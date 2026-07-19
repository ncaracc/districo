'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const VOCI_ATTIVE = [
  { href: '/lavori', label: 'Lavori' },
  { href: '/clienti', label: 'Clienti' },
]

const VOCI_IN_ARRIVO = ['Fornitori', 'Statistica', 'Profilo/Impostazioni']

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [uscendo, setUscendo] = useState(false)

  // Sulla pagina di login l'header non compare affatto (resta solo il footer).
  if (pathname === '/login') return null

  async function handleLogout() {
    setUscendo(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setAperto(false)
      router.push('/login')
      router.refresh()
    } finally {
      // Il componente non si smonta quando si naviga su /login (ritorna solo null),
      // quindi lo stato persiste: senza questo reset "uscendo" resterebbe true per
      // sempre alla sessione successiva, mostrando "Uscita in corso…" a riposo.
      setUscendo(false)
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between md:grid md:grid-cols-3 md:items-center">
        <Link href="/lavori" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/districo_logo.svg" alt="Districo" className="h-9 w-auto" />
        </Link>

        {/* Navigazione desktop: sempre visibile, centrata orizzontalmente */}
        <nav className="hidden md:flex md:items-center md:justify-center md:gap-6">
          {VOCI_ATTIVE.map((voce) => (
            <Link
              key={voce.href}
              href={voce.href}
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              {voce.label}
            </Link>
          ))}
          {VOCI_IN_ARRIVO.map((label) => (
            <span key={label} className="text-sm text-gray-300 cursor-not-allowed">
              {label}
            </span>
          ))}
        </nav>

        <div className="hidden md:flex md:justify-end">
          <button
            type="button"
            onClick={handleLogout}
            disabled={uscendo}
            className="text-sm text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            {uscendo ? 'Uscita in corso…' : 'Esci'}
          </button>
        </div>

        {/* Hamburger: solo mobile, comportamento invariato */}
        <button
          type="button"
          onClick={() => setAperto((v) => !v)}
          aria-label={aperto ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={aperto}
          className="-mr-2 p-2 text-gray-700 hover:text-gray-900 md:hidden"
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
        <nav className="border-t border-gray-200 bg-white md:hidden">
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
