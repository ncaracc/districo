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
    titolo: string
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
      titolo: fields.titolo,
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

  const update: {
    stato: 'accettato' | 'rifiutato' | 'completato'
    accettato_at?: string
    prima_accettazione_at?: string
    completato_at?: string
  } = { stato: nuovoStato }

  if (nuovoStato === 'accettato') {
    update.accettato_at = new Date().toISOString()

    // prima_accettazione_at: valorizzata una sola volta e mai più toccata dopo,
    // a differenza di accettato_at che viene sovrascritta a ogni ri-accettazione
    // — serve al KPI "accettazione -> produzione" per non calcolare durate
    // negative/errate dopo un ciclo accettato->opportunita->accettato (vedi
    // CLAUDE.md, diagnosi KPI del 26/7). Letta prima di scrivere: il client
    // Supabase non supporta espressioni riferite alla colonna stessa nel
    // payload di update (niente coalesce(colonna, now()) diretto).
    const { data: attuale } = await supabase.from('lavoro').select('prima_accettazione_at').eq('id', lavoroId).maybeSingle()
    if (attuale && !attuale.prima_accettazione_at) {
      update.prima_accettazione_at = update.accettato_at
    }
  }

  if (nuovoStato === 'completato') update.completato_at = new Date().toISOString()

  const { error } = await supabase.from('lavoro').update(update).eq('id', lavoroId)

  if (error) {
    console.error('segnaLavoroStato: update fallito', error)
    return { ok: false, error: 'Errore, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Riapertura/correzione di un Lavoro (fix emerso dal test end-to-end in
// produzione, esteso il 26/7 per coprire anche accettato -> opportunita):
// riporta lo stato al valore precedente logico — completato -> accettato,
// rifiutato -> opportunita, accettato -> opportunita. Nessun'altra modifica:
// i satelliti (inclusi quelli di esecuzione creati automaticamente
// dall'accettazione) restano invariati nel database — la sezione "Esecuzione"
// smette solo di essere mostrata in UI finché il lavoro non torna accettato
// (vedi app/(app)/lavori/[id]/page.tsx). Il trigger crea_satelliti_post_
// accettazione ha già una guardia di idempotenza (Sprint A: non ricrea i
// segnaposto se esistono già satelliti acquisti/lavorazione_esterna/
// costruzione/noleggio per il lavoro), quindi un ciclo accettato ->
// opportunita -> accettato ripetuto più volte non duplica nulla. Nessun
// controllo di gate qui (a differenza di segnaLavoroStato verso 'completato'):
// riaprire/correggere non ha condizioni, è sempre concesso.
export async function riapriLavoro(
  lavoroId: string,
  statoAttuale: 'accettato' | 'completato' | 'rifiutato',
): Promise<AzioneResult> {
  const supabase = await createClient()
  const nuovoStato = statoAttuale === 'completato' ? 'accettato' : 'opportunita'

  // Uscendo da 'completato' si azzera esplicitamente completato_at: altrimenti
  // resterebbe un timestamp fantasma di un completamento poi annullato,
  // falsando il KPI "durata montaggio" se il lavoro viene poi ricompletato
  // (segnaLavoroStato lo rivalorizzerà da zero al prossimo completamento).
  // prima_accettazione_at non viene mai toccato qui: resta immutabile per
  // design, indipendentemente da quante volte il lavoro viene riaperto.
  const update: { stato: 'accettato' | 'opportunita'; completato_at?: null } = { stato: nuovoStato }
  if (statoAttuale === 'completato') update.completato_at = null

  const { error } = await supabase.from('lavoro').update(update).eq('id', lavoroId)

  if (error) {
    console.error('riapriLavoro: update fallito', error)
    return { ok: false, error: 'Errore, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}
