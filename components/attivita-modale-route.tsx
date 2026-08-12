'use client'

import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): unico
// scopo di questo wrapper client è fornire router.back() come onChiudi e
// attivare bloccaBackConModifiche — la route intercettata stessa
// (@modal/(.)attivita/[attivitaId]/page.tsx) è un Server Component (fa il
// fetch dati), non può usare useRouter direttamente. `aperto` è sempre vero:
// questa route esiste solo quando l'URL corrisponde, cioè solo quando la
// modale deve essere mostrata (a differenza di "Aggiungi attività", ancora
// gestita con uno stato locale aperto/chiuso in LavoroSatelliteTabella).
//
// Fix bug "Aggiungi attività riporta alla Dashboard" (2026-08-13, vedi
// CLAUDE.md — analisi e fix completo in lavoro-satelliti-tabella.tsx):
// **due tentativi precedenti in questa stessa sessione, scartati dopo
// verifica empirica, per riferimento futuro**: (1) chiudere con
// `router.replace()` verso l'URL noto del Lavoro invece di `router.back()`
// — risolveva la chiusura ma NON smontava lo slot @modal (comportamento
// documentato delle Parallel Routes: una push/replace che non riguarda
// esplicitamente uno slot ne preserva il contenuto precedente); (2)
// aggiunto un controllo `usePathname()` per auto-smontare quando il
// pathname non corrisponde più — risolveva anche quello, MA dopo due cicli
// crea→chiudi consecutivi con `replace()`, un TERZO tentativo di apertura
// (router.push in creaEApri) smetteva di navigare del tutto: l'albero
// interno del router di Next.js, mai correttamente "restaurato" da
// replace() come lo sarebbe da una vera TRAVERSE action (back/forward),
// si accumulava in uno stato inconsistente — verificato confrontando con
// il comportamento del codice precedente a questa sessione (stesso identico
// scenario, nessuna anomalia). Il fix corretto è quindi sul lato APERTURA,
// non chiusura — vedi commento completo su creaEApri()/router.push in
// lavoro-satelliti-tabella.tsx — `router.back()` qui resta l'UNICO modo
// verificato per chiudere senza corrompere lo stato del router (usa la
// TRAVERSE action di Next, l'unica che restaura per intero l'albero,
// slot @modal incluso).
export function AttivitaModaleRoute({ titolo, children }: { titolo: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <Modal aperto onChiudi={() => router.back()} titolo={titolo} bloccaBackConModifiche>
      {children}
    </Modal>
  )
}
