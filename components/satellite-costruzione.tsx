'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaCostruzione } from '@/lib/lavori/satelliti'
import { calcolaTotaleMinutiSessioni, calcolaCostoManodopera } from '@/lib/lavori/satelliti-meta'
import type { Satellite, SatelliteAllegato, SessioneLavoro } from '@/lib/lavori/satelliti-meta'
import { formattaValuta } from '@/lib/formato-valuta'
import { inputClass, inputClassFisso } from '@/lib/input-class'
import { aDataOraLocal, combinaDataOraLocale, SLOT_ORARI, RIGA_DATA_ORA_CLASSI, CAMPO_DATA_CLASSI, CAMPO_ORA_CLASSI } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'

const LABEL_ALLEGATI = 'Puoi allegare foto e documenti inerenti alla costruzione (file di immagine e PDF).'

// `persone` (2026-08-19, vedi CLAUDE.md — tariffe orarie e costo
// manodopera): stringa come gli altri campi numerici di bozza (coerente con
// l'input controllato), default "1" per una sessione nuova ("da solo" è
// l'ipotesi più comune). `arrotondaSuA30Min`/`calcolaTotaleMinuti` (locali,
// duplicate anche in satellite-montaggio.tsx) sono state spostate in
// satelliti-meta.ts come `calcolaTotaleMinutiSessioni` (invariata) perché
// ora serve la stessa formula anche lato server (dettaglio-lavoro-data.ts/
// satelliti.ts) per il costo manodopera — un solo punto, niente rischio di
// divergenza tra le versioni client e quella server.
type SessioneBozza = { inizioData: string; inizioOra: string; fineData: string; fineOra: string; persone: string }

function sessioneVuota(): SessioneBozza {
  return { inizioData: '', inizioOra: '', fineData: '', fineOra: '', persone: '1' }
}

function aSessioneBozza(s: SessioneLavoro): SessioneBozza {
  const inizio = aDataOraLocal(s.inizio)
  const fine = aDataOraLocal(s.fine)
  return { inizioData: inizio.data, inizioOra: inizio.ora, fineData: fine.data, fineOra: fine.ora, persone: String(s.persone ?? 1) }
}

// Converte le bozze in sessioni valide da salvare/usare per il calcolo del
// totale ore — una riga "Aggiungi sessione" mai completata (inizio ancora
// vuoto) viene scartata qui, non bloccante per il salvataggio delle altre.
// Persone: minimo 1 (un valore vuoto/0/non numerico non deve azzerare il
// costo di una sessione realmente lavorata).
function sessioniValide(bozze: SessioneBozza[]): SessioneLavoro[] {
  return bozze
    .filter((b) => b.inizioData)
    .map((b) => ({
      inizio: combinaDataOraLocale(b.inizioData, b.inizioOra)!,
      fine: combinaDataOraLocale(b.fineData, b.fineOra),
      persone: Math.max(1, Math.round(Number(b.persone)) || 1),
    }))
}

function formattaTotaleOre(minutiTotali: number): string {
  const ore = Math.floor(minutiTotali / 60)
  const min = minutiTotali % 60
  if (ore === 0) return `${min}min`
  if (min === 0) return `${ore}h`
  return `${ore}h ${min}min`
}

// "(N persone)" solo quando diverso dal caso comune (da solo) — nessun
// rumore visivo per la maggioranza delle sessioni.
function formattaSessioneLettura(s: SessioneLavoro): string {
  const inizio = new Date(s.inizio).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })
  const fine = s.fine ? new Date(s.fine).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : 'in corso'
  const persone = s.persone && s.persone > 1 ? ` (${s.persone} persone)` : ''
  return `${inizio} → ${fine}${persone}`
}

