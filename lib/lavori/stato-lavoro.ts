// Label e colore del badge stato Lavoro — condivisi tra il dettaglio Lavoro
// (components/lavoro-info.tsx) e la Dashboard (app/(app)/lavori/page.tsx,
// card mobile + tabella desktop). Prima duplicati identicamente in
// entrambi i punti; centralizzati nella sessione rifinitura 2026-08-08
// (vedi CLAUDE.md) insieme all'allineamento colore.

export const STATO_LAVORO_LABEL: Record<string, string> = {
  opportunita: 'Opportunità',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

// Allineato al semaforo delle attività (stessa palette satura di DOT_COLOR,
// satelliti-meta.ts): opportunità=giallo, accettato/completato=verde
// (condividono lo stesso colore — la distinzione resta affidata al testo
// del badge, non al colore), rifiutato=rosso.
export const STATO_LAVORO_COLORE: Record<string, string> = {
  opportunita: 'bg-yellow-500 text-white',
  accettato: 'bg-green-500 text-white',
  completato: 'bg-green-500 text-white',
  rifiutato: 'bg-red-500 text-white',
}
