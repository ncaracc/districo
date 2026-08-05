'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { impostaProgettoAccettato } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import { DOT_COLOR, coloreProgetto, labelStatoProgetto, type Satellite, type SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

// Progetto non fa più parte del gruppo "revisionabile" (vedi TipoRevisionabile
// in satelliti-meta.ts) dallo Sprint C (documenti) del 2/8: niente più catena
// di revisioni/storico, un solo satellite per Lavoro (verificato: 0 righe con
// revisione_di non nullo su tutti i progetto esistenti prima di questo
// sprint). Modello a singolo flag progetto_accettato, semaforo derivato dagli
// allegati caricati — componente dedicato invece di riusare RevisionabileChain,
// stesso principio già seguito per il Preventivo il 1/8.
export function SatelliteProgetto({
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
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const haAllegati = allegati.length > 0
  const colore = coloreProgetto(satellite.progetto_accettato, haAllegati)
  const label = labelStatoProgetto(satellite.progetto_accettato, haAllegati)

  // Nessuna conferma nativa qui (a differenza delle checkbox Accettato/
  // Rifiutato del Preventivo): il flag non ha alcun effetto collaterale su
  // lavoro.stato, stesso trattamento "senza attrito" già riservato alla
  // checkbox "Concluso" di Appuntamento.
  async function toggleAccettato(checked: boolean) {
    setLoading(true)
    setErrore(null)
    const result = await impostaProgettoAccettato(satellite.id, lavoroId, checked)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[colore]}`} />
          Progetto
        </p>
        {isOwner && (
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={satellite.progetto_accettato}
              disabled={loading}
              onChange={(e) => toggleAccettato(e.target.checked)}
              className="accent-primary"
            />
            Accettato
          </label>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Stato</span>
          <span className="text-xs text-gray-600">{label}</span>
        </div>

        {isOwner && (
          <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} />
        )}

        {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}

        <div className={isOwner ? 'mt-2' : ''}>
          <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
        </div>
      </div>
    </div>
  )
}
