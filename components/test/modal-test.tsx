'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconaChiudi } from '@/components/icons'
import { DialogConferma } from '@/components/dialog-conferma'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { inputClass } from '@/lib/input-class'

// Modal di test — ambiente di iterazione rapida sul design, separato dai
// satelliti reali (vedi CLAUDE.md quando aggiornato). Primo passo: solo
// struttura base (header con titolo+semaforo, controllo dimensione font,
// bottone Salva flottante) — nessun campo form vero, nessuna persistenza.
// Componente isolato in components/test/, non referenziato da alcun
// componente satellite/pagina di produzione oltre al singolo trigger nel
// menu (components/app-nav.tsx).

const TITOLO_PLACEHOLDER = 'Titolo della finestra di TEST'

// Range esplorativo, non un limite definitivo: da aggiustare dal vivo.
const FONT_MIN = 14
const FONT_MAX = 28
const FONT_STEP = 2
const FONT_DEFAULT = 18

// Testo di prova (passo 4): 4 paragrafi, abbastanza lunghi da forzare lo
// scroll interno della Modal (in particolare su mobile, con la dimensione
// ridotta del passo 3) — verifica che l'header e il bottone Salva restino
// visibili/accessibili mentre il corpo scorre.
const TESTO_DEFAULT = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus, sed elementum nibh tincidunt id. Nulla facilisi. Vivamus varius, ligula eget commodo pulvinar, sapien nisl fermentum nisi, at fringilla purus mauris a nunc.',
  'Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec ullamcorper nulla non metus auctor fringilla. Aenean lacinia bibendum nulla sed consectetur. Etiam porta sem malesuada magna mollis euismod.',
  'Nullam quis risus eget urna mollis ornare vel eu leo. Maecenas faucibus mollis interdum. Vestibulum id ligula porta felis euismod semper. Cras mattis consectetur purus sit amet fermentum. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.',
].join('\n\n')

// Spazio (in px) nascosto sotto il layout viewport quando la tastiera
// virtuale è aperta su mobile — passo 6, vedi CLAUDE.md. window.innerHeight
// resta quello del layout viewport; window.visualViewport.height/.offsetTop
// riflettono invece l'area REALMENTE visibile sopra la tastiera. Un
// `position: fixed; bottom: 0` normale ignora questa differenza (motivo del
// bug segnalato: il Salva pillola restava sotto la tastiera). Duplicato qui,
// non ancora portato nel componente SalvaFlottante condiviso (usato dai
// satelliti reali) come richiesto esplicitamente — solo la variante
// 'pillola' della Modal di test lo usa per ora, in attesa di validazione.
//
// DIFFERENZA NOTA iOS/Android (come richiesto di segnalare esplicitamente):
// su iOS Safari, un elemento `position: fixed` è posizionato rispetto al
// LAYOUT viewport, non al visual viewport — quando la tastiera si apre,
// Safari non ridimensiona affatto window.innerHeight (resta invariato),
// riduce solo visualViewport.height e può spostare visualViewport.offsetTop
// (la pagina scorre per portare il campo attivo in vista): un elemento
// `fixed bottom-0` NON segue automaticamente la tastiera, resta ancorato al
// fondo del layout viewport ormai fuori dallo schermo visibile — da qui la
// formula sotto (`innerHeight - vv.height - vv.offsetTop`) restituisce un
// valore concreto >0 su iOS. Su Android Chrome invece, a seconda della
// versione/della configurazione (`interactive-widget` nel meta viewport),
// il browser spesso ridimensiona GIÀ window.innerHeight insieme alla
// tastiera (il layout viewport si restringe da solo) — in quel caso la
// stessa formula restituisce ~0 (nessun offset aggiuntivo necessario,
// l'elemento fixed è già correttamente sopra la tastiera senza alcun
// intervento JS). La formula quindi si "auto-adatta" a entrambi i
// comportamenti invece di assumerne uno solo, ma è importante sapere che il
// valore osservato in pratica sarà sistematicamente diverso tra i due SO
// (tipicamente >0 su iOS, spesso ~0 su Android) — non un bug della singola
// piattaforma, comportamento nativo divergente dei due browser.
function useTastieraInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function aggiorna() {
      const nascosto = window.innerHeight - vv!.height - vv!.offsetTop
      setInset(Math.max(0, Math.round(nascosto)))
    }

    aggiorna()
    // 'resize' copre l'apertura/chiusura della tastiera; 'scroll' copre lo
    // spostamento di visualViewport.offsetTop quando iOS scorre la pagina
    // per portare il campo attivo in vista a tastiera già aperta.
    vv.addEventListener('resize', aggiorna)
    vv.addEventListener('scroll', aggiorna)
    return () => {
      vv.removeEventListener('resize', aggiorna)
      vv.removeEventListener('scroll', aggiorna)
    }
  }, [])

  return inset
}

type Guardia = () => void

