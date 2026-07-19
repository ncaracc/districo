'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/password-input'
import { AuthCard } from '@/components/auth-card'
import { applyRememberChoice } from '@/lib/auth/remember'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [rimaniConnesso, setRimaniConnesso] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)

  function validate(email: string, password: string) {
    const errs: { email?: string; password?: string } = {}
    if (!email) {
      errs.email = 'Inserisci la tua email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Email non valida'
    }
    if (!password) {
      errs.password = 'Inserisci la password'
    }
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value

    const errs = validate(email, password)
    setErrors(errs)

    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      setErrors({
        form:
          error.message === 'Invalid login credentials'
            ? 'Email o password non corretti'
            : error.message === 'Email not confirmed'
              ? 'Devi prima verificare la tua email'
              : 'Errore di accesso, riprova',
      })
      return
    }

    applyRememberChoice(rimaniConnesso)

    router.push('/lavori')
    router.refresh()
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {errors.form && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>
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
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
              errors.email
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
            }`}
            placeholder="nome@esempio.it"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
              errors.password
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={rimaniConnesso}
              onChange={(e) => setRimaniConnesso(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-primary focus:ring-primary"
            />
            Rimani connesso
          </label>
          <a href="/password-dimenticata" className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900">
            Hai dimenticato la password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {loading ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Non hai un account?{' '}
        <a href="/registrazione" className="font-medium text-gray-900 underline underline-offset-2">
          Registrati
        </a>
      </p>
    </AuthCard>
  )
}
