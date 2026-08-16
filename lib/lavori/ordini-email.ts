'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmailPersonale } from '@/lib/email/send-email-personale'
import { decifraPassword } from '@/lib/crypto/credenziali-smtp'
import { DEFAULT_APERTURA_INFORMALE, DEFAULT_CONGEDO_INFORMALE, sostituisciPlaceholder } from '@/lib/lavori/mail-ordine-testo'
import { corpoMailOrdine } from '@/lib/lavori/ordine-mail-html'

// richiedeConfigurazione: distingue il caso "credenziali SMTP personali assenti"
// dagli altri errori, così la UI può mostrare un link diretto a Profilo/Impostazioni
// invece del generico messaggio d'errore.
type AzioneResult = { ok: true } | { ok: false; error: string; richiedeConfigurazione?: boolean }

// Contatti selezionabili per l'invio: solo quelli con un'email (senza email non è
// possibile inviare nulla, non ha senso proporli nel dropdown).
export async function contattiPerInvio(
  fornitoreSedeId: string,
): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fornitore_sede_contatto')
    .select('id, nome, cognome, email')
    .eq('fornitore_sede_id', fornitoreSedeId)
    .not('email', 'is', null)

  return (data ?? []).map((c) => ({ id: c.id, label: `${c.nome} ${c.cognome ?? ''} — ${c.email}`.trim() }))
}

