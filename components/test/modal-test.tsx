'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconaChiudi } from '@/components/icons'
import { DialogConferma } from '@/components/dialog-conferma'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { inputClass, inputClassFisso } from '@/lib/input-class'

// Modal di test — ambiente di iterazione rapida sul design, separato dai
// satelliti reali (vedi CLAUDE.md quando aggiornato). Primo passo: solo
// struttura base (header con titolo+semaforo, controllo dimensione font,
// bottone Salva flottante) — nessun campo form vero, nessuna persistenza.
// Componente isolato in components/test/, non referenziato da alcun
// componente satellite/pagina di produzione oltre al singolo trigger nel
// menu (components/app-nav.tsx).

const TITOLO_PLACEHOLDER = 'Titolo della finestra di TEST'

// Passo 7: il controllo +/- (passo 1) è stato rimosso, il titolo torna
// fisso — 16px, cioè -2px rispetto ai 18px di default che aveva prima
// (non più regolabile a runtime, quindi una sola costante invece di un
// range min/max/step).
const TITOLO_FONT_SIZE = 16

// Testo di prova: campo vuoto di default (il Lorem Ipsum del passo 4,
// usato per validare lo scroll interno della Modal, è stato tolto
// esplicitamente a fine sessione — la validazione è conclusa, non serve
// più pre-compilare il campo). Font-size +2px dal passo 7 (14px di text-sm
// di default -> 16px, TESTO_FONT_SIZE sotto), invariato.
const TESTO_DEFAULT = ''
const TESTO_FONT_SIZE = 16

// Controllo ora — un solo <select> con slot "HH:MM" predefiniti (passo 7:
// era affiancato da una "variante A" a due <select> separati, rimossa al
// passo 9 avendo scelto questa soluzione, vedi CLAUDE.md). Range/step
// aggiornati al passo 9: 07:30-19:30, passo 15 minuti (sostituisce il
// pattern 00/12/15/30/45 del passo 8, un esperimento provvisorio).
const SLOT_ORARI: string[] = []
for (let minuti = 7 * 60 + 30; minuti <= 19 * 60 + 30; minuti += 15) {
  const h = String(Math.floor(minuti / 60)).padStart(2, '0')
  const m = String(minuti % 60).padStart(2, '0')
  SLOT_ORARI.push(`${h}:${m}`)
}

// Breakpoint `sm:` di Tailwind (640px) — sotto questa soglia il box della
// Modal è `fixed` (mobile), sopra è `relative` (desktop). Deve combaciare
// esattamente con le classi `sm:` usate più sotto.
const BREAKPOINT_SM = 640

