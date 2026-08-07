'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaCategoriaAcquisto, eliminaCategoriaAcquisto } from '@/lib/acquisti/categorie'
import { inputClass } from '@/lib/input-class'

export function ProfiloCategorieAcquistoForm({ categorie }: { categorie: { id: string; nome: string }[] }) {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleAggiungi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    const result = await creaCategoriaAcquisto(nome)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setNome('')
    router.refresh()
  }

  async function handleElimina(id: string) {
    if (!confirm('Eliminare questa categoria? Gli ordini acquisto esistenti che la usano restano invariati.')) return
    const result = await eliminaCategoriaAcquisto(id)
    if (!result.ok) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div>
      {categorie.length > 0 && (
        <ul className="mb-3 divide-y divide-gray-200 rounded-lg border border-gray-200">
          {categorie.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm text-gray-900">
              {c.nome}
              <button type="button" onClick={() => handleElimina(c.id)} className="text-xs font-medium text-gray-400 hover:text-red-600">
                Elimina
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAggiungi} className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nuova categoria (es. Materiale, Ferramenta, Lavorazioni esterne)"
          className={inputClass()}
        />
        <button
          type="submit"
          disabled={loading || !nome.trim()}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Aggiunta…' : 'Aggiungi'}
        </button>
      </form>
      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}
    </div>
  )
}
