'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const VOCI_ATTIVE = [
  { href: '/lavori', label: 'Lavori' },
  { href: '/clienti', label: 'Clienti' },
  { href: '/clienti/nuovo', label: 'Nuovo cliente' },
]

const VOCI_IN_ARRIVO = ['Fornitori', 'Statistica', 'Profilo/Impostazioni']

export function AppNav() {
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [uscendo, setUscendo] = useState(false)

  async function handleLogout() {
    setUscendo(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">Districo</span>
        <button
          type="button"
          onClick={() => setAperto((v) => !v)}
          aria-label={aperto ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={aperto}
          className="-mr-2 p-2 text-gray-700 hover:text-gray-900"
        >
          {aperto ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {aperto && (
        <nav className="border-t border-gray-200 bg-white">
          <ul className="max-w-2xl mx-auto px-4 py-2">
            {VOCI_ATTIVE.map((voce) => (
              <li key={voce.href}>
                <Link
                  href={voce.href}
                  onClick={() => setAperto(false)}
                  className="block rounded-lg px-2 py-2.5 text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  {voce.label}
                </Link>
              </li>
            ))}
            {VOCI_IN_ARRIVO.map((label) => (
              <li key={label}>
                <span className="flex cursor-not-allowed items-center justify-between px-2 py-2.5 text-sm text-gray-400">
                  {label}
                  <span className="text-xs text-gray-300">in arrivo</span>
                </span>
              </li>
            ))}
            <li className="mt-1 border-t border-gray-100 pt-1">
              <button
                type="button"
                onClick={handleLogout}
                disabled={uscendo}
                className="block w-full rounded-lg px-2 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {uscendo ? 'Uscita in corso…' : 'Esci'}
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
