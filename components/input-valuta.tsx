'use client'

import { useRef } from 'react'
import { formattaValuta } from '@/lib/formato-valuta'

// Input con mascheratura live per i campi importo in modifica (sessione
// rifinitura 2026-08-12, vedi CLAUDE.md): mostra "€ X.XXX" (stessa
// formattazione di `formattaValuta()`, riusata as-is — stesso simbolo,
// stesso separatore delle migliaia, nessun decimale) mentre l'utente
// digita, invece di un numero grezzo. Nessuna libreria nello stack per
// questo (verificato in package.json prima di scriverlo) — implementazione
// minimale.
//
// **Nessun decimale, deciso esplicitamente con l'utente**: i 6 campi
// importo esistenti nell'app avevano tutti `step="0.01"` (centesimi
// editabili) ma la vista di sola lettura condivisa (`formattaValuta()`) li
// arrotonda comunque sempre a euro interi — mantenere i centesimi in
// modifica avrebbe reso l'editing anche meno coerente con la lettura, non
// di più. Un valore esistente con centesimi (es. 1500.50) viene mostrato
// già arrotondato (la formattazione non ha mai un separatore decimale), ma
// lo state `value` del chiamante resta quello originale finché l'utente
// non modifica DAVVERO questo campo — se lascia il form intoccato e salva
// dopo aver cambiato solo un altro campo (es. Note), il valore con
// centesimi resta esattamente quello che era, non viene silenziosamente
// arrotondato "di striscio". L'arrotondamento diventa definitivo (perso
// per sempre) solo alla prima cifra digitata QUI, perché a quel punto si
// riparte dalla stringa già formattata (senza decimali) mostrata a video —
// side-effect accettato, coerente con "solo euro interi" da qui in avanti.
//
// **Contratto identico a un <input type="number"> con state stringa**:
// `value`/`onChange` sono sempre una stringa di sole cifre pure (es. "2000",
// mai "€ 2.000" né "2000.50") — stessa shape dello state `valore: string`
// già in uso in ogni chiamante, drop-in replacement senza toccare
// useDirtyForm/handleSalva/`Number(valore)` esistenti.
//
// **Cursore sempre riportato a fine stringa dopo ogni digitazione**: una
// mascheratura che preservi la posizione esatta durante una modifica A
// METÀ stringa richiederebbe ricalcolare la posizione relativa ai
// separatori delle migliaia che si spostano ad ogni cifra aggiunta/rimossa
// — complessità non giustificata per un campo che nella stragrande
// maggioranza dei casi si compila digitando cifre in sequenza da sinistra
// a destra (mai inserimento a metà stringa). Il valore risultante resta
// comunque sempre corretto indipendentemente da DOVE avviene la modifica
// (si ricostruisce ogni volta da tutte le cifre pure del testo corrente,
// non da un calcolo posizionale) — solo la posizione del cursore dopo il
// re-render non segue un'modifica a metà stringa.
export function InputValuta({
  id,
  value,
  onChange,
  className,
  placeholder = '€ 0',
}: {
  id?: string
  value: string
  onChange: (valore: string) => void
  className: string
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const formattato = value ? formattaValuta(Number(value)) : ''

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const soleCifre = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    onChange(soleCifre)
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
      inputMode="numeric"
      value={formattato}
      onChange={handleChange}
      onInput={handleInput}
      placeholder={placeholder}
      className={className}
    />
  )
}
