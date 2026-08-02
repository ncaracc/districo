'use client'

import { useState } from 'react'
import { Modal } from '@/components/modal'

// Flusso di caricamento allegato in un'unica modale (Sprint "allegati
// modale" 2026-08-02, vedi CLAUDE.md): sostituisce la sequenza precedente
// (etichetta a fianco del bottone, upload immediato alla scelta del file).
// Un solo file per conferma (non `multiple`, coerente con un'etichetta che
// descrive un contenuto specifico, es. "Foto ingresso cucina" — un batch di
// file eterogenei con un'unica etichetta condivisa non avrebbe lo stesso
// significato). Stato locale (file/etichetta) resettato ad ogni chiusura,
// qualunque sia la via (Annulla, backdrop, Esc, X): nessun residuo alla
// riapertura successiva.
export function AllegatoModale({
  aperta,
  onChiudi,
  onConferma,
  loading,
  errore,
}: {
  aperta: boolean
  onChiudi: () => void
  // Ritorna true se l'upload è riuscito: solo in quel caso la modale si
  // chiude da sola. In caso di fallimento resta aperta con file/etichetta
  // già compilati, cosi l'utente può ritentare senza rifare la selezione.
  onConferma: (file: File, etichetta: string) => Promise<boolean>
  loading: boolean
  errore: string | null
}) {
  const [file, setFile] = useState<File | null>(null)
  const [etichetta, setEtichetta] = useState('')

  function reset() {
    setFile(null)
    setEtichetta('')
  }

  function handleChiudi() {
    reset()
    onChiudi()
  }

  const puoConfermare = !!file && etichetta.trim().length > 0

  async function handleConferma() {
    if (!file || !puoConfermare) return
    const riuscito = await onConferma(file, etichetta.trim())
    if (riuscito) {
      reset()
      onChiudi()
    }
  }

  return (
    <Modal aperto={aperta} onChiudi={handleChiudi} titolo="Allega file">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={loading}
            className="w-full cursor-pointer text-xs text-gray-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-gray-800 disabled:cursor-not-allowed"
          />
          {file && <p className="mt-1.5 text-xs text-gray-500">Selezionato: {file.name}</p>}
        </div>

        <div>
          <label htmlFor="allegato-modale-etichetta" className="mb-1 block text-xs font-medium text-gray-700">
            Etichetta <span className="text-red-500">*</span>
          </label>
          <input
            id="allegato-modale-etichetta"
            type="text"
            value={etichetta}
            onChange={(e) => setEtichetta(e.target.value)}
            placeholder="Es. Foto ingresso cucina"
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors"
          />
        </div>

        {errore && <p className="text-xs text-red-600">{errore}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleChiudi}
            disabled={loading}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleConferma}
            disabled={!puoConfermare || loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Caricamento…' : 'Conferma'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
