'use client'

import Link from 'next/link'

// Bottone flottante "pillola" — porta a pagina il design validato nella
// Modal di test (2026-08-07, vedi CLAUDE.md, decisione (1) del Salva
// pillola): centrata orizzontalmente in basso, bg-sky-500 (l'accento
// introdotto lì, distinto da rosso/giallo/verde "a LED" e dal nero
// primario), stesso raggio/ombra/dimensione del testo. Qui `position:
// fixed` (non `absolute` come nella Modal, che la ancorava al box) perché
// il chiamante è sempre una pagina intera, non un contenitore scrollabile
// dedicato — resta quindi sempre visibile durante lo scroll della pagina,
// come richiesto per "Nuovo lavoro"/"Aggiungi attività" (sessione
// affinamento UI 2026-08-08).
//
// z-30: sopra il contenuto di pagina (header sticky è z-10) ma sotto sia il
// pannello del menu mobile (z-40/z-50) sia qualunque Modal (z-50) — quando
// uno dei due è aperto, la pillola sparisce dietro il backdrop invece di
// competere visivamente con essi, senza bisogno di nasconderla esplicitamente.
//
// href → renderizza un Link (navigazione, es. "Nuovo lavoro"); onClick →
// renderizza un button (apre una Modal in loco, es. "Aggiungi attività").
// Esclusivi, non entrambi nello stesso utilizzo.
const CLASSI =
  'fixed bottom-5 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-500 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-colors hover:bg-sky-600'

export function PillolaFlottante({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
}) {
  if (href) {
    return (
      <Link href={href} className={CLASSI}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={CLASSI}>
      {children}
    </button>
  )
}
