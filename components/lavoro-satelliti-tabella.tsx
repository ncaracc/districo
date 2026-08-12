'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { PillolaFlottante } from '@/components/pillola-flottante'
import { IconaCestino, IconaMatita } from '@/components/icons'
import { SatelliteNuovoOrdine } from '@/components/satellite-nuovo-ordine'
import {
  creaAcconto,
  creaAppuntamento,
  creaCampione,
  creaChiusura,
  creaCostruzione,
  creaMontaggio,
  creaNoleggio,
  creaPreventivo,
  creaProgetto,
  creaSpesaNonPreventivata,
  eliminaSatellite,
} from '@/lib/lavori/satelliti'
import { DOT_COLOR } from '@/lib/lavori/satelliti-meta'
import { LABEL_ATTIVITA, ORDINE_ATTIVITA, RIPETIBILE_ATTIVITA, type ChiaveAttivita } from '@/lib/lavori/attivita-ordine'
import type { VoceAttivita } from '@/lib/lavori/satelliti-render'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): stesso
// riepilogo di prima (satelliteId/nome/colore/statoLabel), senza più i due
// campi JSX (contenutoModifica/contenutoLettura) e senza titoloConPallino
// (sempre stato true per ogni riga reale dallo Sprint UI-4 del 6/8 — le
// nuove route compongono sempre pallino+nome nel titolo, incondizionatamente,
// nessuna eccezione rimasta da distinguere). Alias di VoceAttivita (stesso
// modulo che costruisce anche il contenuto per le nuove route) invece di una
// definizione duplicata.
export type RigaSatellite = VoceAttivita

