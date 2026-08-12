'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaAppuntamento } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato, SottotipoAppuntamento } from '@/lib/lavori/satelliti-meta'
import { inputClass, inputClassFisso } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'
import { aDataOraLocal, combinaDataOraLocale, SLOT_ORARI } from '@/lib/date-utils'

// Restyling 2026-08-10 (vedi CLAUDE.md): Briefing diventa il TEMPLATE DI
// RIFERIMENTO per il restyling degli altri satelliti (sostituisce quello
// del 4/8, superato). Riferimento di stile: la Modal di test
// (components/test/modal-test.tsx) — header con titolo+semaforo (il
// pallino vive nel titolo passato al Modal condiviso, vedi
// lavoro-satelliti-tabella.tsx: `titoloConPallino`, font-size allineato lì
// a 16px), controllo data/ora diviso in due campi separati, textarea
// descrizione auto-crescente. Rimossa l'impostazione precedente (link
// "📎 Allegati (n)" che apriva una vista separata nascondendo Data/
// Descrizione): tutto è ora visibile in un unico flusso continuo,
// Salva/Annulla sono pillole flottanti (vedi PilloleSalvaAnnulla) invece
// della barra Salva a piena larghezza.
//
// Etichette per sottotipo (Briefing/Verifica misure/Montaggio condividono
// questo stesso componente — non tecnicamente separabile senza biforcarlo,
// stessa conclusione già raggiunta il 4/8): la richiesta descrive la
// formulazione solo per Briefing ("...raccolti durante il briefing"),
// declinata qui per tutti e tre i sottotipi con lo stesso registro.
const LABEL_CONCLUSO: Record<SottotipoAppuntamento, string> = {
  briefing: 'Contrassegna il briefing come concluso',
  verifica_misure: 'Contrassegna la verifica misure come conclusa',
  montaggio: 'Contrassegna il montaggio come concluso',
}

const LABEL_ALLEGATI: Record<SottotipoAppuntamento, string> = {
  briefing: 'Puoi allegare foto e documenti raccolti durante il briefing (file di immagine e PDF).',
  verifica_misure: 'Puoi allegare foto e documenti raccolti durante la verifica misure (file di immagine e PDF).',
  montaggio: 'Puoi allegare foto e documenti raccolti durante il montaggio (file di immagine e PDF).',
}

// 2026-08-12 (vedi CLAUDE.md — due nuove caselle sulla modale Verifica
// misure): il campo Descrizione esistente (colonna `descrizione`, condivisa
// da tutti e 3 i sottotipi) si rietichetta per Verifica misure invece di
// introdurre un campo duplicato — stesso pattern già in uso per
// LABEL_CONCLUSO/LABEL_ALLEGATI sopra. Briefing/Montaggio restano
// "Descrizione", invariati.
const LABEL_DESCRIZIONE: Record<SottotipoAppuntamento, string> = {
  briefing: 'Descrizione',
  verifica_misure: 'Attività propedeutiche alla verifica',
  montaggio: 'Descrizione',
}