// Passo 9: riparata la regressione del passo 8. Il bottone Salva era
// passato da `fixed` (viewport) ad `absolute` (box Modal) per il fix dello
// scroll — perdendo però l'aggancio a window.visualViewport che lo teneva
// sopra la tastiera virtuale (passo 6). Stesso principio riapplicato qui,
// ma stavolta al BOX della Modal stesso (non più al bottone, che ora la
// segue "gratis" essendo ancorato al fondo del box): quando la tastiera è
// aperta, top/bottom del box si aggiustano per restare dentro lo spazio
// REALMENTE visibile (window.visualViewport), non quello del layout
// viewport (che iOS non ridimensiona mai, vedi nota sotto).
//
// Perché SOLO su mobile (guardia `window.innerWidth >= BREAKPOINT_SM` →
// null): su desktop il box è `position: relative`, dove la regola CSS per
// `top`/`bottom` è diversa da `fixed`/`absolute` — se entrambi sono
// specificati (non `auto`), `bottom` viene IGNORATO e vince `top` da solo,
// quindi impostare `top: 20px` inline avrebbe spostato il box desktop di
// 20px verso il basso invece di lasciarlo centrato (scoperto ragionando
// sulla specifica prima di scrivere il codice, non in produzione). Su
// `fixed`/`absolute` invece (mobile) `top` e `bottom` sono onorati insieme,
// esattamente il comportamento voluto per "restringere" il box da entrambi
// i lati — nessun problema lì.
//
// DIFFERENZA NOTA iOS/Android (come già richiesto esplicitamente al passo
// 6, stessa logica, ora applicata al box): su iOS Safari un elemento
// `position: fixed` è posizionato rispetto al LAYOUT viewport, che non si
// ridimensiona mai all'apertura tastiera (si restringe solo il visual
// viewport, con offsetTop che si sposta se la pagina scorre per portare il
// campo attivo in vista) — la formula sotto restituirà quindi tipicamente
// un valore concreto >0 sia per top sia per bottom quando serve. Su Android
// Chrome, il layout viewport spesso si ridimensiona già da solo insieme
// alla tastiera (a seconda di versione/`interactive-widget`) — la stessa
// formula restituirà tipicamente ~0, nessun intervento aggiuntivo
// necessario. Testato esplicitamente su Android come richiesto; iOS resta
// da verificare separatamente (comportamento noto per essere diverso).
function useTastieraBox() {
  const [box, setBox] = useState<{ top: number; bottom: number } | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function aggiorna() {
      if (window.innerWidth >= BREAKPOINT_SM) {
        setBox(null)
        return
      }
      const top = 20 + Math.max(0, Math.round(vv!.offsetTop))
      const bottom = 20 + Math.max(0, Math.round(window.innerHeight - vv!.height - vv!.offsetTop))
      setBox({ top, bottom })
    }

    aggiorna()
    // 'resize'/'scroll' di visualViewport coprono apertura/chiusura
    // tastiera e lo spostamento di offsetTop; 'resize' della window copre
    // il cambio di breakpoint (rotazione schermo, resize della finestra
    // desktop) che da solo non tocca visualViewport.
    vv.addEventListener('resize', aggiorna)
    vv.addEventListener('scroll', aggiorna)
    window.addEventListener('resize', aggiorna)
    return () => {
      vv.removeEventListener('resize', aggiorna)
      vv.removeEventListener('scroll', aggiorna)
      window.removeEventListener('resize', aggiorna)
    }
  }, [])

  return box
}

type Guardia = () => void

// Margine fisso richiesto al passo 8: sia tra il bordo inferiore del
// bottone Salva e il bordo inferiore del box Modal, sia come contributo
// allo spazio riservato in fondo al contenuto scrollabile.
const MARGINE_SALVA = 20

// Context locale, equivalente a quello interno di components/modal.tsx —
// duplicato invece di importato: ModalTestShell non è il Modal condiviso
// (vedi commento sopra), quindi non può fornire l'istanza Context di
// quel componente (useContext funziona solo con lo stesso oggetto Context
// usato dal Provider). Stessa identica logica del componente reale, più
// `impostaSpazioRiservato` (nuovo al passo 8): un discendente (il bottone
// Salva, dentro ModalTestContenuto) non può altrimenti influenzare il
// padding del contenitore scrollabile che vive in ModalTestShell — stesso
// principio già usato per registraGuardia, non un pattern nuovo.
const ModalTestContesto = createContext<{
  onChiudi: () => void
  registraGuardia: (guardia: Guardia | null) => void
  impostaSpazioRiservato: (px: number) => void
} | null>(null)

// Equivalente locale di useProteggiChiusuraModal (components/modal.tsx,
// Sprint UI-2): un componente figlio con modifiche non salvate registra qui
// una guardia che intercetta X/backdrop/Esc (tipicamente per aprire un
// DialogConferma a 3 opzioni) invece di chiudere direttamente. Ritorna il
// vero onChiudi, da invocare esplicitamente dalle azioni del dialog.
function useProteggiChiusuraModalTest(dirty: boolean, onTentativoChiusura: () => void) {
  const ctx = useContext(ModalTestContesto)
  useEffect(() => {
    if (!ctx) return
    ctx.registraGuardia(dirty ? onTentativoChiusura : null)
    return () => ctx.registraGuardia(null)
  }, [ctx, dirty, onTentativoChiusura])
  return ctx?.onChiudi ?? (() => {})
}

