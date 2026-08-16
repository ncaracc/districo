'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaTestoMail } from '@/lib/profilo/actions'
import {
  DEFAULT_APERTURA_FORMALE,
  DEFAULT_APERTURA_INFORMALE,
  DEFAULT_CONGEDO_FORMALE,
  DEFAULT_CONGEDO_INFORMALE,
  PLACEHOLDER_APERTURA_CONGEDO,
} from '@/lib/lavori/mail-ordine-testo'
import { inputClass } from '@/lib/input-class'

type Fields = {
  aperturaFormale: string
  congedoFormale: string
  aperturaInformale: string
  congedoInformale: string
}

// Testo mail ordine — Apertura/Congedo personalizzabili PER TONO
// (2026-08-19, vedi CLAUDE.md — CORREGGE il design del 17/8, una sola
// coppia con Formale/Informale come semplice prefill). Segnalato
// dall'utente: il tono dipende dal fornitore a cui si scrive volta per
// volta, non ha senso come preferenza fissa dell'artigiano — la scelta si
// fa ora al momento dell'invio (vedi satellite-ordine.tsx), qui restano
// solo le DUE coppie di testo personalizzabili, una per tono, entrambe
// sempre visibili fianco a fianco (non più un solo campo con due bottoni
// di prefill). Ciascuna textarea, lasciata vuota, usa il preset
// applicativo corrispondente (placeholder col default, non un valore
// precompilato — coerente con "vuoto = non personalizzato" già in uso per
// gli altri campi opzionali dell'app).
export function ProfiloTestoMailForm({ initialValues }: { initialValues: Fields }) {
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

    const result = await aggiornaTestoMail(fields)

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setSalvato(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Formale</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="mail-apertura-formale" className="mb-1 block text-sm font-medium text-gray-700">
              Apertura
            </label>
            <textarea
              id="mail-apertura-formale"
              rows={3}
              value={fields.aperturaFormale}
              onChange={(e) => setFields((f) => ({ ...f, aperturaFormale: e.target.value }))}
              placeholder={DEFAULT_APERTURA_FORMALE}
              className={inputClass()}
            />
          </div>
          <div>
            <label htmlFor="mail-congedo-formale" className="mb-1 block text-sm font-medium text-gray-700">
              Congedo
            </label>
            <textarea
              id="mail-congedo-formale"
              rows={3}
              value={fields.congedoFormale}
              onChange={(e) => setFields((f) => ({ ...f, congedoFormale: e.target.value }))}
              placeholder={DEFAULT_CONGEDO_FORMALE}
              className={inputClass()}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Informale</h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="mail-apertura-informale" className="mb-1 block text-sm font-medium text-gray-700">
              Apertura
            </label>
            <textarea
              id="mail-apertura-informale"
              rows={3}
              value={fields.aperturaInformale}
              onChange={(e) => setFields((f) => ({ ...f, aperturaInformale: e.target.value }))}
              placeholder={DEFAULT_APERTURA_INFORMALE}
              className={inputClass()}
            />
          </div>
          <div>
            <label htmlFor="mail-congedo-informale" className="mb-1 block text-sm font-medium text-gray-700">
              Congedo
            </label>
            <textarea
              id="mail-congedo-informale"
              rows={3}
              value={fields.congedoInformale}
              onChange={(e) => setFields((f) => ({ ...f, congedoInformale: e.target.value }))}
              placeholder={DEFAULT_CONGEDO_INFORMALE}
              className={inputClass()}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Il tono si sceglie al momento dell&apos;invio dell&apos;ordine, in base al fornitore. Segnaposto disponibili,
        sostituiti automaticamente nella mail inviata: {PLACEHOLDER_APERTURA_CONGEDO.join(', ')}.
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
