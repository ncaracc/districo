'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaStatistiche } from '@/lib/profilo/actions'
import { inputClass } from '@/lib/input-class'

// Unico superstite del vecchio gruppo "Obiettivi" (2026-08-19, vedi
// CLAUDE.md — riorganizzazione Profilo/Impostazioni): i 4 campi "giorni"
// sono stati rimossi (UI + colonne a schema, confermati inerti
// nell'audit precedente), questo campo invece è l'unico ancora
// effettivamente letto da kpi_dashboard() (Tempo medio
// preventivo/completamento) — merita quindi una sotto-sezione a sé invece
// di sparire insieme agli altri.
type Fields = { kpiFinestraMesi: string }

export function ProfiloStatisticheForm({ initialValues }: { initialValues: Fields }) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialValues)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    const result = await aggiornaStatistiche({ kpiFinestraMesi: Number(fields.kpiFinestraMesi) || 0 })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setSalvato(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}
      {salvato && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Salvato.</p>}

      <div>
        <label htmlFor="statistiche-finestra" className="mb-1 block text-sm font-medium text-gray-700">
          Finestra temporale per le medie (mesi)
        </label>
        <input
          id="statistiche-finestra"
          type="number"
          min="1"
          value={fields.kpiFinestraMesi}
          onChange={(e) => setFields({ kpiFinestraMesi: e.target.value })}
          className={inputClass()}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio in corso…' : 'Salva'}
      </button>
    </form>
  )
}
