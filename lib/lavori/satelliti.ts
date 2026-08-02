'use server'

// Ogni azione qui sotto invalida sia /lavori/[id] sia /lavori: la dashboard
// mostra i conteggi rosso/giallo/verde calcolati da lavori_dashboard(), che
// dipendono dagli stessi satelliti — senza invalidare anche /lavori la cache
// router di Next.js può continuare a mostrare i conteggi precedenti al
// cambio di stato (bug scoperto in produzione, vedi CLAUDE.md).
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type SottotipoAppuntamento, type StatoAcquisti } from '@/lib/lavori/satelliti-meta'
import { assertLavoroModificabile, assertSatelliteModificabile } from '@/lib/lavori/lavoro-modificabile'

type AzioneResult = { ok: true } | { ok: false; error: string }
type CreazioneResult = { ok: true; id: string } | { ok: false; error: string }

export async function aggiornaAppuntamento(
  satelliteId: string,
  lavoroId: string,
  fields: { data: string | null; descrizione: string | null; concluso: boolean },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      data_appuntamento: fields.data,
      descrizione: fields.descrizione,
      concluso: fields.concluso,
    })
    .eq('id', satelliteId)

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

// data_presentazione: nel vecchio modello a stati scattava alla prima
// transizione a "presentato" — con il Preventivo ridotto a due flag
// (revisione satelliti del 1/8, vedi impostaPreventivoDecisione più sotto)
// il momento analogo è la prima volta che viene inserito un valore (diventa
// "presentabile" al cliente, semaforo giallo). Valorizzata una sola volta,
// mai sovrascritta, per non perdere il dato storico usato dal KPI "tempo di
// preventivazione".
export async function aggiornaValorePreventivo(
  satelliteId: string,
  lavoroId: string,
  valore: number | null,
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const updatePayload: { valore_complessivo: number | null; data_presentazione?: string } = { valore_complessivo: valore }

  if (valore != null) {
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
    console.error('aggiornaValorePreventivo: update fallito', error)
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
// 1/8, vedi CLAUDE.md): preventivo_accettato=true -> lavoro.stato='accettato'
// (accettato_at/prima_accettazione_at valorizzati solo se non già impostati);
// preventivo_rifiutato=true -> lavoro.stato='rifiutato'. Annullare una
// decisione (decisione=null, entrambi i flag tornano false) non tocca mai
// lavoro.stato: non si forza mai indietro a 'opportunita' (es. se il lavoro
// fosse già avanzato oltre) — dalla rimozione di "Riporta a opportunità" nello
// Sprint "fondamenta" 2026-08-02 (vedi CLAUDE.md), un Lavoro accettato con
// entrambi i flag annullati resta "accettato" senza una via automatica
// indietro in UI: l'unica reversibilità rimasta è "Riapri lavoro" per
// completato/rifiutato (lib/lavori/actions.ts) — non richiesta una nuova via
// per questo caso specifico, segnalato qui per consapevolezza futura.
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

  if (decisione === 'accettato' || decisione === 'rifiutato') {
    const update: { stato: 'accettato' | 'rifiutato'; accettato_at?: string; prima_accettazione_at?: string } = {
      stato: decisione,
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

// campione_data_consegna: valorizzata a now() solo alla transizione
// false->true di campione_consegnato, azzerata alla transizione inversa —
// letto lo stato attuale prima di scrivere (stesso pattern "leggi poi
// scrivi" già in uso per data_presentazione/prima_accettazione_at), per non
// perdere/falsare la data se il flag viene semplicemente ri-salvato invariato.
export async function aggiornaCampione(
  satelliteId: string,
  lavoroId: string,
  fields: { descrizione: string | null; consegnato: boolean; note: string | null },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { data: attuale } = await supabase
    .from('lavoro_satellite')
    .select('campione_consegnato')
    .eq('id', satelliteId)
    .maybeSingle()

  const update: {
    descrizione: string | null
    descrizione_libera: string | null
    campione_consegnato: boolean
    campione_data_consegna?: string | null
  } = {
    descrizione: fields.descrizione,
    descrizione_libera: fields.note,
    campione_consegnato: fields.consegnato,
  }

  if (fields.consegnato && !attuale?.campione_consegnato) {
    update.campione_data_consegna = new Date().toISOString()
  } else if (!fields.consegnato && attuale?.campione_consegnato) {
    update.campione_data_consegna = null
  }

  const { error } = await supabase.from('lavoro_satellite').update(update).eq('id', satelliteId)

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
export async function creaOrdine(
  lavoroId: string,
  fields: {
    fornitoreSedeId: string | null
    acquistoCategoria: string | null
    valoreComplessivo: number | null
    righe: { descrizione: string; coloreFinitura: string | null; quantita: number }[]
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
      stato: 'da_acquistare',
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

  const righe = fields.righe.filter((r) => r.descrizione.trim() && r.quantita > 0)
  if (righe.length > 0) {
    const { error: righeErr } = await supabase.from('lavoro_satellite_articolo').insert(
      righe.map((r) => ({
        satellite_id: data.id,
        descrizione: r.descrizione,
        colore_finitura: r.coloreFinitura,
        quantita: r.quantita,
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

export async function avanzaStatoOrdine(satelliteId: string, lavoroId: string, nuovoStato: StatoAcquisti): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase.from('lavoro_satellite').update({ stato: nuovoStato }).eq('id', satelliteId)

  if (error) {
    console.error('avanzaStatoOrdine: update fallito', error)
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

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'costruzione', stato: 'da_iniziare' })
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

export async function aggiornaDescrizioneCostruzione(
  satelliteId: string,
  lavoroId: string,
  descrizioneLibera: string | null,
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({ descrizione_libera: descrizioneLibera })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaDescrizioneCostruzione: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// da_iniziare -> in_corso imposta data_inizio=now(); in_corso -> completata imposta
// data_fine=now() — tracciamento automatico del tempo trascorso richiesto dallo schema.
export async function avanzaStatoCostruzione(
  satelliteId: string,
  lavoroId: string,
  nuovoStato: 'in_corso' | 'completata',
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const update: { stato: 'in_corso' | 'completata'; data_inizio?: string; data_fine?: string } = { stato: nuovoStato }
  if (nuovoStato === 'in_corso') update.data_inizio = new Date().toISOString()
  if (nuovoStato === 'completata') update.data_fine = new Date().toISOString()

  const { error } = await supabase.from('lavoro_satellite').update(update).eq('id', satelliteId)

  if (error) {
    console.error('avanzaStatoCostruzione: update fallito', error)
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
