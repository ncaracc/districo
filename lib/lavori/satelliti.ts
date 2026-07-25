'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generaNuovaRevisione, type StatoRevisionabile, type TipoRevisionabile } from '@/lib/lavori/satelliti-meta'

type AzioneResult = { ok: true } | { ok: false; error: string }

export async function aggiornaBriefing(
  satelliteId: string,
  lavoroId: string,
  fields: { data: string | null; descrizione: string | null; concluso: boolean },
): Promise<AzioneResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lavoro_satellite')
    .update({
      data_appuntamento: fields.data,
      descrizione: fields.descrizione,
      concluso: fields.concluso,
    })
    .eq('id', satelliteId)

  if (error) {
    console.error('aggiornaBriefing: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
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
  return { ok: true }
}
