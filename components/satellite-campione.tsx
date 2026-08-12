'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaCampione } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'

const LABEL_ALLEGATI = 'Puoi allegare foto e documenti inerenti al campione (file di immagine e PDF).'

// Restyling 2026-08-12 (vedi CLAUDE.md — mappatura campi Campionatura),
// sullo stesso template di Progetto/Acconto — sostituisce il vecchio
// sotto-box grigio "Stato" (il pallino nell'header del Modal condiviso lo
// comunica già, `titoloConPallino`, impostato per Campionatura fin dallo
// Sprint UI-4 del 6/8, invariato qui).
//
// Ogni Campionatura è un'istanza indipendente dal Sprint D (produzione)
// 2026-08-02 (vedi CLAUDE.md): niente più raggruppamento per serie né catena
// di revisioni via revisione_di — se una campionatura "non va bene" se ne
// crea una nuova scollegata dalla precedente (bottone "Aggiungi attività",
// non un'azione su questo componente). Componente dedicato invece di
// riusare RevisionabileChain (rimosso insieme al resto dell'apparato
// "revisionabile", ormai senza altri consumer — Preventivo/Progetto ne
// erano già usciti l'1/8 e il 2/8, Campione era rimasto l'unico consumer).
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

  // Controlled con baseline corretta al primo render (non defaultValue+
  // onChange separati) — stesso motivo già documentato per Preventivo/
  // Progetto/Acconto: altrimenti il dirty-state partirebbe sempre "sporco"
  // al primo render anche a fronte di dati già presenti.
  const [data, setData] = useState(aDateLocal(satellite.campione_data_consegna))
  const [descrizione, setDescrizione] = useState(satellite.descrizione ?? '')
  const [esito, setEsito] = useState(satellite.descrizione_libera ?? '')
  const [consegnato, setConsegnato] = useState(satellite.campione_consegnato)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Dirty-state: tutti e 4 i campi che "Salva" invia davvero, incluso
  // Consegnato — stesso trattamento di "Incassato" in Acconto (nessun
  // effetto collaterale nuovo da confermare atomicamente, a differenza
  // delle checkbox auto-salvanti di Preventivo/Progetto), non più un
  // side-effect "leggi poi scrivi" separato.
  const { dirty, segnaSalvato } = useDirtyForm({ data, descrizione, esito, consegnato })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  // Data e Descrizione sono entrambi nullable a schema (a differenza della
  // Data NOT NULL di Preventivo/Progetto): il semaforo rosso dipende proprio
  // dal fatto che la Data possa restare vuota alla creazione — nessuna
  // validazione obbligatoria qui.
  async function handleSalva() {
    setLoading(true)
    setErrore(null)

    const result = await aggiornaCampione(satellite.id, lavoroId, {
      data: data || null,
      descrizione: descrizione.trim() || null,
      consegnato,
      note: esito.trim() || null,
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

  // Standard di comportamento salvataggio (2026-08-10, vedi CLAUDE.md):
  // "Salva" salva ma non chiude (resta aperta); "Annulla" scarta e chiude
  // direttamente, nessuna conferma (è già un'azione esplicita di scarto).
  // Il tentativo di chiusura indiretto (X/backdrop/Esc) resta protetto dal
  // dialog esistente sotto, invariato.
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
    // da qualunque wrapper con un proprio `position` (relative/absolute/
    // fixed) — stesso motivo già documentato in satellite-appuntamento.tsx.
    <>
      <div className={dirty ? 'pb-24' : ''}>
        <div className="rounded-lg border border-gray-200 p-4">
          {isOwner ? (
            <div className="space-y-4">
              {/* Riga 1 — Data (campione_data_consegna, ora liberamente
                  editabile — non più un side-effect legato al checkbox
                  Consegnato, vedi commento sopra aggiornaCampione()). */}
              <div>
                <label htmlFor={`camp-data-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Data
                </label>
                <input
                  id={`camp-data-${satellite.id}`}
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 2 — Descrizione (colonna `descrizione`, condivisa con
                  Appuntamento — già usata da Campionatura per questo scopo
                  prima di questo restyling, nessuna nuova colonna). */}
              <div>
                <label htmlFor={`camp-descrizione-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Descrizione
                </label>
                <textarea
                  id={`camp-descrizione-${satellite.id}`}
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  rows={3}
                  className={inputClass()}
                />
              </div>

              {/* Riga 3 — Consegnato: parte del Salva (vedi commento sopra
                  sul dirty-state), non auto-salvante. */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={consegnato}
                  onChange={(e) => setConsegnato(e.target.checked)}
                  className="accent-primary"
                />
                Contrassegna il campione come consegnato.
              </label>

              {/* Riga 4 — Esito (descrizione_libera, colonna condivisa con
                  Costruzione/Noleggio/Preventivo/Progetto/Acconto — nessuna
                  nuova colonna). */}
              <div>
                <label htmlFor={`camp-esito-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Esito
                </label>
                <textarea
                  id={`camp-esito-${satellite.id}`}
                  value={esito}
                  onChange={(e) => setEsito(e.target.value)}
                  rows={3}
                  placeholder="Es. il cliente non ha gradito la finitura"
                  className={inputClass()}
                />
              </div>

              {/* Riga 5 — Allegati: stesso pattern Briefing/Preventivo/
                  Progetto/Acconto, un solo fermaglio cliccabile. */}
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
              {satellite.campione_data_consegna && <p>{new Date(satellite.campione_data_consegna).toLocaleDateString('it-IT')}</p>}
              {satellite.descrizione && <p className="whitespace-pre-wrap">{satellite.descrizione}</p>}
              {satellite.descrizione_libera && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione_libera}</p>}
              <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
            </div>
          )}
        </div>
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
