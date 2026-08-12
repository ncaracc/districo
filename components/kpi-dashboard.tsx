import { formattaGiorni, type KpiDashboard } from '@/lib/lavori/kpi'
import { formattaValuta } from '@/lib/formato-valuta'

// Sprint E (2026-08-03): sostituisce KpiDurateDashboard/KpiDurateNeutro.
// Nessun semaforo/target in questo giro (il prompt non lo richiede per
// nessuno dei 4 nuovi KPI) — card uniformi, nessun colore. KPI 1/2 sono
// conteggio/somma puntuali (uno zero reale è una risposta valida, mai
// "Dati insufficienti"); KPI 3/4 sono medie rolling e usano lo stesso
// pattern "Dati insufficienti" già in uso per i vecchi KPI quando
// campione=0.
//
// KPI 2 rinominato "Importi da incassare" il 2026-08-13 (vedi CLAUDE.md,
// restyling calcoli economici Chiusura Lavoro) — nuova formula (Valore
// complessivo - Acconti complessivi per Lavoro accettato, sommato sul
// perimetro). Nome del campo SQL restituito (`importo_lavori_accettati`)
// NON rinominato — stesso principio già seguito per `valore_preventivo_
// accettato` il 2/8: solo un'etichetta interna, l'unico cambio realmente
// visibile è qui.
export function KpiDashboardCards({ kpi }: { kpi: KpiDashboard | null }) {
  const lavoriInCorso = kpi?.lavori_in_corso ?? 0
  const importoDaIncassare = kpi?.importo_lavori_accettati ?? 0
  const tempoPreventivo = kpi?.tempo_preventivo_giorni ?? null
  const campionePreventivo = kpi?.tempo_preventivo_campione ?? 0
  const tempoCompletamento = kpi?.tempo_completamento_giorni ?? null
  const campioneCompletamento = kpi?.tempo_completamento_campione ?? 0

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Totale lavori in corso</p>
        <p className="mt-1 text-2xl font-medium text-gray-900">{lavoriInCorso}</p>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Importi da incassare</p>
        <p className="mt-1 text-2xl font-medium text-gray-900">{formattaValuta(importoDaIncassare)}</p>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tempo medio preventivo</p>
        <p className="mt-1 text-2xl font-medium text-gray-900">
          {formattaGiorni(tempoPreventivo, campionePreventivo)}
          {campionePreventivo > 0 && <span className="ml-1 text-sm font-normal text-gray-500">giorni</span>}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">{campionePreventivo === 0 ? 'Dati insufficienti' : ' '}</p>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tempo medio completamento</p>
        <p className="mt-1 text-2xl font-medium text-gray-900">
          {formattaGiorni(tempoCompletamento, campioneCompletamento)}
          {campioneCompletamento > 0 && <span className="ml-1 text-sm font-normal text-gray-500">giorni</span>}
        </p>
        <p className="mt-0.5 text-xs text-gray-400">{campioneCompletamento === 0 ? 'Dati insufficienti' : ' '}</p>
      </div>
    </div>
  )
}
