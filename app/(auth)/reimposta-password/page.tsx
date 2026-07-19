'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/password-input'

type Stato = 'verifica' | 'pronto' | 'non_valido' | 'aggiornata'

export default function ReimpostaPasswordPage() {
  const [stato, setStato] = useState<Stato>('verifica')
  const [password, setPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confermaPassword?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'INITIAL_SESSION' && session)) {
        setStato('pronto')
      }
    })

    // Fallback: se l'evento non arriva (link non valido/scaduto), il link non
    // conteneva un token utilizzabile — segnaliamo l'errore dopo una breve attesa
    // invece di lasciare la pagina bloccata su "verifica in corso".
    const timeout = setTimeout(() => {
      setStato((s) => (s === 'verifica' ? 'non_valido' : s))
    }, 3000)

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  function validate() {
    const errs: { password?: string; confermaPassword?: string } = {}
    if (!password) {
      errs.password = 'Campo obbligatorio'
    } else if (password.length < 8) {
      errs.password = 'Almeno 8 caratteri'
    }
    if (confermaPassword !== password) {
      errs.confermaPassword = 'Le password non coincidono'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setLoading(false)
      setErrors({ form: 'Errore durante l\'aggiornamento, riprova' })
      return
    }

    // La sessione di recovery non deve restare attiva: si chiede un nuovo login
    // con la password appena impostata.
    await supabase.auth.signOut()
    setLoading(false)
    setStato('aggiornata')
  }

  if (stato === 'verifica') {
    return (
      <div className="rounded-2xl bg-gray-50 shadow-sm p-6 sm:p-8 text-center">
        <p className="text-sm text-gray-600">Verifica del link in corso…</p>
      </div>
    )
  }

  if (stato === 'non_valido') {
    return (
      <div className="rounded-2xl bg-gray-50 shadow-sm p-6 sm:p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Link non valido o scaduto</h1>
        <p className="mt-3 text-sm text-gray-600">
          Il link per reimpostare la password non è più valido. Richiedine uno nuovo.
        </p>
        <a
          href="/password-dimenticata"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Richiedi un nuovo link
        </a>
      </div>
    )
  }

  if (stato === 'aggiornata') {
    return (
      <div className="rounded-2xl bg-gray-50 shadow-sm p-6 sm:p-8 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Password aggiornata</h1>
        <p className="mt-3 text-sm text-gray-600">Accedi con la tua nuova password.</p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Vai al login
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gray-50 shadow-sm p-6 sm:p-8">
      <h1 className="text-lg font-semibold text-gray-900">Imposta una nuova password</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
        {errors.form && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Nuova password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
              errors.password
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
            }`}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confermaPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Conferma password
          </label>
          <PasswordInput
            id="confermaPassword"
            autoComplete="new-password"
            value={confermaPassword}
            onChange={(e) => setConfermaPassword(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
              errors.confermaPassword
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
            }`}
          />
          {errors.confermaPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confermaPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {loading ? 'Aggiornamento…' : 'Aggiorna password'}
        </button>
      </form>
    </div>
  )
}
