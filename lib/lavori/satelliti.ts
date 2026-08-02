'use server'

// Ogni azione qui sotto invalida sia /lavori/[id] sia /lavori: la dashboard
// mostra i conteggi rosso/giallo/verde calcolati da lavori_dashboard(), che
// dipendono dagli stessi satelliti — senza invalidare anche /lavori la cache
// router di Next.js può continuare a mostrare i conteggi precedenti al
// cambio di stato (bug scoperto in produzione, vedi CLAUDE.md).
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  generaNuovaRevisione,
  type SottotipoAppuntamento,
  type StatoAcquisti,
  type StatoRevisionabile,
  type TipoRevisionabile,
} from '@/lib/lavori/satelliti-meta'
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
export async function creaProgetto(lavoroId: string): Promise<CreazioneResult> {
  const supabase = await createClient()

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'progetto', stato: 'in_preparazione' })
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

// Imposta lo stato di un satellite "revisionabile" (progetto/campione — il
// Preventivo non ne fa più parte dalla revisione satelliti del 1/8, vedi
// impostaPreventivoDecisione più sotto). Se il nuovo stato è quello che
// richiede una nuova revisione (necessaria_revisione per progetto,
// necessario_nuovo_campione per campione), crea prima la nuova riga
// collegata via revisione_di (stato iniziale in_preparazione, stessa serie se campione),
// poi aggiorna la riga corrente — se l'aggiornamento fallisse, la nuova riga appena creata
// viene rimossa (stesso principio di rollback già in uso in creaLavoro/creaSatellite).
export async function impostaStatoRevisionabile(
  satelliteId: string,
  lavoroId: string,
  tipo: TipoRevisionabile,
  nuovoStato: StatoRevisionabile,
  serie: string | null,
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  if (generaNuovaRevisione(tipo, nuovoStato)) {
    const { data: nuova, error: insErr } = await supabase
      .from('lavoro_satellite')
      .insert({
        lavoro_id: lavoroId,
        tipo,
        stato: 'in_preparazione',
        revisione_di: satelliteId,
        serie: tipo === 'campione' ? serie : null,
      })
      .select('id')
      .single()

    if (insErr || !nuova) {
      console.error('impostaStatoRevisionabile: creazione nuova revisione fallita', insErr)
      return { ok: false, error: 'Errore nella creazione della nuova revisione, riprova' }
    }

    const { error: updErr } = await supabase
      .from('lavoro_satellite')
      .update({ stato: nuovoStato })
      .eq('id', satelliteId)

    if (updErr) {
      console.error('impostaStatoRevisionabile: aggiornamento stato precedente fallito', updErr)
      await supabase.from('lavoro_satellite').delete().eq('id', nuova.id)
      return { ok: false, error: 'Errore nel salvataggio, riprova' }
    }
  } else {
    const updatePayload: { stato: StatoRevisionabile; data_presentazione?: string } = { stato: nuovoStato }

    // data_presentazione: valorizzata una sola volta, alla prima transizione a
    // "presentato" per Progetto — mai più sovrascritta da transizioni
    // successive sulla stessa riga (es. necessaria_revisione, "Annulla
    // accettazione" che riporta da accettato a presentato), per non perdere
    // il dato storico usato dal KPI "tempo di progetto" (vedi CLAUDE.md,
    // diagnosi del 26/7). Letta prima di scrivere: il client Supabase non
    // supporta coalesce(colonna, now()) diretto nel payload di update.
    if (tipo === 'progetto' && nuovoStato === 'presentato') {
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
      console.error('impostaStatoRevisionabile: aggiornamento stato fallito', error)
      return { ok: false, error: 'Errore nel salvataggio, riprova' }
    }
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

export async function aggiornaDescrizioneCampione(
  satelliteId: string,
  lavoroId: string,
  descrizione: string | null,
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({ descrizione })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaDescrizioneCampione: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

export async function creaNuovaSerieCampione(lavoroId: string, serie: string): Promise<CreazioneResult> {
  const supabase = await createClient()
  const nomeSerie = serie.trim()

  if (!nomeSerie) {
    return { ok: false, error: 'Il nome della serie è obbligatorio' }
  }

  const bloccato = await assertLavoroModificabile(supabase, lavoroId)
  if (bloccato) return bloccato

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'campione', stato: 'in_preparazione', serie: nomeSerie })
    .select('id')
    .single()

  if (error) {
    console.error('creaNuovaSerieCampione: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione della serie, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true, id: data.id }
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

export async function aggiornaNoleggio(
  satelliteId: string,
  lavoroId: string,
  fields: {
    dataDa: string | null
    dataA: string | null
    costo: number | null
    prenotazioneEffettuata: boolean
  },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      data_da: fields.dataDa,
      data_a: fields.dataA,
      costo: fields.costo,
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
