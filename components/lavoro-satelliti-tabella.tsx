'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { IconaCestino, IconaMatita } from '@/components/icons'
import { SatelliteNuovoOrdine } from '@/components/satellite-nuovo-ordine'
import {
  creaAppuntamento,
  creaCostruzione,
  creaNoleggio,
  creaNuovaSerieCampione,
  creaPreventivo,
  creaProgetto,
  eliminaSatellite,
} from '@/lib/lavori/satelliti'
import { DOT_COLOR, type ColoreSemaforo } from '@/lib/lavori/satelliti-meta'
import { LABEL_ATTIVITA, ORDINE_ATTIVITA, RIPETIBILE_ATTIVITA, type ChiaveAttivita } from '@/lib/lavori/attivita-ordine'

export type RigaSatellite = {
  // Id del satellite da passare a eliminaSatellite e da usare come chiave
  // sia React sia di selezione (apertura modale di dettaglio): per i tipi
  // revisionabili (preventivo/progetto/campione) è sempre la revisione
  // corrente/leaf della catena, mai una revisione storica — quindi sempre
  // univoco per riga, nessun bisogno di una chiave sintetica separata.
  satelliteId: string
  nome: string
  colore: ColoreSemaforo
  statoLabel: string
  contenuto: React.ReactNode
}

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

