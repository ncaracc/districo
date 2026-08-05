'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaCampione } from '@/lib/lavori/satelliti'
import { SatelliteAllegati } from '@/components/satellite-allegati'
import {
  DOT_COLOR,
  coloreCampione,
  labelStatoCampione,
  type Satellite,
  type SatelliteAllegato,
} from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'

// Ogni Campionatura è un'istanza indipendente dal Sprint D (produzione)
// 2026-08-02 (vedi CLAUDE.md): niente più raggruppamento per serie né catena
// di revisioni via revisione_di — se una campionatura "non va bene" se ne
// crea una nuova scollegata dalla precedente (bottone "Aggiungi attività",
// non un'azione su questo componente). Componente dedicato invece di
// riusare RevisionabileChain (rimosso insieme al resto dell'apparato
// "revisionabile", ormai senza altri consumer — Preventivo/Progetto ne
// erano già usciti l'1/8 e il 2/8).
export function SatelliteCampione({
  satellite,
  allegati,
  isOwner,
  lavoroId,
}: {
  satellite: Satellite
  allegati: SatelliteAllegato[]
  isOwner: boolean
  lavoroId: string
}) {
  const router = useRouter()
  const [descrizione, setDescrizione] = useState(satellite.descrizione ?? '')
  const [note, setNote] = useState(satellite.descrizione_libera ?? '')
  const [consegnato, setConsegnato] = useState(satellite.campione_consegnato)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const colore = coloreCampione(satellite.descrizione, satellite.campione_consegnato)
  const label = labelStatoCampione(satellite.descrizione, satellite.campione_consegnato)

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaCampione(satellite.id, lavoroId, {
      descrizione: descrizione.trim() || null,
      consegnato,
      note: note.trim() || null,
    })
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[colore]}`} />
        <p className="text-sm font-medium text-gray-900">Campionatura</p>
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stato</span>
          <span className="text-xs text-gray-600">{label}</span>
        </div>

        <p className="mb-3 text-xs text-gray-500">
          Creata il {new Date(satellite.data_creazione).toLocaleDateString('it-IT')}
          {satellite.campione_data_consegna &&
            ` — consegnata il ${new Date(satellite.campione_data_consegna).toLocaleDateString('it-IT')}`}
        </p>

        {isOwner ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="campione-descrizione" className="mb-1 block text-xs font-medium text-gray-700">
                Descrizione
              </label>
              <textarea
                id="campione-descrizione"
                rows={3}
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                className={inputClass()}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={consegnato}
                onChange={(e) => setConsegnato(e.target.checked)}
                className="accent-primary"
              />
              Consegnato
            </label>

            <div>
              <label htmlFor="campione-note" className="mb-1 block text-xs font-medium text-gray-700">
                Note (esito)
              </label>
              <textarea
                id="campione-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Es. il cliente non ha gradito la finitura"
                className={inputClass()}
              />
            </div>

            {errore && <p className="text-xs text-red-600">{errore}</p>}
            <button
              type="button"
              onClick={handleSalva}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-gray-700">
            {satellite.descrizione && <p className="whitespace-pre-wrap">{satellite.descrizione}</p>}
            {satellite.descrizione_libera && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione_libera}</p>}
          </div>
        )}

        <div className={isOwner ? 'mt-3' : 'mt-2'}>
          <SatelliteAllegati satelliteId={satellite.id} lavoroId={lavoroId} allegati={allegati} isOwner={isOwner} />
        </div>
      </div>
    </div>
  )
}
