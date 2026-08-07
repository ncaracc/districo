// Classi Tailwind condivise per gli <input>/<textarea>/<select> dei form
// dell'app. Centralizza le due varianti reali di quella che era una
// funzione `inputClass()` dichiarata localmente e identica in 19 file
// (Sprint UI-1, 5/8, vedi docs/audit-ui.md sezione 7 e CLAUDE.md): la
// stringa base (bordo sempre grigio) e la stessa stringa con bordo/focus
// rosso condizionale quando `hasError` è vero — un unico parametro
// opzionale copre entrambi i casi, i chiamanti che non gestiscono errori
// continuano a scrivere `inputClass()` senza argomenti.
//
// Include anche `inputClassFisso()` (variante nata in
// `satellite-chiusura.tsx`, stessa stringa meno `w-full`, per i campi a
// larghezza fissa dentro una riga — combinare `w-full` con una larghezza
// fissa nella stessa classe non è affidabile: due classi di larghezza
// Tailwind hanno la stessa specificità CSS, quale vince dipende
// dall'ordine di generazione nel foglio di stile compilato, non
// dall'ordine nella stringa `className`).
//
// NON assorbe la variante di `fornitore-sede-contatto-form.tsx`
// (`px-2.5 py-1.5` invece di `px-3 py-2`): unica occorrenza in tutto il
// progetto, padding volutamente più compresso per un form annidato in una
// card più piccola — eccezione legittima, lasciata locale a quel file (ma
// vedi la nota sul font-size sotto, che si applica anche lì).
//
// `text-base` (16px), non più `text-sm` (14px) — Priorità 1 dell'audit
// iOS Safari/WebKit (docs/audit-ios.md, 2026-08-07): sotto i 16px, iOS
// Safari zooma automaticamente l'intera pagina al focus di un
// <input>/<select>/<textarea> — causa confermata dello zoom osservato in
// produzione (il form di login, che non passa da questo modulo, ne è
// stato il sintomo più visibile, ma il problema era sistemico: queste due
// funzioni coprono ~20 file, praticamente tutti i satelliti e le
// anagrafiche). Nessun'altra modifica alle classi — solo la dimensione
// del testo.

export function inputClass(hasError = false): string {
  return `w-full rounded-lg border px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}

export function inputClassFisso(hasError = false): string {
  return `rounded-lg border px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}
