'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { riapriLavoro } from '@/lib/lavori/actions'

export function LavoroRiapri({
  lavoroId,
  statoAttuale,
}: {
  lavoroId: string
  statoAttuale: 'completato' | 'rifiutato'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleClick() {
    if (!window.confirm('Riaprire questo lavoro?')) return

    setLoading(true)
    setErrore(null)
    const result = await riapriLavoro(lavoroId, statoAttuale)
    setLoading(false)

    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? 'Riapertura…' : 'Riapri lavoro'}
      </button>
      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}
    </div>
  )
}
