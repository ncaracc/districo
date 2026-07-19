'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthCard } from '@/components/auth-card'

export default function PasswordDimenticataPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviata, setInviata] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email non valida')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.districo.it'}/reimposta-password`,
    })
    setLoading(false)

    if (error) {
      setError('Errore durante l\'invio, riprova')
      return
    }

    // Messaggio identico indipendentemente dal fatto che l'email esista o meno,
    // per non rivelare quali indirizzi sono registrati.
    setInviata(true)
  }

  return (
    <AuthCard>
      {inviata ? (
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">Controlla la tua email</h1>
          <p className="mt-3 text-sm text-gray-600">
            Se l&apos;indirizzo <span className="font-medium text-gray-900">{email}</span> è registrato,
            riceverai a breve un&apos;email con le istruzioni per reimpostare la password.
          </p>
          <a href="/login" className="mt-6 inline-block text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900">
            Torna al login
          </a>
        </div>
      ) : (
        <>
          <h1 className="text-lg font-semibold text-gray-900">Password dimenticata</h1>
          <p className="mt-2 text-sm text-gray-600">
            Inserisci la tua email: ti invieremo un link per reimpostare la password.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors"
                placeholder="nome@esempio.it"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Invio in corso…' : 'Invia link di reset'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <a href="/login" className="font-medium text-gray-900 underline underline-offset-2">
              Torna al login
            </a>
          </p>
        </>
      )}
    </AuthCard>
  )
}
