'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaNoleggio } from '@/lib/lavori/satelliti'
import type { Satellite } from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

function aDateLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function SatelliteNoleggio({
  satellite,
  lavoroId,
  isOwner,
}: {
  satellite: Satellite
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [dataDa, setDataDa] = useState(aDateLocal(satellite.data_da))
  const [dataA, setDataA] = useState(aDateLocal(satellite.data_a))
  const [costo, setCosto] = useState(satellite.costo != null ? String(satellite.costo) : '')
  const [prenotazioneEffettuata, setPrenotazioneEffettuata] = useState(satellite.prenotazione_effettuata)
  const [nonNecessario, setNonNecessario] = useState(satellite.non_necessario)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const verde = prenotazioneEffettuata || nonNecessario

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaNoleggio(satellite.id, lavoroId, {
      dataDa: dataDa || null,
      dataA: dataA || null,
      costo: costo ? Number(costo) : null,
      prenotazioneEffettuata,
      nonNecessario,
    })
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${verde ? 'bg-green-500' : 'bg-red-500'}`} />
        <p className="text-sm font-medium text-gray-900">Noleggio</p>
      </div>

      {isOwner ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="noleggio-da" className="mb-1 block text-xs font-medium text-gray-700">
                Da
              </label>
              <input id="noleggio-da" type="date" value={dataDa} onChange={(e) => setDataDa(e.target.value)} className={inputClass()} />
            </div>
            <div>
              <label htmlFor="noleggio-a" className="mb-1 block text-xs font-medium text-gray-700">
                A
              </label>
              <input id="noleggio-a" type="date" value={dataA} onChange={(e) => setDataA(e.target.value)} className={inputClass()} />
            </div>
          </div>

          <div>
            <label htmlFor="noleggio-costo" className="mb-1 block text-xs font-medium text-gray-700">
              Costo
            </label>
            <input
              id="noleggio-costo"
              type="number"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              className={inputClass()}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={prenotazioneEffettuata}
              onChange={(e) => setPrenotazioneEffettuata(e.target.checked)}
              className="accent-primary"
            />
            Prenotazione effettuata
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={nonNecessario}
              onChange={(e) => setNonNecessario(e.target.checked)}
              className="accent-primary"
            />
            Non necessario
          </label>

          {errore && <p className="text-xs text-red-600">{errore}</p>}
          <button
            type="button"
            onClick={handleSalva}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      ) : (
        <div className="space-y-1 text-sm text-gray-700">
          {(satellite.data_da || satellite.data_a) && (
            <p>
              {satellite.data_da ? new Date(satellite.data_da).toLocaleDateString('it-IT') : '—'} →{' '}
              {satellite.data_a ? new Date(satellite.data_a).toLocaleDateString('it-IT') : '—'}
            </p>
          )}
          {satellite.costo != null && <p>€ {satellite.costo.toFixed(2)}</p>}
        </div>
      )}
    </div>
  )
}
