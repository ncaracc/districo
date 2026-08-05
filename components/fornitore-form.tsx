'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaFornitore, aggiornaFornitore } from '@/lib/fornitori/actions'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useAvvisaUscitaPagina } from '@/lib/use-avvisa-uscita-pagina'
import { SalvaFlottante } from '@/components/salva-flottante'

type Fields = { ragioneSociale: string; partitaIva: string }
type Errors = Partial<Record<keyof Fields, string>> & { form?: string }

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

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // stesso trattamento di ClienteForm — solo avviso nativo del browser
  // all'uscita, nessun dialog a 3 opzioni (form a pagina intera, non in
  // una Modal).
  const { dirty, segnaSalvato } = useDirtyForm(fields)
  useAvvisaUscitaPagina(dirty)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
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

    segnaSalvato()

    if (fornitoreId) {
      router.refresh()
    } else {
      router.push(`/fornitori/${result.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>}

      <div>
        <label htmlFor="ragioneSociale" className="block text-sm font-medium text-gray-700 mb-1">
          Ragione sociale <span className="text-red-500">*</span>
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
          Partita IVA
        </label>
        <input id="partitaIva" value={fields.partitaIva} onChange={set('partitaIva')} className={inputClass(false)} />
      </div>

      <SalvaFlottante
        visibile={dirty}
        salvando={loading}
        testoSalva={fornitoreId ? 'Salva modifiche' : 'Crea fornitore'}
        testoSalvando="Salvataggio in corso…"
        arrotondamento=""
      />
    </form>
  )
}
