'use client'

import { useState } from 'react'

// Hook condiviso per il dirty-state dei form (Sprint UI-2, bottone Salva
// flottante, vedi CLAUDE.md e docs/audit-ui.md sezione 2). Nessuna libreria
// di form nel progetto (verificato in package.json prima di scrivere
// questo hook) — logica minima costruita da zero, non un form-state-manager
// generico: il chiamante continua a possedere i propri campi (via singoli
// `useState` o un oggetto `fields`, indifferentemente), passa qui solo uno
// "snapshot" dei soli campi che il bottone Salva invia davvero — i campi ad
// auto-salvataggio immediato (es. checkbox "Concluso" di Progetto/Chiusura,
// "Ordinato" di Acquisto) restano fuori dallo snapshot: non hanno mai un
// "non salvato" da segnalare, il click stesso è già il salvataggio.
//
// `dirty` è calcolato per valore (JSON.stringify) direttamente in fase di
// render, non con un useEffect/setState separato: eviterebbe un frame di
// ritardo tra la modifica del campo e la comparsa della barra, per un
// confronto comunque economico su oggetti di poche decine di campi al
// massimo.
export function useDirtyForm<T>(valoriCorrenti: T) {
  // useState, non useRef: la baseline va letta durante il render (per
  // calcolare `dirty`), e il linting di questo progetto (react-hooks/refs,
  // regola più severa delle classiche "rules of hooks", pensata per essere
  // compatibile col React Compiler) vieta di leggere/scrivere un ref durante
  // il render — solo dentro effect/event handler. Il valore iniziale passato
  // a useState viene comunque usato solo al primo render (semantica
  // equivalente alla lazy-init di un ref per questo caso d'uso).
  const [baseline, setBaseline] = useState<T>(valoriCorrenti)

  const dirty = JSON.stringify(valoriCorrenti) !== JSON.stringify(baseline)

  // Da chiamare dopo un salvataggio riuscito: sposta la baseline sui valori
  // appena persistiti (default: quelli correnti, cioè esattamente ciò che è
  // stato appena inviato al server) — il dirty-state torna a false anche
  // senza attendere il prossimo render/re-fetch dei dati dal server.
  function segnaSalvato(nuovaBaseline: T = valoriCorrenti) {
    setBaseline(nuovaBaseline)
  }

  return { dirty, segnaSalvato, baseline }
}
