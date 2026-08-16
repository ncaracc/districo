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

type Fields = { apertura: string; congedo: string }

// Testo mail ordine — Apertura/Congedo (2026-08-17, vedi CLAUDE.md e
// lib/lavori/mail-ordine-testo.ts per la struttura completa/i default). Il
// selettore Formale/Informale (stesso stile "chip" già in uso altrove
// nell'app, es. FiltroLavoriChip) PRE-COMPILA i due campi col preset
// corrispondente — non è un flag salvato: dopo il click i campi restano
// testo libero, il selettore non ha più alcun effetto sulla mail
// effettivamente inviata (che legge solo il contenuto attuale dei due
// campi, vedi ordini-email.ts). Nessuna conferma prima di sovrascrivere:
// azione leggera, reversibile con un altro click o riscrivendo a mano.
//
// **Visibilità migliorata 2026-08-19** (vedi CLAUDE.md — segnalato come
// "non è chiaro come si sceglie tra Formale e Informale", verificato nella
// sessione precedente: non era un bug funzionale, un problema di
// chiarezza): didascalia "Applica un tono predefinito:" aggiunta sopra i
// due bottoni (proposta nella sessione precedente, ora implementata) +
// stato "attivo" visibile, stesso pattern bg-gray-900/text-white già in
// uso da FiltroLavoriChip per il chip selezionato. `tonoAttivo` è
// DERIVATO da `fields` ad ogni render (non un flag separato salvato a
// parte): risulta "formale"/"informale" solo quando Apertura+Congedo
// corrispondono ESATTAMENTE al preset corrispondente — si accende subito
// dopo un click (che scrive esattamente quel preset), ma si spegne da solo
// se l'utente poi modifica manualmente il testo, evitando un'indicazione
// visiva rimasta "appesa" e non più corrispondente al contenuto reale dei
// campi (rischio concreto con uno stato booleano indipendente impostato
// solo al click, mai più riconciliato).
function tonoDaValori(v: Fields): 'formale' | 'informale' | null {
  if (v.apertura === DEFAULT_APERTURA_FORMALE && v.congedo === DEFAULT_CONGEDO_FORMALE) return 'formale'
  if (v.apertura === DEFAULT_APERTURA_INFORMALE && v.congedo === DEFAULT_CONGEDO_INFORMALE) return 'informale'
  return null
}

export function ProfiloTestoMailForm({ initialValues }: { initialValues: Fields }) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialValues)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)
  const [loading, setLoading] = useState(false)
  const tonoAttivo = tonoDaValori(fields)

  function applicaTono(tono: 'formale' | 'informale') {
    setFields(
      tono === 'formale'
        ? { apertura: DEFAULT_APERTURA_FORMALE, congedo: DEFAULT_CONGEDO_FORMALE }
        : { apertura: DEFAULT_APERTURA_INFORMALE, congedo: DEFAULT_CONGEDO_INFORMALE },
    )
    setSalvato(false)
  }

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <p className="mb-1 text-xs text-gray-500">Applica un tono predefinito:</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => applicaTono('formale')}
            aria-pressed={tonoAttivo === 'formale'}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tonoAttivo === 'formale' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Formale
          </button>
          <button
            type="button"
            onClick={() => applicaTono('informale')}
            aria-pressed={tonoAttivo === 'informale'}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tonoAttivo === 'informale' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Informale
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="mail-apertura" className="mb-1 block text-sm font-medium text-gray-700">
          Apertura
        </label>
        <textarea
          id="mail-apertura"
          rows={3}
          value={fields.apertura}
          onChange={(e) => setFields((f) => ({ ...f, apertura: e.target.value }))}
          className={inputClass()}
        />
      </div>

      <div>
        <label htmlFor="mail-congedo" className="mb-1 block text-sm font-medium text-gray-700">
          Congedo
        </label>
        <textarea
          id="mail-congedo"
          rows={3}
          value={fields.congedo}
          onChange={(e) => setFields((f) => ({ ...f, congedo: e.target.value }))}
          className={inputClass()}
        />
      </div>

      <p className="text-xs text-gray-500">
        Segnaposto disponibili, sostituiti automaticamente nella mail inviata: {PLACEHOLDER_APERTURA_CONGEDO.join(', ')}.
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
