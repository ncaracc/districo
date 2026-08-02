// Formattazione condivisa per gli importi in euro (Sprint C, documenti,
// 2/8): simbolo € + separatore delle migliaia + nessuna cifra decimale
// (es. "€ 3.500", non "€3500.00" né "€ 3500"). Sostituisce i 5 punti del
// codice che prima usavano `€ ${numero.toFixed(2)}` in modo indipendente
// (Preventivo x2, Acquisto, Dashboard, Noleggio) — vedi CLAUDE.md.
//
// `useGrouping: true` esplicito: senza, Intl.NumberFormat('it-IT', {
// maximumFractionDigits: 0 }) non raggruppa le migliaia (bug/quirk
// verificato empiricamente in Node 20/ICU 78 — con maximumFractionDigits
// impostato, useGrouping di default non applica il separatore, mentre lo
// stesso formatter senza quell'opzione lo applica correttamente).
const FORMATTATORE = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: true })

export function formattaValuta(numero: number): string {
  return `€ ${FORMATTATORE.format(numero)}`
}
