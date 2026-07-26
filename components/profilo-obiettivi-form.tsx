'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaObiettiviKpi } from '@/lib/profilo/actions'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

type Fields = {
  targetPreventivoGiorni: string
  targetProgettoGiorni: string
  targetProduzioneGiorni: string
  targetMontaggioGiorni: string
  kpiFinestraMesi: string
}

export function ProfiloObiettiviForm({ initialValues }: { initialValues: Fields }) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialValues)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    const result = await aggiornaObiettiviKpi({
      targetPreventivoGiorni: Number(fields.targetPreventivoGiorni) || 0,
      targetProgettoGiorni: Number(fields.targetProgettoGiorni) || 0,
      targetProduzioneGiorni: Number(fields.targetProduzioneGiorni) || 0,
      targetMontaggioGiorni: Number(fields.targetMontaggioGiorni) || 0,
      kpiFinestraMesi: Number(fields.kpiFinestraMesi) || 0,
    })

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
      {salvato && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Obiettivi salvati.</p>}

      <p className="text-sm text-gray-500">
        Tempi massimi di riferimento per i KPI mostrati in Dashboard e Lavori conclusi — modificabili in
        qualsiasi momento.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="target-preventivo" className="mb-1 block text-sm font-medium text-gray-700">
            Tempo di preventivazione (giorni)
          </label>
          <input
            id="target-preventivo"
            type="number"
            min="1"
            value={fields.targetPreventivoGiorni}
            onChange={set('targetPreventivoGiorni')}
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="target-progetto" className="mb-1 block text-sm font-medium text-gray-700">
            Tempo di progetto (giorni)
          </label>
          <input
            id="target-progetto"
            type="number"
            min="1"
            value={fields.targetProgettoGiorni}
            onChange={set('targetProgettoGiorni')}
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="target-produzione" className="mb-1 block text-sm font-medium text-gray-700">
            Accettazione → produzione (giorni)
          </label>
          <input
            id="target-produzione"
            type="number"
            min="1"
            value={fields.targetProduzioneGiorni}
            onChange={set('targetProduzioneGiorni')}
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="target-montaggio" className="mb-1 block text-sm font-medium text-gray-700">
            Durata montaggio (giorni)
          </label>
          <input
            id="target-montaggio"
            type="number"
            min="1"
            value={fields.targetMontaggioGiorni}
            onChange={set('targetMontaggioGiorni')}
            className={inputClass()}
          />
        </div>
      </div>

      <div>
        <label htmlFor="kpi-finestra" className="mb-1 block text-sm font-medium text-gray-700">
          Finestra temporale per le medie (mesi)
        </label>
        <input
          id="kpi-finestra"
          type="number"
          min="1"
          value={fields.kpiFinestraMesi}
          onChange={set('kpiFinestraMesi')}
          className={inputClass()}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio in corso…' : 'Salva obiettivi'}
      </button>
    </form>
  )
}
