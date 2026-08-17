'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearRememberCookies } from '@/lib/auth/remember'
import { IconaChiudi } from '@/components/icons'
import { Avatar } from '@/components/avatar'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

// "Conclusi" rimossa (unificazione Dashboard/Conclusi in un'unica vista con
// filtri, 2026-08-16, vedi CLAUDE.md) — /statistiche non esiste più, i
// lavori conclusi/rifiutati si trovano ora dentro /lavori con un filtro.
// "Dashboard" rinominata "Lavori": non rappresenta più solo la vista
// "in corso" ma tutti i lavori con filtro — nome più diretto, coerente col
// path (/lavori) e con l'etichetta già usata per la voce di menu
// equivalente ("Lavori associati" su Cliente, ecc.). Scelta stilistica, non
// vincolata dalla richiesta.
// "Catalogo" aggiunta il 2026-08-17 (vedi CLAUDE.md — "Catalogo Referenze
// standalone + revisione modale Acquisto"): sezione dedicata a Categorie/
// Referenze, spostate da Profilo/Impostazioni — non dentro Impostazioni né
// dentro Fornitori (le Referenze sono legate a una Categoria personale, non
// a un Fornitore — vedi CLAUDE.md 14/8), come richiesto esplicitamente.
const VOCI_ATTIVE = [
  { href: '/lavori', label: 'Lavori' },
  { href: '/clienti', label: 'Clienti' },
  { href: '/fornitori', label: 'Fornitori' },
  { href: '/catalogo', label: 'Catalogo' },
]

// Profilo/Impostazioni ha un trattamento a parte (icone invece di testo su
// desktop, stesso principio già applicato a "Esci"): non fa parte della
// normale navigazione testuale, quindi restano fuori da VOCI_ATTIVE.
// Due punti di accesso distinti (2026-08-19, vedi CLAUDE.md —
// riorganizzazione Profilo/Impostazioni): prima un'unica voce/icona
// ingranaggio per una pagina che mescolava dati anagrafici e preferenze
// applicative — ora l'avatar porta ai dati anagrafici (Profilo, nuova
// pagina), l'ingranaggio resta dov'era per le preferenze (Impostazioni).
const VOCE_PROFILO = { href: '/profilo', label: 'Profilo' }
const VOCE_IMPOSTAZIONI = { href: '/profilo/impostazioni', label: 'Impostazioni' }

const VOCI_IN_ARRIVO: string[] = []

// Pagine pubbliche raggiungibili anche da chi non è loggato. '/' aggiunta
// per la landing page (2026-08-19, vedi CLAUDE.md): confronto per
// uguaglianza esatta (Array.includes, non un prefisso) quindi nessun
// rischio di nascondere l'header su altre pagine — la landing ha un proprio
// header pubblico (components/landing/landing-header.tsx), l'AppNav interno
// (pensato per un utente già loggato) non deve comparire sopra di esso.
const PAGINE_PUBBLICHE = ['/', '/privacy', '/cookie-policy', '/password-dimenticata', '/reimposta-password', '/registrazione']

// Una voce è "attiva" sulla pagina esatta o su una sua sotto-pagina (es.
// /lavori/[id], /clienti/nuovo) — non solo su un match esatto dell'href.
// Prima dell'unificazione Dashboard/Conclusi (2026-08-16) questa funzione
// veniva scavalcata su Cliente/Fornitore/Dettaglio Lavoro da una logica di
// "provenienza" (inCatenaConOrigine, rimossa): esisteva solo per decidere
// se evidenziare "Dashboard" o "Conclusi", due sezioni ora unificate in una
// — senza quella distinzione, il match per prefisso qui sotto è già di per
// sé corretto per ogni pagina di dettaglio (nessuna eccezione da gestire).
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

// Badge numerico rosso (stessa semantica "a LED" già riservata agli stati
// urgenti/bloccanti in tutta l'app — coerente con l'uso di rosso per i
// satelliti scaduti). Nascosto del tutto se il conteggio è 0, non un badge
// con "0" visibile.
function BadgeConteggio({ conteggio }: { conteggio: number }) {
  if (conteggio <= 0) return null
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
      {conteggio}
    </span>
  )
}

