'use client'

import { useState, useTransition } from 'react'

// Toggle generico per i flag admin di /admin/utenti (beta_tester,
// accesso_gratuito — 2026-08-22, vedi CLAUDE.md). Nato come
// `BetaTesterToggle` (solo beta_tester, stesso giorno), generalizzato
// appena è servito un secondo flag identico nell'interazione — la
// `azione` è una Server Action già legata all'id della riga
// (`.bind(null, artigianoId)`, stesso pattern già in uso per
// `avviaCheckout` in `ScegliPianoAbbonamento`), il componente non sa e non
// deve sapere quale campo sta effettivamente aggiornando.
//
// Aggiornamento ottimistico (stato locale invertito subito al click,
// prima della risposta del server — coerente con l'uso "strumento di
// lavoro" della pagina, nessuna attesa percepibile su un semplice flag)
// con rollback se la Server Action fallisce (es. sessione scaduta a metà,
// o il controllo `is_admin` lato DB rifiuta per qualche motivo).
export function ToggleAdmin({
  valoreIniziale,
  azione,
}: {
  valoreIniziale: boolean
  azione: (valore: boolean) => Promise<void>
}) {
  const [valore, setValore] = useState(valoreIniziale)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const nuovo = !valore
    setValore(nuovo)
    startTransition(async () => {
      try {
        await azione(nuovo)
      } catch {
        setValore(!nuovo)
      }
    })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={valore}
      onClick={toggle}
      disabled={pending}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        valore ? 'bg-gray-900' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          valore ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
