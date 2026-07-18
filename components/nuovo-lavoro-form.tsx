'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaLavoro } from '@/lib/lavori/actions'

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}

export function NuovoLavoroForm({ clienteId }: { clienteId: string }) {
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!titolo.trim()) {
      setErrore('Il titolo è obbligatorio')
      return
    }

    setLoading(true)
    const result = await creaLavoro(clienteId, {
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
    })
    setLoading(false)

    if (!result.ok) {
      setErrore(result.error)
      return
    }

    router.push(`/lavori/${result.id}`)
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        + Nuovo lavoro
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-gray-200 p-4">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="titolo" className="block text-sm font-medium text-gray-700 mb-1">
          Titolo
        </label>
        <input
          id="titolo"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          className={inputClass(!!errore && !titolo.trim())}
        />
      </div>

      <div>
        <label htmlFor="descrizione" className="block text-sm font-medium text-gray-700 mb-1">
          Descrizione <span className="text-gray-400">(opz.)</span>
        </label>
        <textarea
          id="descrizione"
          rows={3}
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          className={inputClass(false)}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creazione in corso…' : 'Crea lavoro'}
        </button>
        <button
          type="button"
          onClick={() => setAperto(false)}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
