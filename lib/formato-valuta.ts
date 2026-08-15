// Formattazione condivisa per gli importi in euro (Sprint C, documenti,
// 2/8): simbolo € + separatore delle migliaia + nessuna cifra decimale
// (es. "€ 3.500", non "€3500.00" né "€ 3500") come default. Sostituisce i 5
// punti del codice che prima usavano `€ ${numero.toFixed(2)}` in modo
// indipendente (Preventivo x2, Acquisto, Dashboard, Noleggio) — vedi
// CLAUDE.md.
//
// `decimali` (2026-08-15, vedi CLAUDE.md — Acquisto Quantità/Prezzo):
// opt-in, default 0 — preserva invariato "solo euro interi" per i 5 campi
// esistenti che lo usano senza specificarlo (Acconto, Preventivo, Noleggio,
// Spesa non preventivata, Referenze). Il Prezzo per riga di Acquisto (e il
// Valore complessivo calcolato da esso, che può avere fino a 2 decimali —
// prodotto di due valori a 1 decimale ciascuno) sono gli unici a passarlo
// esplicitamente. `minimumFractionDigits: 0` anche quando decimali>0: un
// valore che risulta intero (es. 250.0) si mostra "€ 250", non "€ 250,0" —
// il decimale compare solo quando è effettivamente diverso da zero.
//
// `useGrouping: true` esplicito: senza, Intl.NumberFormat('it-IT', {
// maximumFractionDigits: N }) non raggruppa le migliaia (bug/quirk
// verificato empiricamente in Node 20/ICU 78 — con maximumFractionDigits
// impostato, useGrouping di default non applica il separatore, mentre lo
// stesso formatter senza quell'opzione lo applica correttamente).
const FORMATTATORI = new Map<number, Intl.NumberFormat>()

function formattatorePer(decimali: number): Intl.NumberFormat {
  let f = FORMATTATORI.get(decimali)
  if (!f) {
    f = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: decimali, useGrouping: true })
    FORMATTATORI.set(decimali, f)
  }
  return f
}

export function formattaValuta(numero: number, decimali: 0 | 1 | 2 = 0): string {
  return `€ ${formattatorePer(decimali).format(numero)}`
}
