'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/email/templates'
import { stripeClient } from './client'

export type Piano = 'mensile' | 'annuale'

const PRICE_ID: Record<Piano, string | undefined> = {
  mensile: process.env.STRIPE_PRICE_ID_MENSILE,
  annuale: process.env.STRIPE_PRICE_ID_ANNUALE,
}

// Avvia una Stripe Checkout Session per il piano scelto (2026-08-21, vedi
// CLAUDE.md). Chiamata da `ScegliPianoAbbonamento` (form action, con
// `.bind(null, piano)` — pattern standard Next.js per passare un argomento
// a una Server Action da un form senza leggerlo da FormData), sia dal
// componente "trial scaduto" sia dal tab "Abbonamento" di Impostazioni:
// stesso identico endpoint per entrambi i punti di ingresso ("dalla pagina
// Pricing per un utente già loggato senza abbonamento attivo" del brief —
// qui non esiste una pagina Pricing separata per un utente autenticato, la
// landing pubblica non è mai raggiungibile da loggato (redirect di
// middleware) — questi due punti la sostituiscono).
//
// Nessun collegamento sincrono dalla registrazione stessa (a differenza di
// quanto il brief ipotizzava come possibile): la conferma email è
// obbligatoria in produzione (template "Confirm signup" personalizzato,
// vedi CLAUDE-ARCHIVIO.md 19/7) — al momento del signUp() non esiste ancora
// una sessione autenticata da cui creare una Checkout Session. Il piano si
// sceglie quindi sempre DOPO il primo login riuscito (qui o nel tab
// Abbonamento), non durante il form di registrazione stesso — scelta
// deliberata per non introdurre un flusso di conferma email con parametri
// da preservare attraverso il redirect, fragile e non richiesto
// esplicitamente (il brief condizionava l'hook nella registrazione a "se
// esiste già un passaggio dedicato" — non esiste).
export async function avviaCheckout(piano: Piano) {
  const priceId = PRICE_ID[piano]
  if (!priceId) {
    throw new Error(`Price ID mancante per il piano "${piano}" (variabile d'ambiente non configurata)`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('id, email, stripe_customer_id, stato_abbonamento, trial_fine')
    .eq('id', user.id)
    .maybeSingle()
  if (!artigiano) redirect('/login')

  // Difesa contro un doppio abbonamento per lo stesso artigiano: la UI
  // nasconde già i bottoni piano quando lo stato non è 'nessuno'/'canceled'
  // (ScegliPianoAbbonamento non viene mai mostrato altrimenti), questo è
  // solo un secondo controllo lato server, non richiesto esplicitamente ma
  // a basso costo.
  const trialAncoraValido =
    artigiano.stato_abbonamento === 'trialing' &&
    (!artigiano.trial_fine || new Date(artigiano.trial_fine) >= new Date())
  if (artigiano.stato_abbonamento === 'active' || artigiano.stato_abbonamento === 'past_due' || trialAncoraValido) {
    throw new Error('Hai già un abbonamento in corso')
  }

  const stripe = stripeClient()

  let customerId = artigiano.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: artigiano.email,
      metadata: { artigiano_id: artigiano.id },
    })
    customerId = customer.id
    await supabase.from('artigiano').update({ stripe_customer_id: customerId }).eq('id', artigiano.id)
  }

  const base = siteUrl()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: { artigiano_id: artigiano.id, piano },
    },
    metadata: { artigiano_id: artigiano.id, piano },
    success_url: `${base}/lavori?abbonamento=attivato`,
    cancel_url: `${base}/profilo/impostazioni`,
  })

  if (!session.url) {
    throw new Error('Stripe non ha restituito una URL di Checkout')
  }

  redirect(session.url)
}
