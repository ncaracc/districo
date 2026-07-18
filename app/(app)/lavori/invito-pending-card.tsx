'use client'

import { useState, useTransition } from 'react'
import { accettaInvito, rifiutaInvito } from '@/lib/lavoro-artigiani/inviti'

export function InvitoPendingCard({
  id,
  lavoroTitolo,
  nomeInvitante,
}: {
  id: string
  lavoroTitolo: string
  nomeInvitante: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function accetta() {
    setError(null)
    startTransition(async () => {
      const result = await accettaInvito(id)
      if (!result.ok) setError(result.error)
    })
  }

  function rifiuta() {
    setError(null)
    startTransition(async () => {
      const result = await rifiutaInvito(id)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-sm text-gray-900">
        <strong>{nomeInvitante}</strong> ti ha invitato a collaborare al lavoro &ldquo;
        <strong>{lavoroTitolo}</strong>&rdquo;
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={accetta}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Accetta
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={rifiuta}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Rifiuta
        </button>
      </div>
    </div>
  )
}
