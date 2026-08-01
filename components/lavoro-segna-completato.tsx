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
    <div
      className={`rounded-lg border px-4 py-3 ${pronto ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
    >
      <p className={`mb-2 text-sm font-medium ${pronto ? 'text-green-800' : 'text-gray-800'}`}>
        {pronto ? 'Pronto per il montaggio' : 'Non ancora pronto per il montaggio'}
      </p>
      {!pronto && mancanti.length > 0 && (
        <p className="mb-2 text-xs text-gray-600">
          Satelliti ancora da completare: {mancanti.join(', ')}
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
