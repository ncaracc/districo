'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  TIPI_CON_ARTICOLI,
  TIPI_CON_FORNITORE,
  TIPI_CON_REVISIONE,
  TIPI_CON_VALORE,
  type StatoSatellite,
  type TipoSatellite,
} from '@/lib/lavori/satelliti-meta'

type AzioneResult = { ok: true } | { ok: false; error: string }
type SatelliteResult = { ok: true; id: string } | { ok: false; error: string }

const STATO_INIZIALE: Record<TipoSatellite, StatoSatellite> = {
  appuntamento: 'fissato',
  preventivo: 'in_preparazione',
  progetto: 'in_preparazione',
  acquisto_materiale: 'da_acquistare',
  acquisto_ferramenta: 'da_acquistare',
  lavorazione_esterna: 'da_consegnare',
  campione: 'da_preparare',
}

export async function creaSatellite(
  lavoroId: string,
  fields: {
    tipo: TipoSatellite
    tipoAppuntamento?: string | null
    dataAppuntamento?: string | null
    revisioneDi?: string | null
    valoreComplessivo?: number | null
    fornitoreSedeId?: string | null
    descrizioneLibera?: string | null
    righe?: { descrizione: string; coloreFinitura: string | null; quantita: number }[]
  },
): Promise<SatelliteResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lavoro_satellite')
    .insert({
      lavoro_id: lavoroId,
      tipo: fields.tipo,
      stato: STATO_INIZIALE[fields.tipo],
      tipo_appuntamento: fields.tipo === 'appuntamento' ? fields.tipoAppuntamento || null : null,
      data_appuntamento: fields.tipo === 'appuntamento' ? fields.dataAppuntamento || null : null,
      revisione_di: TIPI_CON_REVISIONE.includes(fields.tipo) ? fields.revisioneDi || null : null,
      valore_complessivo: TIPI_CON_VALORE.includes(fields.tipo) ? fields.valoreComplessivo ?? null : null,
      fornitore_sede_id: TIPI_CON_FORNITORE.includes(fields.tipo) ? fields.fornitoreSedeId || null : null,
      descrizione_libera: fields.tipo === 'lavorazione_esterna' ? fields.descrizioneLibera || null : null,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('creaSatellite: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  const righe = TIPI_CON_ARTICOLI.includes(fields.tipo)
    ? (fields.righe ?? []).filter((r) => r.descrizione.trim() && r.quantita > 0)
    : []

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
      console.error('creaSatellite: insert righe fallito', righeErr)
      const admin = createAdminClient()
      await admin.from('lavoro_satellite').delete().eq('id', data.id)
      return { ok: false, error: 'Errore nel salvataggio degli articoli, riprova' }
    }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true, id: data.id }
}

export async function avanzaStatoSatellite(
  satelliteId: string,
  lavoroId: string,
  nuovoStato: StatoSatellite,
  nota?: string | null,
): Promise<AzioneResult> {
  const supabase = await createClient()
  const update: { stato: StatoSatellite; nota?: string | null } = { stato: nuovoStato }
  if (nota !== undefined) update.nota = nota

  const { error } = await supabase.from('lavoro_satellite').update(update).eq('id', satelliteId)

  if (error) {
    console.error('avanzaStatoSatellite: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}
