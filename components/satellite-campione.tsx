'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RevisionabileChain } from '@/components/satellite-revisionabile'
import { creaNuovaSerieCampione } from '@/lib/lavori/satelliti'
import { costruisciCatena, raggruppaPerSerie, type Satellite, type SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

export function SatelliteCampione({
  satelliti,
  statoEffettivoById,
  allegatiById,
  isOwner,
  lavoroId,
}: {
  satelliti: Satellite[]
  statoEffettivoById: Record<string, string>
  allegatiById: Record<string, SatelliteAllegato[]>
  isOwner: boolean
  lavoroId: string
}) {
  const router = useRouter()
  const [nuovaSerie, setNuovaSerie] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const serie = raggruppaPerSerie(satelliti)

  async function handleCreaSerie() {
    setLoading(true)
    setErrore(null)
    const result = await creaNuovaSerieCampione(lavoroId, nuovaSerie)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setNuovaSerie('')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Campioni</h2>

      {serie.map((g) => (
        <RevisionabileChain
          key={g.serie}
          tipo="campione"
          titolo={g.serie}
          catena={[...costruisciCatena(g.satelliti)].reverse()}
          statoEffettivoById={statoEffettivoById}
          allegatiById={allegatiById}
          isOwner={isOwner}
          lavoroId={lavoroId}
          mostraDescrizione
        />
      ))}

      {isOwner && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="nuova-serie" className="mb-1 block text-xs font-medium text-gray-700">
              Nuova serie di campione
            </label>
            <input
              id="nuova-serie"
              value={nuovaSerie}
              onChange={(e) => setNuovaSerie(e.target.value)}
              placeholder="Es. Campione maniglie"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={handleCreaSerie}
            disabled={loading || !nuovaSerie.trim()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creazione…' : '+ Aggiungi'}
          </button>
        </div>
      )}
      {errore && <p className="text-xs text-red-600">{errore}</p>}
    </div>
  )
}