export function SatelliteAppuntamento({
  satellite,
  lavoroId,
  allegati,
  isOwner,
}: {
  satellite: Satellite
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
}) {
  const router = useRouter()
  const iniziale = aDataOraLocal(satellite.data_appuntamento)
  const [dataLocal, setDataLocal] = useState(iniziale.data)
  const [oraLocal, setOraLocal] = useState(iniziale.ora)
  const [descrizione, setDescrizione] = useState(satellite.descrizione ?? '')
  // Informazioni raccolte (2026-08-12, vedi CLAUDE.md): solo Verifica
  // misure la mostra/modifica, ma lo stato vive qui incondizionatamente
  // (semplice, innocuo per Briefing/Montaggio — quei sottotipi non hanno
  // mai un modo di cambiarlo, il round-trip al salvataggio resta un no-op).
  const [informazioni, setInformazioni] = useState(satellite.descrizione_libera ?? '')
  const [concluso, setConcluso] = useState(satellite.concluso)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const descrizioneRef = useRef<HTMLTextAreaElement>(null)
  const informazioniRef = useRef<HTMLTextAreaElement>(null)

  // Auto-crescita del textarea sul proprio contenuto (stesso pattern della
  // Modal di test): l'altezza segue scrollHeight, nessuna scrollbar interna
  // — un testo lungo allunga il corpo della Modal (già scrollabile) invece
  // di introdurre un doppio scroll annidato.
  useEffect(() => {
    const el = descrizioneRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [descrizione])

  useEffect(() => {
    const el = informazioniRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [informazioni])

  // Dirty-state: gli stessi campi che "Salva" invia davvero.
  const { dirty, segnaSalvato } = useDirtyForm({ dataLocal, oraLocal, descrizione, concluso, informazioni })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  // Sempre valorizzato per le righe che istanziano questo componente
  // (page.tsx filtra esplicitamente per tipo_appuntamento prima di
  // renderizzarlo) — fallback difensivo a 'briefing', mai atteso in pratica.
  const tipo: SottotipoAppuntamento = satellite.tipo_appuntamento ?? 'briefing'

  async function handleSalva() {
    setLoading(true)
    setErrore(null)

    const result = await aggiornaAppuntamento(satellite.id, lavoroId, {
      data: combinaDataOraLocale(dataLocal, oraLocal),
      descrizione: descrizione.trim() || null,
      concluso,
      // undefined per Briefing/Montaggio (il campo non è renderizzato per
      // quei sottotipi, nessuna modifica alla colonna) — solo Verifica
      // misure lo invia davvero.
      informazioniRaccolte: tipo === 'verifica_misure' ? informazioni.trim() || null : undefined,
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

  // Standard di comportamento salvataggio (2026-08-10, vedi CLAUDE.md, da
  // applicare anche agli altri satelliti in sessioni future): "Salva" salva
  // ma non chiude (handleSalva sopra, invariato in questo — resta aperta);
  // "Annulla" scarta e chiude direttamente, nessuna conferma (è già
  // un'azione esplicita di scarto). Il tentativo di chiusura indiretto
  // (X/backdrop/Esc) resta protetto dal dialog esistente sotto, invariato.
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
    // fixed) — è `absolute` e deve risalire fino al box del Modal
    // condiviso (il primo antenato posizionato), non fermarsi a un
    // contenitore locale. Il div sotto riserva spazio in fondo (pb-24,
    // solo quando le pillole sono visibili) perché la lista allegati non
    // finisca coperta durante lo scroll.
    <>
      <div className={dirty ? 'pb-24' : ''}>
        <div className="rounded-lg border border-gray-200 p-4">
          {isOwner ? (
            <div className="space-y-4">
              {/* Riga 1 — Data e Ora: 50%/50% affiancate, impilate sotto sm:
                  (stesso controllo della Modal di test, qui con lo stacking
                  responsive in più richiesto per Briefing). */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="min-w-0 sm:flex-1">
                  <label htmlFor={`app-data-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                    Data
                  </label>
                  <input
                    id={`app-data-${satellite.id}`}
                    type="date"
                    value={dataLocal}
                    onChange={(e) => setDataLocal(e.target.value)}
                    className={`${inputClassFisso()} w-full`}
                  />
                </div>
                <div className="min-w-0 sm:flex-1">
                  <label htmlFor={`app-ora-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                    Ora
                  </label>
                  <select
                    id={`app-ora-${satellite.id}`}
                    value={oraLocal}
                    onChange={(e) => setOraLocal(e.target.value)}
                    className={`${inputClassFisso()} w-full`}
                  >
                    <option value="">--</option>
                    {SLOT_ORARI.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Riga 2 — Descrizione (rietichettata per Verifica misure, vedi
                  LABEL_DESCRIZIONE sopra — Briefing/Montaggio invariati). */}
              <div>
                <label htmlFor={`app-descrizione-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                  {LABEL_DESCRIZIONE[tipo]}
                </label>
                <textarea
                  ref={descrizioneRef}
                  id={`app-descrizione-${satellite.id}`}
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  rows={3}
                  className={`${inputClass()} resize-none overflow-hidden`}
                />
              </div>

              {/* Riga 2bis — Informazioni raccolte: solo Verifica misure
                  (2026-08-12, vedi CLAUDE.md), riusa descrizione_libera
                  (colonna generica mai toccata da Appuntamento finora,
                  nessun conflitto con Briefing/Montaggio). */}
              {tipo === 'verifica_misure' && (
                <div>
                  <label htmlFor={`app-informazioni-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
                    Informazioni raccolte
                  </label>
                  <textarea
                    ref={informazioniRef}
                    id={`app-informazioni-${satellite.id}`}
                    value={informazioni}
                    onChange={(e) => setInformazioni(e.target.value)}
                    rows={3}
                    className={`${inputClass()} resize-none overflow-hidden`}
                  />
                </div>
              )}

              {/* Riga 3 — Concluso: etichetta esplicita per esteso, non solo
                  un'icona/testo criptico. */}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={concluso}
                  onChange={(e) => setConcluso(e.target.checked)}
                  className="accent-primary"
                />
                {LABEL_CONCLUSO[tipo]}.
              </label>

              {/* Riga 4 — Allegati: un solo fermaglio, quello a inizio frase,
                  ora è l'unico trigger dell'upload (era decorativo, duplicato
                  con un secondo fermaglio-bottone in fondo — rimosso il
                  2026-08-11). Componente già esistente e già scoped per
                  Attività (lavoro_satellite_allegato.satellite_id) — riusato
                  as-is, non duplicato. */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} />
                  <span className="text-sm text-gray-700">{LABEL_ALLEGATI[tipo]}</span>
                </div>
                <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-gray-700">
              {satellite.data_appuntamento && <p>{new Date(satellite.data_appuntamento).toLocaleString('it-IT')}</p>}
              {satellite.descrizione && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione}</p>}
              {tipo === 'verifica_misure' && satellite.descrizione_libera && (
                <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione_libera}</p>
              )}
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
