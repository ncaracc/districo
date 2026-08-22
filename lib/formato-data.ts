// Formattazione di date/orari per la UI, sempre nel fuso orario italiano
// esplicito (2026-08-22, vedi CLAUDE.md — fix bug "orari sfasati di 2
// ore"). Causa verificata nei log/ambiente prima di scrivere questo file,
// non ipotizzata: il container Docker di produzione gira sempre in UTC
// (`date`/`Intl.DateTimeFormat().resolvedOptions().timeZone` dentro il
// container confermano entrambi "UTC"). Un Server Component che formatta
// un timestamp con `toLocaleDateString`/`toLocaleString('it-IT')` SENZA
// `timeZone` esplicito eredita il fuso del PROCESSO che esegue il
// rendering — sul server è UTC, non quello del browser dell'artigiano —
// da cui un post pubblicato alle 12:45 (ora italiana, CEST=UTC+2 in
// agosto) mostrato come "10:45". I satelliti Client Component
// ('use client') non hanno questo problema: girano nel browser
// dell'artigiano, già di fatto in Europe/Rome (nessuna modifica fatta
// lì, vedi CLAUDE.md per l'elenco verificato file per file).
//
// 'Europe/Rome' per NOME IANA (non un offset fisso +1/+2): gestisce da
// solo il cambio ora legale/solare — un offset fisso andrebbe storto ad
// ogni cambio di stagione, esattamente il tipo di bug che si vuole
// evitare qui.
const FUSO = 'Europe/Rome'

export function formattaData(iso: string | null | undefined, opzioni?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: FUSO, ...opzioni })
}

export function formattaDataOra(iso: string | null | undefined, opzioni?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { timeZone: FUSO, ...opzioni })
}
