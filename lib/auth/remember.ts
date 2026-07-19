// "Rimani connesso": @supabase/ssr impone sempre il proprio maxAge (400 giorni) sui
// cookie di sessione, ignorando qualsiasi cookieOptions.maxAge custom passato al
// client — non è quindi possibile accorciare direttamente il cookie di Supabase.
// Usiamo invece due cookie applicativi separati, letti dal middleware ad ogni
// richiesta: REMEMBER_CHOICE (persistente, registra la scelta fatta al login) e
// SESSION_ALIVE (cookie di sessione vero, senza maxAge — sparisce alla chiusura
// del browser). Se al login la scelta è "non ricordare" e più tardi SESSION_ALIVE
// non c'è più ma REMEMBER_CHOICE dice ancora "0", il browser è stato chiuso e
// riaperto: il middleware forza il logout.
export const REMEMBER_CHOICE_COOKIE = 'districo-remember-choice'
export const SESSION_ALIVE_COOKIE = 'districo-session-alive'

// Stesso valore di DEFAULT_COOKIE_OPTIONS.maxAge in @supabase/ssr, così il marker
// resta disponibile per tutta la vita effettiva del cookie di sessione Supabase.
const REMEMBER_CHOICE_MAX_AGE = 400 * 24 * 60 * 60

export function applyRememberChoice(remember: boolean) {
  document.cookie = `${REMEMBER_CHOICE_COOKIE}=${remember ? '1' : '0'}; path=/; max-age=${REMEMBER_CHOICE_MAX_AGE}; SameSite=Lax`

  if (remember) {
    // Ripulisce un eventuale marker di sessione lasciato da un login precedente
    // con "Rimani connesso" deselezionato.
    document.cookie = `${SESSION_ALIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  } else {
    document.cookie = `${SESSION_ALIVE_COOKIE}=1; path=/; SameSite=Lax`
  }
}

export function clearRememberCookies() {
  document.cookie = `${REMEMBER_CHOICE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  document.cookie = `${SESSION_ALIVE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}
