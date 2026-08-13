'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendEmailPersonale } from '@/lib/email/send-email-personale'
import { decifraPassword } from '@/lib/crypto/credenziali-smtp'

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
    .select('nome, smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza')
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
    .select('id, tipo, acquisto_categoria, fornitore_sede_id')
    .eq('id', satelliteId)
    .maybeSingle()

  if (!satellite || !satellite.fornitore_sede_id) {
    return { ok: false, error: 'Nessun fornitore selezionato per questo ordine' }
  }

  const [{ data: righe }, { data: contatto }, { data: lavoro }] = await Promise.all([
    supabase
      .from('lavoro_satellite_articolo')
      .select('descrizione, colore_finitura')
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

  // Niente più "× quantità" nel testo (audit 2026-08, allineato al fix già
  // applicato alla lista di sola lettura in satellite-ordine.tsx il 2/8):
  // dal fix modale Acquisto dello stesso giorno, ogni nuova riga viene
  // scritta con `quantita: 1` fisso (nessun significato residuo, il campo
  // non è più raccolto in UI) — mostrarlo nell'email al fornitore avrebbe
  // mostrato un fuorviante "× 1" su ogni singola referenza, esattamente il
  // problema già risolto lato UI ma rimasto qui. `colore_finitura` resta
  // (sempre null per le righe nuove, quindi la condizione non produce mai
  // output oggi, ma può ancora comparire su righe storiche pre-2/8).
  const righeTesto = (righe ?? []).map((r) => `${r.descrizione}${r.colore_finitura ? ` — ${r.colore_finitura}` : ''}`)

  const html = `
    <p>Ciao ${contatto.nome},</p>
    <p>Avrei bisogno di:</p>
    <p>${righeTesto.join('<br>')}</p>
    <p>Buon lavoro<br>${artigiano.nome}</p>
  `

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
