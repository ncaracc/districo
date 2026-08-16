import { formattaGiorni, type KpiDashboard } from '@/lib/lavori/kpi'
import { formattaValuta } from '@/lib/formato-valuta'
import { FILTRO_LABEL_CONTEGGIO, type FiltroLavori } from '@/lib/lavori/lista-filtri'

// Sprint E (2026-08-03): sostituisce KpiDurateDashboard/KpiDurateNeutro.
//
// KPI 2 rinominato "Importi da incassare" il 2026-08-13 (vedi CLAUDE.md,
// restyling calcoli economici Chiusura Lavoro).
//
// Unificazione Dashboard/Conclusi (2026-08-16, vedi CLAUDE.md): i 4 KPI
// storici erano pensati per il solo filtro "In corso" (Opportunità +
// Accettato) — decisione presa con l'utente in sessione su quali mostrare
// per gli altri filtri, invece di lasciarli fissi o inventarne di nuovi
// senza conferma:
//   - "In corso"/"Tutti": i 4 KPI di sempre, invariati.
//   - "Conclusi": "Importi da incassare" -> "Valore totale generato" (nuovo,
//     migration 0049, stessa formula di "Valore complessivo" di Chiusura
//     Lavoro ma sommata sui soli Lavori completati); tempo medio
//     preventivo/completamento restano (entrambi pertinenti: il primo
//     include già accettati e rifiutati, il secondo è per definizione solo
//     sui completati).
//   - "Rifiutati": un solo KPI, il conteggio — gli altri 3 non hanno un
//     valore sensato per questo sottoinsieme (nessun importo da incassare
//     né generato, "tempo medio" mescolerebbe la media globale con un
//     'sottoinsieme' che la RPC non isola separatamente) e sono quindi
//     nascosti invece di mostrare uno zero/N.D. fuorviante.
// Il 1° KPI (conteggio) non arriva più da kpi_dashboard() ma dalla
// lunghezza della lista già caricata da lavori_dashboard() per lo stesso
// filtro — stesso identico numero, nessuna query in più.
type Card = { label: string; value: React.ReactNode; nota?: string }

const GRID_PER_COLONNE: Record<number, string> = {
  1: 'grid-cols-2 sm:grid-cols-1',
  2: 'grid-cols-2 sm:grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
}

export function KpiDashboardCards({
  kpi,
  filtro,
  conteggio,
}: {
  kpi: KpiDashboard | null
  filtro: FiltroLavori
  conteggio: number
}) {
  const importoDaIncassare = kpi?.importo_lavori_accettati ?? 0
  const valoreTotaleGenerato = kpi?.valore_totale_completati ?? 0
  const tempoPreventivo = kpi?.tempo_preventivo_giorni ?? null
  const campionePreventivo = kpi?.tempo_preventivo_campione ?? 0
  const tempoCompletamento = kpi?.tempo_completamento_giorni ?? null
  const campioneCompletamento = kpi?.tempo_completamento_campione ?? 0

  const cards: Card[] = [{ label: FILTRO_LABEL_CONTEGGIO[filtro], value: conteggio }]

  if (filtro === 'in-corso' || filtro === 'tutti') {
    cards.push({ label: 'Importi da incassare', value: formattaValuta(importoDaIncassare) })
  } else if (filtro === 'conclusi') {
    cards.push({ label: 'Valore totale generato', value: formattaValuta(valoreTotaleGenerato) })
  }

  if (filtro !== 'rifiutati') {
    cards.push({
      label: 'Tempo medio preventivo',
      value: (
        <>
          {formattaGiorni(tempoPreventivo, campionePreventivo)}
          {campionePreventivo > 0 && <span className="ml-1 text-sm font-normal text-gray-500">giorni</span>}
        </>
      ),
      nota: campionePreventivo === 0 ? 'Dati insufficienti' : ' ',
    })
  }

  if (filtro === 'in-corso' || filtro === 'tutti' || filtro === 'conclusi') {
    cards.push({
      label: 'Tempo medio completamento',
      value: (
        <>
          {formattaGiorni(tempoCompletamento, campioneCompletamento)}
          {campioneCompletamento > 0 && <span className="ml-1 text-sm font-normal text-gray-500">giorni</span>}
        </>
      ),
      nota: campioneCompletamento === 0 ? 'Dati insufficienti' : ' ',
    })
  }

  return (
    <div className={`mb-8 grid gap-3 ${GRID_PER_COLONNE[cards.length] ?? GRID_PER_COLONNE[4]}`}>
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</p>
          <p className="mt-1 text-2xl font-medium text-gray-900">{c.value}</p>
          {c.nota !== undefined && <p className="mt-0.5 text-xs text-gray-400">{c.nota}</p>}
        </div>
      ))}
    </div>
  )
}
