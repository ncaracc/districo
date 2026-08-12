'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaSpesaNonPreventivata } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { formattaValuta } from '@/lib/formato-valuta'
import { InputValuta } from '@/components/input-valuta'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'

const LABEL_ALLEGATI = 'Puoi allegare foto e documenti inerenti alla spesa non preventivata (file di immagine e PDF).'

// Nuova attività "Attività non preventivate" (2026-08-13, vedi CLAUDE.md):
// identica alla modale Acconto (stesso schema/layout/semaforo/allegati) —
// tipo interno 'spesa_non_preventivata', etichetta UI "Attività non
// preventivate". Uniche differenze: label "Descrizione" invece di "Note"
// (stessa colonna descrizione_libera), checkbox "Contrassegna la spesa
// come accettata." (spesa_accettata invece di acconto_incassato), testo
// allegati dedicato. **Correzione rispetto alla richiesta iniziale**: il
// prompt descriveva Acconto come avente "pattern data+ora 60/40" — verificato
// leggendo satellite-acconto.tsx che il componente reale ha un solo campo
// Data (nessun campo Ora, nessuno split) — replicato Acconto così com'è
// realmente, non come descritto, per restare davvero "identica alla modale
// Acconto già implementata" (l'istruzione esplicita, prevalente sulla frase
// discordante sullo stesso paragrafo).
export function SatelliteSpesaNonPreventivata({
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

  const [data, setData] = useState(aDateLocal(satellite.spesa_data))
  const [valore, setValore] = useState<string>(String(satellite.valore_complessivo ?? ''))
  const [descrizione, setDescrizione] = useState(satellite.descrizione_libera ?? '')
  const [accettata, setAccettata] = useState(satellite.spesa_accettata)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Dirty-state: i 4 campi che "Salva" invia davvero, incluso Accettata
  // (parte del Salva, non auto-salvante — stesso trattamento di Incassato
  // in Acconto).
  const { dirty, segnaSalvato } = useDirtyForm({ data, valore, descrizione, accettata })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  // Data e Importo entrambi nullable a schema: il semaforo rosso dipende
  // proprio dal fatto che possano restare vuoti alla creazione.
  async function handleSalva() {
    setLoading(true)
    setErrore(null)

    const result = await aggiornaSpesaNonPreventivata(satellite.id, lavoroId, {
      data: data || null,
      valore: valore.trim() ? Number(valore) : null,
      descrizione: descrizione.trim() || null,
      accettata,
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
  // direttamente, nessuna conferma.
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
    // da qualunque wrapper con un proprio `position` — stesso motivo già
    // documentato in satellite-appuntamento.tsx.
    <>
      <div className={dirty ? 'pb-24' : ''}>
        <div className="rounded-lg border border-gray-200 p-4">
          {isOwner ? (
            <div className="space-y-4">
              {/* Riga 1 — Data */}
              <div>
                <label htmlFor={`snp-data-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Data
                </label>
                <input
                  id={`snp-data-${satellite.id}`}
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 2 — Importo (valore_complessivo, colonna condivisa con
                  Preventivo/Acconto/Acquisto/Noleggio). */}
              <div>
                <label htmlFor={`snp-importo-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Importo
                </label>
                <InputValuta id={`snp-importo-${satellite.id}`} value={valore} onChange={setValore} className={inputClass()} />
              </div>

              {/* Riga 3 — Descrizione (descrizione_libera, label diversa da
                  Acconto che riusa la stessa colonna come "Note"). */}
              <div>
                <label htmlFor={`snp-descrizione-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Descrizione
                </label>
                <textarea
                  id={`snp-descrizione-${satellite.id}`}
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  rows={3}
                  className={inputClass()}
                />
              </div>

              {/* Riga 4 — Accettata: unico flag, parte del Salva. */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={accettata}
                  onChange={(e) => setAccettata(e.target.checked)}
                  className="accent-primary"
                />
                Contrassegna la spesa come accettata.
              </label>

              {/* Riga 5 — Allegati: stesso pattern Briefing/Preventivo/
                  Acconto, un solo fermaglio cliccabile. */}
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
              {satellite.spesa_data && <p>{new Date(satellite.spesa_data).toLocaleDateString('it-IT')}</p>}
              {satellite.valore_complessivo != null && <p>{formattaValuta(satellite.valore_complessivo)}</p>}
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
