'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaCliente, aggiornaCliente } from '@/lib/clienti/actions'

type Fields = {
  nome: string
  telefono: string
  email: string
  indirizzo: string
  note: string
}

type Errors = Partial<Record<keyof Fields, string>> & { form?: string }

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}

export function ClienteForm({
  clienteId,
  initialValues,
}: {
  clienteId?: string
  initialValues?: Partial<Fields>
}) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>({
    nome: initialValues?.nome ?? '',
    telefono: initialValues?.telefono ?? '',
    email: initialValues?.email ?? '',
    indirizzo: initialValues?.indirizzo ?? '',
    note: initialValues?.note ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [salvato, setSalvato] = useState(false)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSalvato(false)
      setFields((f) => ({ ...f, [key]: e.target.value }))
    }
  }

  function validate(f: Fields): Errors {
    const errs: Errors = {}
    if (!f.nome.trim()) errs.nome = 'Campo obbligatorio'
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      errs.email = 'Email non valida'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const errs = validate(fields)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const payload = {
      nome: fields.nome.trim(),
      telefono: fields.telefono.trim() || null,
      email: fields.email.trim() || null,
      indirizzo: fields.indirizzo.trim() || null,
      note: fields.note.trim() || null,
    }

    const result = clienteId
      ? await aggiornaCliente(clienteId, payload)
      : await creaCliente(payload)
    setLoading(false)

    if (!result.ok) {
      setErrors({ form: result.error })
      return
    }

    if (clienteId) {
      setSalvato(true)
      router.refresh()
    } else {
      router.push(`/clienti/${result.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>
      )}
      {salvato && (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Modifiche salvate.</p>
      )}

      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
          Nome / Ragione sociale
        </label>
        <input
          id="nome"
          value={fields.nome}
          onChange={set('nome')}
          className={inputClass(!!errors.nome)}
        />
        {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome}</p>}
      </div>

      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
          Telefono <span className="text-gray-400">(opz.)</span>
        </label>
        <input
          id="telefono"
          type="tel"
          value={fields.telefono}
          onChange={set('telefono')}
          className={inputClass(false)}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-gray-400">(opz.)</span>
        </label>
        <input
          id="email"
          type="email"
          value={fields.email}
          onChange={set('email')}
          className={inputClass(!!errors.email)}
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="indirizzo" className="block text-sm font-medium text-gray-700 mb-1">
          Indirizzo <span className="text-gray-400">(opz.)</span>
        </label>
        <input
          id="indirizzo"
          value={fields.indirizzo}
          onChange={set('indirizzo')}
          className={inputClass(false)}
        />
      </div>

      <div>
        <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
          Note <span className="text-gray-400">(opz.)</span>
        </label>
        <textarea
          id="note"
          rows={4}
          value={fields.note}
          onChange={set('note')}
          className={inputClass(false)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio in corso…' : clienteId ? 'Salva modifiche' : 'Crea cliente'}
      </button>
    </form>
  )
}
