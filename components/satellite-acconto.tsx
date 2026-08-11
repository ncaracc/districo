'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaAcconto } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { formattaValuta } from '@/lib/formato-valuta'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'

const LABEL_ALLEGATI = "Puoi allegare foto e documenti inerenti all'acconto (file di immagine e PDF)."

// Nuova attività "Acconto" (2026-08-11, vedi CLAUDE.md): stesso template
// di riferimento di Briefing (10/8), non di Preventivo/Progetto — a
// differenza delle loro checkbox (auto-salvanti, per un effetto
// collaterale su lavoro.stato o per riusare un comportamento preesistente),
// "Incassato" qui non ha alcun effetto collaterale nuovo da confermare
// atomicamente: fa parte del dirty-state tracciato da Salva/Annulla come
// "Concluso" in Appuntamento, non un'azione a sé — nessuna conferma
// nativa, nessun aggiornamento immediato al click.
//
// Ripetibile come Campionatura: nessuna catena/raggruppamento, un
// componente per riga, `satellite` singolo (non `catena`).
//
// Intenzionalmente NON collegata a `chiusura_acconti` (dentro Chiusura
// Lavoro): due meccanismi indipendenti — l'Acconto qui giustifica l'avvio
// di acquisti/costruzione, chiusura_acconti riepiloga gli incassi alla
// chiusura finale. Il disallineamento va affrontato quando si arriverà a
// restylare Chiusura Lavoro, non qui.
export function SatelliteAcconto({
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
  // Progetto: altrimenti il dirty-state partirebbe sempre "sporco" al
  // primo render anche a fronte di dati già presenti.
  const [data, setData] = useState(aDateLocal(satellite.acconto_data))
  const [valore, setValore] = useState<string>(String(satellite.valore_complessivo ?? ''))
  const [note, setNote] = useState(satellite.descrizione_libera ?? '')
  const [incassato, setIncassato] = useState(satellite.acconto_incassato)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Dirty-state: i 4 campi che "Salva" invia davvero, incluso Incassato
  // (vedi commento sopra sul perché non è auto-salvante qui).
  const { dirty, segnaSalvato } = useDirtyForm({ data, valore, note, incassato })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  // Data e Importo sono entrambi nullable a schema (a differenza della
  // Data NOT NULL di Preventivo/Progetto): il semaforo rosso dipende
  // proprio dal fatto che possano restare vuoti alla creazione — nessuna
  // validazione obbligatoria qui.
  async function handleSalva() {
    setLoading(true)
    setErrore(null)

    const result = await aggiornaAcconto(satellite.id, lavoroId, {
      data: data || null,
      valore: valore.trim() ? Number(valore) : null,
      note: note.trim() || null,
      incassato,
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
              {/* Riga 1 — Data */}
              <div>
                <label htmlFor={`acc-data-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Data
                </label>
                <input
                  id={`acc-data-${satellite.id}`}
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 2 — Importo (valore_complessivo, label diversa dal
                  Preventivo che usa la stessa colonna). */}
              <div>
                <label htmlFor={`acc-importo-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Importo
                </label>
                <input
                  id={`acc-importo-${satellite.id}`}
                  type="number"
                  step="0.01"
                  value={valore}
                  onChange={(e) => setValore(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 3 — Note (descrizione_libera, colonna condivisa con
                  Costruzione/Campionatura/Noleggio/Preventivo/Progetto —
                  nessuna nuova colonna). */}
              <div>
                <label htmlFor={`acc-note-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Note
                </label>
                <textarea
                  id={`acc-note-${satellite.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={inputClass()}
                />
              </div>

              {/* Riga 4 — Incassato: unico flag, parte del Salva (vedi
                  commento in cima al file). */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={incassato}
                  onChange={(e) => setIncassato(e.target.checked)}
                  className="accent-primary"
                />
                Contrassegna l&apos;acconto come incassato.
              </label>

              {/* Riga 5 — Allegati: stesso pattern Briefing/Preventivo/
                  Progetto, un solo fermaglio cliccabile. */}
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
              {satellite.acconto_data && <p>{new Date(satellite.acconto_data).toLocaleDateString('it-IT')}</p>}
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
