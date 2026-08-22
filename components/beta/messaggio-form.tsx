'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { scriviMessaggioBeta, chiudiPostConRisposta } from '@/lib/beta/actions'

// Form di risposta nel thread beta (2026-08-22, vedi CLAUDE.md). Due
// azioni possibili sullo stesso testo: "Rispondi" (chiunque abbia diritto
// di scrivere in questo momento — autore del post o admin) e "Chiudi con
// questa risposta" (solo admin, richiesto esplicitamente come azione
// distinta — non ogni risposta admin chiude il post automaticamente).
// `router.refresh()` dopo ogni invio riuscito: le Server Action chiamate
// come funzioni dirette (non via form action) non rinfrescano da sole
// l'albero già renderizzato di questa pagina, `revalidatePath()` lato
// server invalida solo la cache per la prossima navigazione.
export function MessaggioForm({ postId, isAdmin }: { postId: string; isAdmin: boolean }) {
  const router = useRouter()
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState<'rispondi' | 'chiudi' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  async function invia(azione: 'rispondi' | 'chiudi') {
    if (!testo.trim()) {
      setErrore('Scrivi un messaggio.')
      return
    }
    setErrore(null)
    setLoading(azione)
    try {
      if (azione === 'chiudi') {
        await chiudiPostConRisposta(postId, testo.trim())
      } else {
        await scriviMessaggioBeta(postId, testo.trim())
      }
      setTesto('')
      router.refresh()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : "Errore nell'invio")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}
      <textarea
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        placeholder="Scrivi una risposta..."
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => invia('rispondi')}
          disabled={loading !== null}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading === 'rispondi' ? 'Invio…' : 'Rispondi'}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => invia('chiudi')}
            disabled={loading !== null}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === 'chiudi' ? 'Chiusura…' : 'Chiudi con questa risposta'}
          </button>
        )}
      </div>
    </div>
  )
}
