'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaAppuntamento } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import { coloreAppuntamento, DOT_COLOR } from '@/lib/lavori/satelliti-meta'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

function aDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SatelliteAppuntamento({
  satellite,
  lavoroId,
  titolo,
  allegati,
  isOwner,
}: {
  satellite: Satellite
  lavoroId: string
  titolo: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState(aDatetimeLocal(satellite.data_appuntamento))
  const [descrizione, setDescrizione] = useState(satellite.descrizione ?? '')
  const [concluso, setConcluso] = useState(satellite.concluso)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    const result = await aggiornaAppuntamento(satellite.id, lavoroId, {
      data: data ? new Date(data).toISOString() : null,
      descrizione: descrizione.trim() || null,
      concluso,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setSalvato(true)
    router.refresh()
  }

  // Riflette dal vivo le modifiche non ancora salvate nel form (data/concluso),
  // stessa logica di coloreAppuntamento() usata per la riga in tabella.
  const colore = coloreAppuntamento(concluso, data ? new Date(data).toISOString() : null)

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      {/* Pallino+nome a sinistra, "Concluso" (solo per chi può modificare)
          all'estrema destra della stessa riga — restyling 2026-08-02, vedi
          CLAUDE.md: prima era un campo separato più in basso nel form. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[colore]}`} />
          {titolo}
        </p>
        {isOwner && (
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={concluso}
              onChange={(e) => setConcluso(e.target.checked)}
              className="accent-primary"
            />
            Concluso
          </label>
        )}
      </div>

      {isOwner ? (
        <div className="space-y-3">
          <div>
            <label htmlFor={`app-data-${satellite.id}`} className="mb-1 block text-xs font-medium text-gray-700">
              Data
            </label>
            <input
              id={`app-data-${satellite.id}`}
              type="datetime-local"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={inputClass()}
            />
          </div>

          <div>
            <label htmlFor={`app-descrizione-${satellite.id}`} className="mb-1 block text-xs font-medium text-gray-700">
              Descrizione
            </label>
            {/* rows 4 -> 8: piu spazio per note lunghe, restyling 2026-08-02 */}
            <textarea
              id={`app-descrizione-${satellite.id}`}
              rows={8}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className={inputClass()}
            />
          </div>

          {/* Fermaglio spostato qui (era il posto del checkbox "Concluso",
              ora in alto) e ingrandito con più padding verticale — resta lo
              stesso AllegatoTrigger/AllegatoModale di feature/allegati-modale,
              solo dimensione/posizione cambiate. */}
          <AllegatoTrigger
            satelliteId={satellite.id}
            lavoroId={lavoroId}
            isOwner={isOwner}
            richiedeEtichetta
            iconClassName="h-6 w-6"
            bottoneClassName="py-3 px-2"
          />

          {errore && <p className="text-xs text-red-600">{errore}</p>}

          <div>
            <button
              type="button"
              onClick={handleSalva}
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio…' : 'Salva'}
            </button>
            {salvato && <p className="mt-1 text-xs text-gray-500">Salvato</p>}
          </div>

          <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
        </div>
      ) : (
        <div className="space-y-1 text-sm text-gray-700">
          {satellite.data_appuntamento && <p>{new Date(satellite.data_appuntamento).toLocaleString('it-IT')}</p>}
          {satellite.descrizione && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione}</p>}
          <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
        </div>
      )}
    </div>
  )
}
