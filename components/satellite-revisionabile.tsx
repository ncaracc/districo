'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  aggiornaDescrizioneCampione,
  aggiornaValorePreventivo,
  impostaStatoRevisionabile,
} from '@/lib/lavori/satelliti'
import { SatelliteAllegati } from '@/components/satellite-allegati'
import {
  DOT_COLOR,
  azioniPossibiliRevisionabile,
  coloreRevisionabile,
  labelStatoRevisionabile,
  type Satellite,
  type SatelliteAllegato,
  type StatoRevisionabile,
  type TipoRevisionabile,
} from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

const VARIANTE_CLASS: Record<'primary' | 'warn' | 'muted', string> = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  warn: 'border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100',
  muted: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
}

export function RevisionabileChain({
  tipo,
  titolo,
  catena,
  statoEffettivoById,
  allegatiById,
  isOwner,
  lavoroId,
  mostraValore,
  mostraDescrizione,
  storicoConStatoReale,
}: {
  tipo: TipoRevisionabile
  titolo: string
  catena: Satellite[] // ordinata dalla più recente (corrente) alla più vecchia
  statoEffettivoById: Record<string, string>
  allegatiById: Record<string, SatelliteAllegato[]>
  isOwner: boolean
  lavoroId: string
  mostraValore?: boolean
  mostraDescrizione?: boolean
  // Per default lo storico "retro-proietta" lo stato finale della catena sulle
  // revisioni superate (decisione Sprint B, usata da Preventivo/Progetto: una
  // volta accettato il preventivo, le versioni precedenti mostrano "Accettato"
  // invece del loro stato reale). Per Campione questo nasconde il motivo di un
  // rifiuto una volta approvato il tentativo finale — con questo flag true lo
  // storico mostra sempre lo stato reale della singola riga, mai retro-proiettato.
  storicoConStatoReale?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const [valore, setValore] = useState<string>('')
  const [descrizione, setDescrizione] = useState<string>('')

  if (catena.length === 0) return null

  const corrente = catena[0]
  const storico = catena.slice(1)
  const statoCorrenteEffettivo = statoEffettivoById[corrente.id] ?? corrente.stato ?? ''
  const azioni = azioniPossibiliRevisionabile(tipo, corrente.stato ?? '')

  async function avanza(nuovoStato: StatoRevisionabile) {
    setLoading(true)
    setErrore(null)
    const result = await impostaStatoRevisionabile(corrente.id, lavoroId, tipo, nuovoStato, corrente.serie ?? null)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  async function salvaValore() {
    setLoading(true)
    setErrore(null)
    const numero = valore.trim() ? Number(valore) : null
    const result = await aggiornaValorePreventivo(corrente.id, lavoroId, numero)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  async function salvaDescrizione() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaDescrizioneCampione(corrente.id, lavoroId, descrizione.trim() || null)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[coloreRevisionabile(tipo, statoCorrenteEffettivo)]}`} />
        <p className="text-sm font-medium text-gray-900">{titolo}</p>
      </div>

      {/* Revisione corrente */}
      <div className="rounded-lg bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Corrente</span>
          <span className="text-xs text-gray-600">{labelStatoRevisionabile(tipo, statoCorrenteEffettivo)}</span>
        </div>

        {mostraValore && isOwner && (
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
        )}
        {mostraValore && !isOwner && corrente.valore_complessivo != null && (
          <p className="mb-2 text-sm text-gray-700">€ {corrente.valore_complessivo.toFixed(2)}</p>
        )}

        {mostraDescrizione && isOwner && (
          <div className="mb-2">
            <label htmlFor="descrizione-campione" className="mb-1 block text-xs font-medium text-gray-700">
              Descrizione
            </label>
            <textarea
              id="descrizione-campione"
              rows={3}
              defaultValue={corrente.descrizione ?? ''}
              onChange={(e) => setDescrizione(e.target.value)}
              className={inputClass()}
            />
            <button
              type="button"
              onClick={salvaDescrizione}
              disabled={loading}
              className="mt-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Salva descrizione
            </button>
          </div>
        )}
        {mostraDescrizione && !isOwner && corrente.descrizione && (
          <p className="mb-2 whitespace-pre-wrap text-sm text-gray-600">{corrente.descrizione}</p>
        )}

        <SatelliteAllegati
          satelliteId={corrente.id}
          lavoroId={lavoroId}
          allegati={allegatiById[corrente.id] ?? []}
          isOwner={isOwner}
        />

        {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}

        {isOwner && azioni.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {azioni.map((a) => (
              <button
                key={a.stato}
                type="button"
                onClick={() => avanza(a.stato)}
                disabled={loading}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${VARIANTE_CLASS[a.variante]}`}
              >
                {loading ? 'Salvataggio…' : a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Storico revisioni superate */}
      {storico.length > 0 && (
        <ul className="mt-2 space-y-2 border-l border-gray-200 pl-3">
          {storico.map((s) => {
            const effettivo = storicoConStatoReale ? s.stato ?? '' : statoEffettivoById[s.id] ?? s.stato ?? ''
            return (
              <li key={s.id} className="text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[coloreRevisionabile(tipo, effettivo)]}`} />
                  <span>{labelStatoRevisionabile(tipo, effettivo)}</span>
                  <span className="text-gray-400">— {new Date(s.data_creazione).toLocaleDateString('it-IT')}</span>
                </div>
                {mostraDescrizione && s.descrizione && (
                  <p className="mt-0.5 whitespace-pre-wrap pl-4 text-gray-600">{s.descrizione}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
