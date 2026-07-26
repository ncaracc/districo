'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type LavoroResult = { ok: true; id: string } | { ok: false; error: string }
type AzioneResult = { ok: true } | { ok: false; error: string }

export async function creaLavoro(
  clienteId: string,
  fields: { titolo: string; descrizione: string | null },
): Promise<LavoroResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  // L'id viene generato qui invece di farselo restituire dall'insert (RETURNING):
  // finché la riga owner in lavoro_artigiani non esiste (statement successivo), il nuovo
  // lavoro non soddisfa ancora la propria policy SELECT (is_artigiano_del_lavoro) — e
  // Postgres richiede che una INSERT ... RETURNING soddisfi anche quella, non solo il
  // WITH CHECK dell'INSERT. Senza RETURNING quel controllo aggiuntivo non scatta.
  const lavoroId = randomUUID()

  const { error: lavoroErr } = await supabase.from('lavoro').insert({
    id: lavoroId,
    cliente_id: clienteId,
    titolo: fields.titolo,
    descrizione: fields.descrizione,
    data_lavoro: new Date().toISOString().slice(0, 10),
  })

  if (lavoroErr) {
    console.error('creaLavoro: insert su lavoro fallito', lavoroErr)
    return {
      ok: false,
      error: `Errore nella creazione del lavoro: ${lavoroErr.message}`,
    }
  }

  const { error: laErr } = await supabase.from('lavoro_artigiani').insert({
    lavoro_id: lavoroId,
    artigiano_id: user.id,
    email_invitata: user.email!,
    ruolo: 'owner',
    stato: 'accettato',
  })

  if (laErr) {
    console.error('creaLavoro: insert owner su lavoro_artigiani fallito', laErr)
    // Rollback col client admin: senza la riga owner il lavoro resterebbe orfano e
    // invisibile a chiunque (tutte le policy su lavoro passano da lavoro_artigiani),
    // quindi non cancellabile con un insert/delete autenticato normale.
    const admin = createAdminClient()
    await admin.from('lavoro').delete().eq('id', lavoroId)
    return {
      ok: false,
      error: `Errore nel collegamento del lavoro: ${laErr.message}`,
    }
  }

  revalidatePath('/lavori')
  revalidatePath(`/clienti/${clienteId}`)
  return { ok: true, id: lavoroId }
}

// Modifica del Lavoro dopo la creazione (fix emerso dal test end-to-end in
// produzione: prima non esisteva alcuna azione di modifica). Titolo escluso
// deliberatamente: non richiesto, resta fisso dalla creazione. Nessun controllo
// esplicito di ownership qui: la policy RLS "lavoro: modifica solo owner"
// (0001) già lo garantisce a livello DB.
export async function aggiornaLavoro(
  lavoroId: string,
  fields: {
    descrizione: string | null
    dataLavoro: string | null
    indirizzo: string | null
    civico: string | null
    cap: string | null
    citta: string | null
    siglaProvincia: string | null
    nazione: string | null
  },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lavoro')
    .update({
      descrizione: fields.descrizione,
      data_lavoro: fields.dataLavoro,
      indirizzo: fields.indirizzo,
      civico: fields.civico,
      cap: fields.cap,
      citta: fields.citta,
      sigla_provincia: fields.siglaProvincia,
      nazione: fields.nazione,
    })
    .eq('id', lavoroId)

  if (error) {
    console.error('aggiornaLavoro: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}

// Transizioni manuali del ciclo di vita del Lavoro (opportunità -> accettato/
// rifiutato, accettato -> completato). "Segna come accettato"/"rifiutato" restano
// senza vincoli, coerente con "transizioni sempre manuali" della revisione
// 2026-07-25. "Segna lavoro completato" invece NON è più sempre disponibile
// (fix emerso dal test end-to-end in produzione, supera la decisione originale
// dello Sprint C): è bloccata se lavoro_pronto_per_montaggio() risulta falso,
// cioè se un qualsiasi satellite bloccante (acquisti, lavorazione esterna,
// costruzione, noleggio, oltre a preventivo/progetto/campione) non è ancora
// verde. Il controllo è qui lato server (non solo il bottone disabilitato in
// UI) perché è un vincolo reale, non solo un suggerimento — riusa la stessa
// funzione SQL già esistente, nessuna nuova logica di gate. `accettato_at`
// continua a essere popolato alla transizione verso 'accettato' per continuità
// con la UI esistente, pur essendo ridondante con stato='accettato'.
export async function segnaLavoroStato(
  lavoroId: string,
  nuovoStato: 'accettato' | 'rifiutato' | 'completato',
): Promise<AzioneResult> {
  const supabase = await createClient()

  if (nuovoStato === 'completato') {
    const { data: pronto } = await supabase.rpc('lavoro_pronto_per_montaggio', { p_lavoro_id: lavoroId })
    if (!pronto) {
      return {
        ok: false,
        error: 'Non tutti i satelliti bloccanti sono completi: il lavoro non può ancora essere segnato come completato.',
      }
    }
  }

  const update: { stato: 'accettato' | 'rifiutato' | 'completato'; accettato_at?: string } = { stato: nuovoStato }
  if (nuovoStato === 'accettato') update.accettato_at = new Date().toISOString()

  const { error } = await supabase.from('lavoro').update(update).eq('id', lavoroId)

  if (error) {
    console.error('segnaLavoroStato: update fallito', error)
    return { ok: false, error: 'Errore, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Riapertura di un Lavoro chiuso per errore (fix emerso dal test end-to-end in
// produzione): riporta lo stato al valore precedente logico — completato ->
// accettato, rifiutato -> opportunita. Nessun'altra modifica: satelliti,
// accettato_at e ogni altro dato collegato restano invariati. Nessun controllo
// di gate qui (a differenza di segnaLavoroStato verso 'completato'): riaprire
// non ha condizioni, è sempre concesso su un lavoro chiuso.
export async function riapriLavoro(
  lavoroId: string,
  statoAttuale: 'completato' | 'rifiutato',
): Promise<AzioneResult> {
  const supabase = await createClient()
  const nuovoStato = statoAttuale === 'completato' ? 'accettato' : 'opportunita'

  const { error } = await supabase.from('lavoro').update({ stato: nuovoStato }).eq('id', lavoroId)

  if (error) {
    console.error('riapriLavoro: update fallito', error)
    return { ok: false, error: 'Errore, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}
