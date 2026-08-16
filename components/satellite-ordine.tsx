'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { aggiornaOrdine, impostaOrdinatoAcquisto } from '@/lib/lavori/satelliti'
import { cercaFornitoreSedi } from '@/lib/fornitori/actions'
import { cercaReferenze, type ReferenzaOption } from '@/lib/acquisti/referenze'
import { contattiPerInvio, inviaOrdineSatellite } from '@/lib/lavori/ordini-email'
import { formattaValuta } from '@/lib/formato-valuta'
import { InputValuta } from '@/components/input-valuta'
import { Combobox } from '@/components/combobox'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato, SatelliteArticolo } from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { PilloleSalvaAnnulla } from '@/components/pillole-salva-annulla'
import { DialogConferma } from '@/components/dialog-conferma'

// Standard allegati (stesso testo/pattern di ogni altro satellite, es.
// Acconto) — mancava qui, aggiunto il 2026-08-18 (vedi CLAUDE.md, sessione
// "allineamento allo standard").
const LABEL_ALLEGATI = "Puoi allegare foto e documenti inerenti all'ordine (file di immagine e PDF)."

type SedeSelezionata = { id: string; label: string }

// Riga di Acquisto: SOLO selezione da catalogo (revisione 2026-08-17, vedi
// CLAUDE.md — "Catalogo Referenze standalone + revisione modale Acquisto",
// CORREGGE la decisione del 14/8 che permetteva anche righe "ad hoc" create
// al volo). `referenzaId` null finché non si sceglie una Referenza dal
// Combobox; descrizione/coloreFinitura sono sola lettura, copiate dalla
// Referenza scelta (mai editabili qui — modificarle non aggiornerebbe il
// catalogo, l'unico posto dove farlo è /catalogo). Righe storiche prive di
// referenza (create prima di questa revisione, o il cui collegamento è
// stato perso da un vecchio hard delete pre-migration 0051) restano
// visualizzabili identicamente, sola lettura, "Cambia" le porta comunque
// alla ricerca per agganciarle a una Referenza reale.
type RigaBozza = {
  referenzaId: string | null
  descrizione: string
  coloreFinitura: string
  prezzo: string
  quantita: string
}

function rigaVuota(): RigaBozza {
  return { referenzaId: null, descrizione: '', coloreFinitura: '', prezzo: '', quantita: '1' }
}

function rigaDaArticolo(r: SatelliteArticolo): RigaBozza {
  return {
    referenzaId: r.referenza_id,
    descrizione: r.descrizione,
    coloreFinitura: r.colore_finitura ?? '',
    prezzo: r.prezzo_unitario != null ? String(r.prezzo_unitario) : '',
    quantita: String(r.quantita),
  }
}

// Payload di una riga verso aggiornaOrdine/creaOrdine — stessa union di
// RigaOrdineInput lato server (lib/lavori/satelliti.ts), qui con
// prezzo/quantita ancora stringhe (valori grezzi dei campi form, convertiti
// a Number solo al momento dell'invio in handleSalva). Righe con una
// Referenza scelta inviano solo referenzaId; righe storiche "ad hoc" (mai
// più creabili da qui, solo preservabili — vedi rigaDaArticolo/verifica su
// dati reali di produzione, 2026-08-17) inviano anche descrizione/colore
// così come già erano. `null` se la riga è vuota (mai iniziata).
type RigaOrdinePayload =
  | { referenzaId: string; prezzo: string; quantita: string }
  | { referenzaId: null; descrizione: string; coloreFinitura: string | null; prezzo: string; quantita: string }

function rigaBozzaAPayload(r: RigaBozza): RigaOrdinePayload | null {
  if (r.referenzaId !== null) {
    return { referenzaId: r.referenzaId, prezzo: r.prezzo, quantita: r.quantita }
  }
  if (r.descrizione.trim()) {
    return {
      referenzaId: null,
      descrizione: r.descrizione.trim(),
      coloreFinitura: r.coloreFinitura.trim() || null,
      prezzo: r.prezzo,
      quantita: r.quantita,
    }
  }
  return null
}

