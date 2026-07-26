'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaSede, aggiornaSede } from '@/lib/fornitori/actions'
import { PAESI, PAESE_DEFAULT, trovaPaese } from '@/lib/paesi'

type Fields = {
  nome: string
  indirizzo: string
  civico: string
  cap: string
  citta: string
  siglaProvincia: string
  nazione: string
}

const CAMPI_VUOTI: Fields = {
  nome: '',
  indirizzo: '',
  civico: '',
  cap: '',
  citta: '',
  siglaProvincia: '',
  nazione: PAESE_DEFAULT,
}

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

export function FornitoreSedeForm({
  fornitoreId,
  sedeId,
  initialValues,
  onSalvato,
  onAnnulla,
}: {
  fornitoreId: string
  sedeId?: string
  initialValues?: Partial<Fields>
  onSalvato: () => void
  onAnnulla?: () => void
}) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>({ ...CAMPI_VUOTI, ...initialValues })
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const labelProvincia = trovaPaese(fields.nazione)?.labelProvincia

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!fields.nome.trim()) {
      setErrore('Il nome della sede è obbligatorio')
      return
    }

    setLoading(true)
    setErrore(null)

    const payload = {
      nome: fields.nome.trim(),
      indirizzo: fields.indirizzo.trim() || null,
      civico: fields.civico.trim() || null,
      cap: fields.cap.trim() || null,
      citta: fields.citta.trim() || null,
      sigla_provincia: fields.siglaProvincia.trim() || null,
      nazione: fields.nazione || null,
    }

    const result = sedeId
      ? await aggiornaSede(sedeId, fornitoreId, payload)
      : await creaSede(fornitoreId, payload)
    setLoading(false)

    if (!result.ok) {
      setErrore(result.error)
      return
    }

    router.refresh()
    onSalvato()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-lg bg-gray-50 p-3">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="sede-nome" className="mb-1 block text-xs font-medium text-gray-700">
          Nome sede <span className="text-red-500">*</span>
        </label>
        <input id="sede-nome" value={fields.nome} onChange={set('nome')} className={inputClass()} placeholder="Es. Sede Bologna" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label htmlFor="sede-indirizzo" className="mb-1 block text-xs font-medium text-gray-700">
            Indirizzo
          </label>
          <input id="sede-indirizzo" value={fields.indirizzo} onChange={set('indirizzo')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="sede-civico" className="mb-1 block text-xs font-medium text-gray-700">
            Civico
          </label>
          <input id="sede-civico" value={fields.civico} onChange={set('civico')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="sede-cap" className="mb-1 block text-xs font-medium text-gray-700">
            CAP
          </label>
          <input id="sede-cap" value={fields.cap} onChange={set('cap')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="sede-citta" className="mb-1 block text-xs font-medium text-gray-700">
            Città
          </label>
          <input id="sede-citta" value={fields.citta} onChange={set('citta')} className={inputClass()} />
        </div>
        <div>
          <label htmlFor="sede-nazione" className="mb-1 block text-xs font-medium text-gray-700">
            Nazione
          </label>
          <select id="sede-nazione" value={fields.nazione} onChange={set('nazione')} className={inputClass()}>
            {PAESI.map((p) => (
              <option key={p.nome} value={p.nome}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sede-sigla-provincia" className="mb-1 block text-xs font-medium text-gray-700">
            {labelProvincia ?? 'Sigla provincia'}
          </label>
          <input
            id="sede-sigla-provincia"
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
          {loading ? 'Salvataggio…' : sedeId ? 'Salva sede' : 'Crea sede'}
        </button>
        {onAnnulla && (
          <button
            type="button"
            onClick={onAnnulla}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
        )}
      </div>
    </form>
  )
}