export function AppNav({
  isLoggedIn,
  appuntamentiScaduti = 0,
  nome = '',
  cognome = '',
  immagineUrl = null,
}: {
  isLoggedIn: boolean
  // Conteggio appuntamenti scaduti (data passata, mai conclusi) su tutti i
  // Lavori dell'artigiano — calcolato server-side in app/layout.tsx
  // (RPC appuntamenti_scaduti_count, migration 0027) e passato qui solo per
  // il rendering. Il badge è agganciato alla voce "Lavori": cliccarlo porta
  // già lì, nessun elenco/dropdown dedicato in questo sprint. Resta un
  // alert SLA indipendente dal filtro attivo su quella pagina — confermato
  // esplicitamente con l'utente in sessione (2026-08-16, vedi CLAUDE.md) di
  // NON farlo diventare "conteggio dei lavori nel filtro corrente": quel
  // numero vive ora nel primo KPI della pagina /lavori stessa, il badge qui
  // resta un alert, non un contatore.
  appuntamentiScaduti?: number
  // Avatar (2026-08-19, vedi CLAUDE.md): nome/cognome/immagineUrl
  // dell'artigiano loggato, calcolati server-side in app/layout.tsx —
  // vuoti/null quando non loggato (la voce Profilo comunque non è
  // renderizzata in quel caso, isLoggedIn la esclude più sotto).
  nome?: string
  cognome?: string
  immagineUrl?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [aperto, setAperto] = useState(false)
  const [uscendo, setUscendo] = useState(false)

  // Chiusura con Esc + blocco scroll dello sfondo mentre il pannello mobile è
  // aperto — stesso pattern già in uso in components/modal.tsx. Va dichiarato
  // prima di qualunque return condizionale (Rules of Hooks: un bug di questo
  // tipo era già emerso in passato in fornitore-sedi.tsx, vedi CLAUDE.md).
  useEffect(() => {
    if (!aperto) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAperto(false)
    }
    document.addEventListener('keydown', onKeyDown)

    const overflowPrecedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowPrecedente
    }
  }, [aperto])

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
      // Post-logout va sempre alla landing pubblica ('/'), non più a
      // '/login' (2026-08-19, vedi CLAUDE.md — "routing landing/logout"):
      // chi esce dall'app deve rivedere la pagina pubblica, non un form di
      // accesso — se vuole rientrare trova comunque "Accedi" nell'header
      // della landing.
      router.push('/')
      router.refresh()
    } finally {
      // Il componente non si smonta quando si naviga su '/' da anonimo
      // (ritorna solo null, essendo '/' in PAGINE_PUBBLICHE sotto), quindi
      // lo stato persiste: senza questo reset "uscendo" resterebbe true per
      // sempre alla sessione successiva, mostrando "Uscita in corso…" a riposo.
      setUscendo(false)
    }
  }

  return (
    <>
    <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
      {/* Stesso contenitore largo delle pagine principali (sessione "coerenza
          layout desktop", 2026-08-10 — vedi CLAUDE.md e
          lib/layout-container.ts): i bordi di header/footer coincidono così
          con quelli del contenuto su schermi ampi, sia per le pagine che
          usano CONTENITORE_LARGO sia per quelle più strette
          (CONTENITORE_STRETTO), tutte centrate allo stesso modo. */}
      <div className={`${CONTENITORE_LARGO} px-4 py-5 flex items-center justify-between md:grid md:grid-cols-3 md:items-center`}>
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
                {voce.href === '/lavori' && <BadgeConteggio conteggio={appuntamentiScaduti} />}
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
          {/* Avatar → Profilo: match ESATTO su /profilo, non con
              voceAttiva() (prefisso) — /profilo/impostazioni inizia anch'essa
              per "/profilo/", il match a prefisso accenderebbe entrambe le
              icone insieme quando si è su Impostazioni. */}
          <Link
            href={VOCE_PROFILO.href}
            aria-label={VOCE_PROFILO.label}
            title={VOCE_PROFILO.label}
            className={`rounded-lg p-1 transition-opacity hover:opacity-80 ${
              pathname === VOCE_PROFILO.href ? 'ring-2 ring-gray-900 ring-offset-2' : ''
            }`}
          >
            <Avatar nome={nome} cognome={cognome} immagineUrl={immagineUrl} taglia="sm" />
          </Link>
          <Link
            href={VOCE_IMPOSTAZIONI.href}
            aria-label={VOCE_IMPOSTAZIONI.label}
            title={VOCE_IMPOSTAZIONI.label}
            className={`rounded-lg p-2 transition-colors hover:bg-gray-50 ${
              voceAttiva(pathname, VOCE_IMPOSTAZIONI.href) ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900'
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

        {/* Hamburger: solo mobile. Non diventa più una X al click (era così
            prima): il pannello a schermo intero copre anche quest'area, la
            X per chiudere è quella dentro al pannello stesso — l'etichetta
            resta "Apri menu" anche a pannello aperto (invece di alternare con
            "Chiudi menu") per non avere due controlli con lo stesso nome
            accessibile in contemporanea sullo schermo; aria-expanded comunica
            comunque lo stato a chi usa uno screen reader. */}
        <button
          type="button"
          onClick={() => setAperto((v) => !v)}
          aria-label="Apri menu"
          aria-expanded={aperto}
          className="-mr-2 p-2 text-gray-700 hover:text-gray-900 md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Menu mobile: pannello overlay a schermo intero (restyling 2026-08-02,
          vedi CLAUDE.md — sostituisce il vecchio pannello che spingeva il
          contenuto della pagina verso il basso). Backdrop e pannello restano
          sempre nel DOM (mai un `{aperto && ...}` che li smonta): l'apertura/
          chiusura è solo una transizione CSS su opacità/traslazione, altrimenti
          l'animazione di chiusura non avrebbe il tempo di essere vista. */}
      <div
        onClick={() => setAperto(false)}
        aria-hidden={!aperto}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          aperto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <nav
        aria-hidden={!aperto}
        className={`fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
          aperto ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/districo_logo.svg" alt="Districo" className="h-10 w-auto" />
          <button
            type="button"
            onClick={() => setAperto(false)}
            aria-label="Chiudi menu"
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <IconaChiudi className="h-6 w-6" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto px-4 py-4">
          {VOCI_ATTIVE.map((voce) => {
            const attiva = voceAttiva(pathname, voce.href)
            return (
              <li key={voce.href}>
                <Link
                  href={voce.href}
                  onClick={() => setAperto(false)}
                  className={`block rounded-lg border-l-2 py-4 pl-3 pr-2 text-xl transition-colors hover:bg-gray-50 ${
                    attiva ? 'border-gray-900 font-medium text-gray-900' : 'border-transparent text-gray-600'
                  }`}
                >
                  {voce.label}
                  {voce.href === '/lavori' && <BadgeConteggio conteggio={appuntamentiScaduti} />}
                </Link>
              </li>
            )
          })}
          {VOCI_IN_ARRIVO.map((label) => (
            <li key={label}>
              <span className="flex cursor-not-allowed items-center justify-between border-l-2 border-transparent py-4 pl-3 pr-2 text-xl text-gray-400">
                {label}
                <span className="text-sm text-gray-300">in arrivo</span>
              </span>
            </li>
          ))}
          <li className="mt-2 border-t border-gray-100 pt-2">
            {/* Match esatto per lo stesso motivo del desktop sopra. */}
            <Link
              href={VOCE_PROFILO.href}
              onClick={() => setAperto(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-4 text-lg transition-colors hover:bg-gray-50 ${
                pathname === VOCE_PROFILO.href ? 'font-medium text-gray-900' : 'text-gray-600'
              }`}
            >
              <Avatar nome={nome} cognome={cognome} immagineUrl={immagineUrl} taglia="sm" />
              {VOCE_PROFILO.label}
            </Link>
            <Link
              href={VOCE_IMPOSTAZIONI.href}
              onClick={() => setAperto(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-4 text-lg transition-colors hover:bg-gray-50 ${
                voceAttiva(pathname, VOCE_IMPOSTAZIONI.href) ? 'font-medium text-gray-900' : 'text-gray-600'
              }`}
            >
              <IconaImpostazioni className="h-5 w-5" />
              {VOCE_IMPOSTAZIONI.label}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={uscendo}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-4 text-left text-lg text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <IconaPower className="h-5 w-5" />
              {uscendo ? 'Uscita in corso…' : 'Esci'}
            </button>
          </li>
        </ul>
      </nav>
    </header>
    </>
  )
}
