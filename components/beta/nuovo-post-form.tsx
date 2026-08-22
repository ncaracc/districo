'use client'

import { useState } from 'react'
import { creaPostBeta } from '@/lib/beta/actions'
import { inputClass } from '@/lib/input-class'

// Form "Nuovo post" del forum beta (2026-08-22, vedi CLAUDE.md). Titolo +
// primo messaggio in un'unica submit — `creaPostBeta()` li crea insieme
// in una sola chiamata atomica (beta_crea_post) e reindirizza al thread
// appena creato.
export function NuovoPostForm() {
  const [titolo, setTitolo] = useState('')
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!titolo.trim() || !testo.trim()) {
      setErrore('Compila sia l’oggetto sia il messaggio.')
      return
    }
    setErrore(null)
    setLoading(true)
    try {
      await creaPostBeta(titolo.trim(), testo.trim())
    } catch (err) {
      // redirect() dentro la Server Action lancia un errore speciale
      // NEXT_REDIRECT gestito dal framework — qui arrivano solo i veri
      // errori (es. violazione RLS), redirect riuscito non passa di qui.
      setErrore(err instanceof Error ? err.message : 'Errore nella creazione del post')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="titolo" className="mb-1 block text-sm font-medium text-gray-700">
          Oggetto <span className="text-red-500">*</span>
        </label>
        <input
          id="titolo"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          className={inputClass(false)}
          placeholder="Es. Bug nella modale Acquisto su mobile"
        />
      </div>

      <div>
        <label htmlFor="testo" className="mb-1 block text-sm font-medium text-gray-700">
          Messaggio <span className="text-red-500">*</span>
        </label>
        <textarea
          id="testo"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          rows={6}
          className={inputClass(false)}
          placeholder="Descrivi la domanda, la segnalazione o la richiesta..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Pubblicazione…' : 'Pubblica'}
      </button>
    </form>
  )
}
