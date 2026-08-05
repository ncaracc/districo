'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaCliente, aggiornaCliente } from '@/lib/clienti/actions'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useAvvisaUscitaPagina } from '@/lib/use-avvisa-uscita-pagina'
import { SalvaFlottante } from '@/components/salva-flottante'

type Fields = {
  nome: string
  telefono: string
  email: string
  indirizzo: string
  note: string
}

type Errors = Partial<Record<keyof Fields, string>> & { form?: string }

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

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // Cliente/Fornitore sono form a pagina intera, non ospitati in una Modal —
  // nessun dialog a 3 opzioni possibile (non esiste un unico "bottone
  // chiudi" da proteggere, decisione esplicita dell'utente), solo l'avviso
  // nativo del browser alla chiusura/reload reale della scheda.
  const { dirty, segnaSalvato } = useDirtyForm(fields)
  useAvvisaUscitaPagina(dirty)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    segnaSalvato()

    if (clienteId) {
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

      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
          Nome / Ragione sociale <span className="text-red-500">*</span>
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
          Telefono
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
          Email
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
          Indirizzo
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
          Note
        </label>
        <textarea
          id="note"
          rows={4}
          value={fields.note}
          onChange={set('note')}
          className={inputClass(false)}
        />
      </div>

      <SalvaFlottante
        visibile={dirty}
        salvando={loading}
        testoSalva={clienteId ? 'Salva modifiche' : 'Crea cliente'}
        testoSalvando="Salvataggio in corso…"
        arrotondamento=""
      />
    </form>
  )
}
