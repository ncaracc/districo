'use client'

import { createPortal } from 'react-dom'

export type OpzioneDialog = {
  label: string
  // primaria = azione consigliata (bg-primary piena); secondaria = alternativa
  // esplicita ma non distruttiva (outline); testuale = via d'uscita a basso
  // impatto visivo ("Annulla"/torna indietro) — stessa palette B&W di tutta
  // l'app, nessun rosso "a LED": queste azioni non sono stati di un satellite,
  // e "Esci senza salvare" non cancella nulla di già persistito, scarta solo
  // modifiche locali non ancora inviate.
  variante: 'primaria' | 'secondaria' | 'testuale'
  onClick: () => void
  disabled?: boolean
}

// Dialog di conferma generico, sopra qualunque Modal (z-index maggiore) —
// riusato per la conferma a 3 opzioni in uscita da un satellite con
// modifiche non salvate (Salva ed esci / Esci senza salvare / Annulla) e
// per la conferma a 2 opzioni su "Annulla" del form di creazione Acquisto
// (Continua modifica / Scarta e chiudi) — Sprint UI-2, vedi CLAUDE.md.
export function DialogConferma({
  aperto,
  titolo,
  messaggio,
  opzioni,
}: {
  aperto: boolean
  titolo: string
  messaggio?: string
  opzioni: OpzioneDialog[]
}) {
  if (!aperto) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-lg">
        <p className="text-sm font-semibold text-gray-900">{titolo}</p>
        {messaggio && <p className="mt-1 text-sm text-gray-600">{messaggio}</p>}
        <div className="mt-4 flex flex-col gap-2">
          {opzioni.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={o.onClick}
              disabled={o.disabled}
              className={
                o.variante === 'primaria'
                  ? 'w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50'
                  : o.variante === 'secondaria'
                    ? 'w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50'
                    : 'w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50'
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
