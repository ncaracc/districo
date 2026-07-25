'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaAppuntamento } from '@/lib/lavori/satelliti'
import type { SottotipoAppuntamento } from '@/lib/lavori/satelliti-meta'

export function SatelliteNuovoAppuntamento({ lavoroId }: { lavoroId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<SottotipoAppuntamento | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleClick(sottotipo: SottotipoAppuntamento) {
    setLoading(sottotipo)
    setErrore(null)
    const result = await creaAppuntamento(lavoroId, sottotipo)
    setLoading(null)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleClick('verifica_misure')}
          disabled={loading !== null}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading === 'verifica_misure' ? 'Creazione…' : '+ Verifica misure'}
        </button>
        <button
          type="button"
          onClick={() => handleClick('montaggio')}
          disabled={loading !== null}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading === 'montaggio' ? 'Creazione…' : '+ Montaggio'}
        </button>
      </div>
      {errore && <p className="mt-1 text-xs text-red-600">{errore}</p>}
    </div>
  )
}