// Somma prezzo×quantità, arrotondata a 2 decimali (2026-08-15, vedi
// CLAUDE.md): con Prezzo e Quantità entrambi a 1 decimale, il prodotto ha
// matematicamente al più 2 decimali (es. 12,5 × 3,5 = 43,75) — ma la
// moltiplicazione in virgola mobile può introdurre artefatti oltre quella
// precisione (es. 12,3 × 3,7 → 45.510000000000005 in JS), sia qui sia
// server-side in valoreComplessivoRighe() (lib/lavori/satelliti.ts, stessa
// formula, stesso arrotondamento) — mai visibile in UI prima di questa
// modifica perché Prezzo/Quantità erano sempre interi.
function totaleRighe(righe: RigaBozza[]): number {
  const somma = righe.reduce((tot, r) => {
    const prezzo = Number(r.prezzo) || 0
    const quantita = Number(r.quantita) || 0
    return tot + prezzo * quantita
  }, 0)
  return Math.round(somma * 100) / 100
}

// Quantità: nessuna mascheratura (a differenza di Prezzo/InputValuta, non
// c'è mai un separatore delle migliaia iniettato da mostrare) — accetta sia
// virgola sia punto come separatore decimale, senza ambiguità possibile
// proprio per questo motivo (un solo separatore comunque ammesso, al
// massimo una cifra dopo di esso). Rianalizza l'intero testo digitato ad
// ogni evento `change` (non carattere-per-carattere), stesso principio già
// scelto per InputValuta/decimali: corretto anche con "seleziona tutto e
// digita" o incolla.
function filtraQuantita(testo: string): string {
  const validi = testo.replace(/[^0-9,.]/g, '')
  const primoSeparatore = validi.search(/[,.]/)
  if (primoSeparatore === -1) return validi.replace(/^0+(?=\d)/, '')
  const intero = validi.slice(0, primoSeparatore).replace(/^0+(?=\d)/, '') || '0'
  const decimale = validi.slice(primoSeparatore + 1).replace(/[,.]/g, '').slice(0, 1)
  return `${intero}.${decimale}`
}

