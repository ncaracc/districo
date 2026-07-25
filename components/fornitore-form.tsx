'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaFornitore, aggiornaFornitore } from '@/lib/fornitori/actions'

type Fields = { ragioneSociale: string; partitaIva: string }
type Errors = Partial<Record<keyof Fields, string>> & { form?: string }

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}

export function FornitoreForm({
  fornitoreId,
  initialValues,
}: {
  fornitoreId?: string
  initialValues?: Partial<Fields>
}) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>({
    ragioneSociale: initialValues?.ragioneSociale ?? '',
    partitaIva: initialValues?.partitaIva ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [salvato, setSalvato] = useState(false)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setSalvato(false)
      setFields((f) => ({ ...f, [key]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!fields.ragioneSociale.trim()) {
      setErrors({ ragioneSociale: 'Campo obbligatorio' })
      return
    }

    setLoading(true)
    const payload = {
      ragione_sociale: fields.ragioneSociale.trim(),
      partita_iva: fields.partitaIva.trim() || null,
    }

    const result = fornitoreId
      ? await aggiornaFornitore(fornitoreId, payload)
      : await creaFornitore(payload)
    setLoading(false)

    if (!result.ok) {
      setErrors({ form: result.error })
      return
    }

    if (fornitoreId) {
      setSalvato(true)
      router.refresh()
    } else {
      router.push(`/fornitori/${result.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>}
      {salvato && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Modifiche salvate.</p>}

      <div>
        <label htmlFor="ragioneSociale" className="block text-sm font-medium text-gray-700 mb-1">
          Ragione sociale
        </label>
        <input
          id="ragioneSociale"
          value={fields.ragioneSociale}
          onChange={set('ragioneSociale')}
          className={inputClass(!!errors.ragioneSociale)}
        />
        {errors.ragioneSociale && <p className="mt-1 text-xs text-red-600">{errors.ragioneSociale}</p>}
      </div>

      <div>
        <label htmlFor="partitaIva" className="block text-sm font-medium text-gray-700 mb-1">
          Partita IVA <span className="text-gray-400">(opz.)</span>
        </label>
        <input id="partitaIva" value={fields.partitaIva} onChange={set('partitaIva')} className={inputClass(false)} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio in corso…' : fornitoreId ? 'Salva modifiche' : 'Crea fornitore'}
      </button>
    </form>
  )
}
