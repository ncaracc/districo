'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const errs = validate(email, password)
    setErrors(errs)

    if (Object.keys(errs).length > 0) return

    // step 3: chiamata Supabase
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Accedi</h1>
        <p className="mt-1 text-sm text-gray-500">Bentornato su Districo</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
              errors.password
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
            }`}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-colors"
        >
          Accedi
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Non hai un account?{' '}
        <a href="/registrazione" className="font-medium text-gray-900 underline underline-offset-2">
          Registrati
        </a>
      </p>
    </div>
  )
}