// Revisione 2026-08-03 (vedi CLAUDE.md): il vecchio stato a 3 valori
// testuali con transizioni manuali è sostituito da un solo flag booleano
// `ordinato`. Finché ordinato=false l'intero Acquisto è modificabile qui
// (fornitore/categoria/referenze/prezzi/quantità, prima possibile solo al
// momento della creazione). `ordinato` è rappresentato come checkbox (non
// bottoni d'azione) — nessuna conferma nativa finché l'ordine non è stato
// inviato via mail, l'unico commit definitivo.
//
// Restyling 2026-08-14 (vedi CLAUDE.md — catalogo Referenze): SOSTITUISCE
// il vecchio Valore complessivo a inserimento manuale e le righe a solo
// testo libero. Ogni riga è ora una Referenza (dal catalogo personale
// dell'artigiano, legata a una Categoria — non a un Fornitore) con prezzo e
// quantità propri; il Valore complessivo diventa un campo calcolato, sola
// lettura, somma di prezzo×quantità. Il Fornitore resta un passo di
// navigazione indipendente (non filtra le Referenze) ma è bloccato
// ("Cambia" nascosto) non appena una Categoria è stata scelta, per evitare
// lo scenario segnalato dall'utente — cambiare fornitore dopo aver già
// scelto categoria/referenze rischierebbe di scegliere un fornitore che
// non vende quella categoria: il blocco previene l'errore invece di
// richiedere solo una conferma testuale (opzione scartata).
//
// Revisione 2026-08-17 (vedi CLAUDE.md — "Catalogo Referenze standalone +
// revisione modale Acquisto"): CORREGGE due punti della sessione del 14/8
// — (1) non è più possibile creare una Referenza "al volo" da qui, solo
// SCEGLIERLA da quelle già nel Catalogo (la gestione CRUD completa vive
// ora nella sua sezione di menu dedicata, /catalogo); (2) il prezzo di
// questo Acquisto non aggiorna più `ultimo_prezzo` sulla Referenza — resta
// solo una proposta di default, liberamente editabile per il singolo
// Acquisto, `ultimo_prezzo` si tocca solo da /catalogo. Righe storiche
// prive di una Referenza collegata (create prima di questa revisione)
// restano visualizzabili/preservabili sola lettura — verificato che
// esistono davvero in produzione prima di scrivere questo commento, non
// solo un caso teorico — "Cambia" resta l'unico modo per agganciarle a una
// Referenza reale.
export function SatelliteOrdine({
  satellite,
  righe,
  allegati,
  fornitoreSedeLabel,
  categorie,
  lavoroId,
  isOwner,
}: {
  satellite: Satellite
  righe: SatelliteArticolo[]
  allegati: SatelliteAllegato[]
  fornitoreSedeLabel: string | null
  categorie: { id: string; nome: string }[]
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Data — allineamento allo standard (2026-08-18, vedi CLAUDE.md): era
  // l'unico satellite con la Data di sola lettura ("Creato il..."), mai
  // passata a un update. NOT NULL a schema, stesso pattern di Preventivo/
  // Progetto (validazione client "non vuota" in handleSalva sotto).
  const [dataCreazione, setDataCreazione] = useState(aDateLocal(satellite.data_creazione))

  const [sede, setSede] = useState<SedeSelezionata | null>(
    satellite.fornitore_sede_id && fornitoreSedeLabel ? { id: satellite.fornitore_sede_id, label: fornitoreSedeLabel } : null,
  )
  // Solo testo libero a schema (acquisto_categoria, nessuna FK — vedi
  // CLAUDE.md): l'id qui è puro stato locale, serve solo a scoping delle
  // Referenze (che invece SONO legate a categoria_acquisto.id per FK) e non
  // viene mai inviato al server così com'è — solo il nome corrispondente
  // (vedi campiCorrenti). Se il nome persistito non corrisponde più a
  // nessuna categoria attuale (rinominata/eliminata dopo la creazione di
  // questo Acquisto, nessun vincolo FK lo impedisce), l'id resta vuoto: le
  // Referenze restano indisponibili finché l'utente non sceglie di nuovo
  // una categoria esplicitamente — degradazione accettata, non un bug.
  const [categoriaId, setCategoriaId] = useState(() => categorie.find((c) => c.nome === satellite.acquisto_categoria)?.id ?? '')
  const [righeBozza, setRigheBozza] = useState<RigaBozza[]>(righe.length > 0 ? righe.map(rigaDaArticolo) : [rigaVuota()])

  // Corretto in sessione successiva (vedi CLAUDE.md/docs/audit): "Ordinato"
  // era auto-salvante — ora fa parte dello stesso dirty-state di
  // Fornitore/Categoria/Referenze, richiede Salva esplicito come ogni altro
  // campo. Stato locale (non più letto da satellite.ordinato direttamente
  // in JSX): pilota anche `editabile` sotto, in modo che spuntare/despuntare
  // la checkbox mostri subito la vista corretta prima ancora di salvare.
  const [ordinato, setOrdinato] = useState(satellite.ordinato)

  const [invioAperto, setInvioAperto] = useState(false)
  const [contatti, setContatti] = useState<{ id: string; label: string }[] | null>(null)
  const [contattoScelto, setContattoScelto] = useState('')
  const [richiedeConfigurazione, setRichiedeConfigurazione] = useState(false)
  // Errore dell'invio ordine (email), distinto da `errore` (flusso Salva,
  // mostrato solo dentro PilloleSalvaAnnulla — che appare solo a `dirty`):
  // l'invio è un'azione indipendente dal dirty-state dei campi, deve avere
  // sempre un posto dove mostrarsi indipendentemente da quello.
  const [erroreInvio, setErroreInvio] = useState<string | null>(null)

  function aggiornaRiga(i: number, patch: Partial<RigaBozza>) {
    setRigheBozza((r) => r.map((riga, idx) => (idx === i ? { ...riga, ...patch } : riga)))
  }

  // Prezzo precompilato da ultimo_prezzo della Referenza (proposta di
  // default), ma resta liberamente editabile subito sotto — modificarlo
  // NON aggiorna più la Referenza (revisione 2026-08-17, vedi CLAUDE.md:
  // ultimo_prezzo si tocca solo dalla schermata Catalogo).
  function selezionaReferenzaEsistente(i: number, opt: ReferenzaOption) {
    aggiornaRiga(i, {
      referenzaId: opt.id,
      descrizione: opt.descrizione,
      coloreFinitura: opt.coloreFinitura ?? '',
      prezzo: opt.ultimoPrezzo != null ? String(opt.ultimoPrezzo) : '',
    })
  }

  function svincolaRiga(i: number) {
    aggiornaRiga(i, { referenzaId: null, descrizione: '', coloreFinitura: '', prezzo: '', quantita: '1' })
  }

  // Ricerca scoped alla categoria corrente (non al fornitore, vedi CLAUDE.md
  // — modello corretto): identità stabile via useCallback, cambia solo
  // quando cambia categoriaId, per non far ripartire la ricerca del
  // Combobox ad ogni render.
  const fetchReferenze = useCallback((query: string) => cercaReferenze(categoriaId, query), [categoriaId])

  // Cambiare categoria dopo aver già scelto delle referenze le renderebbe
  // incoerenti (referenze del catalogo della categoria precedente): non
  // esplicitamente richiesto, ma necessario per evitare uno stato silenzioso
  // inconsistente — stessa cautela già applicata altrove nell'app per
  // conseguenze non ovvie di un cambio di selezione (window.confirm nativo,
  // nessuna nuova primitiva di dialog introdotta per questo caso singolo).
  function handleCategoriaChange(nuovoId: string) {
    const haRigheConDati = righeBozza.some((r) => r.descrizione.trim())
    if (haRigheConDati && nuovoId !== categoriaId) {
      if (!confirm('Cambiando categoria, le referenze già scelte in questo Acquisto verranno rimosse. Continuare?')) return
      setRigheBozza([rigaVuota()])
    }
    setCategoriaId(nuovoId)
  }

  function campiCorrenti() {
    return {
      fornitoreSedeId: sede?.id ?? null,
      acquistoCategoria: categorie.find((c) => c.id === categoriaId)?.nome ?? null,
      // rigaBozzaAPayload esclude le righe vuote e distingue riga con
      // Referenza / riga storica "ad hoc" (vedi il commento lì).
      righe: righeBozza.map(rigaBozzaAPayload).filter((r): r is RigaOrdinePayload => r !== null),
    }
  }

  const { dirty, segnaSalvato } = useDirtyForm({ ...campiCorrenti(), ordinato, dataCreazione })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  // "Ordinato" fa ora parte dello stesso Salva (vedi commento sopra
  // useState(ordinato)), ma richiede comunque una sequenza in due passi
  // quando il flag cambia — vincoli server-side invariati, solo spostati
  // qui da handleToggleOrdinato: aggiornaOrdine rifiuta scritture sui campi
  // base mentre ordinato=true a DB, impostaOrdinatoAcquisto(true) richiede
  // fornitore+referenze già persistiti. `ordinatoDb` segue lo stato noto
  // del DB passo-passo dentro la stessa chiamata (parte da satellite.ordinato,
  // il valore noto all'apertura).
  async function handleSalva() {
    // Data NOT NULL a schema (vedi commento sopra useState(dataCreazione)) —
    // stesso pattern di Preventivo/Progetto: blocca il salvataggio lato
    // client invece di inviare una stringa vuota al DB.
    if (!dataCreazione) {
      setErrore('La data è obbligatoria')
      return false
    }
    setLoading(true)
    setErrore(null)

    const campi = campiCorrenti()
    for (const r of campi.righe) {
      if (!r.prezzo || Number(r.prezzo) < 0) {
        setLoading(false)
        setErrore('Inserisci un prezzo per ogni referenza')
        return false
      }
      if (!r.quantita || Number(r.quantita) <= 0) {
        setLoading(false)
        setErrore('Inserisci una quantità valida per ogni referenza')
        return false
      }
    }

    let ordinatoDb = satellite.ordinato

    if (ordinatoDb && !ordinato) {
      const risultato = await impostaOrdinatoAcquisto(satellite.id, lavoroId, false)
      if (!risultato.ok) {
        setLoading(false)
        setErrore(risultato.error)
        return false
      }
      ordinatoDb = false
    }

    if (!ordinatoDb) {
      const salvatoCampi = await aggiornaOrdine(satellite.id, lavoroId, {
        dataCreazione,
        fornitoreSedeId: campi.fornitoreSedeId,
        acquistoCategoria: campi.acquistoCategoria,
        righe: campi.righe.map((r) =>
          r.referenzaId !== null
            ? { referenzaId: r.referenzaId, prezzoUnitario: Number(r.prezzo), quantita: Number(r.quantita) }
            : {
                referenzaId: null,
                descrizione: r.descrizione,
                coloreFinitura: r.coloreFinitura,
                prezzoUnitario: Number(r.prezzo),
                quantita: Number(r.quantita),
              },
        ),
      })
      if (!salvatoCampi.ok) {
        setLoading(false)
        setErrore(salvatoCampi.error)
        return false
      }
    }

    if (ordinato && !ordinatoDb) {
      const risultatoOrdinato = await impostaOrdinatoAcquisto(satellite.id, lavoroId, true)
      if (!risultatoOrdinato.ok) {
        setLoading(false)
        setErrore(risultatoOrdinato.error)
        return false
      }
    }

    setLoading(false)
    segnaSalvato({ ...campi, ordinato, dataCreazione })
    router.refresh()
    return true
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

  function handleAnnulla() {
    chiudiReale()
  }

  async function apriInvio() {
    setInvioAperto(true)
    setErroreInvio(null)
    if (satellite.fornitore_sede_id) {
      setContatti(await contattiPerInvio(satellite.fornitore_sede_id))
    } else {
      setContatti([])
    }
  }

  async function confermaInvio() {
    if (!contattoScelto) return
    setLoading(true)
    setErroreInvio(null)
    setRichiedeConfigurazione(false)
    const result = await inviaOrdineSatellite(satellite.id, lavoroId, contattoScelto)
    setLoading(false)
    if (!result.ok) {
      setErroreInvio(result.error)
      setRichiedeConfigurazione(!!result.richiedeConfigurazione)
      return
    }
    setInvioAperto(false)
    router.refresh()
  }

  const editabile = isOwner && !ordinato
  const totale = totaleRighe(righeBozza.filter((r) => r.descrizione.trim()))

  return (
    // Frammento, non un unico div: PilloleSalvaAnnulla sibling del div a
    // bordo, non annidato dentro — stesso motivo già documentato negli altri
    // satelliti restylati sul template Briefing. `pb-24` quando dirty
    // (allineamento allo standard, 2026-08-18, vedi CLAUDE.md): mancava,
    // stesso motivo già documentato per Acconto — senza, le PilloleSalvaAnnulla
    // (fixed) possono coprire l'ultima riga di contenuto.
    <>
      <div className={dirty ? 'pb-24' : ''}>
      <div className="rounded-lg border border-gray-200 p-4">
        {editabile ? (
          <div className="mb-3 space-y-3">
            {/* Riga 1 — Data: NOT NULL a schema, vedi commento sopra
                useState(dataCreazione). */}
            <div>
              <label htmlFor="ordine-data" className="mb-1 block text-sm font-medium text-gray-700">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                id="ordine-data"
                type="date"
                value={dataCreazione}
                onChange={(e) => setDataCreazione(e.target.value)}
                className={inputClass()}
              />
            </div>

            <div>
              <label htmlFor="ordine-fornitore" className="mb-1 block text-sm font-medium text-gray-700">
                Fornitore
              </label>
              {sede ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm text-gray-700">{sede.label}</p>
                  {/* "Cambia" nascosto una volta scelta una categoria (vedi
                      commento sopra la funzione) — per tornare a cambiare
                      fornitore bisogna prima azzerare la categoria. */}
                  {!categoriaId && (
                    <button type="button" onClick={() => setSede(null)} className="shrink-0 text-xs font-medium text-gray-600 underline">
                      Cambia
                    </button>
                  )}
                </div>
              ) : (
                <Combobox
                  id="ordine-fornitore"
                  placeholder="Cerca per ragione sociale o sede..."
                  fetchOptions={cercaFornitoreSedi}
                  onSelect={setSede}
                />
              )}
            </div>

            <div>
              <label htmlFor="ordine-categoria" className="mb-1 block text-sm font-medium text-gray-700">
                Categoria
              </label>
              <select
                id="ordine-categoria"
                value={categoriaId}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className={inputClass()}
              >
                <option value="">— Nessuna —</option>
                {categorie.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Referenze</span>
              <div className="space-y-3">
                {righeBozza.map((riga, i) => (
                  <div key={i} className="space-y-2 rounded-lg bg-gray-50 p-3">
                    {riga.referenzaId || riga.descrizione.trim() ? (
                      // Referenza già a catalogo, o riga storica "ad hoc"
                      // precedente a questa revisione (referenzaId assente
                      // ma descrizione già valorizzata — vedi
                      // rigaDaArticolo): in entrambi i casi sola lettura,
                      // modificare qui non aggiornerebbe comunque il
                      // catalogo (solo /catalogo può, vedi CLAUDE.md
                      // 2026-08-17) — "Cambia" torna alla ricerca, per
                      // agganciare anche una riga storica a una Referenza
                      // reale se lo si desidera.
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-900">{riga.descrizione}</p>
                          {riga.coloreFinitura && <p className="text-xs text-gray-500">{riga.coloreFinitura}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => svincolaRiga(i)}
                          className="shrink-0 text-xs font-medium text-gray-600 underline"
                        >
                          Cambia
                        </button>
                      </div>
                    ) : categoriaId ? (
                      // Selezione-only (revisione 2026-08-17, vedi
                      // CLAUDE.md): Combobox generico, non più
                      // ComboboxCreabile — nessuna affordance di creazione,
                      // solo scelta di una Referenza già nel Catalogo.
                      <Combobox
                        placeholder="Cerca una referenza..."
                        fetchOptions={fetchReferenze}
                        onSelect={(opt) => selezionaReferenzaEsistente(i, opt)}
                      />
                    ) : (
                      <p className="text-xs text-gray-500">Scegli prima una categoria per selezionare una referenza.</p>
                    )}

                    {riga.descrizione.trim() && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor={`ordine-prezzo-${i}`} className="mb-1 block text-xs font-medium text-gray-700">
                            Prezzo <span className="text-red-500">*</span>
                          </label>
                          <InputValuta
                            id={`ordine-prezzo-${i}`}
                            value={riga.prezzo}
                            onChange={(v) => aggiornaRiga(i, { prezzo: v })}
                            className={inputClass()}
                            decimali={1}
                          />
                        </div>
                        <div>
                          <label htmlFor={`ordine-quantita-${i}`} className="mb-1 block text-xs font-medium text-gray-700">
                            Quantità <span className="text-red-500">*</span>
                          </label>
                          {/* type="text" (non "number"): rimuove le frecce
                              di incremento/decremento nativo — permettevano
                              variazioni non intenzionali (2026-08-15, vedi
                              CLAUDE.md). filtraQuantita() ammette al più
                              un decimale, virgola o punto indifferentemente. */}
                          <input
                            id={`ordine-quantita-${i}`}
                            type="text"
                            inputMode="decimal"
                            value={riga.quantita}
                            onChange={(e) => aggiornaRiga(i, { quantita: filtraQuantita(e.target.value) })}
                            className={inputClass()}
                          />
                        </div>
                      </div>
                    )}

                    {righeBozza.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRigheBozza((r) => r.filter((_, idx) => idx !== i))}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        ✕ Rimuovi
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRigheBozza((r) => [...r, rigaVuota()])}
                className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                + Aggiungi referenza
              </button>
            </div>

            {/* Valore complessivo: sola lettura, somma di prezzo×quantità
                di tutte le righe — non più un campo inserito a mano (vedi
                CLAUDE.md, restyling 2026-08-14). Ricalcolato ad ogni render
                dallo stato locale non ancora salvato, stesso principio già
                in uso per "Totale ore" di Costruzione/Montaggio. */}
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Valore complessivo</span>
              <p className="text-sm font-medium text-gray-900">{formattaValuta(totale, 2)}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Una volta ordinato, il campo Fornitore (con la sua Combobox)
                non è più renderizzato — questa riga evita che il nome del
                fornitore diventi altrimenti irrecuperabile dalla Modal.
                Valori letti dallo stato locale (sede/categoriaId/righeBozza),
                non dalle prop persistite: "Ordinato" richiede Salva
                esplicito — se l'owner ha modificato dei campi e spuntato
                "Ordinato" nella stessa sessione senza ancora salvare, questa
                vista deve riflettere la bozza corrente. */}
            <p className="mb-1 text-xs text-gray-500">{new Date(`${dataCreazione}T00:00:00`).toLocaleDateString('it-IT')}</p>
            <p className="mb-1 text-sm text-gray-700">{sede?.label ?? 'Nessun fornitore'}</p>
            {categoriaId && (
              <p className="mb-1 text-xs text-gray-500">{categorie.find((c) => c.id === categoriaId)?.nome}</p>
            )}
            {righeBozza.filter((r) => r.descrizione.trim()).length > 0 && (
              <ul className="mb-2 space-y-1 text-sm text-gray-700">
                {righeBozza
                  .filter((r) => r.descrizione.trim())
                  .map((r, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3">
                      <span>
                        {r.descrizione}
                        {r.coloreFinitura && ` — ${r.coloreFinitura}`}
                        {' '}
                        {/* Virgola per la sola visualizzazione (lo stato
                            interno resta a punto, coerente con Number()) —
                            coerenza con la convenzione italiana già in uso
                            per Prezzo. */}
                        <span className="text-gray-500">× {r.quantita.replace('.', ',')}</span>
                      </span>
                      {r.prezzo && <span className="shrink-0 text-gray-500">{formattaValuta(Number(r.prezzo), 1)}</span>}
                    </li>
                  ))}
              </ul>
            )}
            {totale > 0 && <p className="mb-2 text-sm font-medium text-gray-900">{formattaValuta(totale, 2)}</p>}
          </>
        )}

        {satellite.data_invio_ordine && (
          <p className="mb-2 text-xs text-gray-500">
            Ordine inviato il {new Date(satellite.data_invio_ordine).toLocaleDateString('it-IT')}
          </p>
        )}

        {isOwner && (
          <div className="mb-2 flex items-center gap-2">
            <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} />
            <span className="text-sm text-gray-700">{LABEL_ALLEGATI}</span>
          </div>
        )}
        <div className="mb-2">
          <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
        </div>

        {erroreInvio && (
          <p className="mb-2 text-xs text-red-600">
            {erroreInvio}
            {richiedeConfigurazione && (
              <>
                {' '}
                <Link href="/profilo/impostazioni" className="underline underline-offset-2">
                  Vai a Profilo/Impostazioni
                </Link>
              </>
            )}
          </p>
        )}

        {isOwner && !satellite.data_invio_ordine && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={ordinato}
                disabled={loading || (!ordinato && (!sede || campiCorrenti().righe.length === 0))}
                onChange={(e) => setOrdinato(e.target.checked)}
                className="accent-primary"
              />
              Contrassegna l&apos;acquisto come effettuato.
            </label>
            {/* "Invia ordine" resta legato al valore PERSISTITO
                (satellite.ordinato), non alla bozza locale: invia
                un'email reale e irreversibile, non deve mai comparire
                prima che il flag sia stato davvero salvato. */}
            {satellite.ordinato && !invioAperto && (
              <button
                type="button"
                onClick={apriInvio}
                disabled={loading}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Invia ordine
              </button>
            )}
          </div>
        )}

        {invioAperto && (
          <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
            {contatti === null ? (
              <p className="text-xs text-gray-500">Caricamento contatti…</p>
            ) : contatti.length === 0 ? (
              <p className="text-xs text-gray-500">Nessun contatto con email per questa sede.</p>
            ) : (
              <>
                <select
                  value={contattoScelto}
                  onChange={(e) => setContattoScelto(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">— Scegli il destinatario —</option>
                  {contatti.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confermaInvio}
                    disabled={loading || !contattoScelto}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Invio…' : 'Conferma invio'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvioAperto(false)}
                    disabled={loading}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>

      {/* isOwner, non `editabile`: quest'ultimo dipende ora dallo stato
          locale di "Ordinato" (vedi commento sopra useState(ordinato)) — se
          l'owner ha appena spuntato la checkbox, editabile è già falso (la
          vista è già passata a sola lettura) ma la modifica resta comunque
          da salvare, la barra deve restare visibile. */}
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
