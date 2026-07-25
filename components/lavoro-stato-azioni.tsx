'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { segnaLavoroStato } from '@/lib/lavori/actions'

export function LavoroStatoAzioni({ lavoroId }: { lavoroId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accettato' | 'rifiutato' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleClick(nuovoStato: 'accettato' | 'rifiutato') {
    setLoading(nuovoStato)
    setErrore(null)
    const result = await segnaLavoroStato(lavoroId, nuovoStato)
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
          onClick={() => handleClick('accettato')}
          disabled={loading !== null}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading === 'accettato' ? 'Salvataggio…' : 'Segna come accettato'}
        </button>
        <button
          type="button"
          onClick={() => handleClick('rifiutato')}
          disabled={loading !== null}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading === 'rifiutato' ? 'Salvataggio…' : 'Segna come rifiutato'}
        </button>
      </div>
      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}
    </div>
  )
}
