'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearRememberCookies } from '@/lib/auth/remember'

const VOCI_ATTIVE = [
  { href: '/lavori', label: 'Dashboard' },
  { href: '/clienti', label: 'Clienti' },
  { href: '/fornitori', label: 'Fornitori' },
  { href: '/statistiche', label: 'Conclusi' },
]

// Profilo/Impostazioni ha un trattamento a parte (icona ingranaggio invece di
// testo su desktop, stesso principio già applicato a "Esci"): non fa parte
// della normale navigazione testuale, quindi resta fuori da VOCI_ATTIVE.
const VOCE_PROFILO = { href: '/profilo/impostazioni', label: 'Profilo/Impostazioni' }

const VOCI_IN_ARRIVO: string[] = []

// Pagine pubbliche raggiungibili anche da chi non è loggato.
const PAGINE_PUBBLICHE = ['/privacy', '/cookie-policy', '/password-dimenticata', '/reimposta-password', '/registrazione']

// Una voce è "attiva" sulla pagina esatta o su una sua sotto-pagina (es.
// /lavori/[id], /clienti/nuovo) — non solo su un match esatto dell'href.
function voceAttiva(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// Icona "power" (spegnimento/uscita): linee sottili, nessun riempimento,
// stesso stile stroke-based dell'hamburger già in uso in questo componente.
// Disegnata a mano (path circolare aperto + linea verticale, forma standard
// dell'icona "power" universale), nessuna libreria di icone in uso nel
// progetto: coerente con il pattern già seguito altrove (password-input,
// hamburger, favicon) di SVG inline senza dipendenze aggiuntive.
function IconaPower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" strokeLinecap="round" />
      <line x1="12" y1="2" x2="12" y2="12" strokeLinecap="round" />
    </svg>
  )
}

// Icona "ingranaggio" (impostazioni): stessa forma standard/universale del
// simbolo "settings", stesso trattamento stroke-based di IconaPower — nessuna
// libreria di icone, solo SVG inline.
function IconaImpostazioni({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function AppNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [uscendo, setUscendo] = useState(false)

  // Sulla pagina di login l'header non compare affatto (resta solo il footer).
  if (pathname === '/login') return null

  // Privacy/Cookie Policy sono raggiungibili anche da chi non è loggato: in quel
  // caso non deve vedere menù né bottone Esci (nessun contenuto riservato da esporre).
  if (!isLoggedIn && PAGINE_PUBBLICHE.includes(pathname)) return null

  async function handleLogout() {
    setUscendo(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      clearRememberCookies()
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
      {/* Contenitore indipendente dalla larghezza del contenuto della pagina
          ospitante: stessa larghezza piena + stesso padding (px-4 / lg:px-12)
          del "breakout" usato da Dashboard/Conclusi (app/(app)/lavori/page.tsx),
          non il max-w-5xl mx-auto di prima — così i bordi di header/footer
          coincidono sempre con quelli della tabella su schermi lg+,
          indipendentemente da quanto sono strette le altre pagine (Clienti,
          Fornitori, dettaglio Lavoro, Profilo), che restano centrate. */}
      <div className="px-4 py-5 lg:px-12 flex items-center justify-between md:grid md:grid-cols-3 md:items-center">
        <Link href="/lavori" className="flex items-center py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/districo_logo.svg" alt="Districo" className="h-14 w-auto" />
        </Link>

        {/* Navigazione desktop: sempre visibile, centrata orizzontalmente.
            La voce della pagina corrente e l'hover condividono lo stesso
            indicatore minimale (sottile linea sotto la voce), solo
            l'intensità cambia: pieno/scuro se attiva, chiaro al passaggio
            del mouse — niente sfondo pieno o bordi vistosi. */}
        <nav className="hidden md:flex md:items-center md:justify-center md:gap-6">
          {VOCI_ATTIVE.map((voce) => {
            const attiva = voceAttiva(pathname, voce.href)
            return (
              <Link
                key={voce.href}
                href={voce.href}
                className={`border-b-2 pb-0.5 text-sm transition-colors ${
                  attiva
                    ? 'border-gray-900 font-medium text-gray-900'
                    : 'border-transparent text-gray-700 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {voce.label}
              </Link>
            )
          })}
          {VOCI_IN_ARRIVO.map((label) => (
            <span key={label} className="border-b-2 border-transparent pb-0.5 text-sm text-gray-300 cursor-not-allowed">
              {label}
            </span>
          ))}
        </nav>

        <div className="hidden md:flex md:items-center md:justify-end md:gap-1">
          <Link
            href={VOCE_PROFILO.href}
            aria-label={VOCE_PROFILO.label}
            title={VOCE_PROFILO.label}
            className={`rounded-lg p-2 transition-colors hover:bg-gray-50 ${
              voceAttiva(pathname, VOCE_PROFILO.href) ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <IconaImpostazioni className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={uscendo}
            aria-label={uscendo ? 'Uscita in corso…' : 'Esci'}
            title={uscendo ? 'Uscita in corso…' : 'Esci'}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <IconaPower className="h-5 w-5" />
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
          <ul className="px-4 py-2">
            {VOCI_ATTIVE.map((voce) => {
              const attiva = voceAttiva(pathname, voce.href)
              return (
                <li key={voce.href}>
                  <Link
                    href={voce.href}
                    onClick={() => setAperto(false)}
                    className={`block rounded-lg border-l-2 py-2.5 pl-[10px] pr-2 text-sm transition-colors hover:bg-gray-50 ${
                      attiva ? 'border-gray-900 font-medium text-gray-900' : 'border-transparent text-gray-600'
                    }`}
                  >
                    {voce.label}
                  </Link>
                </li>
              )
            })}
            {VOCI_IN_ARRIVO.map((label) => (
              <li key={label}>
                <span className="flex cursor-not-allowed items-center justify-between border-l-2 border-transparent py-2.5 pl-[10px] pr-2 text-sm text-gray-400">
                  {label}
                  <span className="text-xs text-gray-300">in arrivo</span>
                </span>
              </li>
            ))}
            <li className="mt-1 border-t border-gray-100 pt-1">
              <Link
                href={VOCE_PROFILO.href}
                onClick={() => setAperto(false)}
                className={`flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                  voceAttiva(pathname, VOCE_PROFILO.href) ? 'font-medium text-gray-900' : 'text-gray-600'
                }`}
              >
                <IconaImpostazioni className="h-4 w-4" />
                {VOCE_PROFILO.label}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={uscendo}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <IconaPower className="h-4 w-4" />
                {uscendo ? 'Uscita in corso…' : 'Esci'}
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
