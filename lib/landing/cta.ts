// Colore delle CTA principali della landing (2026-08-19, vedi CLAUDE.md —
// sessione "routing/selettore mestiere/colore CTA"): stesso azzurro già
// usato per il bottone "Salva" nelle modali satellite (`PILLOLA_CLASSI_
// PRIMARIA`, components/pillola-flottante.tsx — `bg-sky-500`/`hover:bg-
// sky-600`), non un azzurro nuovo scelto per somiglianza. Riusata qui solo
// la coppia di classi colore, non l'intero token (quello include anche
// forma/padding da pillola flottante, `rounded-full px-7 py-4`, non adatta
// a bottoni rettangolari di dimensioni diverse per placement) — ogni
// chiamante compone `CTA_LANDING_CLASSI` con le proprie classi di
// forma/padding, stesso pattern già in uso in pillola-flottante.tsx per
// PILLOLA_CLASSI_BASE/_PRIMARIA/_SECONDARIA.
//
// Testo scuro (`text-gray-900`, il token di testo scuro già in uso in
// tutta la landing per titoli/corpo) invece del bianco del token Salva:
// verificato che bg-sky-500 + testo bianco è ~2.8:1 di contrasto, sotto la
// soglia WCAG AA (4.5:1 per testo normale, 3:1 per testo grande) — bg-
// sky-500 + testo text-gray-900 è invece ~6.4:1, ampiamente sopra soglia.
// Nessuno scurimento del fondo in hover (a differenza di bg-primary/90 nel
// resto dell'app, o di hover:bg-sky-600 dello stesso token Salva):
// bg-sky-600 con testo scuro scende a ~4.33:1, appena sotto la soglia
// stretta per testo normale (4.5:1) — differenza piccola ma reale, quindi
// qui l'hover è segnalato con ombra/sollevamento invece che con un cambio
// di colore, mantenendo lo stesso ~6.4:1 in entrambi gli stati (normale e
// hover), non solo a riposo.
export const CTA_LANDING_CLASSI =
  'bg-sky-500 text-gray-900 shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:-translate-y-0.5'
