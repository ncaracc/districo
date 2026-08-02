'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaValorePreventivo, impostaPreventivoDecisione } from '@/lib/lavori/satelliti'
import { SatelliteAllegati } from '@/components/satellite-allegati'
import { DOT_COLOR, colorePreventivo, labelStatoPreventivo, type Satellite, type SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { formattaValuta } from '@/lib/formato-valuta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

// Preventivo non fa più parte del gruppo "revisionabile" (progetto/campione)
// dalla revisione satelliti del 1/8: usa un modello a due flag booleani
// indipendenti (preventivo_accettato/preventivo_rifiutato) invece del vecchio
// stato a 5 valori — vedi CLAUDE.md. Componente dedicato invece di riusare
// RevisionabileChain: le interazioni (due checkbox mutuamente esclusive che
// pilotano il gate su lavoro.stato) non hanno più nulla in comune con
// azioniPossibiliRevisionabile.
export function SatellitePreventivo({
  catena, // ordinata dalla più recente (corrente) alla più vecchia
  allegatiById,
  isOwner,
  lavoroId,
}: {
  catena: Satellite[]
  allegatiById: Record<string, SatelliteAllegato[]>
  isOwner: boolean
  lavoroId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [valore, setValore] = useState<string>('')

  if (catena.length === 0) return null

  const corrente = catena[0]
  const storico = catena.slice(1)
  const colore = colorePreventivo(corrente.preventivo_accettato, corrente.preventivo_rifiutato, corrente.valore_complessivo)
  const label = labelStatoPreventivo(corrente.preventivo_accettato, corrente.preventivo_rifiutato, corrente.valore_complessivo)

  async function salvaValore() {
    setLoading(true)
    setErrore(null)
    const numero = valore.trim() ? Number(valore) : null
    const result = await aggiornaValorePreventivo(corrente.id, lavoroId, numero)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  async function setDecisione(checked: boolean, decisione: 'accettato' | 'rifiutato', conferma: string, confermaAnnulla: string) {
    if (!window.confirm(checked ? conferma : confermaAnnulla)) return
    setLoading(true)
    setErrore(null)
    const result = await impostaPreventivoDecisione(corrente.id, lavoroId, checked ? decisione : null)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[colore]}`} />
        <p className="text-sm font-medium text-gray-900">Preventivo</p>
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Corrente</span>
          <span className="text-xs text-gray-600">{label}</span>
        </div>

        {isOwner ? (
          <div className="mb-2 flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="valore-preventivo" className="mb-1 block text-xs font-medium text-gray-700">
                Valore
              </label>
              <input
                id="valore-preventivo"
                type="number"
                step="0.01"
                defaultValue={corrente.valore_complessivo ?? ''}
                onChange={(e) => setValore(e.target.value)}
                className={inputClass()}
              />
            </div>
            <button
              type="button"
              onClick={salvaValore}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Salva
            </button>
          </div>
        ) : (
          corrente.valore_complessivo != null && <p className="mb-2 text-sm text-gray-700">{formattaValuta(corrente.valore_complessivo)}</p>
        )}

        <SatelliteAllegati satelliteId={corrente.id} lavoroId={lavoroId} allegati={allegatiById[corrente.id] ?? []} isOwner={isOwner} />

        {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}

        {isOwner && (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={corrente.preventivo_accettato}
                disabled={loading}
                onChange={(e) =>
                  setDecisione(
                    e.target.checked,
                    'accettato',
                    'Segnare il preventivo come accettato? Il lavoro passerà allo stato "Accettato" e verranno create le attività di esecuzione.',
                    "Annullare l'accettazione del preventivo? Lo stato del lavoro non tornerà automaticamente indietro.",
                  )
                }
                className="accent-primary"
              />
              Accettato
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={corrente.preventivo_rifiutato}
                disabled={loading}
                onChange={(e) =>
                  setDecisione(
                    e.target.checked,
                    'rifiutato',
                    'Segnare il preventivo come rifiutato? Il lavoro passerà allo stato "Rifiutato".',
                    'Annullare il rifiuto del preventivo?',
                  )
                }
                className="accent-primary"
              />
              Rifiutato
            </label>
          </div>
        )}
      </div>

      {storico.length > 0 && (
        <ul className="mt-2 space-y-1 border-l border-gray-200 pl-3">
          {storico.map((s) => (
            <li key={s.id} className="text-xs text-gray-500">
              Revisione precedente — {new Date(s.data_creazione).toLocaleDateString('it-IT')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
