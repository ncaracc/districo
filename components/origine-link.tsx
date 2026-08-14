'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ORIGINE_INFO, leggiOrigineSezioneClient, type SezioneOrigine } from '@/lib/nav/origine-sezione'

// Link "← Dashboard"/"← Conclusi" condiviso (sessione correzione 2026-08-14,
// vedi CLAUDE.md) — sostituisce le 3 rese server-side quasi identiche che
// esistevano prima (lavoro-dettaglio-sezioni.tsx, clienti/[id]/page.tsx,
// fornitori/[id]/page.tsx): tutte e tre calcolavano `origine` server-side da
// leggiOrigineSezione() e la incapsulavano in un payload RSC — esposte allo
// stesso bug di staleness (Client Router Cache/prefetch dei <Link>, vedi
// lib/nav/origine-sezione.ts) che ha reso necessario questo componente.
// Client Component: legge il cookie direttamente via
// leggiOrigineSezioneClient() (document.cookie), fuori da qualunque payload
// server-renderizzato cacheabile — sempre aggiornato, indipendentemente da
// quale pagina l'ha prefetchato o quando.
//
// `origineIniziale` resta un prop opzionale SOLO per l'hydration (valore
// server-renderizzato, evita un mismatch al primo paint) — non più la fonte
// di verità dopo il mount, esattamente come in AppNav. Se omesso, parte da
// 'dashboard' (stesso default di parseOrigineSezione) e si corregge subito
// al primo useEffect: un lampo di un frame è preferibile a un valore
// permanentemente sbagliato.
export function OrigineLink({
  origineIniziale = 'dashboard',
  className = 'text-sm text-gray-500 hover:text-gray-700 transition-colors',
}: {
  origineIniziale?: SezioneOrigine
  className?: string
}) {
  const pathname = usePathname()
  // "Adjusting state during rendering" (pattern ufficiale React, non un
  // useEffect): il linting di questo progetto vieta setState sincrono
  // dentro un effect (react-hooks/set-state-in-effect, compatibilità React
  // Compiler) — questo pattern ottiene lo stesso risultato (rileggere il
  // cookie ad ogni cambio pathname) senza un effect, applicato durante il
  // render stesso prima che il DOM venga toccato, nessun frame visibile in
  // più. Stessa idea del "Storing information from previous renders" dei
  // React docs.
  const [pathnamePrecedente, setPathnamePrecedente] = useState(pathname)
  const [origine, setOrigine] = useState(origineIniziale)
  if (pathname !== pathnamePrecedente) {
    setPathnamePrecedente(pathname)
    setOrigine(leggiOrigineSezioneClient())
  }

  const info = ORIGINE_INFO[origine]

  return (
    // prefetch={false}: questo Link punta esattamente a /lavori o
    // /statistiche, gli stessi due path la cui visita reale scrive il
    // cookie "sezione di origine" nel middleware — un prefetch automatico
    // (comportamento di default di <Link>) lo sovrascriverebbe in
    // background, indipendentemente da dove l'utente sta davvero guardando
    // (stesso fix di components/app-nav.tsx, vedi CLAUDE.md 2026-08-14).
    <Link href={info.href} prefetch={false} className={className}>
      ← {info.label}
    </Link>
  )
}
