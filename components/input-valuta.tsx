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
// **Il punto è un separatore decimale valido SOLO quando non può essere
// confuso con un separatore delle migliaia iniettato dalla formattazione**
// (fix 2026-08-19, vedi CLAUDE.md — bug reale segnalato: digitare "0.5",
// il punto essendo il tasto decimale offerto da quasi ogni tastierino
// numerico/`inputMode="decimal"`, produceva silenziosamente "€ 5" invece di
// "€ 0,5" — il punto veniva scartato come rumore incondizionatamente, un
// prezzo sotto l'euro/sotto le migliaia non può però MAI avere un
// separatore delle migliaia già presente nel testo mostrato, quindi in
// quel caso non c'è alcuna reale ambiguità da proteggere). La distinzione
// (vedi `puntoAmbiguo` sotto) si basa sulla parte intera del valore GIÀ
// noto prima di questo tasto (`Number(value)`, non quello che sta per
// diventare): se ≥ 1000, la formattazione del render precedente avrebbe
// già mostrato un punto delle migliaia — un punto digitato in quel
// contesto resta rumore scartato, esattamente come da bug fix originale
// del 2026-08-15 (provato empiricamente: dopo aver digitato "1.234,5" e
// premuto Backspace due volte per tornare a "1234", un parsing "ultimo
// separatore trovato" che accettasse sempre il punto reinterpreta quello
// delle migliaia residuo come decimale, producendo "1,2" invece di
// "1234") — quella protezione resta intatta, solo ristretta ai casi in cui
// serve davvero. Sotto le migliaia, il punto è equivalente alla virgola:
// stesso trattamento, stessa posizione come separatore. La virgola resta
// comunque sempre valida in ogni caso (mai iniettata dalla formattazione
// finché non c'è una parte decimale, quindi mai ambigua) — coerente con le
// impostazioni locali italiane già in uso da `formattaValuta()` (virgola
// decimale, punto delle migliaia).
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
    // Il punto è ambiguo (potrebbe essere un separatore delle migliaia
    // residuo nel testo mostrato) solo se il valore GIÀ noto prima di
    // questo tasto è ≥ 1000 — vedi commento sopra il componente. Sotto
    // quella soglia, punto e virgola sono equivalenti; "€ "/lo spazio
    // restano sempre rumore scartato.
    const parteInteraAttuale = Math.trunc(Math.abs(Number(value) || 0))
    const puntoAmbiguo = parteInteraAttuale >= 1000
    const pulito = e.target.value.replace(puntoAmbiguo ? /[^0-9,]/g : /[^0-9,.]/g, '')
    const indiceSeparatore = puntoAmbiguo ? pulito.indexOf(',') : pulito.search(/[,.]/)

    if (indiceSeparatore === -1) {
      onChange(pulito.replace(/^0+(?=\d)/, ''))
      return
    }

    const intero = pulito.slice(0, indiceSeparatore).replace(/^0+(?=\d)/, '') || '0'
    const decimale = pulito.slice(indiceSeparatore + 1).replace(/[,.]/g, '').slice(0, 1)
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
