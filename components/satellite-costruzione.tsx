'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaDescrizioneCostruzione, avanzaStatoCostruzione } from '@/lib/lavori/satelliti'
import {
  DOT_COLOR,
  STATO_COSTRUZIONE_LABEL,
  azioniPossibiliCostruzione,
  coloreCostruzione,
  type Satellite,
} from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

function formattaDurata(inizio: string, fine: string | null): string {
  const ms = (fine ? new Date(fine).getTime() : Date.now()) - new Date(inizio).getTime()
  const giorni = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (giorni >= 1) return `${giorni} giorn${giorni === 1 ? 'o' : 'i'}`
  const ore = Math.max(1, Math.floor(ms / (1000 * 60 * 60)))
  return `${ore} or${ore === 1 ? 'a' : 'e'}`
}

export function SatelliteCostruzione({
  satellite,
  lavoroId,
  isOwner,
}: {
  satellite: Satellite
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [descrizione, setDescrizione] = useState(satellite.descrizione_libera ?? '')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const stato = satellite.stato ?? 'da_iniziare'
  const azioni = azioniPossibiliCostruzione(stato)

  async function salvaDescrizione() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaDescrizioneCostruzione(satellite.id, lavoroId, descrizione.trim() || null)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  async function avanza(nuovoStato: string) {
    setLoading(true)
    setErrore(null)
    const result = await avanzaStatoCostruzione(satellite.id, lavoroId, nuovoStato as 'in_corso' | 'completata')
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[coloreCostruzione(stato)]}`} />
          Costruzione
        </p>
        <span className="shrink-0 text-xs text-gray-600">{STATO_COSTRUZIONE_LABEL[stato] ?? stato}</span>
      </div>

      {satellite.data_inizio && (
        <p className="mb-2 text-xs text-gray-500">
          In corso da {formattaDurata(satellite.data_inizio, satellite.data_fine)}
          {satellite.data_fine && ' (completata)'}
        </p>
      )}

      {isOwner ? (
        <div className="space-y-2">
          <textarea
            rows={3}
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Note (opz.)"
            className={inputClass()}
          />
          <button
            type="button"
            onClick={salvaDescrizione}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Salva note
          </button>
        </div>
      ) : (
        satellite.descrizione_libera && <p className="text-sm text-gray-600">{satellite.descrizione_libera}</p>
      )}

      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}

      {isOwner && azioni.length > 0 && (
        <div className="mt-3 flex gap-2">
          {azioni.map((a) => (
            <button
              key={a.stato}
              type="button"
              onClick={() => avanza(a.stato)}
              disabled={loading}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio…' : a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
