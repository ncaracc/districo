'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { richiediPostoBeta } from '@/lib/beta/actions'

// Bottone "Richiedi un posto" del mini-sito beta (2026-08-22, vedi
// CLAUDE.md). Imposta solo `artigiano.richiesta_beta_at` — NON concede
// accesso automatico, è solo una richiesta che l'admin vede in
// /admin/utenti e decide se accettare (toggle `beta_tester` già
// esistente). `router.refresh()` dopo l'invio: la pagina rilegge
// `richiesta_beta_at` e mostra "Richiesta inviata" al posto del bottone.
export function RichiediPostoButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleClick() {
    setErrore(null)
    setLoading(true)
    try {
      await richiediPostoBeta()
      router.refresh()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore, riprova')
      setLoading(false)
    }
  }

  return (
    <div>
      {errore && <p className="mb-2 text-sm text-red-600">{errore}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Invio…' : 'Richiedi un posto'}
      </button>
    </div>
  )
}
