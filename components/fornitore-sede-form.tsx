'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaSede, aggiornaSede } from '@/lib/fornitori/actions'
import { PAESE_DEFAULT } from '@/lib/paesi'
import { inputClass } from '@/lib/input-class'
import { CampiIndirizzo } from '@/components/campi-indirizzo'

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
        <label htmlFor="sede-nome" className="mb-1 block text-sm font-medium text-gray-700">
          Nome sede <span className="text-red-500">*</span>
        </label>
        <input id="sede-nome" value={fields.nome} onChange={set('nome')} className={inputClass()} placeholder="Es. Sede Bologna" />
      </div>

      {/* Campi indirizzo (Città → Provincia → Nazione, era Città →
          Nazione → Provincia): componente condiviso
          components/campi-indirizzo.tsx, vedi CLAUDE.md 2026-08-13 —
          stesso bug già corretto una prima volta in lavoro-form.tsx il
          2026-08-12, centralizzato qui per evitare un terzo episodio. */}
      <CampiIndirizzo
        idPrefix="sede"
        values={{
          indirizzo: fields.indirizzo,
          civico: fields.civico,
          cap: fields.cap,
          citta: fields.citta,
          siglaProvincia: fields.siglaProvincia,
          nazione: fields.nazione,
        }}
        onChange={(campo, valore) => setFields((f) => ({ ...f, [campo]: valore }))}
      />

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
