import { costruisciCatena, type Satellite, type SatelliteAllegato, type SatelliteArticolo } from '@/lib/lavori/satelliti-meta'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): estrae
// il blocco di data-fetching che prima viveva solo dentro
// app/(app)/lavori/[id]/page.tsx (una singola chiamata) — ora condiviso
// anche dalle nuove route @modal/(.)attivita/[attivitaId] e
// attivita/[attivitaId] (pagina piena di fallback), che devono costruire lo
// stesso identico contenuto satellite mostrato dalla tabella, ma raggiunte
// da un URL diretto senza passare da page.tsx. Nessuna ottimizzazione
// "fetch solo il satellite richiesto": lavoro_satellite per un Lavoro è
// sempre una tabella piccola (poche decine di righe al massimo) e più tipi
// (Preventivo/Chiusura) hanno comunque bisogno dell'intero insieme
// (catena di revisioni, riepilogo costi aggregato) — rifare la stessa
// query completa in ogni route è la scelta più semplice e priva di rischio
// di divergenza, non una query via via più larga.
export type DatiLavoroSatelliti = {
  lavoro: {
    id: string
    titolo: string
    descrizione: string | null
    stato: string
    cliente_id: string
    accettato_at: string | null
    completato_at: string | null
    data_lavoro: string | null
    indirizzo: string | null
    civico: string | null
    cap: string | null
    citta: string | null
    sigla_provincia: string | null
    nazione: string | null
  }
  clienteNome: string | null
  isOwner: boolean
  completato: boolean
  // Lavoro completato = sola lettura su tutti i satelliti (vedi CLAUDE.md):
  // isOwnerEffettivo riusa lo stesso meccanismo di sola lettura già previsto
  // per il ruolo "ospite" (isOwner=false) in ogni componente satellite.
  isOwnerEffettivo: boolean
  satelliti: Satellite[]
  allegatiById: Record<string, SatelliteAllegato[]>
  righePerSatellite: Record<string, SatelliteArticolo[]>
  labelPerSedeId: Map<string, string>
  categorieAcquisto: { id: string; nome: string }[]
  costiSostenuti: number
  // Preventivo "rilevante" (corrente, non superato da una revisione più
  // recente) — stessa logica già usata dal fix Valore Dashboard (0033) e dal
  // KPI 2 (0034). preventivoCatena è l'intera catena (più recente -> più
  // vecchia), serve a SatellitePreventivo per l'eventuale storico.
  valorePreventivo: number | null
  preventivoCatena: Satellite[]
  progettoEsiste: boolean
  preventivoEsiste: boolean
  chiusuraEsiste: boolean
}

