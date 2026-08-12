'use server'

import { randomUUID } from 'crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Stessa cartella base usata per gli allegati (vedi lib/lavori/allegati.ts):
// /app/uploads in produzione (volume montato su /srv/apps/districo/uploads),
// ./uploads in locale.
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

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

// Eliminazione definitiva e a cascata di un Lavoro: righe DB (lavoro,
// lavoro_artigiani, satelliti/allegati/righe collegate, allegato generale,
// attivita/fasi/pagamenti — tutte già "on delete cascade" su lavoro_id dalla
// 0001/0009/0012, RLS "lavoro: eliminazione solo owner" già esistente dalla
// 0001, nessuna migrazione necessaria) più i file fisici caricati sul
// volume uploads del VPS, mai ripuliti da un semplice DELETE via FK. La
// cartella allegati di un Lavoro vive tutta sotto uploads/lavori/<lavoroId>/
// (satelliti e, in futuro, il repository generale "allegato" — vedi
// lib/lavori/allegati.ts), quindi una singola rimozione ricorsiva della
// cartella basta, senza dover enumerare ogni singolo file. Rimozione file
// eseguita DOPO il delete DB riuscito: se il delete fallisse (es. RLS nega
// perché non owner) non tocchiamo comunque nulla su disco.
export async function eliminaLavoro(lavoroId: string): Promise<AzioneResult> {
  const supabase = await createClient()

  const { error } = await supabase.from('lavoro').delete().eq('id', lavoroId)

  if (error) {
    console.error('eliminaLavoro: delete fallito', error)
    return { ok: false, error: "Errore nell'eliminazione, riprova" }
  }

  await fs.rm(path.join(UPLOADS_DIR, 'lavori', lavoroId), { recursive: true, force: true }).catch(() => {})

  revalidatePath('/lavori')
  return { ok: true }
}

// Riapertura/correzione di un Lavoro: riporta lo stato al valore precedente
// logico — completato -> accettato, rifiutato -> opportunita. Nessun'altra
// modifica: i satelliti restano invariati nel database. Nessun controllo di
// gate qui (a differenza di completaLavoro): riaprire/correggere non ha
// condizioni, è sempre concesso.
//
// La terza variante che esisteva qui (accettato -> opportunita, "Riporta a
// opportunità") è stata rimossa nello Sprint "fondamenta" 2026-08-02 (vedi
// CLAUDE.md): lavoro.stato ora si modifica esclusivamente tramite i flag
// preventivo_accettato/preventivo_rifiutato sul satellite Preventivo
// (impostaPreventivoDecisione in lib/lavori/satelliti.ts), non più con
// un'azione manuale diretta sulla pagina Lavoro.
//
// Lifecycle Chiusura Lavoro (2026-08-13, vedi CLAUDE.md): nessuna chiamata
// di creazione/rimozione necessaria qui. 'completato' -> 'accettato': la
// Chiusura esiste già (non viene mai rimossa entrando in 'completato', vedi
// impostaPreventivoDecisione) — nessuna ricreazione necessaria. 'rifiutato'
// -> 'opportunita': la Chiusura era già stata rimossa quando il Lavoro
// aveva lasciato 'accettato' per diventare 'rifiutato' (stessa funzione), e
// il target qui non è comunque 'accettato' — nessuna azione necessaria.
export async function riapriLavoro(
  lavoroId: string,
  statoAttuale: 'completato' | 'rifiutato',
): Promise<AzioneResult> {
  const supabase = await createClient()
  const nuovoStato = statoAttuale === 'completato' ? 'accettato' : 'opportunita'

  // Uscendo da 'completato' si azzera esplicitamente completato_at: altrimenti
  // resterebbe un timestamp fantasma di un completamento poi annullato,
  // falsando il KPI "durata montaggio" se il lavoro viene poi ricompletato
  // (completaLavoro lo rivalorizzerà da zero al prossimo completamento).
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
