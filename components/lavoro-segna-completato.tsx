'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completaLavoro } from '@/lib/lavori/actions'

export function LavoroSegnaCompletato({
  lavoroId,
  pronto,
  mancanti,
}: {
  lavoroId: string
  pronto: boolean
  mancanti: string[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setErrore(null)
    const result = await completaLavoro(lavoroId)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div>
      {!pronto && mancanti.length > 0 && (
        <p className="mb-2 text-xs text-gray-600">
          Attività ancora da completare: {mancanti.join(', ')}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !pronto}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio…' : 'Segna lavoro completato'}
      </button>
      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}
    </div>
  )
}
