'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaNoleggio } from '@/lib/lavori/satelliti'
import { cercaFornitoreSedi } from '@/lib/fornitori/actions'
import type { Satellite } from '@/lib/lavori/satelliti-meta'
import { formattaValuta } from '@/lib/formato-valuta'
import { Combobox } from '@/components/combobox'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'

type SedeSelezionata = { id: string; label: string }

// La "compagnia" di noleggio è un Fornitore a tutti gli effetti (emette
// fattura, va in contabilità), non un campo testo libero — stesso pattern di
// ricerca già in uso in SatelliteNuovoOrdine per Acquisto, riusa la colonna
// fornitore_sede_id già esistente (Sprint D, produzione, 2/8, vedi
// CLAUDE.md). A differenza di Acquisto, qui il fornitore resta modificabile
// anche dopo la creazione (nessun form di creazione dedicato per Noleggio).
export function SatelliteNoleggio({
  satellite,
  fornitoreSedeLabel,
  lavoroId,
  isOwner,
}: {
  satellite: Satellite
  fornitoreSedeLabel: string | null
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [sede, setSede] = useState<SedeSelezionata | null>(
    satellite.fornitore_sede_id && fornitoreSedeLabel ? { id: satellite.fornitore_sede_id, label: fornitoreSedeLabel } : null,
  )
  const [dataDa, setDataDa] = useState(aDateLocal(satellite.data_da))
  const [dataA, setDataA] = useState(aDateLocal(satellite.data_a))
  const [costo, setCosto] = useState(satellite.costo != null ? String(satellite.costo) : '')
  const [note, setNote] = useState(satellite.descrizione_libera ?? '')
  const [prenotazioneEffettuata, setPrenotazioneEffettuata] = useState(satellite.prenotazione_effettuata)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const verde = prenotazioneEffettuata

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaNoleggio(satellite.id, lavoroId, {
      fornitoreSedeId: sede?.id ?? null,
      dataDa: dataDa || null,
      dataA: dataA || null,
      costo: costo ? Number(costo) : null,
      note: note.trim() || null,
      prenotazioneEffettuata,
    })
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${verde ? 'bg-green-500' : 'bg-red-500'}`} />
        <p className="text-sm font-medium text-gray-900">Noleggio</p>
      </div>

      {isOwner ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="noleggio-fornitore" className="mb-1 block text-sm font-medium text-gray-700">
              Compagnia (fornitore)
            </label>
            {sede ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-sm text-gray-700">{sede.label}</p>
                <button type="button" onClick={() => setSede(null)} className="shrink-0 text-xs font-medium text-gray-600 underline">
                  Cambia
                </button>
              </div>
            ) : (
              <Combobox
                id="noleggio-fornitore"
                placeholder="Cerca per ragione sociale o sede..."
                fetchOptions={cercaFornitoreSedi}
                onSelect={setSede}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="noleggio-da" className="mb-1 block text-sm font-medium text-gray-700">
                Da
              </label>
              <input id="noleggio-da" type="date" value={dataDa} onChange={(e) => setDataDa(e.target.value)} className={inputClass()} />
            </div>
            <div>
              <label htmlFor="noleggio-a" className="mb-1 block text-sm font-medium text-gray-700">
                A
              </label>
              <input id="noleggio-a" type="date" value={dataA} onChange={(e) => setDataA(e.target.value)} className={inputClass()} />
            </div>
          </div>

          <div>
            <label htmlFor="noleggio-costo" className="mb-1 block text-sm font-medium text-gray-700">
              Costo
            </label>
            <input
              id="noleggio-costo"
              type="number"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              className={inputClass()}
            />
          </div>

          <div>
            <label htmlFor="noleggio-note" className="mb-1 block text-sm font-medium text-gray-700">
              Note
            </label>
            <textarea id="noleggio-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass()} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={prenotazioneEffettuata}
              onChange={(e) => setPrenotazioneEffettuata(e.target.checked)}
              className="accent-primary"
            />
            Prenotazione effettuata
          </label>

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
        <div className="space-y-1 text-sm text-gray-700">
          {fornitoreSedeLabel && <p>{fornitoreSedeLabel}</p>}
          {(satellite.data_da || satellite.data_a) && (
            <p>
              {satellite.data_da ? new Date(satellite.data_da).toLocaleDateString('it-IT') : '—'} →{' '}
              {satellite.data_a ? new Date(satellite.data_a).toLocaleDateString('it-IT') : '—'}
            </p>
          )}
          {satellite.costo != null && <p>{formattaValuta(satellite.costo)}</p>}
          {satellite.descrizione_libera && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione_libera}</p>}
        </div>
      )}
    </div>
  )
}
