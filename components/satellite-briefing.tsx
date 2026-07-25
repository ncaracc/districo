'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaBriefing } from '@/lib/lavori/satelliti'
import { SatelliteAllegati } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

function aDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SatelliteBriefing({
  satellite,
  lavoroId,
  allegati,
  isOwner,
}: {
  satellite: Satellite
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState(aDatetimeLocal(satellite.data_appuntamento))
  const [descrizione, setDescrizione] = useState(satellite.descrizione ?? '')
  const [concluso, setConcluso] = useState(satellite.concluso)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    const result = await aggiornaBriefing(satellite.id, lavoroId, {
      data: data ? new Date(data).toISOString() : null,
      descrizione: descrizione.trim() || null,
      concluso,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setSalvato(true)
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${concluso ? 'bg-green-500' : 'bg-red-500'}`} />
          Briefing
        </p>
      </div>

      {isOwner ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="briefing-data" className="mb-1 block text-xs font-medium text-gray-700">
              Data
            </label>
            <input
              id="briefing-data"
              type="datetime-local"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={inputClass()}
            />
          </div>

          <div>
            <label htmlFor="briefing-descrizione" className="mb-1 block text-xs font-medium text-gray-700">
              Descrizione <span className="text-gray-400">(opz.)</span>
            </label>
            <textarea
              id="briefing-descrizione"
              rows={4}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className={inputClass()}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={concluso}
              onChange={(e) => setConcluso(e.target.checked)}
              className="accent-primary"
            />
            Concluso
          </label>

          {errore && <p className="text-xs text-red-600">{errore}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSalva}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio…' : 'Salva'}
            </button>
            {salvato && <span className="text-xs text-gray-500">Salvato</span>}
          </div>

          <SatelliteAllegati satelliteId={satellite.id} lavoroId={lavoroId} allegati={allegati} isOwner={isOwner} />
        </div>
      ) : (
        <div className="space-y-1 text-sm text-gray-700">
          {satellite.data_appuntamento && <p>{new Date(satellite.data_appuntamento).toLocaleString('it-IT')}</p>}
          {satellite.descrizione && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione}</p>}
          <SatelliteAllegati satelliteId={satellite.id} lavoroId={lavoroId} allegati={allegati} isOwner={isOwner} />
        </div>
      )}
    </div>
  )
}
