'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/password-input'
import { PAESI, PAESE_DEFAULT, trovaPaese } from '@/lib/paesi'

type Fields = {
  nome: string
  cognome: string
  ragioneSociale: string
  partitaIva: string
  specializzazione: string
  specializzazioneAltro: string
  via: string
  civico: string
  cap: string
  localita: string
  provincia: string
  paese: string
  prefissoTelefono: string
  numeroTelefono: string
  email: string
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
  via: '',
  civico: '',
  cap: '',
  localita: '',
  provincia: '',
  paese: PAESE_DEFAULT,
  prefissoTelefono: trovaPaese(PAESE_DEFAULT)?.prefisso ?? '+39',
  numeroTelefono: '',
  email: '',
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

export function RegistrazioneForm({ specializzazioni }: { specializzazioni: string[] }) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialFields)
  const [prefissoManuale, setPrefissoManuale] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)
  const [registrato, setRegistrato] = useState(false)

  const paeseSelezionato = trovaPaese(fields.paese)
  const labelProvincia = paeseSelezionato?.labelProvincia ?? null

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
      provincia: infoNuovoPaese?.labelProvincia ? f.provincia : '',
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
    if (f.partitaIva && f.paese === 'Italia' && !/^\d{11}$/.test(f.partitaIva)) {
      errs.partitaIva = 'La P.IVA italiana deve contenere 11 cifre numeriche'
    }
    if (!f.specializzazione) errs.specializzazione = 'Seleziona una specializzazione'
    if (f.specializzazione === ALTRO && !f.specializzazioneAltro) {
      errs.specializzazioneAltro = 'Indica la tua specializzazione'
    }
    if (!f.via) errs.via = 'Campo obbligatorio'
    if (!f.civico) errs.civico = 'Campo obbligatorio'
    if (!f.cap) errs.cap = 'Campo obbligatorio'
    if (!f.localita) errs.localita = 'Campo obbligatorio'
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
          ragione_sociale: fields.ragioneSociale || null,
          partita_iva: fields.partitaIva || null,
          specializzazione,
          telefono,
          via: fields.via,
          civico: fields.civico,
          cap: fields.cap,
          localita: fields.localita,
          provincia: fields.provincia || null,
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
      <div className="rounded-lg bg-gray-50 px-4 py-6 text-center">
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="ragioneSociale"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
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
            className={inputClass(!!errors.partitaIva)}
          />
          {errors.partitaIva && <p className="mt-1 text-xs text-red-600">{errors.partitaIva}</p>}
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
            CAP / Postal code
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
            Città
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
        {labelProvincia && (
          <div>
            <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">
              {labelProvincia} <span className="text-gray-400">(opz.)</span>
            </label>
            <input
              id="provincia"
              value={fields.provincia}
              onChange={set('provincia')}
              className={inputClass(false)}
            />
          </div>
        )}
        <div className={labelProvincia ? '' : 'col-span-2'}>
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

      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label
            htmlFor="confermaPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Conferma password
          </label>
          <PasswordInput
            id="confermaPassword"
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
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50"
      >
        {loading ? 'Registrazione in corso…' : 'Registrati'}
      </button>
    </form>
  )
}
