'use client'

import { useRef } from 'react'
import { formattaValuta } from '@/lib/formato-valuta'

// Input con mascheratura live per i campi importo in modifica (sessione
// rifinitura 2026-08-12, vedi CLAUDE.md): mostra "€ X.XXX" (stessa
// formattazione di `formattaValuta()`, riusata as-is — stesso simbolo,
// stesso separatore delle migliaia) mentre l'utente digita, invece di un
// numero grezzo. Nessuna libreria nello stack per questo (verificato in
// package.json prima di scriverlo) — implementazione minimale.
//
// **Nessun decimale di default, deciso esplicitamente con l'utente il
// 10/8**: i campi importo esistenti nell'app (Acconto, Preventivo,
// Noleggio, Spesa non preventivata, Referenze) restano tutti a euro
// interi, invariato — `decimali` è opt-in (prop `decimali?: 1`, default
// assente = comportamento di sempre, identico a prima di questa modifica).
// **Prezzo per riga di Acquisto, 2026-08-15 (vedi CLAUDE.md), primo e
// unico chiamante con `decimali={1}`**: un prezzo unitario può
// legittimamente essere sotto l'euro (es. una vite), arrotondare a euro
// interi avrebbe reso Quantità×Prezzo imprecisa in modo percepibile.
//
// **Contratto identico a un <input type="number"> con state stringa**:
// `value`/`onChange` sono sempre una stringa "pulita" pronta per `Number()`
// (es. "2000" o, con `decimali={1}`, "12.5" — mai "€ 2.000" né una virgola)
// — stessa shape dello state `valore: string` già in uso in ogni chiamante,
// drop-in replacement senza toccare useDirtyForm/handleSalva/`Number(valore)`
// esistenti.
//
// **Solo la virgola è un separatore decimale valido in digitazione**
// (`decimali={1}`), non il punto — scelta deliberata, non solo stilistica:
// il punto compare già nel testo mostrato come separatore delle migliaia
// iniettato dalla formattazione stessa (es. "1.234"). Un parsing che
// accettasse anche il punto digitato dall'utente non potrebbe più
// distinguerlo da quello delle migliaia non appena l'utente rimuove la
// virgola con Backspace (provato empiricamente: dopo aver digitato
// "1.234,5" e premuto Backspace due volte per tornare a "1234", un
// parsing "ultimo separatore trovato" reinterpreta il punto delle migliaia
// residuo come decimale, producendo "1,2" invece di "1234") — bug
// strutturale, non un caso limite raro. La virgola invece non è MAI
// iniettata dalla formattazione finché non c'è una parte decimale, quindi
// la sua presenza nel testo digitato è sempre e solo intenzionale
// dell'utente: nessuna ambiguità possibile. Coerente con le impostazioni
// locali italiane già in uso da `formattaValuta()` (virgola decimale,
// punto delle migliaia) — un punto digitato viene silenziosamente
// ignorato (rumore, come lo spazio o il simbolo €), il valore mostrato
// ricorda comunque sempre la virgola come separatore corretto.
//
// **Parsing "a blocco" (non carattere-per-carattere)**: l'intero testo
// digitato viene rianalizzato da zero ad ogni evento `change` (stesso
// principio già in uso per `decimali` assente/0) — a differenza di un
// approccio che processi un solo carattere alla volta (scartato dopo
// verifica: si rompe con "seleziona tutto e digita", un pattern comune su
// mobile dove il tap su un campo compilato ne seleziona il contenuto),
// qui funziona correttamente qualunque sia stata l'interazione (digitazione
// singola, sostituzione totale, incolla).
export function InputValuta({
  id,
  value,
  onChange,
  className,
  placeholder = '€ 0',
  decimali,
}: {
  id?: string
  value: string
  onChange: (valore: string) => void
  className: string
  placeholder?: string
  decimali?: 1
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  // `value` termina con "." quando l'utente ha appena digitato la virgola
  // ma non ancora la cifra dopo di essa (es. "1234.") — Number("1234.") ===
  // 1234, la formattazione da sola perderebbe quindi il feedback visivo
  // della virgola appena digitata; qui viene riaggiunta esplicitamente in
  // coda.
  const inDecimaleSospeso = decimali === 1 && value.endsWith('.')
  const formattato = value ? formattaValuta(Number(value), decimali ?? 0) + (inDecimaleSospeso ? ',' : '') : ''

  function handleChangeInteri(e: React.ChangeEvent<HTMLInputElement>) {
    const soleCifre = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    onChange(soleCifre)
  }

  function handleChangeDecimale(e: React.ChangeEvent<HTMLInputElement>) {
    // Solo cifre e virgola: il punto delle migliaia (e "€ ", lo spazio)
    // sono rumore, sempre scartati — vedi commento sopra il componente.
    const soloCifreEVirgola = e.target.value.replace(/[^0-9,]/g, '')
    const indiceVirgola = soloCifreEVirgola.indexOf(',')

    if (indiceVirgola === -1) {
      onChange(soloCifreEVirgola.replace(/^0+(?=\d)/, ''))
      return
    }

    const intero = soloCifreEVirgola.slice(0, indiceVirgola).replace(/^0+(?=\d)/, '') || '0'
    const decimale = soloCifreEVirgola.slice(indiceVirgola + 1).replace(/,/g, '').slice(0, 1)
    onChange(`${intero}.${decimale}`)
  }

  function handleInput() {
    const el = inputRef.current
    if (!el) return
    // Il DOM ha già il nuovo value in questo punto (onInput, non onChange
    // — che in React è già l'evento "live" ad ogni tasto, ma la ref serve
    // comunque a leggere la lunghezza del testo dopo il re-render, non
    // prima) — un frame dopo per essere certi che React abbia già
    // applicato il nuovo `value` formattato al nodo reale.
    requestAnimationFrame(() => {
      const len = el.value.length
      el.setSelectionRange(len, len)
    })
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode={decimali === 1 ? 'decimal' : 'numeric'}
      value={formattato}
      onChange={decimali === 1 ? handleChangeDecimale : handleChangeInteri}
      onInput={handleInput}
      placeholder={placeholder}
      className={className}
    />
  )
}
