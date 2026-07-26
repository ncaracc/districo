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
  statoInizialeOrdine,
  type SottotipoAppuntamento,
  type StatoOrdine,
  type StatoRevisionabile,
  type TipoOrdine,
  type TipoRevisionabile,
} from '@/lib/lavori/satelliti-meta'

type AzioneResult = { ok: true } | { ok: false; error: string }
type CreazioneResult = { ok: true; id: string } | { ok: false; error: string }

export async function aggiornaAppuntamento(
  satelliteId: string,
  lavoroId: string,
  fields: { data: string | null; descrizione: string | null; concluso: boolean; nonNecessario: boolean },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      data_appuntamento: fields.data,
      descrizione: fields.descrizione,
      concluso: fields.concluso,
      non_necessario: fields.nonNecessario,
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

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'appuntamento', tipo_appuntamento: sottotipo, concluso: false, non_necessario: false })
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

// Imposta lo stato di un satellite "revisionabile" (preventivo/progetto/campione).
// Se il nuovo stato è quello che richiede una nuova revisione (necessaria_revisione per
// preventivo/progetto, necessario_nuovo_campione per campione), crea prima la nuova riga
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
    const { error } = await supabase.from('lavoro_satellite').update({ stato: nuovoStato }).eq('id', satelliteId)

    if (error) {
      console.error('impostaStatoRevisionabile: aggiornamento stato fallito', error)
      return { ok: false, error: 'Errore nel salvataggio, riprova' }
    }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

export async function aggiornaValorePreventivo(
  satelliteId: string,
  lavoroId: string,
  valore: number | null,
): Promise<AzioneResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({ valore_complessivo: valore })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaValorePreventivo: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
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

export async function creaNuovaSerieCampione(lavoroId: string, serie: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const nomeSerie = serie.trim()

  if (!nomeSerie) {
    return { ok: false, error: 'Il nome della serie è obbligatorio' }
  }

  const { error } = await supabase
    .from('lavoro_satellite')
    .insert({ lavoro_id: lavoroId, tipo: 'campione', stato: 'in_preparazione', serie: nomeSerie })

  if (error) {
    console.error('creaNuovaSerieCampione: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione della serie, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

// --- Acquisti / Lavorazione esterna ---
// Più istanze dello stesso tipo sullo stesso Lavoro sono ammesse (più ordini
// successivi), nessun vincolo di unicità nello schema.
export async function creaOrdine(
  lavoroId: string,
  tipo: TipoOrdine,
  fields: {
    fornitoreSedeId: string | null
    acquistoCategoria: 'materiale' | 'ferramenta' | null
    valoreComplessivo: number | null
    righe: { descrizione: string; coloreFinitura: string | null; quantita: number }[]
  },
): Promise<CreazioneResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({
      lavoro_id: lavoroId,
      tipo,
      stato: statoInizialeOrdine(tipo),
      fornitore_sede_id: fields.fornitoreSedeId,
      acquisto_categoria: tipo === 'acquisti' ? fields.acquistoCategoria : null,
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

export async function avanzaStatoOrdine(satelliteId: string, lavoroId: string, nuovoStato: StatoOrdine): Promise<AzioneResult> {
  const supabase = await createClient()
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
export async function aggiornaDescrizioneCostruzione(
  satelliteId: string,
  lavoroId: string,
  descrizioneLibera: string | null,
): Promise<AzioneResult> {
  const supabase = await createClient()
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

// --- Noleggio ---
export async function aggiornaNoleggio(
  satelliteId: string,
  lavoroId: string,
  fields: {
    dataDa: string | null
    dataA: string | null
    costo: number | null
    prenotazioneEffettuata: boolean
    nonNecessario: boolean
  },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      data_da: fields.dataDa,
      data_a: fields.dataA,
      costo: fields.costo,
      prenotazione_effettuata: fields.prenotazioneEffettuata,
      non_necessario: fields.nonNecessario,
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
