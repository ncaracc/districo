'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { nascondiMessaggioBeta } from '@/lib/beta/actions'

// Toggle nascondi/mostra un singolo messaggio (2026-08-22, vedi
// CLAUDE.md) — soft hide, admin-only (RLS lo garantisce comunque, questo
// bottone è renderizzato solo se `isAdmin` dal chiamante).
export function NascondiMessaggioButton({
  messaggioId,
  postId,
  nascosto,
}: {
  messaggioId: string
  postId: string
  nascosto: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      await nascondiMessaggioBeta(messaggioId, postId, !nascosto)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="text-xs text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50"
    >
      {loading ? '…' : nascosto ? 'mostra' : 'nascondi'}
    </button>
  )
}
