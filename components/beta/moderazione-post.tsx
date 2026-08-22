'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { riapriPostBeta, nascondiPostBeta } from '@/lib/beta/actions'

// Controlli di moderazione admin sul post (2026-08-22, vedi CLAUDE.md):
// "Riapri" (solo se chiuso — azione separata ed esplicita richiesta dal
// brief, nessuna scrittura diretta attraverso la chiusura) e
// "Nascondi/Mostra il post" (soft hide, mai una cancellazione fisica).
export function ModerazionePost({
  postId,
  stato,
  nascosto,
}: {
  postId: string
  stato: string
  nascosto: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<'riapri' | 'nascondi' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function esegui(azione: 'riapri' | 'nascondi') {
    setErrore(null)
    setLoading(azione)
    try {
      if (azione === 'riapri') {
        await riapriPostBeta(postId)
      } else {
        await nascondiPostBeta(postId, !nascosto)
      }
      router.refresh()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {errore && <p className="text-sm text-red-600">{errore}</p>}
      {stato === 'chiuso' && (
        <button
          type="button"
          onClick={() => esegui('riapri')}
          disabled={loading !== null}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {loading === 'riapri' ? 'Riapertura…' : 'Riapri il post'}
        </button>
      )}
      <button
        type="button"
        onClick={() => esegui('nascondi')}
        disabled={loading !== null}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === 'nascondi' ? '…' : nascosto ? 'Mostra il post' : 'Nascondi il post'}
      </button>
    </div>
  )
}