// Tabella riepilogativa delle attività nel dettaglio Lavoro. Il click sul
// nome naviga in sola lettura, il click sulla matita naviga in modifica —
// STESSA distinzione UX di sempre (fix UX 2026-08-02, vedi CLAUDE.md,
// sezione "Visualizzazione vs modifica"), ma ora tramite router.push verso
// l'URL dell'attività invece di stato locale: il tasto Back del browser
// chiude la modale e torna qui, gestito dalla route intercettata
// (@modal/(.)attivita/[attivitaId]), non più da questo componente. Nessuna
// Modal di dettaglio satellite qui — vive nella nuova route.
//
// "Aggiungi attività" (Sprint "fondamenta" 2026-08-02, vedi CLAUDE.md)
// RESTA invece stato locale in questo componente, deliberatamente non
// route-ificata in questo stesso refactor (vedi CLAUDE.md, voce
// "Route parallele/intercettate" — valutato e scartato per contenere lo
// scope di una sessione già ampia: l'obiettivo esplicito della sessione è
// la modale di DETTAGLIO di un'attività, "Aggiungi attività" è un
// selettore di creazione senza alcun dirty-state da proteggere, il gap
// "Back non la chiude" è preesistente e non una regressione). Alla
// creazione riuscita (creaEApri), naviga però verso la nuova route di
// dettaglio dell'attività appena creata (invece di stato locale) — stesso
// comportamento "si apre da sola in modifica" di prima, ora un vero
// router.push.
export function LavoroSatelliteTabella({
  righe,
  lavoroId,
  isOwner,
  completato,
  progettoEsiste,
  preventivoEsiste,
  chiusuraEsiste,
  costruzioneEsiste,
  montaggioEsiste,
  categorieAcquisto,
}: {
  righe: RigaSatellite[]
  lavoroId: string
  isOwner: boolean
  // Lavoro con stato 'completato': sola lettura su tutte le attività (modifica
  // ed eliminazione disabilitate, "+ Aggiungi attività" nascosto) — sblocco
  // solo tramite "Riapri lavoro" (vedi CLAUDE.md).
  completato: boolean
  progettoEsiste: boolean
  preventivoEsiste: boolean
  chiusuraEsiste: boolean
  // Costruzione/Montaggio non più ripetibili (2026-08-12, vedi CLAUDE.md),
  // stesso trattamento di progetto/preventivo/chiusura sopra.
  costruzioneEsiste: boolean
  montaggioEsiste: boolean
  categorieAcquisto: { id: string; nome: string }[]
}) {
  const router = useRouter()
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const [mostraAggiungi, setMostraAggiungi] = useState(false)
  const [formAcquistoAperto, setFormAcquistoAperto] = useState(false)
  const [creandoChiave, setCreandoChiave] = useState<ChiaveAttivita | null>(null)
  const [erroreAggiungi, setErroreAggiungi] = useState<string | null>(null)

  function urlAttivita(satelliteId: string, vista: 'lettura' | 'modifica') {
    return vista === 'modifica' ? `/lavori/${lavoroId}/attivita/${satelliteId}?vista=modifica` : `/lavori/${lavoroId}/attivita/${satelliteId}`
  }

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
    setErroreAggiungi(null)
  }

  // Crea l'attività selezionata e naviga subito alla sua route di dettaglio
  // (in modifica) — stessa UX di prima ("si apre da sola appena creata"),
  // ora tramite navigazione reale invece di stato locale.
  //
  // Fix bug "Aggiungi attività riporta alla Dashboard" (2026-08-13, vedi
  // CLAUDE.md per l'indagine completa, inclusi due tentativi scartati sul
  // lato chiusura). Causa: `router.push()` qui è l'UNICO punto dell'app che
  // naviga subito dopo l'`await` di una Server Action che chiama anche
  // `revalidatePath()` sulla STESSA pagina di provenienza (il click diretto
  // su una riga esistente, per confronto, chiama `router.push()` in modo
  // sincrono nell'onClick, senza alcun await prima). Verificato con
  // instrumentazione diretta di `history.pushState`/`replaceState`: in una
  // frazione non trascurabile dei tentativi (~1 su 2 nei test), Next.js
  // usa `replaceState` al posto di `pushState` per QUESTA navigazione —
  // race condition confermata leggendo
  // `node_modules/next/dist/client/components/app-router.js`
  // (`HistoryUpdater`): il refresh implicito che la Server Action stessa
  // innesca su questa pagina (via `revalidatePath`) compete con questo
  // `router.push()` esplicito per lo stesso "turno" di aggiornamento del
  // router — quale dei due arriva per primo decide se `pushRef.pendingPush`
  // viene consumato dal push giusto o da un refresh che vede l'URL già
  // corrente (quindi replace). L'effetto quando la race va male: l'entry
  // "/lavori/[id]" nella history del browser viene SOVRASCRITTA (mai
  // aggiunta una nuova entry sopra) — un successivo `router.back()` alla
  // chiusura salta quindi all'entry ANCORA PRIMA (tipicamente la
  // Dashboard), non a "/lavori/[id]" come atteso.
  //
  // **Fix scelto, sul lato APERTURA** (non chiusura — due tentativi lì
  // scartati dopo verifica empirica, vedi attivita-modale-route.tsx):
  // `setTimeout(..., 0)` sposta il `router.push()` a un macrotask
  // successivo, fuori dal turno di aggiornamento del router in cui il
  // refresh implicito della Server Action è ancora "in coda" — verificato
  // affidabile su 15 tentativi consecutivi (0 fallimenti, contro una
  // frequenza di fallimento di circa 1 su 2 senza il ritardo). Nessuna
  // API pubblica di Next.js per attendere/rilevare la fine del refresh
  // implicito in modo deterministico — un ritardo "a zero" (yield al
  // prossimo giro dell'event loop, non un tempo fisso arbitrario) è la
  // soluzione più mirata disponibile: lascia drenare la coda di azioni del
  // router già pianificate prima del nostro push esplicito, senza
  // introdurre alcun ritardo percepibile per l'utente (impossibile da
  // notare a occhio, sotto il singolo frame).
  async function creaEApri(azione: () => Promise<{ ok: true; id: string } | { ok: false; error: string }>) {
    setErroreAggiungi(null)
    const result = await azione()
    if (!result.ok) {
      setErroreAggiungi(result.error)
      return
    }
    chiudiAggiungi()
    setTimeout(() => router.push(urlAttivita(result.id, 'modifica')), 0)
  }

  function handleSeleziona(chiave: ChiaveAttivita) {
    if (chiave === 'acquisto') {
      setFormAcquistoAperto(true)
      return
    }
    setCreandoChiave(chiave)
    const azione = (() => {
      switch (chiave) {
        case 'briefing':
        case 'verifica_misure':
          return () => creaAppuntamento(lavoroId, chiave)
        case 'progetto':
          return () => creaProgetto(lavoroId)
        case 'preventivo':
          return () => creaPreventivo(lavoroId)
        case 'acconto':
          return () => creaAcconto(lavoroId)
        case 'costruzione':
          return () => creaCostruzione(lavoroId)
        case 'montaggio':
          // Promosso a tipo autonomo il 2026-08-12 (vedi CLAUDE.md): non più
          // creaAppuntamento(lavoroId, 'montaggio'), creaMontaggio() dedicata
          // — stesso pattern di creaCostruzione().
          return () => creaMontaggio(lavoroId)
        case 'noleggio':
          return () => creaNoleggio(lavoroId)
        case 'campionatura':
          return () => creaCampione(lavoroId)
        case 'spesa_non_preventivata':
          return () => creaSpesaNonPreventivata(lavoroId)
        case 'chiusura':
          return () => creaChiusura(lavoroId)
      }
    })()
    creaEApri(azione).finally(() => setCreandoChiave(null))
  }

  // Ripetibili sempre proposte; le non ripetibili (progetto/preventivo/
  // chiusura/costruzione/montaggio) solo se non esistono già per questo
  // Lavoro — Costruzione/Montaggio aggiunte il 2026-08-12 (vedi CLAUDE.md),
  // stesso trattamento delle prime tre.
  const esistente: Partial<Record<ChiaveAttivita, boolean>> = {
    progetto: progettoEsiste,
    preventivo: preventivoEsiste,
    chiusura: chiusuraEsiste,
    costruzione: costruzioneEsiste,
    montaggio: montaggioEsiste,
  }
  const opzioni = ORDINE_ATTIVITA.filter((chiave) => RIPETIBILE_ATTIVITA[chiave] || !esistente[chiave])

  return (
    <div className={isOwner && !completato ? 'pb-24' : undefined}>
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
                      onClick={() => router.push(urlAttivita(riga.satelliteId, 'lettura'))}
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
                          onClick={() => router.push(urlAttivita(riga.satelliteId, 'modifica'))}
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

      {/* Bottone flottante (sessione affinamento UI 2026-08-08, vedi
          CLAUDE.md): sempre visibile durante lo scroll della lista attività.
          pb-24 sul contenitore radice (sotto) riserva lo spazio perché non
          copra mai l'ultima riga della tabella. Nascosta solo quando
          "Aggiungi attività" stessa è aperta (mostraAggiungi, stato locale
          — resterebbe visibile dietro alla propria modale) — la modale di
          dettaglio di un'attività ora vive in una route separata (z-50,
          come questa stessa Modal), la pillola (z-30) sparisce già dietro
          il suo backdrop per la sola differenza di z-index, senza bisogno
          di una condizione esplicita qui (stesso principio già documentato
          in pillola-flottante.tsx). */}
      {isOwner && !completato && !mostraAggiungi && (
        <PillolaFlottante onClick={() => setMostraAggiungi(true)}>Aggiungi attività</PillolaFlottante>
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
    </div>
  )
}
