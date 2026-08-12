'use server'

// Ogni azione qui sotto invalida sia /lavori/[id] sia /lavori: la dashboard
// mostra i conteggi rosso/giallo/verde calcolati da lavori_dashboard(), che
// dipendono dagli stessi satelliti — senza invalidare anche /lavori la cache
// router di Next.js può continuare a mostrare i conteggi precedenti al
// cambio di stato (bug scoperto in produzione, vedi CLAUDE.md).
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type Acconto, type SessioneLavoro, type SottotipoAppuntamento } from '@/lib/lavori/satelliti-meta'
import { assertLavoroModificabile, assertSatelliteModificabile } from '@/lib/lavori/lavoro-modificabile'

type AzioneResult = { ok: true } | { ok: false; error: string }
type CreazioneResult = { ok: true; id: string } | { ok: false; error: string }

// informazioniRaccolte (2026-08-12, vedi CLAUDE.md — due nuove caselle sulla
// modale Verifica misure): riusa `descrizione_libera`, colonna generica mai
// toccata finora da nessun sottotipo di Appuntamento (verificato in
// migrations/codice prima di procedere — nessuna nuova colonna). Campo
// opzionale: `undefined` per Briefing/Montaggio (il componente non lo invia
// affatto per quei sottotipi, colonna resta quindi quella che era, non
// forzata a null).
export async function aggiornaAppuntamento(
  satelliteId: string,
  lavoroId: string,
  fields: { data: string | null; descrizione: string | null; concluso: boolean; informazioniRaccolte?: string | null },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const update: {
    data_appuntamento: string | null
    descrizione: string | null
    concluso: boolean
    descrizione_libera?: string | null
  } = {
    data_appuntamento: fields.data,
    descrizione: fields.descrizione,
    concluso: fields.concluso,
  }
  if (fields.informazioniRaccolte !== undefined) update.descrizione_libera = fields.informazioniRaccolte

  const { error } = await supabase.from('lavoro_satellite').update(update).eq('id', satelliteId)

  if (error) {
    console.error('aggiornaAppuntamento: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Più appuntamenti dello stesso sottotipo sullo stesso Lavoro sono ammessi (nessun
// collegamento tra loro, coerente col modello satellite libero).
export async function creaAppuntamento(
  lavoroId: string,
  sottotipo: SottotipoAppuntamento,
): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'appuntamento', tipo_appuntamento: sottotipo, concluso: false })
    .select('id')
    .single()

  if (error || !data) {
    console.error('creaAppuntamento: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Progetto non è più creato automaticamente alla creazione del Lavoro
// (Sprint "fondamenta" 2026-08-02, vedi CLAUDE.md): non essendo ripetibile,
// "Aggiungi attività" lo propone finché non esiste già una catena per questo
// Lavoro (il chiamante verifica l'assenza prima di invocare questa azione).
// Progetto non scrive più `stato` dallo Sprint C (documenti) del 2/8:
// modello a flag progetto_accettato (default false a schema), semaforo
// derivato dagli allegati caricati — stesso principio già seguito da
// creaPreventivo() (nessuno stato/flag da impostare al momento della
// creazione, parte sempre dai default a schema).
export async function creaProgetto(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'progetto' })
    .select('id')
    .single()

  if (error) {
    console.error('creaProgetto: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Flag "Accettato" del Progetto (Sprint C, 2/8): a differenza del
// Preventivo, non ha alcun effetto su lavoro.stato — resta indipendente dal
// gate, che dipende solo dal Preventivo (verificato esplicitamente: questa
// funzione tocca solo la riga lavoro_satellite, mai la tabella lavoro).
export async function impostaProgettoAccettato(satelliteId: string, lavoroId: string, accettato: boolean): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase.from('lavoro_satellite').update({ progetto_accettato: accettato }).eq('id', satelliteId)

  if (error) {
    console.error('impostaProgettoAccettato: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Restyling 2026-08-11 (vedi CLAUDE.md — mappatura campi Progetto, stesso
// template di Preventivo dello stesso giorno): Data (data_creazione, NOT
// NULL a schema, resa editabile per la prima volta — stesso pattern di
// aggiornaPreventivo(), il chiamante deve garantire una stringa non vuota)
// e Descrizione (descrizione_libera, colonna già condivisa con Costruzione/
// Campionatura/Noleggio/Preventivo, mai usata dal Progetto finora, nessuna
// nuova colonna). Nessun side-effect su data_presentazione qui (a
// differenza di aggiornaPreventivo): per il Progetto quella colonna si
// valorizza al primo allegato caricato (lib/lavori/allegati.ts), non al
// salvataggio di questi campi — invariato, fuori scope di questa sessione.
export async function aggiornaProgetto(
  satelliteId: string,
  lavoroId: string,
  fields: { dataCreazione: string; descrizione: string | null },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({ data_creazione: fields.dataCreazione, descrizione_libera: fields.descrizione })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaProgetto: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Restyling 2026-08-11 (vedi CLAUDE.md — verifica schema + mappatura campi
// Preventivo): sostituisce aggiornaValorePreventivo() (solo Valore), unico
// chiamante — nessun altro punto del codice la referenziava, rinominata
// invece di mantenuta come alias morto. Salva insieme i tre campi editabili
// dalla modale: Data (data_creazione — colonna già esistente, NOT NULL a
// schema, mai stata scrivibile prima d'ora: il chiamante deve garantire una
// stringa non vuota, un valore vuoto qui violerebbe il vincolo), Valore
// (valore_complessivo, invariato) e Note (descrizione_libera — colonna già
// condivisa con Costruzione/Campionatura/Noleggio, mai usata dal Preventivo
// finora, nessuna nuova colonna). data_presentazione (colonna distinta,
// write-only/dead KPI dalla 0034 — vedi CLAUDE.md) resta invariata, fuori
// scope di questa sessione: stesso side-effect "leggi poi scrivi" di prima,
// solo la prima volta che viene inserito un valore.
export async function aggiornaPreventivo(
  satelliteId: string,
  lavoroId: string,
  fields: { dataCreazione: string; valore: number | null; note: string | null },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const updatePayload: {
    data_creazione: string
    valore_complessivo: number | null
    descrizione_libera: string | null
    data_presentazione?: string
  } = {
    data_creazione: fields.dataCreazione,
    valore_complessivo: fields.valore,
    descrizione_libera: fields.note,
  }

  if (fields.valore != null) {
    const { data: corrente } = await supabase
      .from('lavoro_satellite')
      .select('data_presentazione')
      .eq('id', satelliteId)
      .maybeSingle()

    if (corrente && !corrente.data_presentazione) {
      updatePayload.data_presentazione = new Date().toISOString()
    }
  }

  const { error } = await supabase.from('lavoro_satellite').update(updatePayload).eq('id', satelliteId)

  if (error) {
    console.error('aggiornaPreventivo: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Preventivo non è più creato automaticamente alla creazione del Lavoro
// (Sprint "fondamenta" 2026-08-02, vedi CLAUDE.md): non essendo ripetibile,
// "Aggiungi attività" lo propone finché non ne esiste già uno per questo
// Lavoro. Nessuno stato/flag da impostare al momento della creazione: parte
// sempre da preventivo_accettato=false/preventivo_rifiutato=false (default a
// schema).
export async function creaPreventivo(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'preventivo' })
    .select('id')
    .single()

  if (error) {
    console.error('creaPreventivo: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Gate lavoro.stato derivato SOLO dal Preventivo (revisione satelliti del
// 1/8, vedi CLAUDE.md): funzione pura dei due flag correnti, ricalcolata a
// ogni cambiamento — decisione='accettato' -> 'accettato', 'rifiutato' ->
// 'rifiutato', null (annullamento/reset di entrambi i flag) -> 'opportunita'.
// Corretto il 2026-08-02: fino a questo fix il ramo null non toccava affatto
// lavoro.stato ("non torna mai indietro automaticamente", comportamento
// verificato e confermato reale prima di cambiarlo, poi giudicato non
// desiderato e sostituito su richiesta esplicita). accettato_at/
// prima_accettazione_at restano valorizzati solo se non già impostati (mai
// azzerati qui, coerente con riapriLavoro() in lib/lavori/actions.ts, che
// non li tocca nemmeno lui in un reset verso 'opportunita'). Il Lavoro
// 'completato' è già escluso a monte: assertSatelliteModificabile blocca
// l'intera funzione prima di arrivare a questo punto, nessuna guardia
// aggiuntiva necessaria qui.
export async function impostaPreventivoDecisione(
  satelliteId: string,
  lavoroId: string,
  decisione: 'accettato' | 'rifiutato' | null,
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      preventivo_accettato: decisione === 'accettato',
      preventivo_rifiutato: decisione === 'rifiutato',
    })
    .eq('id', satelliteId)

  if (error) {
    console.error('impostaPreventivoDecisione: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  const nuovoStato = decisione === 'accettato' ? 'accettato' : decisione === 'rifiutato' ? 'rifiutato' : 'opportunita'
  const update: { stato: 'accettato' | 'rifiutato' | 'opportunita'; accettato_at?: string; prima_accettazione_at?: string } = {
    stato: nuovoStato,
  }

  if (decisione === 'accettato') {
    const ora = new Date().toISOString()
    const { data: attuale } = await supabase
      .from('lavoro')
      .select('accettato_at, prima_accettazione_at')
      .eq('id', lavoroId)
      .maybeSingle()
    if (attuale && !attuale.accettato_at) update.accettato_at = ora
    if (attuale && !attuale.prima_accettazione_at) update.prima_accettazione_at = ora
  }

  const { error: lavoroErr } = await supabase.from('lavoro').update(update).eq('id', lavoroId)
  if (lavoroErr) {
    console.error('impostaPreventivoDecisione: update lavoro fallito', lavoroErr)
    return { ok: false, error: "Preventivo salvato, ma errore nell'aggiornamento dello stato del lavoro" }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// --- Acconto (2026-08-11, vedi CLAUDE.md) ---
// Ripetibile come Campionatura: creazione senza alcun parametro, righe
// indipendenti (nessuna catena/raggruppamento), numerazione "Acconto N" in
// UI quando ce n'è più di una — stesso pattern di creaCampione()/
// creaCostruzione()/creaNoleggio(). Intenzionalmente NON collegata a
// chiusura_acconti (Chiusura Lavoro): due meccanismi indipendenti, vedi
// CLAUDE.md.
export async function creaAcconto(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'acconto' })
    .select('id')
    .single()

  if (error) {
    console.error('creaAcconto: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Salva i 4 campi editabili in un solo update, inclusa la checkbox
// "Incassato" — a differenza delle checkbox auto-salvanti di Preventivo/
// Progetto (che pilotano lavoro.stato o riusano un flag preesistente),
// qui non c'è alcun effetto collaterale su lavoro.stato da confermare
// atomicamente: stesso trattamento della checkbox "Concluso" di
// Appuntamento (Briefing/Verifica misure/Montaggio), il template di
// riferimento primario per questa modale — parte del dirty-state
// tracciato da Salva/Annulla, non un'azione a sé.
export async function aggiornaAcconto(
  satelliteId: string,
  lavoroId: string,
  fields: { data: string | null; valore: number | null; note: string | null; incassato: boolean },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      acconto_data: fields.data,
      valore_complessivo: fields.valore,
      descrizione_libera: fields.note,
      acconto_incassato: fields.incassato,
    })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaAcconto: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// --- Campione ---
// Sprint D (produzione) 2026-08-02: ogni riga è un'istanza indipendente
// (vedi CLAUDE.md) — creazione senza alcun parametro, come
// creaProgetto()/creaCostruzione()/creaNoleggio() (parte sempre dai default
// a schema: descrizione/campione_consegnato/note tutti vuoti, compilabili
// dopo l'apertura della modale).
export async function creaCampione(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'campione' })
    .select('id')
    .single()

  if (error) {
    console.error('creaCampione: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Restyling 2026-08-12 (vedi CLAUDE.md — mappatura campi Campionatura,
// stesso template di Progetto/Acconto): campione_data_consegna diventa un
// campo Data liberamente editabile dall'utente (come acconto_data), non più
// un side-effect "leggi poi scrivi" legato alla transizione di
// campione_consegnato — il vecchio comportamento (valorizzata solo alla
// transizione false->true, azzerata alla transizione inversa) è stato
// rimosso: il chiamante invia ora tutti e 4 i campi in un solo update,
// stesso pattern di aggiornaAcconto().
export async function aggiornaCampione(
  satelliteId: string,
  lavoroId: string,
  fields: { data: string | null; descrizione: string | null; consegnato: boolean; note: string | null },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      campione_data_consegna: fields.data,
      descrizione: fields.descrizione,
      descrizione_libera: fields.note,
      campione_consegnato: fields.consegnato,
    })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaCampione: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// --- Acquisti ---
// Lavorazione_esterna eliminata come tipo satellite a sé (revisione
// satelliti del 1/8): resta solo 'acquisti', con acquisto_categoria come
// testo libero facoltativo (dalle preferenze dell'artigiano, vedi
// lib/acquisti/categorie.ts). Più istanze sullo stesso Lavoro sono ammesse
// (più ordini successivi), nessun vincolo di unicità nello schema.
// Righe: un solo campo di testo libero per riga ("Articolo", fix modale
// Acquisto 2026-08-02, vedi CLAUDE.md) — l'artigiano scrive materiale/
// codice/spessore/quantità tutto insieme in linguaggio naturale, coerente
// col documento di revisione. colore_finitura/quantita restano a schema
// (nessuna migration: quantita ha un check quantita > 0, non nullable) ma
// non sono più raccolti da UI — scritti con un default fisso (null/1) per
// soddisfare il vincolo, senza alcun significato residuo.
export async function creaOrdine(
  lavoroId: string,
  fields: {
    fornitoreSedeId: string | null
    acquistoCategoria: string | null
    valoreComplessivo: number | null
    righe: { descrizione: string }[]
  },
): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({
      lavoro_id: lavoroId,
      tipo: 'acquisti',
      fornitore_sede_id: fields.fornitoreSedeId,
      acquisto_categoria: fields.acquistoCategoria,
      valore_complessivo: fields.valoreComplessivo,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('creaOrdine: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  const righe = fields.righe.filter((r) => r.descrizione.trim())
  if (righe.length > 0) {
    const { error: righeErr } = await supabase.from('lavoro_satellite_articolo').insert(
      righe.map((r) => ({
        satellite_id: data.id,
        descrizione: r.descrizione.trim(),
        colore_finitura: null,
        quantita: 1,
      })),
    )

    if (righeErr) {
      console.error('creaOrdine: insert righe fallito', righeErr)
      await supabase.from('lavoro_satellite').delete().eq('id', data.id)
      return { ok: false, error: 'Errore nel salvataggio delle righe, riprova' }
    }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Modifica fornitore/categoria/valore/righe di un Acquisto — possibile solo
// finché ordinato=false (revisione 2026-08-03, vedi CLAUDE.md): oltre al
// gate generico "Lavoro modificabile", questo tipo ha un secondo lock
// specifico — bloccato mentre ordinato=true, ma quel flag stesso è
// reversibile finché l'ordine non è stato inviato via mail (vedi
// impostaOrdinatoAcquisto più sotto): per tornare a modificare basta
// disattivare "ordinato", nessun bisogno di eliminare/ricreare l'Acquisto.
// Verificato qui leggendo lo stato reale a DB, non un valore passato dal
// client. Righe sostituite per intero (delete + insert), stesso pattern già
// in uso per la creazione — più semplice che calcolare un diff, e il volume
// per Acquisto è sempre piccolo.
export async function aggiornaOrdine(
  satelliteId: string,
  lavoroId: string,
  fields: {
    fornitoreSedeId: string | null
    acquistoCategoria: string | null
    valoreComplessivo: number | null
    righe: { descrizione: string }[]
  },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { data: satellite } = await supabase.from('lavoro_satellite').select('ordinato').eq('id', satelliteId).maybeSingle()
  if (satellite?.ordinato) return { ok: false, error: 'Acquisto ordinato: disattiva il flag "ordinato" prima di modificare' }

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      fornitore_sede_id: fields.fornitoreSedeId,
      acquisto_categoria: fields.acquistoCategoria,
      valore_complessivo: fields.valoreComplessivo,
    })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaOrdine: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  const { error: eliminaRigheErr } = await supabase.from('lavoro_satellite_articolo').delete().eq('satellite_id', satelliteId)
  if (eliminaRigheErr) {
    console.error('aggiornaOrdine: eliminazione righe precedenti fallita', eliminaRigheErr)
    return { ok: false, error: 'Errore nel salvataggio delle referenze, riprova' }
  }

  const righe = fields.righe.filter((r) => r.descrizione.trim())
  if (righe.length > 0) {
    const { error: righeErr } = await supabase.from('lavoro_satellite_articolo').insert(
      righe.map((r) => ({
        satellite_id: satelliteId,
        descrizione: r.descrizione.trim(),
        colore_finitura: null,
        quantita: 1,
      })),
    )
    if (righeErr) {
      console.error('aggiornaOrdine: insert righe fallito', righeErr)
      return { ok: false, error: 'Errore nel salvataggio delle referenze, riprova' }
    }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Toggle reversibile (corretto il 2026-08-03, vedi CLAUDE.md — la prima
// versione lo trattava come commit definitivo, mai reversibile: sbagliato,
// l'unico evento davvero irreversibile è l'invio mail, non questo flag).
// Attivare richiede fornitore selezionato e almeno una referenza già
// salvata — validato qui leggendo lo stato reale a DB, non fidandosi del
// form lato client. Disattivare non ha alcun requisito. Una volta inviato
// l'ordine (data_invio_ordine valorizzato), il flag non è più toccabile in
// nessuna delle due direzioni: quello sì è il commit definitivo.
export async function impostaOrdinatoAcquisto(satelliteId: string, lavoroId: string, ordinato: boolean): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const [{ data: satellite }, { count: numeroRighe }] = await Promise.all([
    supabase
      .from('lavoro_satellite')
      .select('fornitore_sede_id, ordinato, data_invio_ordine')
      .eq('id', satelliteId)
      .maybeSingle(),
    supabase.from('lavoro_satellite_articolo').select('id', { count: 'exact', head: true }).eq('satellite_id', satelliteId),
  ])

  if (!satellite) return { ok: false, error: 'Acquisto non trovato' }
  if (satellite.ordinato === ordinato) return { ok: true }
  if (satellite.data_invio_ordine) return { ok: false, error: 'Ordine già inviato: non più modificabile' }
  if (ordinato) {
    if (!satellite.fornitore_sede_id) return { ok: false, error: 'Seleziona un fornitore prima di confermare l\'ordine' }
    if (!numeroRighe) return { ok: false, error: 'Aggiungi almeno una referenza prima di confermare l\'ordine' }
  }

  const { error } = await supabase.from('lavoro_satellite').update({ ordinato }).eq('id', satelliteId)

  if (error) {
    console.error('impostaOrdinatoAcquisto: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// --- Costruzione ---
// Nessuna funzione di creazione esisteva finora (satellite creato solo dal
// trigger crea_satelliti_post_accettazione): con la Costruzione ripetibile
// (Sprint "fondamenta" 2026-08-02, vedi CLAUDE.md) "Aggiungi attività" deve
// poterne creare altre istanze in qualunque momento, indipendentemente dallo
// stato del Lavoro.
export async function creaCostruzione(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  // Restyling 2026-08-12 (vedi CLAUDE.md): niente più `stato: 'da_iniziare'`
  // alla creazione — sessioni_lavoro parte dal proprio default a schema
  // ('[]'::jsonb), concluso dal proprio (false).
  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'costruzione' })
    .select('id')
    .single()

  if (error) {
    console.error('creaCostruzione: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Restyling 2026-08-12 (vedi CLAUDE.md — mappatura campi Costruzione):
// sostituisce aggiornaDescrizioneCostruzione()/avanzaStatoCostruzione()
// (nessun altro chiamante), stesso pattern di aggiornaAcconto()/
// aggiornaCampione() — tutti i campi editabili salvati in un solo update.
// `sessioni` arriva già filtrata dal componente (righe con inizio vuoto,
// es. una "Aggiungi sessione" mai completata, escluse prima della chiamata).
export async function aggiornaCostruzione(
  satelliteId: string,
  lavoroId: string,
  fields: { sessioni: SessioneLavoro[]; note: string | null; conclusa: boolean },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      sessioni_lavoro: fields.sessioni,
      descrizione_libera: fields.note,
      concluso: fields.conclusa,
    })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaCostruzione: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Elimina definitivamente un satellite. Per i tipi "revisionabili"
// (preventivo/progetto/campione) il satellite passato è sempre la revisione
// corrente (leaf) di una catena collegata da revisione_di — quella colonna
// non ha "on delete cascade", quindi il DB rifiuterebbe di eliminare una riga
// ancora referenziata da una revisione successiva. Per far sparire l'intera
// voce dalla tabella (non solo l'ultima revisione, che lascerebbe
// "riemergere" quella precedente come nuova corrente) si risale la catena
// all'indietro fino alla radice e si elimina nello stesso ordine
// leaf -> radice, così ogni riga eliminata non è più referenziata da nessuna
// revisione rimasta. Per i tipi non revisionabili la catena è sempre di una
// sola riga, comportamento identico a un semplice delete. Allegati e righe
// articolo sono già "on delete cascade" (0009/0012), nessuna pulizia manuale
// necessaria.
export async function eliminaSatellite(satelliteId: string, lavoroId: string): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const catena: string[] = []
  let idCorrente: string | null = satelliteId
  while (idCorrente) {
    catena.push(idCorrente)
    const { data }: { data: { revisione_di: string | null } | null } = await supabase
      .from('lavoro_satellite')
      .select('revisione_di')
      .eq('id', idCorrente)
      .maybeSingle()
    idCorrente = data?.revisione_di ?? null
  }

  for (const id of catena) {
    const { error } = await supabase.from('lavoro_satellite').delete().eq('id', id)
    if (error) {
      console.error('eliminaSatellite: delete fallito', error)
      return { ok: false, error: "Errore nell'eliminazione, riprova" }
    }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// --- Noleggio ---
// Stesso ragionamento di creaCostruzione sopra: nessuna funzione di
// creazione esisteva (solo trigger post-accettazione), ora serve per
// "Aggiungi attività" essendo il Noleggio ripetibile.
export async function creaNoleggio(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'noleggio', prenotazione_effettuata: false })
    .select('id')
    .single()

  if (error) {
    console.error('creaNoleggio: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// fornitoreSedeId: la "compagnia" di noleggio è un Fornitore a tutti gli
// effetti (emette fattura, va in contabilità), non un campo testo libero —
// riusa la stessa colonna fornitore_sede_id già in uso per Acquisto, invece
// di introdurre un nuovo campo "compagnia" (Sprint D, produzione, 2/8, vedi
// CLAUDE.md). note: riusa descrizione_libera, colonna già condivisa con
// Costruzione per lo stesso scopo.
export async function aggiornaNoleggio(
  satelliteId: string,
  lavoroId: string,
  fields: {
    fornitoreSedeId: string | null
    dataDa: string | null
    dataA: string | null
    costo: number | null
    note: string | null
    prenotazioneEffettuata: boolean
  },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      fornitore_sede_id: fields.fornitoreSedeId,
      data_da: fields.dataDa,
      data_a: fields.dataA,
      costo: fields.costo,
      descrizione_libera: fields.note,
      prenotazione_effettuata: fields.prenotazioneEffettuata,
    })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaNoleggio: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// --- Chiusura Lavoro ---
// Auto-creata insieme a Briefing/Preventivo dalla migration 0037 (vedi
// CLAUDE.md): questa funzione resta comunque necessaria come fallback
// manuale per i Lavori creati prima di questa modifica, che ne sono privi
// (stesso principio già seguito per creaProgetto()/creaPreventivo()).
export async function creaChiusura(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'chiusura' })
    .select('id')
    .single()

  if (error) {
    console.error('creaChiusura: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
}

// Data/riepilogo acconti — nessun effetto su lavoro.stato, solo dati.
export async function aggiornaChiusura(
  satelliteId: string,
  lavoroId: string,
  fields: { data: string | null; acconti: Acconto[] },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({ chiusura_data: fields.data, chiusura_acconti: fields.acconti })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaChiusura: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// Il semaforo verde di questa attività è il nuovo (e unico) meccanismo che
// porta lavoro.stato a 'completato' (vedi CLAUDE.md — sostituisce il vecchio
// bottone manuale "Segna lavoro completato", rimosso il 3/8). Richiede che
// il Lavoro sia già 'accettato': senza questo controllo, essendo Chiusura
// auto-creata fin dalla nascita del Lavoro (come Briefing/Preventivo), si
// potrebbe altrimenti concludere un Lavoro ancora 'opportunita', saltando a
// piè pari l'accettazione guidata dal Preventivo — non esplicitamente
// richiesto ma verificato necessario prima di scrivere questa funzione.
// chiusura_data valorizzata di default a now() alla prima transizione a
// concluso (stesso pattern "leggi poi scrivi" già in uso per
// data_presentazione/prima_accettazione_at — non più per
// campione_data_consegna, diventata un campo liberamente editabile dal
// restyling Campionatura del 12/8, vedi CLAUDE.md), mai sovrascritta se già
// impostata — resta
// comunque modificabile in seguito tramite aggiornaChiusura(). Bloccata
// insieme a tutto il resto (fornitore/righe/ecc.) non appena lavoro.stato
// diventa 'completato': assertSatelliteModificabile lo garantisce già,
// nessuna funzione simmetrica "riapri" qui — l'unico sblocco resta
// "Riapri lavoro" sulla tabella lavoro (invariato, agnostico a come il
// Lavoro sia diventato completato).
export async function impostaChiusuraConclusa(satelliteId: string, lavoroId: string, concluso: boolean): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  if (concluso) {
    const { data: lavoro } = await supabase.from('lavoro').select('stato').eq('id', lavoroId).maybeSingle()
    if (lavoro?.stato !== 'accettato') {
      return { ok: false, error: 'Il lavoro deve essere accettato (tramite il Preventivo) prima di poter essere chiuso' }
    }
  }

  const { data: attuale } = await supabase
    .from('lavoro_satellite')
    .select('chiusura_data')
    .eq('id', satelliteId)
    .maybeSingle()

  const update: { chiusura_conclusa: boolean; chiusura_data?: string } = { chiusura_conclusa: concluso }
  if (concluso && !attuale?.chiusura_data) update.chiusura_data = new Date().toISOString()

  const { error } = await supabase.from('lavoro_satellite').update(update).eq('id', satelliteId)

  if (error) {
    console.error('impostaChiusuraConclusa: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  const { error: lavoroErr } = await supabase
    .from('lavoro')
    .update({
      stato: concluso ? 'completato' : 'accettato',
      completato_at: concluso ? new Date().toISOString() : null,
    })
    .eq('id', lavoroId)

  if (lavoroErr) {
    console.error('impostaChiusuraConclusa: update lavoro fallito', lavoroErr)
    return { ok: false, error: "Chiusura salvata, ma errore nell'aggiornamento dello stato del lavoro" }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}
