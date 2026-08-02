'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { eliminaLavoro } from '@/lib/lavori/actions'
import { IconaCestino } from '@/components/icons'

export function LavoroEliminaBottone({ lavoroId, titolo }: { lavoroId: string; titolo: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (
      !window.confirm(
        `Eliminare definitivamente il lavoro "${titolo}"? Tutte le attività e gli allegati collegati verranno cancellati. L'azione non è reversibile.`,
      )
    ) {
      return
    }

    setLoading(true)
    const result = await eliminaLavoro(lavoroId)
    setLoading(false)

    if (!result.ok) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label="Elimina lavoro"
      title="Elimina lavoro"
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <IconaCestino className="h-4 w-4" />
    </button>
  )
}
