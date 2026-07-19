'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaAttivita } from '@/lib/lavori/actions'

const TIPI: { value: string; label: string }[] = [
  { value: 'briefing', label: 'Briefing' },
  { value: 'progetto', label: 'Progetto' },
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'sopralluogo', label: 'Sopralluogo' },
  { value: 'campioni', label: 'Campioni' },
]

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

export function NuovaAttivitaForm({ lavoroId }: { lavoroId: string }) {
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [tipo, setTipo] = useState('briefing')
  const [dataAppuntamento, setDataAppuntamento] = useState('')
  const [commenti, setCommenti] = useState('')
  const [importo, setImporto] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)

    const result = await creaAttivita(lavoroId, {
      tipo: tipo as 'briefing' | 'progetto' | 'preventivo' | 'sopralluogo' | 'campioni',
      dataAppuntamento: dataAppuntamento ? new Date(dataAppuntamento).toISOString() : null,
      commenti: commenti.trim() || null,
      importo: importo ? Number(importo) : null,
    })
    setLoading(false)

    if (!result.ok) {
      setErrore(result.error)
      return
    }

    setTipo('briefing')
    setDataAppuntamento('')
    setCommenti('')
    setImporto('')
    setAperto(false)
    router.refresh()
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        + Nuova attività
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 p-4">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo
        </label>
        <select
          id="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className={inputClass()}
        >
          {TIPI.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="dataAppuntamento" className="block text-sm font-medium text-gray-700 mb-1">
          Appuntamento <span className="text-gray-400">(opz.)</span>
        </label>
        <input
          id="dataAppuntamento"
          type="datetime-local"
          value={dataAppuntamento}
          onChange={(e) => setDataAppuntamento(e.target.value)}
          className={inputClass()}
        />
      </div>

      {tipo === 'preventivo' && (
        <div>
          <label htmlFor="importo" className="block text-sm font-medium text-gray-700 mb-1">
            Importo <span className="text-gray-400">(opz.)</span>
          </label>
          <input
            id="importo"
            type="number"
            step="0.01"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            className={inputClass()}
          />
        </div>
      )}

      <div>
        <label htmlFor="commenti" className="block text-sm font-medium text-gray-700 mb-1">
          Commenti <span className="text-gray-400">(opz.)</span>
        </label>
        <textarea
          id="commenti"
          rows={2}
          value={commenti}
          onChange={(e) => setCommenti(e.target.value)}
          className={inputClass()}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creazione in corso…' : 'Aggiungi attività'}
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
