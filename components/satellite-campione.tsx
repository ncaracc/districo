'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaCampione } from '@/lib/lavori/satelliti'
import { SatelliteAllegati } from '@/components/satellite-allegati'
import {
  labelStatoCampione,
  type Satellite,
  type SatelliteAllegato,
} from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { SalvaFlottante } from '@/components/salva-flottante'
import { DialogConferma } from '@/components/dialog-conferma'

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

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // tutti e 3 i campi sono salvati manualmente insieme, nessun campo
  // auto-salvante qui da escludere dallo snapshot.
  const { dirty, segnaSalvato } = useDirtyForm({ descrizione, note, consegnato })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

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
    if (!result.ok) {
      setErrore(result.error)
      return false
    }
    segnaSalvato()
    router.refresh()
    return true
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
    // Frammento, non un unico div: SalvaFlottante sibling del div a bordo,
    // non annidato dentro — stesso motivo già documentato in
    // satellite-appuntamento.tsx (Sprint UI-2, vedi CLAUDE.md).
    <>
      <div className="rounded-lg border border-gray-200 p-4">
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
                <label htmlFor="campione-descrizione" className="mb-1 block text-sm font-medium text-gray-700">
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
                <label htmlFor="campione-note" className="mb-1 block text-sm font-medium text-gray-700">
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

      {isOwner && <SalvaFlottante visibile={dirty} salvando={loading} errore={errore} onSalva={handleSalva} />}

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
