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
]

// Nomi cookie del meccanismo "Rimani connesso", vedi lib/auth/remember.ts.
const REMEMBER_CHOICE_COOKIE = 'districo-remember-choice'
const SESSION_ALIVE_COOKIE = 'districo-session-alive'

// Provenienza Dettaglio Lavoro (sessione correzione 2026-08-13, vedi
// CLAUDE.md e lib/nav/origine-sezione.ts): scritto SOLO su una visita
// esatta a /lavori o /statistiche (mai su una sotto-pagina, es. /lavori/[id]
// o /lavori/nuovo) — la "sezione di origine" resta quindi quella
// dell'ultima visita reale a Dashboard/Conclusi, indipendentemente da
// quante pagine intermedie (Cliente, Fornitore, Dettaglio Lavoro...) si
// attraversano dopo. Cookie di sessione (nessun maxAge).
const ORIGINE_SEZIONE_COOKIE = 'districo_origine_sezione'

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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // "Rimani connesso" deselezionato: al login è stato scritto un cookie di
  // sessione (SESSION_ALIVE, senza maxAge) accanto al marker persistente
  // REMEMBER_CHOICE. Se il browser è stato chiuso e riaperto, SESSION_ALIVE
  // sparisce mentre il cookie di Supabase (maxAge fisso, non configurabile)
  // sopravvive: qui lo trattiamo come sessione scaduta.
  const rememberChoice = request.cookies.get(REMEMBER_CHOICE_COOKIE)?.value
  const sessionAlive = request.cookies.get(SESSION_ALIVE_COOKIE)?.value
  const sessioneNonRicordataScaduta = !!user && rememberChoice === '0' && !sessionAlive

  if ((!user && !isPublic) || sessioneNonRicordataScaduta) {
    if (sessioneNonRicordataScaduta) {
      // Invalida anche lato Supabase (scope globale di default), non solo il
      // marker applicativo: il signOut aggiorna i cookie su supabaseResponse
      // tramite il callback setAll sopra, quindi vanno riportati sul redirect.
      await supabase.auth.signOut()
    }
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

  if (pathname === '/lavori') {
    supabaseResponse.cookies.set(ORIGINE_SEZIONE_COOKIE, 'dashboard', { path: '/', sameSite: 'lax', httpOnly: true })
  } else if (pathname === '/statistiche') {
    supabaseResponse.cookies.set(ORIGINE_SEZIONE_COOKIE, 'conclusi', { path: '/', sameSite: 'lax', httpOnly: true })
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
