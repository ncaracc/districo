'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { avanzaStatoSatellite } from '@/lib/lavori/satelliti'
import {
  DOT_COLOR,
  STATO_LABEL,
  TIPO_SATELLITE_LABEL,
  coloreStato,
  prossimoStato,
  type Satellite,
  type SatelliteArticolo,
  type StatoSatellite,
} from '@/lib/lavori/satelliti-meta'

export function SatelliteCard({
  satellite,
  righe,
  isOwner,
  superata,
  lavoroId,
  fornitoreLabel,
}: {
  satellite: Satellite
  righe: SatelliteArticolo[]
  isOwner: boolean
  superata: boolean
  lavoroId: string
  fornitoreLabel: string | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [richiediNota, setRichiediNota] = useState(false)
  const [notaBozza, setNotaBozza] = useState('')

  const colore = coloreStato(satellite.tipo, satellite.stato)
  const prossimo = prossimoStato(satellite.tipo, satellite.stato)

  async function avanza(nuovoStato: StatoSatellite, nota?: string | null) {
    setLoading(true)
    setErrore(null)
    const result = await avanzaStatoSatellite(satellite.id, lavoroId, nuovoStato, nota)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setRichiediNota(false)
    router.refresh()
  }

  function handleAvanza() {
    if (!prossimo) return
    if (satellite.tipo === 'appuntamento' && prossimo === 'fatto') {
      setRichiediNota(true)
      return
    }
    avanza(prossimo)
  }

  return (
    <li className={`px-4 py-3 ${superata ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[colore]}`} />
          {TIPO_SATELLITE_LABEL[satellite.tipo]}
          {satellite.revisione_di && (
            <span className="text-xs font-normal text-gray-400">(revisione)</span>
          )}
          {superata && <span className="text-xs font-normal text-gray-400">(superata)</span>}
        </p>
        <span className="shrink-0 text-xs text-gray-600">{STATO_LABEL[satellite.stato]}</span>
      </div>

      <div className="mt-1 space-y-0.5 text-xs text-gray-500">
        {satellite.tipo === 'appuntamento' && satellite.tipo_appuntamento && (
          <p>{satellite.tipo_appuntamento}</p>
        )}
        {satellite.tipo === 'appuntamento' && satellite.data_appuntamento && (
          <p>{new Date(satellite.data_appuntamento).toLocaleString('it-IT')}</p>
        )}
        {satellite.nota && <p>{satellite.nota}</p>}
        {satellite.valore_complessivo != null && (
          <p>€ {satellite.valore_complessivo.toFixed(2)}</p>
        )}
        {fornitoreLabel && <p>{fornitoreLabel}</p>}
        {satellite.descrizione_libera && <p>{satellite.descrizione_libera}</p>}
        {righe.length > 0 && (
          <ul className="mt-1 list-disc pl-4">
            {righe.map((r) => (
              <li key={r.id}>
                {r.descrizione}
                {r.colore_finitura ? ` — ${r.colore_finitura}` : ''} × {r.quantita}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isOwner && !superata && prossimo && (
        <div className="mt-2">
          {richiediNota ? (
            <div className="space-y-2">
              <textarea
                rows={2}
                value={notaBozza}
                onChange={(e) => setNotaBozza(e.target.value)}
                placeholder="Nota (obbligatoria per segnare come fatto)"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900"
              />
              {errore && <p className="text-xs text-red-600">{errore}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading || !notaBozza.trim()}
                  onClick={() => avanza('fatto', notaBozza.trim())}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvataggio…' : 'Conferma'}
                </button>
                <button
                  type="button"
                  onClick={() => setRichiediNota(false)}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <>
              {errore && <p className="mb-1 text-xs text-red-600">{errore}</p>}
              <button
                type="button"
                onClick={handleAvanza}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvataggio…' : `Segna come ${STATO_LABEL[prossimo].toLowerCase()}`}
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
