import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripeClient } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'

// Webhook Stripe (2026-08-21, integrazione abbonamenti — modalità
// test/sandbox, vedi CLAUDE.md). URL: /api/stripe/webhook — questo è
// l'endpoint da registrare su Stripe Dashboard (Sviluppatori → Webhook →
// Aggiungi endpoint) per ottenere il signing secret da mettere in
// STRIPE_WEBHOOK_SECRET.
//
// Nessun controllo di sessione/RLS qui: la richiesta arriva direttamente
// dai server di Stripe, non da un browser autenticato — l'unica
// autenticazione possibile è la verifica della firma HMAC
// (`stripe.webhooks.constructEvent`), per questo è imprescindibile prima
// di fidarsi di qualunque campo del payload. Scrittura DB via
// `createAdminClient()` (service role, bypassa RLS) — stesso pattern già
// in uso altrove nel progetto per scritture che non hanno un utente
// autenticato dietro (es. il trigger di creazione artigiano).
//
// `request.text()` (non `.json()`): la verifica della firma richiede il
// corpo RAW esatto ricevuto — un giro di parse/stringify anche solo
// leggermente diverso (ordine chiavi, spazi) la farebbe fallire. I Route
// Handler di Next (App Router) non applicano alcun body-parsing di
// default, a differenza delle vecchie Pages API routes che richiedevano
// `bodyParser: false` — nessuna configurazione aggiuntiva necessaria qui.
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !secret) {
    console.error('Webhook Stripe: firma o STRIPE_WEBHOOK_SECRET mancante')
    return NextResponse.json({ error: 'Configurazione webhook mancante' }, { status: 400 })
  }

  const body = await request.text()
  const stripe = stripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    console.error('Webhook Stripe: firma non valida', err)
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    // created/updated/deleted trattati identicamente: il payload di
    // 'deleted' ha comunque `subscription.status === 'canceled'`, la
    // mappatura sotto lo traduce già correttamente — nessun branch
    // separato necessario.
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await sincronizzaAbbonamento(admin, subscription)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      console.info('Webhook Stripe: fattura pagata', invoice.id, invoice.customer)
      break
    }

    // Opzionale per ora, come da richiesta esplicita: nessun invio mail —
    // solo il gancio, loggato. Un futuro promemoria si aggancerebbe qui
    // (stessa infrastruttura mail già in uso altrove nel progetto,
    // lib/email/send-email-personale.ts).
    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription
      console.info('Webhook Stripe: trial in scadenza a breve', subscription.id, subscription.customer)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}

type StatoAbbonamento = 'nessuno' | 'trialing' | 'active' | 'past_due' | 'canceled'

// Mappatura stati Stripe → i 5 valori del CHECK a schema (migration 0057).
// Stripe ne ha di più (incomplete/incomplete_expired/unpaid/paused) — nessuno
// di questi è raggiungibile dal flusso di checkout usato qui (Checkout
// Session hosted, carta raccolta subito, trial_period_days sempre
// impostato), mappati comunque per robustezza invece di lasciare un caso
// non gestito: 'unpaid'/'incomplete' come 'past_due' (problema di
// pagamento, stessa semantica pratica), 'incomplete_expired'/'paused' come
// 'canceled' (l'abbonamento non è comunque utilizzabile).
function mappaStatoStripe(status: Stripe.Subscription.Status): StatoAbbonamento {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled'
    default:
      return 'past_due'
  }
}

function mappaPiano(subscription: Stripe.Subscription): 'mensile' | 'annuale' | null {
  const priceId = subscription.items.data[0]?.price?.id
  if (priceId === process.env.STRIPE_PRICE_ID_MENSILE) return 'mensile'
  if (priceId === process.env.STRIPE_PRICE_ID_ANNUALE) return 'annuale'
  return null
}

async function sincronizzaAbbonamento(admin: ReturnType<typeof createAdminClient>, subscription: Stripe.Subscription) {
  // Chiave primaria di lookup: i metadata della subscription (impostati da
  // `avviaCheckout()` alla creazione della Checkout Session,
  // `subscription_data.metadata`) — sempre presenti per ogni abbonamento
  // creato da questa app. Fallback sul customer_id (indicizzato univoco,
  // migration 0057) solo per robustezza, es. un abbonamento creato/gestito
  // manualmente da Stripe Dashboard senza passare da `avviaCheckout()`.
  const artigianoId = subscription.metadata?.artigiano_id
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

  const update = {
    stripe_subscription_id: subscription.id,
    stato_abbonamento: mappaStatoStripe(subscription.status),
    piano_abbonamento: mappaPiano(subscription),
    trial_fine: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  }

  const query = admin.from('artigiano').update(update, { count: 'exact' })
  const { error, count } = artigianoId
    ? await query.eq('id', artigianoId)
    : await query.eq('stripe_customer_id', customerId)

  if (error) {
    console.error('Webhook Stripe: errore aggiornamento artigiano', subscription.id, error)
  } else if (count === 0) {
    console.error('Webhook Stripe: nessun artigiano trovato per la subscription', subscription.id, {
      artigianoId,
      customerId,
    })
  }
}
