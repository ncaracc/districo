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