export async function caricaDatiLavoroSatelliti(
  supabase: SupabaseServerClient,
  lavoroId: string,
): Promise<DatiLavoroSatelliti | null> {
  const { data: lavoro } = await supabase
    .from('lavoro')
    .select(
      'id, titolo, descrizione, stato, cliente_id, accettato_at, completato_at, data_lavoro, indirizzo, civico, cap, citta, sigla_provincia, nazione',
    )
    .eq('id', lavoroId)
    .maybeSingle()

  if (!lavoro) return null

  const [{ data: isOwner }, { data: satellitiGrezzi }, { data: cliente }] = await Promise.all([
    supabase.rpc('is_owner_del_lavoro', { p_lavoro_id: lavoroId }),
    supabase.from('lavoro_satellite').select('*').eq('lavoro_id', lavoroId),
    supabase.from('cliente').select('nome').eq('id', lavoro.cliente_id).maybeSingle(),
  ])

  const satelliti: Satellite[] = satellitiGrezzi ?? []
  const satelliteIds = satelliti.map((s) => s.id)

  const [{ data: allegatiGrezzi }, { data: righeGrezze }] = await Promise.all([
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_allegato').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteAllegato[] }),
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_articolo').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteArticolo[] }),
  ])

  const allegati: SatelliteAllegato[] = allegatiGrezzi ?? []
  const allegatiById: Record<string, SatelliteAllegato[]> = {}
  for (const a of allegati) {
    ;(allegatiById[a.satellite_id] ??= []).push(a)
  }

  const righe: SatelliteArticolo[] = righeGrezze ?? []
  const righePerSatellite: Record<string, SatelliteArticolo[]> = {}
  for (const r of righe) {
    ;(righePerSatellite[r.satellite_id] ??= []).push(r)
  }

  const acquistiSatelliti = satelliti.filter((s) => s.tipo === 'acquisti')
  const noleggioSatelliti = satelliti.filter((s) => s.tipo === 'noleggio')

  // Riepilogo costi sostenuti (Chiusura Lavoro, vedi CLAUDE.md): solo
  // Acquisti già ordinato=true e Noleggi già prenotazione_effettuata=true —
  // le voci non confermate non entrano nel riepilogo.
  const costiSostenuti = satelliti.reduce((somma, s) => {
    if (s.tipo === 'acquisti' && s.ordinato) return somma + (s.valore_complessivo ?? 0)
    if (s.tipo === 'noleggio' && s.prenotazione_effettuata) return somma + (s.costo ?? 0)
    return somma
  }, 0)

  const fornitoreSedeIds = [
    ...new Set([...acquistiSatelliti, ...noleggioSatelliti].map((s) => s.fornitore_sede_id).filter((v): v is string => !!v)),
  ]
  const { data: fornitoreSedi } =
    fornitoreSedeIds.length > 0
      ? await supabase.from('fornitore_sede').select('id, fornitore_id, nome, citta').in('id', fornitoreSedeIds)
      : { data: [] }

  const fornitoreIds = [...new Set((fornitoreSedi ?? []).map((s) => s.fornitore_id))]
  const { data: fornitori } =
    fornitoreIds.length > 0 ? await supabase.from('fornitore').select('id, ragione_sociale').in('id', fornitoreIds) : { data: [] }

  const ragioneSocialePerFornitoreId = new Map((fornitori ?? []).map((f) => [f.id, f.ragione_sociale]))
  const labelPerSedeId = new Map(
    (fornitoreSedi ?? []).map((s) => [
      s.id,
      `${ragioneSocialePerFornitoreId.get(s.fornitore_id) ?? '—'} — ${s.nome}${s.citta ? ` (${s.citta})` : ''}`,
    ]),
  )

  // Categorie acquisto libere dell'artigiano (Profilo/Impostazioni), per il
  // form "Acquisto" nel modale "Aggiungi attività" e per la vista Acquisto.
  const { data: categorieAcquisto } = isOwner ? await supabase.from('categoria_acquisto').select('id, nome').order('nome') : { data: [] }

  const completato = lavoro.stato === 'completato'
  const isOwnerEffettivo = !!isOwner && !completato

  const preventivoSatelliti = satelliti.filter((s) => s.tipo === 'preventivo')
  const preventivoCatena = preventivoSatelliti.length > 0 ? [...costruisciCatena(preventivoSatelliti)].reverse() : []
  const preventivoCorrente = preventivoCatena[0] ?? null
  const valorePreventivo = preventivoCorrente?.valore_complessivo ?? null

  return {
    lavoro,
    clienteNome: cliente?.nome ?? null,
    isOwner: !!isOwner,
    completato,
    isOwnerEffettivo,
    satelliti,
    allegatiById,
    righePerSatellite,
    labelPerSedeId,
    categorieAcquisto: categorieAcquisto ?? [],
    costiSostenuti,
    valorePreventivo,
    preventivoCatena,
    progettoEsiste: satelliti.some((s) => s.tipo === 'progetto'),
    preventivoEsiste: preventivoSatelliti.length > 0,
    chiusuraEsiste: satelliti.some((s) => s.tipo === 'chiusura'),
  }
}
