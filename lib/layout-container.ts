// Sessione rifinitura "coerenza layout desktop" (2026-08-10, vedi CLAUDE.md).
//
// Prima di questa sessione la larghezza massima delle pagine viveva in due
// posti incoerenti: di default in `app/(app)/layout.tsx` (`<main>`,
// `max-w-2xl mx-auto`, ~672px, usato tal quale da Fornitori e dal dettaglio
// Lavoro — la "colonna stretta" segnalata) e, per un sottoinsieme di pagine
// (Dashboard/Conclusi/Clienti), un "breakout" locale (`lg:relative
// lg:left-1/2 lg:w-screen lg:-translate-x-1/2`) pensato per scappare da quel
// vincolo ed usare la larghezza piena dello schermo. Il breakout era anche
// la causa della scrollbar orizzontale indesiderata: `100vw` (da cui
// `w-screen`) include nel proprio calcolo la larghezza della scrollbar
// verticale del browser in Chrome/Firefox, mentre lo spazio realmente
// visibile (quello che il resto della pagina occupa) non la include — su
// una pagina abbastanza lunga da avere una scrollbar verticale (tipicamente
// la Dashboard), l'elemento risultava quindi più largo dello spazio visibile
// di esattamente la larghezza della scrollbar, un overflow orizzontale reale
// che nessuna delle classi `left-1/2`/`-translate-x-1/2` (pensate per
// *centrare*, non per *restringere*) poteva correggere.
//
// Fix strutturale, non solo un valore diverso: `<main>` non impone più
// alcun max-width (vedi `app/(app)/layout.tsx`) — ogni pagina sceglie
// esplicitamente uno dei due contenitori sotto, nessuna delle due dipende da
// `vw`/`w-screen`. Stessa strategia (mx-auto + max-w) ovunque, valore diverso
// solo in base al tipo di contenuto:
//
// - CONTENITORE_LARGO: pagine "principali" di lista/dettaglio con contenuto
//   che beneficia di più spazio orizzontale (tabelle, card, form a più
//   colonne) — Dashboard, dettaglio Lavoro, Clienti (lista e dettaglio),
//   Fornitori (lista e dettaglio), Conclusi. 72rem/1152px: via di mezzo
//   deliberata tra la vecchia colonna stretta (672px) e la piena larghezza
//   dello schermo — lascia margini ragionevoli anche su monitor molto ampi
//   (1920px+) invece di stirare il contenuto edge-to-edge.
// - CONTENITORE_STRETTO: form a colonna singola dove una riga di testo più
//   larga non aiuterebbe la leggibilità — Nuovo lavoro/cliente/fornitore,
//   Profilo/Impostazioni. Stesso valore (max-w-2xl) già in uso prima di
//   questa sessione per queste pagine, ora esplicito invece di implicito.
export const CONTENITORE_LARGO = 'mx-auto w-full max-w-6xl'
export const CONTENITORE_STRETTO = 'mx-auto w-full max-w-2xl'
