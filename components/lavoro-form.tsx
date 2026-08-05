'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaLavoro } from '@/lib/lavori/actions'
import { PAESI, trovaPaese } from '@/lib/paesi'
import { inputClass } from '@/lib/input-class'

type Fields = {
  titolo: string
  descrizione: string
  dataLavoro: string
  indirizzo: string
  civico: string
  cap: string
  citta: string
  siglaProvincia: string
  nazione: string
}

export function LavoroForm({
  lavoroId,
  initialValues,
  onAnnulla,
}: {
  lavoroId: string
  initialValues: Fields
  onAnnulla: () => void
}) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialValues)
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const labelProvincia = trovaPaese(fields.nazione)?.labelProvincia

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!fields.titolo.trim()) {
      setErrore('Il titolo è obbligatorio')
      return
    }

    if (!fields.dataLavoro) {
      setErrore('La data è obbligatoria')
      return
    }

    setLoading(true)
    setErrore(null)

    const result = await aggiornaLavoro(lavoroId, {
      titolo: fields.titolo.trim(),
      descrizione: fields.descrizione.trim() || null,
      dataLavoro: fields.dataLavoro,
      indirizzo: fields.indirizzo.trim() || null,
      civico: fields.civico.trim() || null,
      cap: fields.cap.trim() || null,
      citta: fields.citta.trim() || null,
      siglaProvincia: fields.siglaProvincia.trim() || null,
      nazione: fields.nazione || null,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }

    router.refresh()
    onAnnulla()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="lavoro-titolo" className="mb-1 block text-sm font-medium text-gray-700">
          Titolo <span className="text-red-500">*</span>
        </label>
        <input id="lavoro-titolo" value={fields.titolo} onChange={set('titolo')} className={inputClass()} />
      </div>

      <div>
        <label htmlFor="lavoro-descrizione" className="mb-1 block text-sm font-medium text-gray-700">
          Descrizione
        </label>
        <textarea
          id="lavoro-descrizione"
          rows={3}
          value={fields.descrizione}
          onChange={set('descrizione')}
          className={inputClass()}
        />
      </div>

      <div>
        <label htmlFor="lavoro-data" className="mb-1 block text-sm font-medium text-gray-700">
          Data <span className="text-red-500">*</span>
        </label>
        <input
          id="lavoro-data"
          type="date"
          value={fields.dataLavoro}
          onChange={set('dataLavoro')}
          className={inputClass()}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label htmlFor="lavoro-indirizzo" className="mb-1 block text-sm font-medium text-gray-700">
            Indirizzo
          </label>
          <input id="lavoro-indirizzo" value={fields.indirizzo} onChange={set('indirizzo')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="lavoro-civico" className="mb-1 block text-sm font-medium text-gray-700">
            Civico
          </label>
          <input id="lavoro-civico" value={fields.civico} onChange={set('civico')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="lavoro-cap" className="mb-1 block text-sm font-medium text-gray-700">
            CAP
          </label>
          <input id="lavoro-cap" value={fields.cap} onChange={set('cap')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="lavoro-citta" className="mb-1 block text-sm font-medium text-gray-700">
            Città
          </label>
          <input id="lavoro-citta" value={fields.citta} onChange={set('citta')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="lavoro-nazione" className="mb-1 block text-sm font-medium text-gray-700">
            Nazione
          </label>
          <select id="lavoro-nazione" value={fields.nazione} onChange={set('nazione')} className={inputClass()}>
            {PAESI.map((p) => (
              <option key={p.nome} value={p.nome}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="lavoro-sigla-provincia" className="mb-1 block text-sm font-medium text-gray-700">
            {labelProvincia ?? 'Sigla provincia'}
          </label>
          <input
            id="lavoro-sigla-provincia"
            value={fields.siglaProvincia}
            onChange={set('siglaProvincia')}
            placeholder="Es. BO"
            className={inputClass()}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        <button
          type="button"
          onClick={onAnnulla}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
