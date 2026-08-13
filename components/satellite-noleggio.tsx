'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaNoleggio } from '@/lib/lavori/satelliti'
import { cercaFornitoreSedi } from '@/lib/fornitori/actions'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { formattaValuta } from '@/lib/formato-valuta'
import { InputValuta } from '@/components/input-valuta'
import { Combobox } from '@/components/combobox'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'

type SedeSelezionata = { id: string; label: string }

const LABEL_ALLEGATI = 'Puoi allegare foto e documenti inerenti il noleggio (file di immagine e PDF).'

// La "compagnia" di noleggio è un Fornitore a tutti gli effetti (emette
// fattura, va in contabilità), non un campo testo libero — stesso pattern di
// ricerca già in uso in SatelliteNuovoOrdine per Acquisto, riusa la colonna
// fornitore_sede_id già esistente (Sprint D, produzione, 2/8, vedi
// CLAUDE.md). A differenza di Acquisto, qui il fornitore resta modificabile
// anche dopo la creazione (nessun form di creazione dedicato per Noleggio).
export function SatelliteNoleggio({
  satellite,
  fornitoreSedeLabel,
  allegati,
  lavoroId,
  isOwner,
}: {
  satellite: Satellite
  fornitoreSedeLabel: string | null
  allegati: SatelliteAllegato[]
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

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // qui, a differenza di altri satelliti, "Prenotazione effettuata" NON si
  // auto-salva (unico checkbox binario dell'app con questo comportamento,
  // vedi docs/audit-ui.md sezione 3) — resta quindi dentro lo snapshot
  // insieme a tutti gli altri campi, tutti salvati insieme da "Salva".
  const { dirty, segnaSalvato } = useDirtyForm({
    fornitoreSedeId: sede?.id ?? null,
    dataDa,
    dataA,
    costo,
    note,
    prenotazioneEffettuata,
  })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

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
    if (!result.ok) {
      setErrore(result.error)
      return false
    }
    segnaSalvato()
    router.refresh()
    return true
  }

  function handleAnnulla() {
    chiudiReale()
  }

  async function handleSalvaEEsci() {
    if (await handleSalva()) {
      setConfermaUscitaAperta(false)
      chiudiReale()
    }
  }

  function handleEsciSenzaSalvare() {
    setConfermaUscitaAperta(false)
    chiudiReale()
  }

  return (
    // Frammento, non un unico div: PilloleSalvaAnnulla deve restare fuori
    // dal div a bordo (position: absolute ancorato al box della Modal, non
    // al div interno) — stesso pattern degli altri satelliti già migrati
    // al template Briefing (vedi CLAUDE.md, restyling 10/8 in poi).
    <>
      <div className="rounded-lg border border-gray-200 p-4">
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
              <InputValuta id="noleggio-costo" value={costo} onChange={setCosto} className={inputClass()} />
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
              Contrassegna la prenotazione come effettuata.
            </label>

            {/* Allegati: stesso pattern già in uso su Progetto/Preventivo/
                Campionatura/Acconto — un solo fermaglio cliccabile, testo a
                fianco, componente condiviso riusato as-is (non ricreato). */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} />
                <span className="text-sm text-gray-700">{LABEL_ALLEGATI}</span>
              </div>
              <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            {fornitoreSedeLabel && <p>{fornitoreSedeLabel}</p>}
            {(satellite.data_da || satellite.data_a) && (
              <p>
                {satellite.data_da ? new Date(satellite.data_da).toLocaleDateString('it-IT') : '—'} →{' '}
                {satellite.data_a ? new Date(satellite.data_a).toLocaleDateString('it-IT') : '—'}
              </p>
            )}
            {satellite.costo != null && <p>{formattaValuta(satellite.costo)}</p>}
            {satellite.descrizione_libera && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione_libera}</p>}
            <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
          </div>
        )}
      </div>

      {isOwner && (
        <PilloleSalvaAnnulla visibile={dirty} salvando={loading} errore={errore} onSalva={handleSalva} onAnnulla={handleAnnulla} />
      )}

      <DialogConferma
        aperto={confermaUscitaAperta}
        titolo="Modifiche non salvate"
        messaggio="Vuoi salvare le modifiche prima di uscire?"
        opzioni={[
          { label: 'Salva ed esci', variante: 'primaria', onClick: handleSalvaEEsci, disabled: loading },
          { label: 'Esci senza salvare', variante: 'secondaria', onClick: handleEsciSenzaSalvare, disabled: loading },
          { label: 'Annulla', variante: 'testuale', onClick: () => setConfermaUscitaAperta(false) },
        ]}
      />
    </>
  )
}
