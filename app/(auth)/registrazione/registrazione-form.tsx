'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/password-input'
import { PAESI, PAESE_DEFAULT, trovaPaese } from '@/lib/paesi'

type Fields = {
  nome: string
  cognome: string
  specializzazione: string
  specializzazioneAltro: string
  paese: string
  email: string
  prefissoTelefono: string
  numeroTelefono: string
  password: string
}

const ALTRO = '__altro__'

const initialFields: Fields = {
  nome: '',
  cognome: '',
  specializzazione: '',
  specializzazioneAltro: '',
  paese: PAESE_DEFAULT,
  email: '',
  prefissoTelefono: trovaPaese(PAESE_DEFAULT)?.prefisso ?? '+39',
  numeroTelefono: '',
  password: '',
}

type Errors = Partial<Record<keyof Fields, string>> & { form?: string }

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}

export function RegistrazioneForm({ specializzazioni }: { specializzazioni: string[] }) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialFields)
  const [prefissoManuale, setPrefissoManuale] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [registrato, setRegistrato] = useState(false)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  function handlePaeseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nuovoPaese = e.target.value
    const infoNuovoPaese = trovaPaese(nuovoPaese)
    setFields((f) => ({
      ...f,
      paese: nuovoPaese,
      prefissoTelefono:
        !prefissoManuale && infoNuovoPaese?.prefisso ? infoNuovoPaese.prefisso : f.prefissoTelefono,
    }))
  }

  function handlePrefissoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPrefissoManuale(true)
    setFields((f) => ({ ...f, prefissoTelefono: e.target.value }))
  }

  function validate(f: Fields): Errors {
    const errs: Errors = {}
    if (!f.nome) errs.nome = 'Campo obbligatorio'
    if (!f.cognome) errs.cognome = 'Campo obbligatorio'
    if (!f.specializzazione) errs.specializzazione = 'Seleziona una specializzazione'
    if (f.specializzazione === ALTRO && !f.specializzazioneAltro) {
      errs.specializzazioneAltro = 'Indica la tua specializzazione'
    }
    if (!f.numeroTelefono) errs.numeroTelefono = 'Campo obbligatorio'
    if (!f.email) {
      errs.email = 'Campo obbligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      errs.email = 'Email non valida'
    }
    if (!f.password) {
      errs.password = 'Campo obbligatorio'
    } else if (f.password.length < 8) {
      errs.password = 'Almeno 8 caratteri'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const errs = validate(fields)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const supabase = createClient()
    const specializzazione =
      fields.specializzazione === ALTRO ? fields.specializzazioneAltro : fields.specializzazione
    const telefono = `${fields.prefissoTelefono} ${fields.numeroTelefono}`.trim()

    const { error } = await supabase.auth.signUp({
      email: fields.email,
      password: fields.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.districo.it'}/login`,
        data: {
          nome: fields.nome,
          cognome: fields.cognome,
          specializzazione,
          telefono,
          paese: fields.paese,
        },
      },
    })
    setLoading(false)

    if (error) {
      setErrors({
        form:
          error.message === 'User already registered'
            ? 'Esiste già un account con questa email'
            : 'Errore nella registrazione, riprova',
      })
      return
    }

    setRegistrato(true)
  }

  if (registrato) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-900">
          Ti abbiamo inviato un&apos;email a <strong>{fields.email}</strong> per verificare il tuo
          account. Apri il link ricevuto per completare la registrazione.
        </p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-2"
        >
          Torna al login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.form && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>
      )}

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

      <div>
        <label
          htmlFor="specializzazione"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
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
          <label
            htmlFor="specializzazioneAltro"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
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
        <label htmlFor="paese" className="block text-sm font-medium text-gray-700 mb-1">
          Paese
        </label>
        <select
          id="paese"
          value={fields.paese}
          onChange={handlePaeseChange}
          className={inputClass(false)}
        >
          {PAESI.map((p) => (
            <option key={p.iso2} value={p.nome}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={set('email')}
          className={inputClass(!!errors.email)}
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="prefissoTelefono" className="block text-sm font-medium text-gray-700 mb-1">
            Prefisso
          </label>
          <select
            id="prefissoTelefono"
            value={fields.prefissoTelefono}
            onChange={handlePrefissoChange}
            className={inputClass(false)}
          >
            {PAESI.map((p) => (
              <option key={p.iso2} value={p.prefisso}>
                {p.prefisso} — {p.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="numeroTelefono" className="block text-sm font-medium text-gray-700 mb-1">
            Telefono
          </label>
          <input
            id="numeroTelefono"
            type="tel"
            value={fields.numeroTelefono}
            onChange={set('numeroTelefono')}
            className={inputClass(!!errors.numeroTelefono)}
          />
          {errors.numeroTelefono && (
            <p className="mt-1 text-xs text-red-600">{errors.numeroTelefono}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={fields.password}
          onChange={set('password')}
          className={inputClass(!!errors.password)}
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50"
      >
        {loading ? 'Registrazione in corso…' : 'Registrati'}
      </button>
    </form>
  )
}
