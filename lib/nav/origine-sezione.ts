// Provenienza Dettaglio Lavoro (sessione correzione 2026-08-13, vedi
// CLAUDE.md): la sezione di origine (Dashboard o Conclusi) va ricordata per
// l'intera catena di navigazione — Dashboard/Conclusi → Cliente/Fornitore →
// Lavori associati → Dettaglio Lavoro — indipendentemente da quante pagine
// intermedie si attraversano. Non è quindi un breadcrumb (torna alla pagina
// immediatamente precedente): un parametro propagato di link in link
// avrebbe richiesto toccare ogni singolo punto della catena (incluso il
// click sulla voce di menu "Clienti"/"Fornitori", che non è un link
// "consapevole" della provenienza) e si sarebbe perso su navigazione diretta
// via URL/back del browser a metà catena.
//
// Soluzione scelta: un cookie scritto da middleware.ts SOLO quando l'utente
// visita esattamente /lavori o /statistiche (mai su una sotto-pagina) — la
// "memoria" vive quindi in un unico posto centralizzato, letta da qualunque
// pagina lungo la catena tramite leggiOrigineSezione()
// (lib/nav/origine-sezione.server.ts) senza bisogno di propagare nulla
// esplicitamente di pagina in pagina. Cookie di sessione (nessun maxAge):
// la provenienza è un concetto di navigazione corrente, non una preferenza
// persistente.
//
// Questo modulo contiene SOLO costanti/tipi puri (nessun import da
// next/headers) — importabile sia da Server sia da Client Component. La
// lettura del cookie vera e propria (leggiOrigineSezione, richiede
// cookies()) vive in un file separato, .server.ts, per non trascinare
// next/headers nel bundle client quando AppNav/LavoroDettaglioSezioni
// importano solo ORIGINE_INFO/SezioneOrigine.
export type SezioneOrigine = 'dashboard' | 'conclusi'

export const COOKIE_ORIGINE_SEZIONE = 'districo_origine_sezione'

export const ORIGINE_INFO: Record<SezioneOrigine, { href: string; label: string }> = {
  dashboard: { href: '/lavori', label: 'Dashboard' },
  conclusi: { href: '/statistiche', label: 'Conclusi' },
}

export function parseOrigineSezione(value: string | undefined | null): SezioneOrigine {
  return value === 'conclusi' ? 'conclusi' : 'dashboard'
}

// Lettura CLIENT-SIDE del cookie (sessione correzione 2026-08-14, vedi
// CLAUDE.md — bug distinto scoperto in questa sessione, non una regressione
// di codice ma una caratteristica di Next.js mai considerata quando questo
// meccanismo è stato progettato il 13/8): il valore letto server-side da
// leggiOrigineSezione() e passato come prop finisce dentro un payload RSC
// che Next.js può memorizzare nella cache client (Client Router Cache) —
// inclusi i prefetch automatici dei <Link> visibili in viewport, che
// avvengono PRIMA che l'utente clicchi davvero. Un Link verso una pagina che
// dipende dal cookie origine, prefetchato mentre il cookie aveva un certo
// valore, può restare "congelato" a quel valore anche dopo che il cookie è
// cambiato — Next non ha modo di sapere che il payload dipende da un cookie
// e invalidarlo di conseguenza. Una lettura diretta di `document.cookie` in
// un Client Component, rieseguita ad ogni cambio di pathname, aggira del
// tutto questo livello di cache: non fa mai parte di un payload
// server-renderizzato/cacheabile, è sempre calcolata al momento sul browser.
export function leggiOrigineSezioneClient(): SezioneOrigine {
  if (typeof document === 'undefined') return 'dashboard'
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_ORIGINE_SEZIONE}=([^;]*)`))
  return parseOrigineSezione(match ? decodeURIComponent(match[1]) : undefined)
}
