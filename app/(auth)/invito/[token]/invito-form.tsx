'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { registraDaInvito } from '@/lib/lavoro-artigiani/registrazione-invito'
import { accettaInvito } from '@/lib/lavoro-artigiani/inviti'

type Fields = {
  nome: string
  cognome: string
  ragioneSociale: string
  partitaIva: string
  specializzazione: string
  specializzazioneAltro: string
  telefono: string
  via: string
  civico: string
  cap: string
  localita: string
  password: string
  confermaPassword: string
}

const ALTRO = '__altro__'

const initialFields: Fields = {
  nome: '',
  cognome: '',
  ragioneSociale: '',
  partitaIva: '',
  specializzazione: '',
  specializzazioneAltro: '',
  telefono: '',
  via: '',
  civico: '',
  cap: '',
  localita: '',
  password: '',
  confermaPassword: '',
}

type Errors = Partial<Record<keyof Fields, string>> & { form?: string }

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}

export function InvitoForm({
  token,
  email,
  invitoId,
  specializzazioni,
}: {
  token: string
  email: string
  invitoId: string
  specializzazioni: string[]
}) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialFields)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'conferma'>('form')

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  function validate(f: Fields): Errors {
    const errs: Errors = {}
    if (!f.nome) errs.nome = 'Campo obbligatorio'
    if (!f.cognome) errs.cognome = 'Campo obbligatorio'
    if (!f.specializzazione) errs.specializzazione = 'Seleziona una specializzazione'
    if (f.specializzazione === ALTRO && !f.specializzazioneAltro) {
      errs.specializzazioneAltro = 'Indica la tua specializzazione'
    }
    if (!f.telefono) errs.telefono = 'Campo obbligatorio'
    if (!f.via) errs.via = 'Campo obbligatorio'
    if (!f.civico) errs.civico = 'Campo obbligatorio'
    if (!f.cap) errs.cap = 'Campo obbligatorio'
    if (!f.localita) errs.localita = 'Campo obbligatorio'
    if (!f.password) {
      errs.password = 'Campo obbligatorio'
    } else if (f.password.length < 8) {
      errs.password = 'Almeno 8 caratteri'
    }
    if (f.confermaPassword !== f.password) {
      errs.confermaPassword = 'Le password non coincidono'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const errs = validate(fields)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const specializzazione =
      fields.specializzazione === ALTRO ? fields.specializzazioneAltro : fields.specializzazione

    const result = await registraDaInvito(token, { ...fields, specializzazione })

    if (!result.ok) {
      setLoading(false)
      setErrors({ form: result.error })
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: fields.password,
    })
    setLoading(false)

    if (signInError) {
      setErrors({ form: 'Account creato ma accesso non riuscito, prova a fare login manualmente' })
      return
    }

    setStep('conferma')
  }

  async function handleConferma() {
    setLoading(true)
    const result = await accettaInvito(invitoId)
    setLoading(false)

    if (!result.ok) {
      setErrors({ form: result.error })
      return
    }

    router.push('/lavori')
    router.refresh()
  }

  if (step === 'conferma') {
    return (
      <div className="rounded-lg bg-gray-50 px-4 py-6 text-center">
        <p className="text-sm text-gray-900">Account creato. Conferma la tua partecipazione al lavoro per completare l&apos;invito.</p>
        {errors.form && <p className="mt-3 text-sm text-red-600">{errors.form}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={handleConferma}
          className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {loading ? 'Conferma in corso…' : 'Conferma partecipazione'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errors.form && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          value={email}
          disabled
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
            Nome
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
          <label htmlFor="cognome" className="block text-sm font-medium text-gray-700 mb-1">
            Cognome
          </label>
          <input
            id="cognome"
            value={fields.cognome}
            onChange={set('cognome')}
            className={inputClass(!!errors.cognome)}
          />
          {errors.cognome && <p className="mt-1 text-xs text-red-600">{errors.cognome}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ragioneSociale" className="block text-sm font-medium text-gray-700 mb-1">
            Ragione sociale <span className="text-gray-400">(opz.)</span>
          </label>
          <input
            id="ragioneSociale"
            value={fields.ragioneSociale}
            onChange={set('ragioneSociale')}
            className={inputClass(false)}
          />
        </div>
        <div>
          <label htmlFor="partitaIva" className="block text-sm font-medium text-gray-700 mb-1">
            Partita IVA <span className="text-gray-400">(opz.)</span>
          </label>
          <input
            id="partitaIva"
            value={fields.partitaIva}
            onChange={set('partitaIva')}
            className={inputClass(false)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="specializzazione" className="block text-sm font-medium text-gray-700 mb-1">
          Specializzazione
        </label>
        <select
          id="specializzazione"
          value={fields.specializzazione}
          onChange={set('specializzazione')}
          className={inputClass(!!errors.specializzazione)}
        >
          <option value="">Seleziona...</option>
          {specializzazioni.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={ALTRO}>Altro...</option>
        </select>
        {errors.specializzazione && (
          <p className="mt-1 text-xs text-red-600">{errors.specializzazione}</p>
        )}
      </div>

      {fields.specializzazione === ALTRO && (
        <div>
          <label htmlFor="specializzazioneAltro" className="block text-sm font-medium text-gray-700 mb-1">
            Specifica la tua specializzazione
          </label>
          <input
            id="specializzazioneAltro"
            value={fields.specializzazioneAltro}
            onChange={set('specializzazioneAltro')}
            className={inputClass(!!errors.specializzazioneAltro)}
          />
          {errors.specializzazioneAltro && (
            <p className="mt-1 text-xs text-red-600">{errors.specializzazioneAltro}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
          Telefono
        </label>
        <input
          id="telefono"
          type="tel"
          value={fields.telefono}
          onChange={set('telefono')}
          className={inputClass(!!errors.telefono)}
        />
        {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label htmlFor="via" className="block text-sm font-medium text-gray-700 mb-1">
            Via
          </label>
          <input
            id="via"
            value={fields.via}
            onChange={set('via')}
            className={inputClass(!!errors.via)}
          />
          {errors.via && <p className="mt-1 text-xs text-red-600">{errors.via}</p>}
        </div>
        <div>
          <label htmlFor="civico" className="block text-sm font-medium text-gray-700 mb-1">
            Civico
          </label>
          <input
            id="civico"
            value={fields.civico}
            onChange={set('civico')}
            className={inputClass(!!errors.civico)}
          />
          {errors.civico && <p className="mt-1 text-xs text-red-600">{errors.civico}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cap" className="block text-sm font-medium text-gray-700 mb-1">
            CAP
          </label>
          <input
            id="cap"
            value={fields.cap}
            onChange={set('cap')}
            className={inputClass(!!errors.cap)}
          />
          {errors.cap && <p className="mt-1 text-xs text-red-600">{errors.cap}</p>}
        </div>
        <div>
          <label htmlFor="localita" className="block text-sm font-medium text-gray-700 mb-1">
            Località
          </label>
          <input
            id="localita"
            value={fields.localita}
            onChange={set('localita')}
            className={inputClass(!!errors.localita)}
          />
          {errors.localita && <p className="mt-1 text-xs text-red-600">{errors.localita}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={fields.password}
            onChange={set('password')}
            className={inputClass(!!errors.password)}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
        <div>
          <label htmlFor="confermaPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Conferma password
          </label>
          <input
            id="confermaPassword"
            type="password"
            autoComplete="new-password"
            value={fields.confermaPassword}
            onChange={set('confermaPassword')}
            className={inputClass(!!errors.confermaPassword)}
          />
          {errors.confermaPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confermaPassword}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors disabled:opacity-50"
      >
        {loading ? 'Registrazione in corso…' : 'Registrati e continua'}
      </button>
    </form>
  )
}
