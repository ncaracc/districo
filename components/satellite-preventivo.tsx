'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaPreventivo, impostaPreventivoDecisione } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import { formattaValuta } from '@/lib/formato-valuta'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'

const LABEL_ALLEGATI = 'Puoi allegare foto e documenti inerenti al preventivo (file di immagine e PDF).'

// Restyling 2026-08-11 (vedi CLAUDE.md — mappatura campi Preventivo, sessione
// "verifica schema" + implementazione): stesso template di riferimento di
// Briefing (10/8) — header con pallino nel titolo del Modal condiviso
// (titoloConPallino, invariato in page.tsx), un unico flusso continuo di
// righe (non più un sotto-box grigio "Corrente" con etichetta di stato
// testuale a fianco: il pallino nel titolo la comunica già, stesso
// principio già applicato altrove per non duplicare il semaforo — vedi
// CLAUDE.md 3/8), PilloleSalvaAnnulla al posto di SalvaFlottante, un solo
// fermaglio cliccabile per gli allegati (fix 11/8 applicato qui fin da
// subito, non riprodotto il bug del doppio fermaglio).
//
// Preventivo non fa più parte del gruppo "revisionabile" (progetto/campione)
// dalla revisione satelliti del 1/8: usa un modello a due flag booleani
// indipendenti (preventivo_accettato/preventivo_rifiutato, esclusività
// reciproca garantita da un CHECK a DB) invece del vecchio stato a 5 valori
// — vedi CLAUDE.md. Le due checkbox restano auto-salvanti con conferma
// nativa, fuori dal tracking dirty di questo restyling (il click è già il
// salvataggio, comportamento invariato) — logica di impostaPreventivoDecisione
// riusata as-is, come richiesto.
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

  // corrente può essere undefined se catena è vuota (mai realisticamente da
  // quando il Preventivo è auto-creato dal 3/8, ma il tipo resta un array):
  // calcolato prima degli hook, che devono restare incondizionati — il
  // return anticipato per catena vuota resta più sotto, dopo tutti gli hook.
  const corrente = catena[0] as Satellite | undefined

  // Controlled con baseline corretta al primo render (non defaultValue+
  // onChange separati): con defaultValue il dirty-state partirebbe sempre
  // "sporco" al primo render anche a fronte di dati già presenti — stesso
  // motivo già documentato per "valore" prima di questo restyling.
  const [dataCreazione, setDataCreazione] = useState(corrente ? aDateLocal(corrente.data_creazione) : '')
  const [valore, setValore] = useState<string>(corrente ? String(corrente.valore_complessivo ?? '') : '')
  const [note, setNote] = useState(corrente?.descrizione_libera ?? '')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Dirty-state: i tre campi che "Salva" invia davvero. Accettato/Rifiutato
  // restano fuori (auto-salvanti, invariato).
  const { dirty, segnaSalvato } = useDirtyForm({ dataCreazione, valore, note })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  if (!corrente) return null

  const storico = catena.slice(1)

  // data_creazione è NOT NULL a schema (mai stata editabile finora — vedi
  // CLAUDE.md, verifica schema 11/8): a differenza di Valore/Note, che
  // accettano vuoto, un campo Data svuotato blocca il salvataggio lato
  // client invece di inviare una stringa vuota al DB — stesso pattern già
  // in uso in lavoro-form.tsx per il campo Data del Lavoro (altra colonna
  // NOT NULL resa editabile in un form).
  async function handleSalva() {
    if (!dataCreazione) {
      setErrore('La data è obbligatoria')
      return false
    }
    setLoading(true)
    setErrore(null)

    const result = await aggiornaPreventivo(corrente!.id, lavoroId, {
      dataCreazione,
      valore: valore.trim() ? Number(valore) : null,
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

  async function setDecisione(checked: boolean, decisione: 'accettato' | 'rifiutato', conferma: string, confermaAnnulla: string) {
    if (!window.confirm(checked ? conferma : confermaAnnulla)) return
    setLoading(true)
    setErrore(null)
    const result = await impostaPreventivoDecisione(corrente!.id, lavoroId, checked ? decisione : null)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
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
                <label htmlFor={`prev-data-${corrente.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  id={`prev-data-${corrente.id}`}
                  type="date"
                  value={dataCreazione}
                  onChange={(e) => setDataCreazione(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 2 — Valore */}
              <div>
                <label htmlFor={`prev-valore-${corrente.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Valore
                </label>
                <input
                  id={`prev-valore-${corrente.id}`}
                  type="number"
                  step="0.01"
                  value={valore}
                  onChange={(e) => setValore(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 3 — Note (descrizione_libera, colonna condivisa con
                  Costruzione/Campionatura/Noleggio — nessuna nuova colonna). */}
              <div>
                <label htmlFor={`prev-note-${corrente.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Note
                </label>
                <textarea
                  id={`prev-note-${corrente.id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={inputClass()}
                />
              </div>

              {/* Riga 4/5 — Accettato/Rifiutato: auto-salvanti, esclusività
                  reciproca garantita sia in UI (setDecisione azzera sempre
                  l'altro flag) sia dal CHECK a DB — invariato dal 1/8. */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={corrente.preventivo_accettato}
                  disabled={loading}
                  onChange={(e) =>
                    setDecisione(
                      e.target.checked,
                      'accettato',
                      'Segnare il preventivo come accettato? Il lavoro passerà allo stato "Accettato".',
                      "Annullare l'accettazione del preventivo?",
                    )
                  }
                  className="accent-primary"
                />
                Contrassegna il preventivo come accettato.
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
                Contrassegna il preventivo come rifiutato.
              </label>

              {/* Accettato/Rifiutato sono auto-salvanti (setDecisione),
                  indipendenti dal dirty-state che pilota la visibilità di
                  PilloleSalvaAnnulla: un loro errore andrebbe altrimenti
                  perso in silenzio se nessun altro campo è "sporco" in quel
                  momento (nessun'altra pillola visibile a mostrarlo) — riga
                  dedicata, sempre visibile, non duplicata quando le pillole
                  sono già a schermo con lo stesso errore. */}
              {errore && !dirty && <p className="text-xs text-red-600">{errore}</p>}

              {/* Riga 6 — Allegati: stesso pattern Briefing, un solo
                  fermaglio cliccabile (nessun secondo trigger duplicato). */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <AllegatoTrigger satelliteId={corrente.id} lavoroId={lavoroId} isOwner={isOwner} />
                  <span className="text-sm text-gray-700">{LABEL_ALLEGATI}</span>
                </div>
                <AllegatoLista allegati={allegatiById[corrente.id] ?? []} lavoroId={lavoroId} isOwner={isOwner} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-gray-700">
              <p>{new Date(corrente.data_creazione).toLocaleDateString('it-IT')}</p>
              {corrente.valore_complessivo != null && <p>{formattaValuta(corrente.valore_complessivo)}</p>}
              {corrente.descrizione_libera && <p className="whitespace-pre-wrap text-gray-600">{corrente.descrizione_libera}</p>}
              <AllegatoLista allegati={allegatiById[corrente.id] ?? []} lavoroId={lavoroId} isOwner={isOwner} />
            </div>
          )}

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
