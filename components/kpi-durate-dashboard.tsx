import { formattaGiorni, semaforoKpi, type KpiDurate, type SemaforoKpi } from '@/lib/lavori/kpi'

const DOT_COLOR: Record<SemaforoKpi, string> = {
  verde: 'bg-green-500',
  giallo: 'bg-yellow-500',
  rosso: 'bg-red-500',
  neutro: 'bg-gray-300',
}

const VOCI: {
  chiave: keyof KpiDurate
  campioneChiave: keyof KpiDurate
  label: string
  targetChiave: 'target_preventivo_giorni' | 'target_progetto_giorni' | 'target_produzione_giorni' | 'target_montaggio_giorni'
}[] = [
  { chiave: 'tempo_preventivazione_giorni', campioneChiave: 'tempo_preventivazione_campione', label: 'Tempo di preventivazione', targetChiave: 'target_preventivo_giorni' },
  { chiave: 'tempo_progetto_giorni', campioneChiave: 'tempo_progetto_campione', label: 'Tempo di progetto', targetChiave: 'target_progetto_giorni' },
  { chiave: 'tempo_produzione_giorni', campioneChiave: 'tempo_produzione_campione', label: 'Accettazione → produzione', targetChiave: 'target_produzione_giorni' },
  { chiave: 'tempo_montaggio_giorni', campioneChiave: 'tempo_montaggio_campione', label: 'Durata montaggio', targetChiave: 'target_montaggio_giorni' },
]

type Target = {
  target_preventivo_giorni: number
  target_progetto_giorni: number
  target_produzione_giorni: number
  target_montaggio_giorni: number
}

// Card colorate confrontate con il target dell'artigiano — solo l'indicatore di
// stato è colorato (un pallino, stesso linguaggio dei semafori satellite),
// mai lo sfondo della card intera, per restare coerenti con la palette B&W
// dell'app (colori "a LED" riservati agli stati, mai decorativi).
export function KpiDurateDashboard({ kpi, target }: { kpi: KpiDurate | null; target: Target }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {VOCI.map((v) => {
        const media = kpi ? (kpi[v.chiave] as number | null) : null
        const campione = kpi ? (kpi[v.campioneChiave] as number) : 0
        const targetGiorni = target[v.targetChiave]
        const stato = semaforoKpi(media, campione, targetGiorni)
        return (
          <div key={v.chiave} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[stato]}`} />
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{v.label}</p>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {formattaGiorni(media, campione)}
              {campione > 0 && <span className="ml-1 text-sm font-normal text-gray-500">giorni</span>}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              {campione === 0 ? 'Dati insufficienti' : `Obiettivo: ${targetGiorni} giorni`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