// Involucro locale della Modal di test — NON il componente Modal condiviso
// (components/modal.tsx), lasciato intenzionalmente intatto: la dimensione
// ridotta (passo 2) va validata dal vivo qui prima di essere eventualmente
// portata ovunque in uno sprint dedicato (vedi CLAUDE.md). Duplica il minimo
// indispensabile di Modal (portal, backdrop, Esc, blocco scroll, header
// titolo+chiudi, guardia di chiusura) — stessa logica, Context locale.
function ModalTestShell({
  aperto,
  onChiudi,
  titolo,
  children,
}: {
  aperto: boolean
  onChiudi: () => void
  titolo: ReactNode
  children: ReactNode
}) {
  // Ref, non state: la guardia cambia ad ogni tasto digitato nel textarea e
  // non deve causare un re-render della Shell — viene letta solo al
  // tentativo di chiusura (X/backdrop/Esc), stesso principio di modal.tsx.
  const guardiaRef = useRef<Guardia | null>(null)

  // Spazio (px) da riservare in fondo al contenuto scrollabile quando il
  // Salva pillola è visibile — passo 8, riportato da ModalTestContenuto via
  // impostaSpazioRiservato(). Questo, a differenza di guardiaRef, DEVE
  // essere state (non ref): influenza direttamente il rendering (il
  // paddingBottom del div scrollabile sotto), un ref non farebbe scattare
  // il re-render necessario a farlo comparire.
  const [spazioRiservato, setSpazioRiservato] = useState(0)

  // Passo 9: aggiustamento top/bottom del box per la tastiera virtuale
  // (null su desktop — vedi useTastieraBox per il perché della guardia).
  const tastieraBox = useTastieraBox()

  function richiediChiusura() {
    if (guardiaRef.current) guardiaRef.current()
    else onChiudi()
  }

  // "Latest ref", stesso pattern di modal.tsx: il listener Esc si registra
  // una sola volta per apertura ma deve comunque invocare la richiediChiusura
  // più recente (guardia/onChiudi correnti), non quella catturata al mount.
  const richiediChiusuraRef = useRef(richiediChiusura)
  useEffect(() => {
    richiediChiusuraRef.current = richiediChiusura
  })

  useEffect(() => {
    if (!aperto) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') richiediChiusuraRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    const overflowPrecedente = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflowPrecedente
    }
  }, [aperto])

  if (!aperto) return null

  return createPortal(
    <ModalTestContesto.Provider
      value={{
        onChiudi,
        registraGuardia: (guardia) => { guardiaRef.current = guardia },
        impostaSpazioRiservato: setSpazioRiservato,
      }}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
        <div className="fixed inset-0 bg-black/40" onClick={richiediChiusura} aria-hidden="true" />

        {/* Mobile: margine assoluto di 20px su tutti e 4 i lati (`inset-5` =
            1.25rem = 20px esatti in Tailwind), fisso indipendentemente dalla
            dimensione dello schermo — `fixed` toglie il box dal flusso, quindi
            il centraggio flex del genitore non lo riguarda più su mobile.
            Desktop (sm:): torna al centraggio flex normale. Corretto (passo 3):
            una riduzione percentuale (max-w-[420px]/70vh, passo 2) non dava un
            risultato sensato — sostituita con una larghezza massima assoluta,
            indipendente dalla larghezza del monitor (640px, a metà del range
            600-700px indicato) più un'altezza massima in vh (80vh, coerente
            con l'85vh già in uso su Modal in produzione) — così su un monitor
            grande resta una finestra di dimensione ragionevole centrata, non
            un rettangolo che segue lo schermo. Solo qui, non nel Modal
            condiviso.

            Passo 9: `tastieraBox` (null su desktop) sovrascrive top/bottom
            in px quando la tastiera virtuale è aperta su mobile, restringendo
            il box allo spazio realmente visibile (window.visualViewport) —
            `inset-5` resta comunque la base/il fallback (left/right sempre
            da lì, top/bottom da lì finché tastieraBox è null). */}
        <div
          className="fixed inset-5 flex flex-col overflow-hidden rounded-2xl bg-white sm:relative sm:inset-auto sm:w-full sm:max-w-[640px] sm:max-h-[80vh]"
          style={tastieraBox ? { top: tastieraBox.top, bottom: tastieraBox.bottom } : undefined}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{titolo}</p>
            <button
              type="button"
              onClick={richiediChiusura}
              aria-label="Chiudi"
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <IconaChiudi className="h-5 w-5" />
            </button>
          </div>
          {/* paddingBottom dinamico (passo 8): 16px di base (py-4) + lo
              spazio riservato al Salva pillola quando visibile, misurato in
              JS su ModalTestContenuto — lo stile inline sovrascrive solo
              padding-bottom, padding-top resta quello di py-4 (Tailwind
              genera le due proprietà separate, non uno shorthand).

              scrollPaddingBottom (fix problema 1, segnalato da test reale su
              iPhone): stesso identico valore del paddingBottom. Il
              paddingBottom da solo riserva lo spazio visivo, ma lo scroll
              nativo "porta il caret in vista" di iOS Safari (che scatta ad
              ogni ritorno a capo mentre si scrive nel textarea, indipendente
              dai listener su window.visualViewport di useTastieraBox) non ne
              è a conoscenza — scorre il testo fino al bordo visibile reale
              del contenitore, ignorando sia il padding sia il bottone Salva
              (position:absolute, dipinto sopra, invisibile a quell'algoritmo)
              che quindi finisce sopra l'ultima riga scritta. scroll-padding
              (CSS Scroll Snap, Safari iOS ≥14.5) esiste apposta per questo:
              dice al browser di lasciare N px in fondo quando scorre un
              elemento in vista — stesso meccanismo del padding visivo, ma
              applicato allo scroll automatico. Su Android non dovrebbe
              cambiare nulla in pratica (lì il problema non si presentava
              già), qui aggiunto perché additivo e a basso rischio. DA
              VERIFICARE su iPhone reale, non testabile in questo ambiente. */}
          <div
            className="grow overflow-y-auto px-4 py-4"
            style={{ paddingBottom: 16 + spazioRiservato, scrollPaddingBottom: 16 + spazioRiservato }}
          >
            {children}
          </div>
        </div>
      </div>
    </ModalTestContesto.Provider>,
    document.body,
  )
}

