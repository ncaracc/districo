'use client'

import { useEffect } from 'react'

// Cliente e Fornitore sono form a pagina intera, non ospitati in una Modal
// (Sprint UI-2, vedi CLAUDE.md): non esiste un unico "bottone chiudi" da
// proteggere come per i satelliti (useProteggiChiusuraModal, modal.tsx).
// Intercettare anche la navigazione interna (Link di nav/altre pagine)
// richiederebbe un sistema di route-guard applicativo, esplicitamente
// escluso dallo scope di questo sprint — l'unico avviso realistico qui è
// quello nativo del browser alla chiusura/reload reale della scheda.
// `beforeunload` non permette testo/bottoni personalizzati (limite di
// sicurezza imposto dai browser, non di questo codice): mostra sempre un
// dialog generico, non il nostro DialogConferma a 3 opzioni.
export function useAvvisaUscitaPagina(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}
