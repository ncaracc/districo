'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { segnaLavoroAccettato } from '@/lib/lavori/actions'

export function SegnaAccettatoButton({ lavoroId }: { lavoroId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setErrore(null)
    const result = await segnaLavoroAccettato(lavoroId)
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
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio…' : 'Segna lavoro accettato'}
      </button>
      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}
    </div>
  )
}
