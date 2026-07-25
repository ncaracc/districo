'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaContatto, aggiornaContatto } from '@/lib/fornitori/actions'

type Fields = { nome: string; cognome: string; cellulare: string; email: string }

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

export function FornitoreSedeContattoForm({
  sedeId,
  fornitoreId,
  contattoId,
  initialValues,
  onSalvato,
  onAnnulla,
}: {
  sedeId: string
  fornitoreId: string
  contattoId?: string
  initialValues?: Partial<Fields>
  onSalvato: () => void
  onAnnulla?: () => void
}) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>({
    nome: initialValues?.nome ?? '',
    cognome: initialValues?.cognome ?? '',
    cellulare: initialValues?.cellulare ?? '',
    email: initialValues?.email ?? '',
  })
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!fields.nome.trim()) {
      setErrore('Il nome è obbligatorio')
      return
    }

    setLoading(true)
    setErrore(null)

    const payload = {
      nome: fields.nome.trim(),
      cognome: fields.cognome.trim() || null,
      cellulare: fields.cellulare.trim() || null,
      email: fields.email.trim() || null,
    }

    const result = contattoId
      ? await aggiornaContatto(contattoId, fornitoreId, payload)
      : await creaContatto(sedeId, fornitoreId, payload)
    setLoading(false)

    if (!result.ok) {
      setErrore(result.error)
      return
    }

    router.refresh()
    onSalvato()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2 rounded-lg border border-gray-200 p-2.5">
      {errore && <p className="text-xs text-red-600">{errore}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input value={fields.nome} onChange={set('nome')} placeholder="Nome" className={inputClass()} />
        <input value={fields.cognome} onChange={set('cognome')} placeholder="Cognome" className={inputClass()} />
        <input value={fields.cellulare} onChange={set('cellulare')} placeholder="Cellulare" className={inputClass()} />
        <input value={fields.email} onChange={set('email')} placeholder="Email" type="email" className={inputClass()} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvataggio…' : contattoId ? 'Salva' : 'Aggiungi contatto'}
        </button>
        {onAnnulla && (
          <button
            type="button"
            onClick={onAnnulla}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
        )}
      </div>
    </form>
  )
}
