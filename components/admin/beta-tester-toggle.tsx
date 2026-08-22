'use client'

import { useState, useTransition } from 'react'
import { impostaBetaTester } from '@/lib/admin/actions'

// Toggle beta_tester (2026-08-22, pagina admin /admin/utenti — vedi
// CLAUDE.md). Aggiornamento ottimistico (stato locale invertito subito al
// click, prima della risposta del server — coerente con l'uso "strumento
// di lavoro" della pagina, nessuna attesa percepibile su un semplice
// flag) con rollback se la Server Action fallisce (es. sessione scaduta a
// metà, o il controllo `is_admin` lato DB rifiuta per qualche motivo).
export function BetaTesterToggle({
  artigianoId,
  valoreIniziale,
}: {
  artigianoId: string
  valoreIniziale: boolean
}) {
  const [valore, setValore] = useState(valoreIniziale)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const nuovo = !valore
    setValore(nuovo)
    startTransition(async () => {
      try {
        await impostaBetaTester(artigianoId, nuovo)
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
