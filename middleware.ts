import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/registrazione',
  '/invito',
  '/privacy',
  '/cookie-policy',
  '/password-dimenticata',
  '/reimposta-password',
  // Webhook Stripe (2026-08-21, vedi CLAUDE.md): chiamata server-to-server
  // da Stripe, mai da un browser con sessione — senza questa eccezione il
  // gate `!user && !isPublic` sotto la reindirizzerebbe sempre a /login,
  // rompendo il webhook. Bug reale trovato testando il flusso end-to-end
  // (la richiesta di Stripe avrebbe ricevuto un redirect invece della
  // risposta 200/400 del route handler). L'autenticazione della richiesta
  // resta comunque garantita — non da qui, ma dalla verifica della firma
  // HMAC dentro app/api/stripe/webhook/route.ts.
  '/api/stripe/webhook',
]

// Nomi cookie del meccanismo "Rimani connesso", vedi lib/auth/remember.ts.
const REMEMBER_CHOICE_COOKIE = 'districo-remember-choice'
const SESSION_ALIVE_COOKIE = 'districo-session-alive'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user: utenteGrezzo } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Landing page pubblica (2026-08-19, vedi CLAUDE.md): '/' è pubblica ma
  // va confrontata per uguaglianza esatta, MAI aggiunta a PUBLIC_PATHS
  // sopra — quell'array usa startsWith, e '/' è prefisso di ogni altro
  // pathname dell'app (avrebbe reso pubblico l'intero sito).
  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // "Rimani connesso" deselezionato: al login è stato scritto un cookie di
  // sessione (SESSION_ALIVE, senza maxAge) accanto al marker persistente
  // REMEMBER_CHOICE. Se il browser è stato chiuso e riaperto, SESSION_ALIVE
  // sparisce mentre il cookie di Supabase (maxAge fisso, non configurabile)
  // sopravvive: qui lo trattiamo come sessione scaduta.
  const rememberChoice = request.cookies.get(REMEMBER_CHOICE_COOKIE)?.value
  const sessionAlive = request.cookies.get(SESSION_ALIVE_COOKIE)?.value
  const sessioneNonRicordataScaduta = !!utenteGrezzo && rememberChoice === '0' && !sessionAlive

  // Correzione 2026-08-19 (vedi CLAUDE.md — "routing landing/logout"): prima
  // di questa sessione `sessioneNonRicordataScaduta` forzava SEMPRE un
  // redirect a /login, anche su un path pubblico come '/' — un visitatore
  // con un vecchio cookie Supabase ancora presente ma "scaduto per policy"
  // (browser riaperto senza aver spuntato "Rimani connesso") veniva quindi
  // rimbalzato sulla pagina di login invece di vedere la landing, pur
  // essendo '/' nominalmente pubblica. Fix: il signOut scatta comunque
  // (pulizia cookie, invariato), ma da qui in poi `user` è trattato come
  // null in questo caso — ogni controllo sotto (gate di autenticazione,
  // redirect '/'/'/login' → /lavori) ragiona quindi in modo coerente su
  // un utente "effettivamente" autenticato, non sul solo cookie grezzo.
  if (sessioneNonRicordataScaduta) {
    // Invalida anche lato Supabase (scope globale di default), non solo il
    // marker applicativo: il signOut aggiorna i cookie su supabaseResponse
    // tramite il callback setAll sopra, riportati su qualunque risposta si
    // finisca per restituire (redirect o meno) più sotto.
    await supabase.auth.signOut()
  }
  const user = sessioneNonRicordataScaduta ? null : utenteGrezzo

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (user && (pathname === '/' || pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/lavori'
    return NextResponse.redirect(url)
  }

  // /statistiche non esiste più (unificazione Dashboard/Conclusi in
  // un'unica vista con filtri, 2026-08-16, vedi CLAUDE.md) — redirect di
  // cortesia per bookmark/link vecchi verso "Tutti" (non più "Completati",
  // rinominato dal 2026-08-17: il vecchio "Conclusi" mostrava insieme
  // completato+rifiutato, "Tutti" resta il filtro più vicino a quella
  // vista come superset, "Completati" ora esclude i rifiutati). Elimina
  // anche alla radice l'intero meccanismo "sezione di origine" (cookie
  // scritto qui su /lavori vs /statistiche, lib/nav/origine-sezione.ts,
  // componente OrigineLink, prefetch disabilitato sui Link di menu)
  // rimosso in questa stessa sessione: esisteva solo per distinguere due
  // sezioni che ora sono una sola, il problema che risolveva smette di
  // esistere strutturalmente.
  if (pathname === '/statistiche') {
    const url = request.nextUrl.clone()
    url.pathname = '/lavori'
    url.search = 'filtro=tutti'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
