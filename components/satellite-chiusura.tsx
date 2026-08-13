'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaChiusuraFlags } from '@/lib/lavori/satelliti'
import { formattaValuta } from '@/lib/formato-valuta'
import type { Satellite } from '@/lib/lavori/satelliti-meta'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'

// Restyling calcoli economici (2026-08-13, vedi CLAUDE.md): SOSTITUISCE
// interamente la vecchia struttura (Data + Acconti ricevuti liberi +
// singola checkbox "Concluso" + allegati) — nessuno dei vecchi campi
// editabili sopravvive. I 5 campi economici sono ora SOLA LETTURA,
// calcolati server-side (dettaglio-lavoro-data.ts) dalle altre attività del
// Lavoro (Preventivo, Attività non preventivate, Acquisti, Noleggi,
// Acconto) — nessun input manuale, nessun salvataggio su questi campi.
// Gli unici due campi editabili sono i flag "Incassato"/"Chiuso"
// (chiusura_incassata/chiusura_conclusa), parte del dirty-state tracciato
// da Salva/Annulla (PilloleSalvaAnnulla, standard 10/8 — questo restyling
// migra anche Chiusura da SalvaFlottante) — lavoro.stato diventa
// 'completato' solo quando ENTRAMBI sono true (vedi aggiornaChiusuraFlags).
// Nessuna riga allegati (rimossa, come da nuova struttura richiesta — 0
// allegati reali su Chiusura in produzione al momento della modifica,
// verificato prima di rimuoverla).
//
// Vincolo "Contrassegna il lavoro come chiuso." (2026-08-13, vedi
// CLAUDE.md): la checkbox "Chiuso" è disabilitata finché non TUTTE le
// Attività del Lavoro (Chiusura esclusa) sono verdi — `tutteAttivitaVerdi`/
// `attivitaNonVerdiCount` arrivano già calcolati da dettaglio-lavoro-data.ts
// (dove sono già disponibili allegatiById/righePerSatellite necessari per
// Progetto/Acquisti), nessun ricalcolo qui. Ri-verificato anche lato
// server in `aggiornaChiusuraFlags()` (difensivo, la disabilitazione qui è
// solo la guardia UX primaria). Reset automatico (scelta esplicita
// dell'utente): se `chiusura_conclusa` era già `true` ma nel frattempo
// qualcosa non è più verde, il valore arriva già corretto a `false` da
// dettaglio-lavoro-data.ts (side-effect al caricamento dati, non qui) —
// questo componente si limita a inizializzare `conclusa` dal valore già
// coerente ricevuto.
export function SatelliteChiusura({
  satellite,
  lavoroId,
  isOwner,
  valoreComplessivo,
  speseComplessive,
  margine,
  accontiComplessivi,
  importoDaIncassare,
  tutteAttivitaVerdi,
  attivitaNonVerdiCount,
}: {
  satellite: Satellite
  lavoroId: string
  isOwner: boolean
  valoreComplessivo: number
  speseComplessive: number
  margine: number
  accontiComplessivi: number
  importoDaIncassare: number
  // Vincolo "Contrassegna il lavoro come chiuso." (2026-08-13, vedi
  // CLAUDE.md): calcolati server-side (dettaglio-lavoro-data.ts, dove sono
  // già disponibili allegatiById/righePerSatellite necessari per
  // Progetto/Acquisti) — nessun ricalcolo qui, solo lettura.
  tutteAttivitaVerdi: boolean
  attivitaNonVerdiCount: number
}) {
  const router = useRouter()
  const [incassata, setIncassata] = useState(satellite.chiusura_incassata)
  const [conclusa, setConclusa] = useState(satellite.chiusura_conclusa)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Dirty-state: entrambi i flag, nessun campo economico (sola lettura, mai
  // inviato al server) — stesso trattamento di "Concluso" in Costruzione/
  // Montaggio, "Incassato" in Acconto: parte del Salva, non auto-salvante.
  const { dirty, segnaSalvato } = useDirtyForm({ incassata, conclusa })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  async function handleSalva() {
    setLoading(true)
    setErrore(null)

    const result = await aggiornaChiusuraFlags(satellite.id, lavoroId, { incassata, conclusa })

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
          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-center justify-between">
              <span>Valore complessivo</span>
              <span className="font-medium text-gray-900">{formattaValuta(valoreComplessivo)}</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Spese complessive</span>
              <span className="font-medium text-gray-900">{formattaValuta(speseComplessive)}</span>
            </p>
            {/* Margine e Importo da incassare in grassetto (sessione
                rifinitura 2026-08-13, vedi CLAUDE.md): enfasi visiva sulle
                due righe di sintesi, stesso peso già usato per i titoli
                della modale (font-semibold) — le altre tre righe restano a
                peso normale/font-medium, invariate. */}
            <p className="flex items-center justify-between font-semibold text-gray-900">
              <span>Margine</span>
              <span>{formattaValuta(margine)}</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Acconti complessivi</span>
              <span className="font-medium text-gray-900">{formattaValuta(accontiComplessivi)}</span>
            </p>
            <p className="flex items-center justify-between font-semibold text-gray-900">
              <span>Importo da incassare</span>
              <span>{formattaValuta(importoDaIncassare)}</span>
            </p>
          </div>

          {isOwner ? (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={incassata}
                  onChange={(e) => setIncassata(e.target.checked)}
                  className="accent-primary"
                />
                Contrassegna tutti gli importi come incassati.
              </label>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={conclusa}
                    disabled={!tutteAttivitaVerdi}
                    onChange={(e) => setConclusa(e.target.checked)}
                    className="accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  Contrassegna il lavoro come chiuso.
                </label>
                {/* Vincolo "tutte le Attività verdi" (2026-08-13, vedi
                    CLAUDE.md): indicazione visiva del motivo quando
                    disabilitato, stesso stile grigio secondario già in uso
                    per le altre didascalie dell'app. */}
                {!tutteAttivitaVerdi && (
                  <p className="mt-1 text-xs text-gray-500">
                    Disponibile quando tutte le attività del lavoro sono concluse ({attivitaNonVerdiCount}{' '}
                    {attivitaNonVerdiCount === 1 ? 'attività non ancora conclusa' : 'attività non ancora concluse'}).
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-1 border-t border-gray-100 pt-4 text-sm text-gray-700">
              <p>Importi incassati: {satellite.chiusura_incassata ? 'Sì' : 'No'}</p>
              <p>Lavoro chiuso: {satellite.chiusura_conclusa ? 'Sì' : 'No'}</p>
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
