'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaTariffeOrarie } from '@/lib/profilo/actions'
import { InputValuta } from '@/components/input-valuta'
import { inputClass } from '@/lib/input-class'

type Fields = { tariffaCostruzione: string; tariffaMontaggio: string }

// Tariffe orarie manodopera (2026-08-19, vedi CLAUDE.md). `InputValuta` con
// `decimali={1}` — stesso componente/precisione già in uso per il Prezzo di
// Acquisto (15/8): una tariffa oraria può ragionevolmente avere un
// decimale (es. 47,50 €/h), coerente con "usa lo stesso componente di
// formattazione valuta già in uso nell'app" richiesto per il costo
// manodopera calcolato — riusato qui anche per l'input, non solo per la
// sola-lettura, per coerenza visiva in tutta la sezione.
export function ProfiloTariffeForm({ initialValues }: { initialValues: Fields }) {
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

    const result = await aggiornaTariffeOrarie({
      tariffaCostruzione: Number(fields.tariffaCostruzione) || 0,
      tariffaMontaggio: Number(fields.tariffaMontaggio) || 0,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tariffa-costruzione" className="mb-1 block text-sm font-medium text-gray-700">
            Costo orario Costruzione
          </label>
          <InputValuta
            id="tariffa-costruzione"
            value={fields.tariffaCostruzione}
            onChange={(v) => setFields((f) => ({ ...f, tariffaCostruzione: v }))}
            className={inputClass()}
            decimali={1}
          />
        </div>

        <div>
          <label htmlFor="tariffa-montaggio" className="mb-1 block text-sm font-medium text-gray-700">
            Costo orario Montaggio
          </label>
          <InputValuta
            id="tariffa-montaggio"
            value={fields.tariffaMontaggio}
            onChange={(v) => setFields((f) => ({ ...f, tariffaMontaggio: v }))}
            className={inputClass()}
            decimali={1}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Usate per calcolare il costo manodopera stimato di Costruzione e Montaggio (durata delle sessioni × numero di
        persone × tariffa) e per il Margine di Chiusura Lavoro. Un Lavoro già chiuso mantiene il costo calcolato al
        momento della chiusura, anche se cambi la tariffa in seguito.
      </p>

      {errore && <p className="text-xs text-red-600">{errore}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio…' : salvato ? 'Salvato' : 'Salva'}
      </button>
    </form>
  )
}
