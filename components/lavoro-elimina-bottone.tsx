'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { eliminaLavoro } from '@/lib/lavori/actions'
import { IconaCestino } from '@/components/icons'

// `grande` (sessione rifinitura 2026-08-08, vedi CLAUDE.md): variante
// leggermente più grande usata solo dalla card mobile della Dashboard,
// stesso trattamento di LavoroDocumentoBottone accanto — la tabella
// desktop resta alla dimensione originale, fuori scope di quella richiesta.
export function LavoroEliminaBottone({
  lavoroId,
  titolo,
  grande = false,
}: {
  lavoroId: string
  titolo: string
  grande?: boolean
}) {
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
      <IconaCestino className={grande ? 'h-5 w-5' : 'h-4 w-4'} />
    </button>
  )
}
