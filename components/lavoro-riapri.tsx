'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { riapriLavoro } from '@/lib/lavori/actions'

const LABEL: Record<'accettato' | 'completato' | 'rifiutato', string> = {
  accettato: 'Riporta a opportunità',
  completato: 'Riapri lavoro',
  rifiutato: 'Riapri lavoro',
}

const CONFERMA: Record<'accettato' | 'completato' | 'rifiutato', string> = {
  accettato:
    'Riportare il lavoro a "opportunità"? I satelliti di esecuzione già creati restano salvati, ma non saranno visibili finché il lavoro non torna accettato.',
  completato: 'Riaprire questo lavoro?',
  rifiutato: 'Riaprire questo lavoro?',
}

export function LavoroRiapri({
  lavoroId,
  statoAttuale,
}: {
  lavoroId: string
  statoAttuale: 'accettato' | 'completato' | 'rifiutato'
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleClick() {
    if (!window.confirm(CONFERMA[statoAttuale])) return

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
        {loading ? 'Salvataggio…' : LABEL[statoAttuale]}
      </button>
      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}
    </div>
  )
}