// Contenuto della Modal di test — reso come `children` di ModalTestShell,
// quindi genuino DISCENDENTE del suo Provider nell'albero dei fiber React
// (a differenza di ModalTest, che è l'ANTENATO che costruisce ModalTestShell:
// un componente non può consumare un Context fornito da un Provider che lui
// stesso genera nel proprio return, perché al momento dei suoi hook quel
// Provider non è ancora "entrato" nell'albero — bug scoperto in produzione
// dopo il passo 5, vedi CLAUDE.md). Stesso identico pattern del componente
// satellite reale (es. SatellitePreventivo): un componente separato passato
// come children a Modal, mai lo stesso componente che assembla <Modal>.
//
// Nessun prop dal passo 7 in poi: testo/data/ora* vivono tutti QUI (stato
// locale), non più sollevati in ModalTest — al passo 5 fontSize/testo erano
// stati sollevati solo perché il titolo (costruito in ModalTest, fuori dal
// Provider) doveva mostrare la dimensione corrente tramite il controllo +/-;
// rimosso quel controllo (passo 7), non c'è più alcun motivo per condividere
// stato con ModalTest. Vantaggio diretto: ModalTestContenuto si smonta per
// davvero ad ogni chiusura (ModalTestShell ritorna null), quindi TUTTI i
// campi ripartono già puliti al prossimo mount — resetCompleto() del passo 5
// non serve più, "Salva ed esci"/"Esci senza salvare" chiudono soltanto.
function ModalTestContenuto() {
  const [testo, setTesto] = useState(TESTO_DEFAULT)
  const [data, setData] = useState('')
  // Passo 9: era "oraB" quando conviveva con la (ora rimossa) variante A a
  // due <select> separati — rinominato, non c'è più nulla da distinguere.
  const [ora, setOra] = useState('')
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const testoRef = useRef<HTMLTextAreaElement>(null)

  // Auto-crescita del textarea sul proprio contenuto (nessuna scrollbar
  // interna): l'altezza segue esattamente `scrollHeight`, così un testo
  // lungo allunga il corpo della Modal fino a superare lo spazio visibile
  // e a far scorrere l'intera Modal (il div `overflow-y-auto` del corpo,
  // vedi ModalTestShell) — non un doppio scroll annidato nel textarea.
  useEffect(() => {
    const el = testoRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [testo])

  // Dirty-state: testo + data + ora — il Salva pillola compare alla prima
  // modifica di uno qualunque di questi campi (passo 9: da 5 a 3 campi,
  // rimossa la variante A).
  const { dirty, segnaSalvato } = useDirtyForm({ testo, data, ora })

  // Registra la guardia sulla Shell: con dirty=true, X/backdrop/Esc aprono
  // il dialog invece di chiudere direttamente. `chiudiReale` è il vero
  // onChiudi (passato da AppNav) — invocato esplicitamente dalle due azioni
  // del dialog sotto, mai direttamente dal contenuto.
  const chiudiReale = useProteggiChiusuraModalTest(dirty, () => setConfermaUscitaAperta(true))

  // Passo 8: il Salva pillola passa da `fixed` (viewport) ad `absolute`
  // (box della Modal — sm:relative su desktop, fixed su mobile: entrambi
  // già stabiliscono un containing block per un discendente absolute,
  // nessuna modifica extra necessaria lì). Altezza misurata realmente via
  // ref (non assunta fissa in codice, come richiesto esplicitamente) e
  // comunicata a ModalTestShell tramite lo stesso Context già usato per la
  // guardia di chiusura, per riservare lo spazio corrispondente in fondo al
  // contenuto scrollabile.
  const salvaRef = useRef<HTMLButtonElement>(null)
  const ctx = useContext(ModalTestContesto)

  useEffect(() => {
    const impostaSpazioRiservato = ctx?.impostaSpazioRiservato
    if (!impostaSpazioRiservato) return

    if (!dirty) {
      impostaSpazioRiservato(0)
      return
    }

    const el = salvaRef.current
    if (!el) return

    function misura() {
      impostaSpazioRiservato!(el!.offsetHeight + MARGINE_SALVA)
    }
    misura()
    // ResizeObserver, non solo una misura una tantum: l'altezza del bottone
    // può cambiare (es. testo che va a capo a viewport molto stretti) anche
    // senza che `dirty` cambi.
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ctx, dirty])

  // Effetto "pulizia allo smontaggio vero", non ad ogni cambio di ctx: `ctx`
  // cambia identità ad ogni render di ModalTestShell (il value del Provider
  // è un oggetto letterale ricreato ogni volta, vedi sopra) — un effect con
  // `[ctx]` come dipendenza girerebbe la propria cleanup ad ogni giro,
  // azzerando lo spazio riservato subito dopo averlo appena impostato
  // (bug individuato scrivendo questo stesso file, corretto prima di
  // committare). Dipendenze vuote invece: la cleanup scatta SOLO al vero
  // smontaggio di ModalTestContenuto — "latest ref" (stesso pattern già in
  // uso per richiediChiusuraRef in ModalTestShell) per usare comunque il
  // ctx più recente in quel momento, non quello catturato al primo render.
  const ctxRef = useRef(ctx)
  useEffect(() => {
    ctxRef.current = ctx
  })
  useEffect(() => {
    return () => ctxRef.current?.impostaSpazioRiservato(0)
  }, [])

  // "Salva ed esci" ed "Esci senza salvare" si comportano allo stesso modo
  // qui: nessuna persistenza reale dietro questa Modal di test, quindi
  // "salvare" significa solo far sparire il dirty-state (come già fa il
  // Salva pillola). Nessun reset esplicito necessario (a differenza del
  // passo 5): chiudiReale() fa smontare ModalTestContenuto, tutto lo stato
  // locale (incluso quello di useDirtyForm) sparisce da solo.
  function handleSalvaEdEsci() {
    setConfermaUscitaAperta(false)
    chiudiReale()
  }

  function handleEsciSenzaSalvare() {
    setConfermaUscitaAperta(false)
    chiudiReale()
  }

  return (
    <>
      {/* mt-2: si somma al py-4 del corpo della Modal (ModalTestShell) per
          una distanza sotto il titolo né incollata né eccessiva. */}
      <div className="mt-2">
        <label className="mb-1 block text-sm font-medium text-gray-700">Testo di prova</label>
        <textarea
          ref={testoRef}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          style={{ fontSize: TESTO_FONT_SIZE }}
          className={`${inputClass()} resize-none overflow-hidden`}
        />
      </div>

      {/* Passo 9: Data e Ora affiancate sulla stessa riga (prima una sotto
          l'altra) — inputClassFisso()+flex-1 su entrambe, stesso principio
          già usato per i due <select> della (ormai rimossa) variante A, per
          non combinare `w-full` (di inputClass) con una larghezza flessibile
          nella stessa classe. Variante A (due <select> ore/minuti separati)
          rimossa: la variante B (slot predefiniti) è la soluzione scelta,
          l'etichetta non distingue più "variante B" da altro — è solo "Ora".

          min-w-0 su entrambi i wrapper (fix problema 2, segnalato da test
          reale su iPhone): un flex item ha di default `min-width: auto`, che
          per un controllo nativo (<select>, <input type="date">) si risolve
          nella larghezza minima intrinseca del widget del browser — su iOS
          Safari quel minimo è tipicamente più largo che su Android Chrome
          (frecce/padding/segmenti gg-mm-aaaa del date picker nativo), quindi
          né Data né Ora riuscivano a restringersi sotto quella soglia su
          schermi stretti, invadendo lo spazio del vicino invece di andare in
          overflow "pulito". Stesso principio già noto in questo progetto ma
          in grid, non flex (vedi CLAUDE.md, riga allegati: "1fr equivale a
          minmax(auto,1fr), non minmax(0,1fr)"). DA VERIFICARE su iPhone
          reale, non testabile in questo ambiente. */}
      <div className="mt-4 flex gap-2">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={`${inputClassFisso()} w-full`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Ora</label>
          <select value={ora} onChange={(e) => setOra(e.target.value)} className={`${inputClassFisso()} w-full`}>
            <option value="">--</option>
            {SLOT_ORARI.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Salva pillola locale (non il componente SalvaFlottante condiviso,
          come da richiesta esplicita — solo qui per ora). Passo 8: da
          `fixed` (viewport) ad `absolute` (box della Modal, il primo
          ancestor posizionato risalendo dal DOM — qui il contenitore
          fixed/relative di ModalTestShell, non influenzato dal fatto che
          questo bottone sia annidato dentro il div scrollabile: l'overflow
          di quel div clippa solo se il bottone eccede il SUO box, non
          rilevante qui dato che bottom:20 lo tiene ben dentro), `bottom`
          fisso a MARGINE_SALVA. Passo 9: la tastiera virtuale è di nuovo
          gestita correttamente — non più aggiustando QUESTO bottone (come
          al passo 6), ma il BOX della Modal stesso (useTastieraBox, sopra),
          che si restringe sopra la tastiera; il bottone, ancorato al fondo
          del box, la segue "gratis" senza bisogno di alcun aggiustamento
          proprio. */}
      {dirty && (
        <button
          ref={salvaRef}
          type="button"
          onClick={() => segnaSalvato()}
          style={{ bottom: MARGINE_SALVA }}
          className="absolute left-1/2 z-[60] -translate-x-1/2 rounded-full bg-sky-500 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-colors hover:bg-sky-600"
        >
          Salva
        </button>
      )}

      <DialogConferma
        aperto={confermaUscitaAperta}
        titolo="Modifiche non salvate"
        messaggio="Vuoi salvare le modifiche prima di uscire?"
        opzioni={[
          { label: 'Salva ed esci', variante: 'primaria', onClick: handleSalvaEdEsci },
          { label: 'Esci senza salvare', variante: 'secondaria', onClick: handleEsciSenzaSalvare },
          { label: 'Annulla', variante: 'testuale', onClick: () => setConfermaUscitaAperta(false) },
        ]}
      />
    </>
  )
}

// Titolo fisso (passo 7, nessun controllo +/- residuo): nessuna dipendenza
// da props/state, definito una sola volta a livello di modulo invece che
// ricreato ad ogni render di ModalTest.
const TITOLO = (
  <span className="inline-flex items-center gap-2">
    {/* Semaforo: un solo colore fisso per questo passo (verde), non ancora
        ciclabile — placeholder puramente visivo, nessuno stato reale
        dietro. Stessa forma (pallino pieno) già in uso nell'header dei
        satelliti veri, colore scelto qui direttamente (non importato da
        lib/lavori/satelliti-meta.ts) per restare isolato dal codice di
        produzione. */}
    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
    <span className="font-sans font-semibold text-gray-900" style={{ fontSize: TITOLO_FONT_SIZE }}>
      {TITOLO_PLACEHOLDER}
    </span>
  </span>
)

export function ModalTest({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  return (
    <ModalTestShell aperto={aperto} onChiudi={onChiudi} titolo={TITOLO}>
      <ModalTestContenuto />
    </ModalTestShell>
  )
}