// Restyling 2026-08-12 (vedi CLAUDE.md — mappatura campi Costruzione),
// sullo stesso template di Progetto/Acconto/Campionatura — sostituisce il
// vecchio stato a 3 valori (da_iniziare/in_corso/completata) + singola
// coppia data_inizio/data_fine con un elenco libero di sessioni di lavoro
// (sessioni_lavoro) + flag booleano `concluso` (colonna condivisa con
// Appuntamento, riusata qui — vedi CLAUDE.md per la verifica di non
// conflitto). Header con pallino invariato (titoloConPallino, già
// impostato per Costruzione dallo Sprint UI-4 del 6/8).
export function SatelliteCostruzione({
  satellite,
  lavoroId,
  allegati,
  isOwner,
  tariffaOraria,
  costoManodoperaStimato,
}: {
  satellite: Satellite
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
  // Tariffe orarie e costo manodopera (2026-08-19, vedi CLAUDE.md).
  // `tariffaOraria`: tariffa VIVA dell'artigiano owner del Lavoro, usata
  // SOLO per il ricalcolo reattivo del ramo editabile (isOwner=true implica
  // già Lavoro non completato, vedi dettaglio-lavoro-data.ts — nessun
  // congelamento in gioco mentre si sta ancora modificando).
  // `costoManodoperaStimato`: valore già risolto server-side (congelato se
  // il Lavoro è chiuso, altrimenti calcolato dal vivo al caricamento della
  // pagina) — usato SOLO dal ramo di sola lettura, mai ricalcolato qui.
  tariffaOraria: number
  costoManodoperaStimato: number
}) {
  const router = useRouter()
  const [sessioni, setSessioni] = useState<SessioneBozza[]>(satellite.sessioni_lavoro.map(aSessioneBozza))
  const [note, setNote] = useState(satellite.descrizione_libera ?? '')
  const [conclusa, setConclusa] = useState(satellite.concluso)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Dirty-state: sessioni (incluse aggiunte/rimozioni di righe), Note e
  // Conclusa — tutti e 3 salvati insieme da "Salva", nessun campo
  // auto-salvante qui (Conclusa fa parte del dirty-state tracciato,
  // stesso trattamento di "Incassato" in Acconto/"Consegnato" in
  // Campionatura, non delle checkbox auto-salvanti di Preventivo/Progetto).
  const { dirty, segnaSalvato } = useDirtyForm({ sessioni, note, conclusa })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  // Ricalcolati ad ogni render (nessun useEffect/timer): riflettono anche
  // le modifiche non ancora salvate nel form, stesso principio già in uso
  // per "Valore - Acconti" di Chiusura Lavoro.
  const sessioniAttuali = sessioniValide(sessioni)
  const totaleMinuti = calcolaTotaleMinutiSessioni(sessioniAttuali)
  const costoManodoperaVivo = calcolaCostoManodopera(sessioniAttuali, tariffaOraria)

  function aggiornaSessione(indice: number, campo: keyof SessioneBozza, valore: string) {
    setSessioni((prev) => prev.map((s, i) => (i === indice ? { ...s, [campo]: valore } : s)))
  }

  function aggiungiSessione() {
    setSessioni((prev) => [...prev, sessioneVuota()])
  }

  function rimuoviSessione(indice: number) {
    setSessioni((prev) => prev.filter((_, i) => i !== indice))
  }

  async function handleSalva() {
    setLoading(true)
    setErrore(null)

    const result = await aggiornaCostruzione(satellite.id, lavoroId, {
      sessioni: sessioniValide(sessioni),
      note: note.trim() || null,
      conclusa,
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
              {/* Riga 2 — Elenco sessioni: una riga per sessione, Data+Ora
                  inizio e Data+Ora fine (fine facoltativa, sessione ancora
                  aperta). Bottone "Rimuovi" per riga (non esplicitamente
                  richiesto ma coerente con il pattern già in uso per gli
                  acconti di Chiusura Lavoro — evita che un click su
                  "Aggiungi sessione" per errore resti irrecuperabile). */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Sessioni di lavoro</p>
                {sessioni.length === 0 && <p className="text-sm text-gray-500">Nessuna sessione ancora avviata.</p>}
                {sessioni.map((s, i) => (
                  <div key={i} className="space-y-2 rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sessione {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => rimuoviSessione(i)}
                        className="text-xs font-medium text-gray-500 underline hover:text-red-600"
                      >
                        Rimuovi
                      </button>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-700">Inizio</p>
                      <div className={`${RIGA_DATA_ORA_CLASSI} gap-2`}>
                        <input
                          type="date"
                          value={s.inizioData}
                          onChange={(e) => aggiornaSessione(i, 'inizioData', e.target.value)}
                          className={`${inputClassFisso()} w-full ${CAMPO_DATA_CLASSI}`}
                        />
                        <select
                          value={s.inizioOra}
                          onChange={(e) => aggiornaSessione(i, 'inizioOra', e.target.value)}
                          className={`${inputClassFisso()} w-full ${CAMPO_ORA_CLASSI}`}
                        >
                          <option value="">--</option>
                          {SLOT_ORARI.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-700">Fine</p>
                      <div className={`${RIGA_DATA_ORA_CLASSI} gap-2`}>
                        <input
                          type="date"
                          value={s.fineData}
                          onChange={(e) => aggiornaSessione(i, 'fineData', e.target.value)}
                          className={`${inputClassFisso()} w-full ${CAMPO_DATA_CLASSI}`}
                        />
                        <select
                          value={s.fineOra}
                          onChange={(e) => aggiornaSessione(i, 'fineOra', e.target.value)}
                          className={`${inputClassFisso()} w-full ${CAMPO_ORA_CLASSI}`}
                        >
                          <option value="">--</option>
                          {SLOT_ORARI.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Persone (2026-08-19, vedi CLAUDE.md): numero di
                        persone su questa sessione, usato per il costo
                        manodopera — 1 = da solo, 2 = con un aiutante, ecc.
                        Stesso pattern type="number" già in uso per i campi
                        Obiettivi (ProfiloObiettiviForm), non il testo
                        filtrato di Quantità/Acquisto: qui non c'è alcuna
                        mascheratura con separatore delle migliaia da cui
                        distinguere le frecce native, il rischio di
                        variazioni accidentali è marginale su un contatore
                        a step 1. */}
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-700">Persone</p>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={s.persone}
                        onChange={(e) => aggiornaSessione(i, 'persone', e.target.value)}
                        className={`${inputClassFisso()} w-24`}
                      />
                    </div>
                  </div>
                ))}

                {/* Riga 3 — Aggiungi sessione */}
                <button
                  type="button"
                  onClick={aggiungiSessione}
                  className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
                >
                  + Aggiungi sessione
                </button>
              </div>

              {/* Riga 4 — Totale ore di costruzione: sola lettura, calcolato. */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-700">Totale ore di costruzione</span>
                <span className="text-sm text-gray-900">{formattaTotaleOre(totaleMinuti)}</span>
              </div>

              {/* Riga 4bis — Costo manodopera stimato (2026-08-19, vedi
                  CLAUDE.md): sola lettura, calcolato dal vivo qui (ramo
                  editabile, Lavoro sempre non completato — nessun
                  congelamento in gioco, vedi commento sui prop sopra). */}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-sm font-medium text-gray-700">Costo manodopera stimato</span>
                <span className="text-sm text-gray-900">{formattaValuta(costoManodoperaVivo, 2)}</span>
              </div>

              {/* Riga 5 — Appunti e commenti */}
              <div>
                <label htmlFor={`costruzione-note-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  Appunti e commenti
                </label>
                <textarea
                  id={`costruzione-note-${satellite.id}`}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Riga 6 — Conclusa: parte del Salva (vedi commento sopra sul
                  dirty-state), non auto-salvante. */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={conclusa}
                  onChange={(e) => setConclusa(e.target.checked)}
                  className="accent-primary"
                />
                Contrassegna la costruzione come conclusa.
              </label>

              {/* Riga 7 — Allegati: stesso pattern già in uso su Progetto/
                  Preventivo/Campionatura/Acconto/Noleggio, un solo
                  fermaglio cliccabile. */}
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
              {satellite.sessioni_lavoro.length > 0 ? (
                <div className="space-y-1">
                  {satellite.sessioni_lavoro.map((s, i) => (
                    <p key={i}>{formattaSessioneLettura(s)}</p>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Nessuna sessione ancora avviata.</p>
              )}
              <p className="text-gray-600">Totale ore di costruzione: {formattaTotaleOre(calcolaTotaleMinutiSessioni(satellite.sessioni_lavoro))}</p>
              {/* Costo manodopera stimato (2026-08-19, vedi CLAUDE.md):
                  valore già risolto server-side (congelato se il Lavoro è
                  chiuso) — non ricalcolato qui, vedi commento sui prop. */}
              <p className="text-gray-600">Costo manodopera stimato: {formattaValuta(costoManodoperaStimato, 2)}</p>
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
