// Colore delle CTA della landing (2026-08-21, Sezione Pricing — prima CTA
// della pagina, e Sezione Beta). Riusa lo stesso token azzurro già in uso
// per il bottone "Salva" in tutta l'app (`PILLOLA_CLASSI_PRIMARIA`,
// components/pillola-flottante.tsx — `bg-sky-500`/`hover:bg-sky-600`), come
// richiesto esplicitamente ("riusa la classe/variabile già esistente, non
// introdurne una simile ma diversa") — non l'intera forma "pillola
// flottante" (`rounded-full px-7 py-4`, pensata per un bottone fixed in
// basso pagina, non per una CTA inline dentro una sezione).
//
// Testo scuro sulla CTA primaria, non bianco come nella pillola originale:
// contrasto verificato via rendering reale (script Playwright — canvas
// `fillStyle`/`getImageData` per convertire i colori restituiti da
// `getComputedStyle` in sRGB, dato che Tailwind v4 li espone in `lab()`/
// `oklab()`, non in rgb letterale — non un calcolo a mano) — `bg-sky-500`
// (`rgb(0,166,244)`) + testo bianco è **2.71:1**, sotto la soglia WCAG AA
// (4.5:1 testo normale, 3:1 testo grande/UI); `bg-sky-500` + `text-gray-
// 900` (`rgb(16,24,40)`) è invece **6.56:1**, ampiamente sopra soglia.
// Nessuno scurimento del fondo in hover (a differenza di `hover:bg-sky-600`
// della pillola originale): l'hover è segnalato con un'ombra più marcata
// (`hover:shadow-xl`) invece che con un cambio di colore — stesso 6.56:1 in
// entrambi gli stati, verificato identico via hover reale nello script.
export const CTA_PRINCIPALE_CLASSI =
  'inline-flex items-center justify-center rounded-lg bg-sky-500 px-8 py-3.5 text-base font-semibold text-gray-900 shadow-lg shadow-sky-500/30 transition-shadow hover:shadow-xl'

// CTA secondaria (Sezione Beta): stesso trattamento cromatico azzurro della
// primaria, ma a contorno invece che a riempimento pieno — stessa
// distinzione strutturale primaria/secondaria già in uso in
// `pillola-flottante.tsx` (`PILLOLA_CLASSI_PRIMARIA`/`_SECONDARIA`, lì
// riempimento pieno vs bordo grigio neutro), qui ricolorata in azzurro come
// richiesto esplicitamente ("stesso trattamento cromatico azzurro... ma
// contorno"). Contrasto verificato con lo stesso script: `text-sky-700`
// (`rgb(0,105,168)`) su sfondo bianco è **5.86:1** a riposo, **5.49:1** in
// hover (`hover:bg-sky-50`, `rgb(240,249,255)`) — sopra soglia AA in
// entrambi gli stati.
export const CTA_SECONDARIA_CLASSI =
  'inline-flex items-center justify-center rounded-lg border-2 border-sky-500 bg-white px-8 py-3.5 text-base font-semibold text-sky-700 transition-colors hover:bg-sky-50'
