'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconaChiudi } from '@/components/icons'

// Modale generica riusata per la vista/modifica di un satellite (vedi
// lavoro-satelliti-tabella.tsx): su mobile occupa tutto lo schermo (comodo
// per scrivere note lunghe con la tastiera aperta), su desktop è centrata e
// più stretta. Monta i figli così come sono — non introduce una modalità
// "sola lettura" propria, il componente satellite esistente resta l'unica
// fonte di verità su editabile/sola lettura in base al ruolo.
export function Modal({
  aperto,
  onChiudi,
  titolo,
  children,
}: {
  aperto: boolean
  onChiudi: () => void
  // ReactNode (non solo string) da 2026-08-04: alcune righe compongono qui
  // pallino di stato + nome sulla stessa riga (vedi lavoro-satelliti-tabella.tsx,
  // RigaSatellite.titoloConPallino) invece di ripeterlo anche dentro il
  // componente satellite — nessun cambiamento per chi passa una semplice
  // stringa, un ReactNode include già string.
  titolo?: React.ReactNode
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!aperto) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    document.addEventListener('keydown', onKeyDown)

    const overflowPrecedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowPrecedente
    }
  }, [aperto, onChiudi])

  if (!aperto) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onChiudi} aria-hidden="true" />

      <div className="relative flex h-[92vh] w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{titolo}</p>
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <IconaChiudi className="h-5 w-5" />
          </button>
        </div>

        <div className="grow overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
