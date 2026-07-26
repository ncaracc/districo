import { formattaGiorni, type KpiDurate } from '@/lib/lavori/kpi'

const VOCI: { chiave: keyof KpiDurate; campioneChiave: keyof KpiDurate; label: string }[] = [
  { chiave: 'tempo_preventivazione_giorni', campioneChiave: 'tempo_preventivazione_campione', label: 'Tempo di preventivazione' },
  { chiave: 'tempo_progetto_giorni', campioneChiave: 'tempo_progetto_campione', label: 'Tempo di progetto' },
  { chiave: 'tempo_produzione_giorni', campioneChiave: 'tempo_produzione_campione', label: 'Accettazione → produzione' },
  { chiave: 'tempo_montaggio_giorni', campioneChiave: 'tempo_montaggio_campione', label: 'Durata montaggio' },
]

// Dato reale, senza colorazione: usato in "Lavori conclusi", dove i KPI sono
// una lettura storica e non un confronto con un obiettivo (quello è riservato
// alla Dashboard).
export function KpiDurateNeutro({ kpi }: { kpi: KpiDurate | null }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {VOCI.map((v) => {
        const media = kpi ? (kpi[v.chiave] as number | null) : null
        const campione = kpi ? (kpi[v.campioneChiave] as number) : 0
        return (
          <div key={v.chiave} className="rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{v.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formattaGiorni(media, campione)}
              {campione > 0 && <span className="ml-1 text-sm font-normal text-gray-500">giorni</span>}
            </p>
            {campione === 0 && <p className="mt-0.5 text-xs text-gray-400">Dati insufficienti</p>}
          </div>
        )
      })}
    </div>
  )
}