export async function inviaOrdineSatellite(
  satelliteId: string,
  lavoroId: string,
  contattoId: string,
): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  // Credenziali SMTP PERSONALI dell'artigiano che sta inviando (mittente reale =
  // la sua email) — non lo SMTP di sistema Aruba usato per gli inviti "a quattro
  // mani". Se mancano anche solo in parte, non si tenta l'invio.
  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('nome, cognome, smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza, mail_ordine_apertura, mail_ordine_congedo')
    .eq('id', user.id)
    .maybeSingle()

  if (
    !artigiano ||
    !artigiano.smtp_host ||
    !artigiano.smtp_porta ||
    !artigiano.smtp_username ||
    !artigiano.smtp_password_cifrata ||
    !artigiano.smtp_sicurezza
  ) {
    return {
      ok: false,
      error: 'Configura le tue credenziali email in Profilo/Impostazioni prima di poter inviare ordini.',
      richiedeConfigurazione: true,
    }
  }

  const { data: satellite } = await supabase
    .from('lavoro_satellite')
    .select('id, tipo, acquisto_categoria, fornitore_sede_id, valore_complessivo')
    .eq('id', satelliteId)
    .maybeSingle()

  if (!satellite || !satellite.fornitore_sede_id) {
    return { ok: false, error: 'Nessun fornitore selezionato per questo ordine' }
  }

  const [{ data: righe }, { data: contatto }, { data: lavoro }] = await Promise.all([
    supabase
      .from('lavoro_satellite_articolo')
      .select('descrizione, colore_finitura, quantita, prezzo_unitario')
      .eq('satellite_id', satelliteId),
    supabase
      .from('fornitore_sede_contatto')
      .select('id, nome, cognome, email')
      .eq('id', contattoId)
      .maybeSingle(),
    supabase.from('lavoro').select('id, cliente_id').eq('id', lavoroId).maybeSingle(),
  ])

  if (!contatto || !contatto.email) {
    return { ok: false, error: 'Il contatto selezionato non ha un indirizzo email' }
  }

  const { data: cliente } = lavoro
    ? await supabase.from('cliente').select('nome').eq('id', lavoro.cliente_id).maybeSingle()
    : { data: null }

  const oggettoTipo = satellite.acquisto_categoria ? satellite.acquisto_categoria.toLowerCase() : 'acquisti'

  const subject = `Ordine ${oggettoTipo} rif. ${cliente?.nome ?? 'lavoro'}`

  // Apertura/Congedo personalizzabili (2026-08-17, vedi CLAUDE.md): SOSTITUISCONO
  // il vecchio saluto/congedo fissi — Apertura include già il lead-in
  // all'elenco ("Avrei bisogno di:" o equivalente), Congedo include anche la
  // firma dell'artigiano (decisione presa con l'utente, non un blocco a
  // parte come prima). Nessuna personalizzazione mai salvata -> fallback al
  // preset Informale, stesso tono del testo fisso preesistente (nessun
  // cambio di comportamento percepito finché l'utente non tocca
  // Impostazioni). Placeholder sostituiti con gli stessi dati già letti
  // sopra per contatto/artigiano, nessun fetch aggiuntivo.
  const placeholder = {
    nomeContatto: contatto.nome,
    nomeArtigiano: artigiano.nome,
    nomeCognomeArtigiano: `${artigiano.nome} ${artigiano.cognome}`,
  }
  // `.trim()` solo per decidere se il campo è "vuoto" (fallback al default) —
  // il valore sostituito resta quello originale, non troncato: i default
  // stessi terminano deliberatamente con un `\n` (riga vuota prima
  // dell'elenco), un `.trim()` sul valore effettivo lo perderebbe (bug
  // gemello di quello corretto in aggiornaTestoMail, vedi CLAUDE.md).
  const apertura = sostituisciPlaceholder(
    artigiano.mail_ordine_apertura?.trim() ? artigiano.mail_ordine_apertura : DEFAULT_APERTURA_INFORMALE,
    placeholder,
  )
  const congedo = sostituisciPlaceholder(
    artigiano.mail_ordine_congedo?.trim() ? artigiano.mail_ordine_congedo : DEFAULT_CONGEDO_INFORMALE,
    placeholder,
  )

  // Corpo HTML completo (2026-08-17, vedi CLAUDE.md — "mail d'ordine ai
  // fornitori in HTML con banner responsive"): CORREGGE la decisione del
  // 14/8 ("il prezzo resta fuori dall'email") — la tabella include ora
  // prezzo unitario e totale per riga più il totale complessivo,
  // esplicitamente richiesto in questa sessione (una mail d'ordine è a
  // tutti gli effetti un ordine d'acquisto, il prezzo ci va). Totale
  // complessivo dal campo persistito `valore_complessivo` (già calcolato
  // server-side da salvaRigheOrdine/valoreComplessivoRighe), non
  // ricalcolato qui — stessa fonte mostrata ovunque nell'app.
  const html = corpoMailOrdine({
    apertura,
    congedo,
    righe: (righe ?? []).map((r) => ({
      descrizione: r.descrizione,
      coloreFinitura: r.colore_finitura,
      quantita: r.quantita,
      prezzoUnitario: r.prezzo_unitario,
    })),
    totaleComplessivo: satellite.valore_complessivo ?? 0,
  })

  try {
    await sendEmailPersonale({
      smtp: {
        host: artigiano.smtp_host,
        porta: artigiano.smtp_porta,
        username: artigiano.smtp_username,
        password: decifraPassword(artigiano.smtp_password_cifrata),
        sicurezza: artigiano.smtp_sicurezza,
      },
      mittenteNome: artigiano.nome,
      to: contatto.email,
      subject,
      html,
    })
  } catch (err) {
    console.error('inviaOrdineSatellite: invio email fallito', err)
    return { ok: false, error: "Errore nell'invio dell'email (credenziali o server SMTP), riprova" }
  }

  const { error: updErr } = await supabase
    .from('lavoro_satellite')
    .update({ data_invio_ordine: new Date().toISOString(), contatto_invio_id: contattoId })
    .eq('id', satelliteId)

  if (updErr) {
    console.error('inviaOrdineSatellite: registrazione invio fallita', updErr)
    // L'email è comunque partita: non blocchiamo l'utente per un errore secondario
    // di sola registrazione, ma lo segnaliamo.
    return { ok: false, error: "Email inviata, ma non è stato possibile registrare l'invio" }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}
