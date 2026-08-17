import Link from 'next/link'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Header pubblico della landing (2026-08-19, vedi CLAUDE.md) — sostituisce
// l'AppNav interno (pensato per un utente già loggato, nascosto su '/' per
// gli anonimi, vedi components/app-nav.tsx) con un header minimale: logo,
// ancore alle sezioni della pagina (solo desktop, nessun hamburger — la
// pagina è già pensata per essere scorsa per intero, non serve un menu
// mobile separato) e i due CTA di ingresso all'app. Stesso contenitore
// largo/stile sticky+bordo dell'header interno per coerenza visiva.
const ANCORE = [
  { href: '#come-funziona', label: 'Come funziona' },
  { href: '#funzioni', label: 'Funzioni' },
  { href: '#prezzi', label: 'Prezzi' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className={`${CONTENITORE_LARGO} flex items-center justify-between gap-4 px-4 py-4`}>
        <a href="#top" className="flex items-center py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/districo_logo.svg" alt="Districo" className="h-10 w-auto sm:h-12" />
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {ANCORE.map((a) => (
            <a key={a.href} href={a.href} className="text-sm text-gray-600 transition-colors hover:text-gray-900">
              {a.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Accedi
          </Link>
          <Link
            href="/registrazione"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:px-4"
          >
            Prova gratis
          </Link>
        </div>
      </div>
    </header>
  )
}
