import { formattaGiorni, semaforoKpi, type KpiDurate, type SemaforoKpi } from '@/lib/lavori/kpi'

// Il semaforo colora solo il numero (mai uno sfondo pieno o un pallino
// decorativo) — coerente con la palette B&W dell'app, dove il colore resta
// riservato al giudizio sullo stato, applicato nel modo più minimale possibile.
const TEXT_COLOR: Record<SemaforoKpi, string> = {
  verde: 'text-green-600',
  giallo: 'text-yellow-700',
  rosso: 'text-red-600',
  neutro: 'text-gray-900',
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

// Card confrontate con il target dell'artigiano — l'unico elemento colorato è
// il numero stesso (nessun pallino, nessuno sfondo pieno), coerente con la
// palette B&W dell'app: il colore resta riservato al giudizio sullo stato,
// applicato nel modo più minimale possibile.
export function KpiDurateDashboard({ kpi, target }: { kpi: KpiDurate | null; target: Target }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {VOCI.map((v) => {
        const media = kpi ? (kpi[v.chiave] as number | null) : null
        const campione = kpi ? (kpi[v.campioneChiave] as number) : 0
        const targetGiorni = target[v.targetChiave]
        const stato = semaforoKpi(media, campione, targetGiorni)
        return (
          <div key={v.chiave} className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{v.label}</p>
            <p className={`mt-1 text-2xl font-medium ${TEXT_COLOR[stato]}`}>
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