// Context locale, equivalente a quello interno di components/modal.tsx —
// duplicato invece di importato: ModalTestShell non è il Modal condiviso
// (vedi commento sopra), quindi non può fornire l'istanza Context di
// quel componente (useContext funziona solo con lo stesso oggetto Context
// usato dal Provider). Stessa identica logica del componente reale.
const ModalTestContesto = createContext<{
  onChiudi: () => void
  registraGuardia: (guardia: Guardia | null) => void
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
      value={{ onChiudi, registraGuardia: (guardia) => { guardiaRef.current = guardia } }}
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
            condiviso. */}
        <div className="fixed inset-5 flex flex-col overflow-hidden rounded-2xl bg-white sm:relative sm:inset-auto sm:w-full sm:max-w-[640px] sm:max-h-[80vh]">
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
          <div className="grow overflow-y-auto px-4 py-4">{children}</div>
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
function ModalTestContenuto({
  fontSize,
  setFontSize,
  testo,
  setTesto,
}: {
  fontSize: number
  setFontSize: (f: number) => void
  testo: string
  setTesto: (t: string) => void
}) {
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

  // Dirty-state agganciato sia al controllo +/- della dimensione titolo sia
  // al testo: il bottone Salva compare alla prima modifica di uno dei due,
  // scompare al "salva" (nessuna persistenza reale in questo passo).
  const { dirty, segnaSalvato } = useDirtyForm({ fontSize, testo })

  // Passo 6: spazio nascosto dalla tastiera virtuale, per tenere il Salva
  // pillola sempre sopra di essa invece che sotto (vedi useTastieraInset
  // sopra per il dettaglio/le differenze iOS-Android).
  const tastieraInset = useTastieraInset()

  // Registra la guardia sulla Shell: con dirty=true, X/backdrop/Esc aprono
  // il dialog invece di chiudere direttamente. `chiudiReale` è il vero
  // onChiudi (passato da AppNav) — invocato esplicitamente dalle due azioni
  // del dialog sotto, mai direttamente dal contenuto.
  const chiudiReale = useProteggiChiusuraModalTest(dirty, () => setConfermaUscitaAperta(true))

  // fontSize/testo vivono in ModalTest (mai smontato, sempre montato in
  // AppNav) — senza un reset esplicito resterebbero in memoria da
  // un'apertura all'altra. Azzera sia i valori sia la baseline di
  // useDirtyForm (non solo i valori): se l'utente avesse già premuto il
  // Salva pillola a metà sessione, la baseline sarebbe rimasta su quei
  // valori intermedi, e un reset dei soli campi risulterebbe di nuovo
  // "sporco" al prossimo giro. ModalTestContenuto invece SI smonta
  // correttamente ad ogni chiusura (ModalTestShell ritorna null quando
  // aperto=false, quindi anche {children}) — dirty/confermaUscitaAperta
  // ripartono già puliti da soli al prossimo mount, senza bisogno di reset.
  function resetCompleto() {
    setFontSize(FONT_DEFAULT)
    setTesto(TESTO_DEFAULT)
    segnaSalvato({ fontSize: FONT_DEFAULT, testo: TESTO_DEFAULT })
  }

  // "Salva ed esci" ed "Esci senza salvare" si comportano allo stesso modo
  // qui: nessuna persistenza reale dietro questa Modal di test, quindi
  // "salvare" significa solo far sparire il dirty-state (come già fa il
  // Salva pillola) — in entrambi i casi lo stato locale torna pulito prima
  // di chiudere davvero, così la prossima apertura riparte da zero.
  function handleSalvaEdEsci() {
    resetCompleto()
    setConfermaUscitaAperta(false)
    chiudiReale()
  }

  function handleEsciSenzaSalvare() {
    resetCompleto()
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
          className={`${inputClass()} resize-none overflow-hidden`}
        />
      </div>
      {/* Salva pillola locale (non il componente SalvaFlottante condiviso,
          come da richiesta esplicita — solo qui per ora, in attesa di
          portare la logica di useTastieraInset lì in uno sprint dedicato
          se questa validazione funziona bene). Stesso stile della variante
          'pillola' già esistente in SalvaFlottante, ma con `bottom`
          calcolato dinamicamente: 50px dal fondo del visual viewport
          (non del layout viewport), così resta sopra la tastiera invece
          che sotto quando questa è aperta. */}
      {dirty && (
        <button
          type="button"
          onClick={() => segnaSalvato()}
          style={{ bottom: 50 + tastieraInset }}
          className="fixed left-1/2 z-[60] -translate-x-1/2 rounded-full bg-sky-500 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-colors hover:bg-sky-600"
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

export function ModalTest({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const [fontSize, setFontSize] = useState(FONT_DEFAULT)
  const [testo, setTesto] = useState(TESTO_DEFAULT)

  function decrementa() {
    setFontSize((s) => Math.max(FONT_MIN, s - FONT_STEP))
  }

  function incrementa() {
    setFontSize((s) => Math.min(FONT_MAX, s + FONT_STEP))
  }

  const titolo = (
    <span className="inline-flex flex-wrap items-center gap-2">
      {/* Semaforo: un solo colore fisso per questo passo (verde), non ancora
          ciclabile — placeholder puramente visivo, nessuno stato reale
          dietro. Stessa forma (pallino pieno) già in uso nell'header dei
          satelliti veri, colore scelto qui direttamente (non importato da
          lib/lavori/satelliti-meta.ts) per restare isolato dal codice di
          produzione. */}
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
      <span className="font-sans font-semibold text-gray-900" style={{ fontSize }}>
        {TITOLO_PLACEHOLDER}
      </span>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={decrementa}
          disabled={fontSize <= FONT_MIN}
          aria-label="Riduci dimensione titolo"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
        >
          −
        </button>
        <span className="w-9 text-center text-[11px] tabular-nums text-gray-400">{fontSize}px</span>
        <button
          type="button"
          onClick={incrementa}
          disabled={fontSize >= FONT_MAX}
          aria-label="Aumenta dimensione titolo"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
        >
          +
        </button>
      </span>
    </span>
  )

  return (
    <ModalTestShell aperto={aperto} onChiudi={onChiudi} titolo={titolo}>
      <ModalTestContenuto fontSize={fontSize} setFontSize={setFontSize} testo={testo} setTesto={setTesto} />
    </ModalTestShell>
  )
}