// Tabella riepilogativa delle attività nel dettaglio Lavoro, al posto del
// vecchio box discorsivo "Satelliti ancora da completare: ...". Il click sul
// nome (unico target che apre la vista) e la matita montano nella stessa
// modale lo stesso componente satellite già esistente, così com'è oggi — non
// esiste una modalità "sola lettura" dedicata, resta quella implicita già
// gestita da ciascun componente in base al ruolo (isOwner).
//
// "Aggiungi attività" (Sprint "fondamenta" 2026-08-02, vedi CLAUDE.md):
// sostituisce il vecchio "+ Aggiungi satellite" (tre mini-form separati) con
// un unico modale che elenca le 9 tipologie nell'ordine di
// lib/lavori/attivita-ordine.ts — le ripetibili sempre, Progetto/Preventivo
// solo se non esistono già per questo Lavoro. Alla selezione, la maggior
// parte dei tipi viene creata subito (stato iniziale di default) e si apre
// direttamente la stessa modale di dettaglio della riga corrispondente,
// appena questa compare tra le righe dopo il refresh — stesso principio già
// in uso per le altre righe, nessuna modale "di compilazione" dedicata.
// Due eccezioni deliberate (vedi CLAUDE.md per la motivazione): Campionatura
// chiede prima il nome della serie (obbligatorio a schema, non rinominabile
// oggi); Acquisto apre invece il form di creazione già esistente
// (SatelliteNuovoOrdine) perché il dettaglio di un Acquisto non permette di
// impostare fornitore/categoria/righe/valore dopo la creazione.
export function LavoroSatelliteTabella({
  righe,
  lavoroId,
  isOwner,
  completato,
  progettoEsiste,
  preventivoEsiste,
  categorieAcquisto,
}: {
  righe: RigaSatellite[]
  lavoroId: string
  isOwner: boolean
  // Lavoro con stato 'completato': sola lettura su tutte le attività (modifica
  // ed eliminazione disabilitate, "+ Aggiungi attività" nascosto) — sblocco
  // solo tramite "Riapri lavoro" (vedi CLAUDE.md). Il nome resta cliccabile:
  // apre comunque la modale, ma in sola lettura (vedi isOwner effettivo passato
  // al contenuto da app/(app)/lavori/[id]/page.tsx).
  completato: boolean
  progettoEsiste: boolean
  preventivoEsiste: boolean
  categorieAcquisto: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [apertoSatelliteId, setApertoSatelliteId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const [mostraAggiungi, setMostraAggiungi] = useState(false)
  const [formAcquistoAperto, setFormAcquistoAperto] = useState(false)
  // null = elenco tipologie; stringa (anche vuota) = form nome-serie aperto,
  // in attesa di digitazione.
  const [serieInInserimento, setSerieInInserimento] = useState<string | null>(null)
  const [creandoChiave, setCreandoChiave] = useState<ChiaveAttivita | null>(null)
  const [erroreAggiungi, setErroreAggiungi] = useState<string | null>(null)

  const rigaAperta = righe.find((r) => r.satelliteId === apertoSatelliteId) ?? null

  async function handleElimina(riga: RigaSatellite) {
    if (!confirm('Eliminare definitivamente questa attività? L\'azione non è reversibile.')) return
    setEliminandoId(riga.satelliteId)
    const result = await eliminaSatellite(riga.satelliteId, lavoroId)
    setEliminandoId(null)
    if (!result.ok) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  function chiudiAggiungi() {
    setMostraAggiungi(false)
    setFormAcquistoAperto(false)
    setSerieInInserimento(null)
    setErroreAggiungi(null)
  }

  // Crea l'attività selezionata e, appena la riga corrispondente compare tra
  // `righe` dopo il refresh, apre la sua modale di dettaglio — apertoSatelliteId
  // resta impostato durante il refresh (stato locale del client component, non
  // rimontato dal re-render del Server Component), quindi il Modal sottostante
  // si apre da solo non appena `righe` include un satelliteId corrispondente.
  async function creaEApri(
    chiave: ChiaveAttivita,
    azione: () => Promise<{ ok: true; id: string } | { ok: false; error: string }>,
  ) {
    setCreandoChiave(chiave)
    setErroreAggiungi(null)
    const result = await azione()
    setCreandoChiave(null)
    if (!result.ok) {
      setErroreAggiungi(result.error)
      return
    }
    setApertoSatelliteId(result.id)
    chiudiAggiungi()
    router.refresh()
  }

  function handleSeleziona(chiave: ChiaveAttivita) {
    switch (chiave) {
      case 'briefing':
      case 'verifica_misure':
      case 'montaggio':
        creaEApri(chiave, () => creaAppuntamento(lavoroId, chiave))
        return
      case 'progetto':
        creaEApri(chiave, () => creaProgetto(lavoroId))
        return
      case 'preventivo':
        creaEApri(chiave, () => creaPreventivo(lavoroId))
        return
      case 'costruzione':
        creaEApri(chiave, () => creaCostruzione(lavoroId))
        return
      case 'noleggio':
        creaEApri(chiave, () => creaNoleggio(lavoroId))
        return
      case 'campionatura':
        setSerieInInserimento('')
        return
      case 'acquisto':
        setFormAcquistoAperto(true)
    }
  }

  // Ripetibili sempre proposte; le due non ripetibili (progetto/preventivo)
  // solo se non esistono già per questo Lavoro.
  const esistente: Partial<Record<ChiaveAttivita, boolean>> = { progetto: progettoEsiste, preventivo: preventivoEsiste }
  const opzioni = ORDINE_ATTIVITA.filter((chiave) => RIPETIBILE_ATTIVITA[chiave] || !esistente[chiave])

  return (
    <div>
      {righe.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Attività</th>
                <th className="px-4 py-2">Stato</th>
                {isOwner && <th className="px-4 py-2 text-right">Azioni</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {righe.map((riga) => (
                <tr key={riga.satelliteId}>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setApertoSatelliteId(riga.satelliteId)}
                      className="text-left font-medium text-gray-900 underline-offset-2 hover:underline"
                    >
                      {riga.nome}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 whitespace-nowrap text-gray-700">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[riga.colore]}`} />
                      {riga.statoLabel}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setApertoSatelliteId(riga.satelliteId)}
                          disabled={completato}
                          aria-label="Modifica"
                          title={completato ? 'Riapri il lavoro per modificare' : 'Modifica'}
                          className={`rounded-lg p-1.5 transition-colors ${
                            completato
                              ? 'cursor-not-allowed text-gray-300 opacity-50'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <IconaMatita className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleElimina(riga)}
                          disabled={completato || eliminandoId === riga.satelliteId}
                          aria-label="Elimina"
                          title={completato ? 'Riapri il lavoro per modificare' : 'Elimina'}
                          className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                            completato ? 'cursor-not-allowed text-gray-300' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <IconaCestino className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOwner && !completato && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setMostraAggiungi(true)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            + Aggiungi attività
          </button>
        </div>
      )}

      <Modal aperto={mostraAggiungi} onChiudi={chiudiAggiungi} titolo="Aggiungi attività">
        {formAcquistoAperto ? (
          <SatelliteNuovoOrdine
            lavoroId={lavoroId}
            categorie={categorieAcquisto}
            onSuccesso={() => {
              chiudiAggiungi()
              router.refresh()
            }}
            onAnnulla={chiudiAggiungi}
          />
        ) : serieInInserimento !== null ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="nuova-serie-campionatura" className="mb-1 block text-sm font-medium text-gray-700">
                Nome della serie
              </label>
              <input
                id="nuova-serie-campionatura"
                value={serieInInserimento}
                onChange={(e) => setSerieInInserimento(e.target.value)}
                placeholder="Es. Campionatura maniglie"
                className={inputClass()}
              />
            </div>
            {erroreAggiungi && <p className="text-xs text-red-600">{erroreAggiungi}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => creaEApri('campionatura', () => creaNuovaSerieCampione(lavoroId, serieInInserimento))}
                disabled={creandoChiave !== null || !serieInInserimento.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {creandoChiave === 'campionatura' ? 'Creazione…' : 'Crea'}
              </button>
              <button
                type="button"
                onClick={() => setSerieInInserimento(null)}
                disabled={creandoChiave !== null}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {erroreAggiungi && <p className="mb-2 text-xs text-red-600">{erroreAggiungi}</p>}
            {opzioni.map((chiave) => (
              <button
                key={chiave}
                type="button"
                onClick={() => handleSeleziona(chiave)}
                disabled={creandoChiave !== null}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {creandoChiave === chiave ? 'Creazione…' : LABEL_ATTIVITA[chiave]}
              </button>
            ))}
          </div>
        )}
      </Modal>

      <Modal aperto={!!rigaAperta} onChiudi={() => setApertoSatelliteId(null)} titolo={rigaAperta?.nome}>
        {rigaAperta?.contenuto}
      </Modal>
    </div>
  )
}
