'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaProgetto } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'

const LABEL_ALLEGATI = 'Puoi allegare foto e documenti inerenti al progetto (file di immagine e PDF).'

// Restyling 2026-08-11 (vedi CLAUDE.md — mappatura campi Progetto), sullo
// stesso template di Preventivo dello stesso giorno, con le differenze
// esplicitamente richieste: nessun campo Valore (il Progetto non ne ha
// mai avuto uno), un solo flag "Accettato" (nessun "Rifiutato" — il
// Progetto non ha un concetto di rifiuto), campo testo "Descrizione" invece
// di "Note" (stessa colonna descrizione_libera, solo l'etichetta cambia).
//
// Progetto non fa più parte del gruppo "revisionabile" (vedi TipoRevisionabile
// in satelliti-meta.ts) dallo Sprint C (documenti) del 2/8: niente più catena
// di revisioni/storico, un solo satellite per Lavoro (verificato: 0 righe con
// revisione_di non nullo su tutti i progetto esistenti prima di quello
// sprint) — a differenza del Preventivo, quindi nessun prop `catena`/
// `costruisciCatena`/lista "Revisione precedente" qui.
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
  const haAllegati = allegati.length > 0

  // Controlled con baseline corretta al primo render (non defaultValue+
  // onChange separati) — stesso motivo già documentato per Preventivo:
  // altrimenti il dirty-state partirebbe sempre "sporco" al primo render
  // anche a fronte di dati già presenti.
  const [dataCreazione, setDataCreazione] = useState(aDateLocal(satellite.data_creazione))
  const [descrizione, setDescrizione] = useState(satellite.descrizione_libera ?? '')
  // Corretto in sessione successiva (vedi CLAUDE.md/docs/audit): "Accettato"
  // era auto-salvante (chiamava impostaProgettoAccettato direttamente
  // sull'onChange, fuori da qualunque dirty-tracking) — contraddiceva il
  // principio "nessun salvataggio implicito" già stabilito per ogni altro
  // campo dell'app. Ora fa parte dello stesso snapshot inviato da "Salva",
  // esattamente come Data/Descrizione.
  const [accettato, setAccettato] = useState(satellite.progetto_accettato)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const { dirty, segnaSalvato } = useDirtyForm({ dataCreazione, descrizione, accettato })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  // data_creazione è NOT NULL a schema (mai stata editabile finora — vedi
  // CLAUDE.md, verifica schema 11/8, applicata qui identica a Preventivo):
  // un campo Data svuotato blocca il salvataggio lato client invece di
  // inviare una stringa vuota al DB.
  async function handleSalva() {
    if (!dataCreazione) {
      setErrore('La data è obbligatoria')
      return false
    }
    setLoading(true)
    setErrore(null)

    const result = await aggiornaProgetto(satellite.id, lavoroId, {
      dataCreazione,
      descrizione: descrizione.trim() || null,
      accettato,
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
              {/* Riga 1 — Data: NOT NULL a schema, vedi commento sopra
                  handleSalva. */}
              <div>
                <label htmlFor={`prog-data-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  id={`prog-data-${satellite.id}`}
                  type="date"
                  value={dataCreazione}
                  onChange={(e) => setDataCreazione(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 2 — Descrizione (descrizione_libera, colonna condivisa
                  con Costruzione/Campionatura/Noleggio/Preventivo — nessuna
                  nuova colonna). */}
              <div>
                <label htmlFor={`prog-descrizione-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Descrizione
                </label>
                <textarea
                  id={`prog-descrizione-${satellite.id}`}
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  rows={3}
                  className={inputClass()}
                />
              </div>

              {/* Riga 3 — Accettato: unico flag, nessuna esclusività da
                  gestire (nessun "Rifiutato" per il Progetto). Parte del
                  dirty-state (Salva esplicito, come Data/Descrizione — non
                  più auto-salvante, vedi CLAUDE.md/docs/audit). Subordinato
                  alla presenza di almeno un allegato (semaforo corretto in
                  sessione successiva: rosso->giallo->verde, non più
                  rosso->verde diretto) — stesso pattern già in uso per il
                  gate "Contrassegna il lavoro come chiuso." di Chiusura
                  Lavoro. */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={accettato}
                    disabled={!haAllegati}
                    onChange={(e) => setAccettato(e.target.checked)}
                    className="accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  Contrassegna il progetto come accettato.
                </label>
                {!haAllegati && (
                  <p className="mt-1 text-xs text-gray-500">Disponibile dopo aver caricato almeno un allegato.</p>
                )}
              </div>

              {/* Riga 4 — Allegati: stesso pattern Briefing/Preventivo, un
                  solo fermaglio cliccabile (nessun secondo trigger
                  duplicato). */}
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
              <p>{new Date(satellite.data_creazione).toLocaleDateString('it-IT')}</p>
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
