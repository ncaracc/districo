'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconaChiudi } from '@/components/icons'

type Guardia = () => void

// Breakpoint `sm:` di Tailwind (640px) — deve combaciare esattamente con le
// classi `sm:` usate più sotto (stesso principio già in uso in
// components/test/modal-test.tsx, BREAKPOINT_SM).
const BREAKPOINT_SM = 640

// Fix Finding C dell'audit iOS Safari/WebKit (docs/audit-ios.md, 2026-08-07),
// RICALIBRATO l'11/8 per l'allineamento dimensioni/margini alla Modal di
// test (vedi il commento sul box più sotto — mobile è passato da
// `max-h-[92vh]` a `fixed inset-5`, che essendo a pixel fissi non soffre più
// del bug `vh`/`dvh` che questo hook risolveva in origine — vedi audit-ios.md
// §7, che aveva già notato come `inset-5` sidesteppasse il problema in
// modal-test.tsx). Questo hook resta comunque utile come rete di sicurezza
// per il caso tastiera virtuale (che `inset-5` da solo non gestisce, essendo
// fisso rispetto al layout viewport, non a quello visibile quando la
// tastiera è aperta): limita l'altezza allo spazio REALMENTE visibile meno
// gli stessi 20px+20px di margine di `inset-5`, così il box non finisce mai
// più alto dell'area visibile — senza però riposizionarlo (resta lo stesso
// porting MINIMALE e ISOLATO da useTastieraBox di modal-test.tsx: solo
// misurazione via window.visualViewport, non il riposizionamento top/bottom
// dinamico — quello resta fuori scope, come già deciso il 7/8).
//
// Attivo solo sotto BREAKPOINT_SM (torna `undefined` su desktop, dove
// max-h-[80vh] resta l'unica fonte di verità, nessun bug vh lì) e solo
// quando window.visualViewport è disponibile — altrimenti (SSR, primo
// render prima dell'effect, browser senza l'API) `inset-5` da solo si
// applica correttamente, nessun salto visivo.
function useAltezzaMassimaMobile(): number | undefined {
  const [altezzaMassima, setAltezzaMassima] = useState<number | undefined>(undefined)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function aggiorna() {
      if (window.innerWidth >= BREAKPOINT_SM) {
        setAltezzaMassima(undefined)
        return
      }
      // -40px: stesso margine di inset-5 (20px sopra + 20px sotto), qui
      // sottratto dall'altezza VISIBILE reale invece che dal layout
      // viewport — così il tetto resta coerente con inset-5 nel caso
      // comune, e si stringe ulteriormente solo quando la tastiera (o la
      // barra indirizzi espansa) riduce davvero lo spazio visibile.
      setAltezzaMassima(Math.round(vv!.height) - 40)
    }

    aggiorna()
    // 'resize'/'scroll' di visualViewport coprono sia il collasso/espansione
    // della barra indirizzi sia l'apertura/chiusura della tastiera; 'resize'
    // della window copre il cambio di breakpoint (rotazione, resize desktop)
    // che da solo non tocca visualViewport — stesso set di listener di
    // useTastieraBox.
    vv.addEventListener('resize', aggiorna)
    vv.addEventListener('scroll', aggiorna)
    window.addEventListener('resize', aggiorna)
    return () => {
      vv.removeEventListener('resize', aggiorna)
      vv.removeEventListener('scroll', aggiorna)
      window.removeEventListener('resize', aggiorna)
    }
  }, [])

  return altezzaMassima
}

// Contesto interno: espone ai discendenti (i componenti satellite montati
// come children) il vero onChiudi e un modo per "proteggere" la chiusura
// quando hanno modifiche non salvate (Sprint UI-2, bottone Salva flottante
// con dirty-state, vedi CLAUDE.md). Necessario perché LavoroSatelliteTabella
// (che possiede aperto/onChiudi) non può conoscere il dirty-state interno di
// ciascun componente satellite senza reintrodurre lo stesso anti-pattern già
// scoperto e corretto nello Sprint C (cloneElement su un ReactNode passato
// da Server a Client Component non è affidabile, vedi CLAUDE.md 2/8) — un
// Context, al contrario, funziona correttamente indipendentemente da come
// l'elemento ha attraversato il confine RSC, perché non richiede clonare o
// ispezionare l'elemento: il discendente lo consulta da sé.
const ModalContesto = createContext<{
  onChiudi: () => void
  registraGuardia: (guardia: Guardia | null) => void
} | null>(null)

// Hook che un componente satellite usa per proteggere la chiusura della
// Modal che lo ospita: finché `dirty` è vero, X/backdrop/Esc non chiudono
// più direttamente — invocano invece `onTentativoChiusura` (tipicamente
// apre un DialogConferma a 3 opzioni). Ritorna il vero onChiudi, da
// richiamare esplicitamente dalle azioni "Salva ed esci"/"Esci senza
// salvare" del dialog stesso. Nessun effetto se il componente non è dentro
// una Modal (ctx null): ritorna un no-op, per non far esplodere chi lo
// chiama comunque in quel caso.
export function useProteggiChiusuraModal(dirty: boolean, onTentativoChiusura: () => void) {
  const ctx = useContext(ModalContesto)

  // "Latest ref" per onTentativoChiusura (2026-08-12, vedi CLAUDE.md —
  // refactor route parallele/intercettate): i componenti satellite passano
  // quasi sempre una arrow function inline (`() => setConfermaUscitaAperta(true)`),
  // una referenza NUOVA ad ogni render — se restasse nelle dipendenze
  // dell'effect sotto, l'effect (e la sua cleanup) rieseguirebbe ad ogni
  // render del satellite, non solo alle vere transizioni di `dirty`. Con la
  // vecchia registraGuardia (solo `guardiaRef.current = guardia`, nessun
  // effetto collaterale) questo era innocuo; da quando registraGuardia ha
  // effetti collaterali sulla history (push/pop del "fantasma" per il
  // blocco Back, vedi Modal più sotto) lo stesso schema di cleanup+re-run
  // spurio genera transizioni false (guardia annullata e subito
  // ripristinata) che disallineano il conteggio della history — bug reale
  // scoperto testando "Annulla" nel dialog di conferma (un secondo render
  // del satellite, es. per un motivo qualsiasi non legato a dirty, bastava
  // a scatenare un push+pop fantasma extra). Fix qui, nell'hook condiviso,
  // non nei satelliti (non toccati, come richiesto): l'effect sotto dipende
  // ora solo da `[ctx, dirty]`, la guardia esposta legge sempre la versione
  // più recente di onTentativoChiusura tramite questo ref.
  const onTentativoChiusuraRef = useRef(onTentativoChiusura)
  useEffect(() => {
    onTentativoChiusuraRef.current = onTentativoChiusura
  })

  useEffect(() => {
    if (!ctx) return
    ctx.registraGuardia(dirty ? () => onTentativoChiusuraRef.current() : null)
    return () => ctx.registraGuardia(null)
  }, [ctx, dirty])

  return ctx?.onChiudi ?? (() => {})
}

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md):
// variante "statica" del Provider, per la pagina piena di fallback
// (attivita/[attivitaId]/page.tsx, apertura diretta dell'URL — nessun
// overlay/portal/backdrop lì, è una pagina vera). I componenti satellite
// esistenti chiamano comunque useProteggiChiusuraModal internamente (non
// toccati, per requisito esplicito): senza un Provider nel loro albero,
// ctx sarebbe null e i loro bottoni "Annulla"/"Salva ed esci"/"Esci senza
// salvare" chiamerebbero un no-op — morti. Qui il Context esiste ma senza
// alcuna delle meccaniche di Modal (guardiaRef/fantasma/popstate): non
// c'è alcun X/backdrop/Esc/Back-fisico da intercettare su una pagina piena
// normale, solo bottoni interni al satellite che devono poter navigare via
// onChiudi — registraGuardia è quindi un no-op legittimo qui, non una
// funzionalità mancante.
export function ModalContestoStatico({ onChiudi, children }: { onChiudi: () => void; children: React.ReactNode }) {
  return <ModalContesto.Provider value={{ onChiudi, registraGuardia: () => {} }}>{children}</ModalContesto.Provider>
}

// Modale generica riusata per la vista/modifica di un satellite (vedi
// lavoro-satelliti-tabella.tsx): centrata verticalmente sia su mobile sia su
// desktop (fix 2026-08-06, vedi CLAUDE.md — prima del fix, su mobile restava
// ancorata al fondo schermo come un bottom-sheet, comportamento preesistente
// dal 31/7 mai notato finché la Modal aveva sempre altezza fissa; con
// max-h-[92vh] introdotto dallo Sprint UI-2 un form corto rendeva quel
// bottom-sheet visibile per la prima volta, con un vuoto sopra — l'utente ha
// confermato di preferire il centraggio uniforme, non di voler ripristinare
// il vecchio comportamento). Su mobile occupa lo schermo meno un margine
// fisso di 20px per lato (`inset-5`, allineato l'11/8 alla Modal di test —
// vedi commento sul box più sotto), su desktop resta più stretta
// (max-w-[640px]/max-h-[80vh]). Monta i figli così come sono — non
// introduce una modalità "sola lettura" propria,
// il componente satellite esistente resta l'unica fonte di verità su
// editabile/sola lettura in base al ruolo.
export function Modal({
  aperto,
  onChiudi,
  titolo,
  children,
  bloccaBackConModifiche = false,
}: {
  aperto: boolean
  onChiudi: () => void
  // ReactNode (non solo string) da 2026-08-04: alcune righe compongono qui
  // pallino di stato + nome sulla stessa riga (vedi lavoro-satelliti-tabella.tsx,
  // RigaSatellite.titoloConPallino) invece di ripeterlo anche dentro il
  // componente satellite — nessun cambiamento per chi passa una semplice
  // stringa, un ReactNode include già string.
  titolo?: React.ReactNode
  children: React.ReactNode
  // Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md —
  // punto delicato #1, blocco navigazione con modifiche non salvate):
  // opt-in, default false — solo la nuova route di dettaglio attività lo
  // passa a true, "Aggiungi attività" (nessun dirty-state da proteggere)
  // resta invariata. Quando true, un tentativo di chiudere via tasto Back
  // del browser (non solo X/backdrop/Esc, già coperti da guardiaRef) mentre
  // c'è una guardia registrata (dirty) mostra lo stesso dialog di conferma
  // invece di lasciare che la navigazione proceda — vedi la voce d'archivio
  // per la spiegazione completa della tecnica ("storia fantasma").
  bloccaBackConModifiche?: boolean
}) {
  // Ref, non state: la guardia cambia spesso (ogni tasto digitato in un
  // campo del form aggiorna `dirty`) e non deve mai causare un re-render
  // della Modal stessa — viene solo letta al momento del tentativo di
  // chiusura (X/backdrop/Esc/Back).
  const guardiaRef = useRef<Guardia | null>(null)

  // Fix Finding C (vedi commento della funzione sopra): altezza massima in
  // px calcolata sull'area realmente visibile, solo su mobile.
  const altezzaMassimaMobile = useAltezzaMassimaMobile()

  // --- Blocco Back con modifiche non salvate (2026-08-12, vedi CLAUDE.md) ---
  // Tecnica della "voce di history fantasma": l'App Router di Next.js non
  // offre un blocco nativo per le navigazioni client-side (verificato: solo
  // <Link onNavigate> esiste, e copre solo i click su Link, non il tasto
  // Back — nessuna API stabile equivalente a un "router.block()" del vecchio
  // Pages Router). Verificato leggendo il sorgente del router
  // (node_modules/next/dist/client/components/app-router.js): Next intercetta
  // popstate e, se `event.state.__NA` è assente, esegue un
  // `window.location.reload()` — quindi non si può rispondere a un tentativo
  // di back pushando uno state qualsiasi. Ma lo stesso file ha già la
  // soluzione: `window.history.pushState`/`replaceState` sono monkey-patchati
  // per copiare automaticamente `__NA`/l'albero interno di Next
  // (`copyNextJsInternalHistoryState`) in QUALSIASI stato passato da codice
  // esterno — quindi una pushState "esterna" come questa è già sicura e
  // riconosciuta da Next.
  //
  // Quando la guardia passa da assente a presente (dirty diventa vero),
  // pushiamo una voce di history duplicata con la STESSA URL corrente
  // (`fantasmaAttivoRef`). Un primo tasto Back fisico pop-a quella voce senza
  // alcun cambio di URL/route (Next non ha nulla da fare, la vede identica) —
  // il nostro listener popstate lo intercetta e mostra il dialog di conferma
  // esistente, la Modal resta montata con tutto lo stato in corso intatto
  // (mai smontata, a differenza di un tentativo "preveni poi ripristina" che
  // arriverebbe sempre troppo tardi). Se l'utente conferma di uscire, un
  // `history.go(-2)` (fantasma + voce reale) porta via davvero in un colpo
  // solo — go(-2) invece di due back() sequenziali per evitare qualunque
  // rischio di ordinamento asincrono tra le due chiamate.
  const fantasmaAttivoRef = useRef(false)
  // true solo mentre siamo NOI a consumare il fantasma (dirty tornato pulito
  // restando aperti, es. "Salva" senza uscire) — il conseguente popstate va
  // ignorato, non è un tentativo di uscita dell'utente.
  const consumandoFantasmaRef = useRef(false)

  // --- Bug Android: picker data nativo che chiude la modale (audit 2026-08,
  // vedi docs/audit-2026-08.md — causa isolata lì, corretta qui) ---
  // Il fantasma sopra si arma solo quando `dirty` diventa vero: se l'utente
  // apre il picker nativo della Data (primo campo di un form ancora
  // "pulito", es. Acconto) e lo dismette con il tasto Back fisico PRIMA di
  // selezionare una data — su alcuni dispositivi/versioni Android (Samsung
  // One UI, riportato) quel Back non resta confinato al picker ma si
  // propaga al browser come un vero back di pagina — non esiste ancora
  // alcun fantasma ad assorbirlo (dirty è ancora falso), quindi arriva come
  // navigazione reale e chiude l'intera modale. `fantasmaDaFocusRef`
  // distingue un fantasma armato per QUESTO motivo (focus su un campo
  // data/ora, non modifiche reali) da uno armato per dirty — necessario per
  // sapere come reagire quando viene consumato: nessun dialog (nessuna
  // modifica da confermare) e nessun ri-arm (un secondo Back deve poter
  // uscire davvero, a differenza del caso dirty che si ri-arma sempre).
  const fantasmaDaFocusRef = useRef(false)

  function registraGuardia(guardia: Guardia | null) {
    const eraSporco = guardiaRef.current !== null
    const oraSporco = guardia !== null
    guardiaRef.current = guardia
    if (!bloccaBackConModifiche) return

    if (!eraSporco && oraSporco) {
      // Se un fantasma "da focus" è già presente (l'utente stava
      // interagendo con un campo data/ora quando è scattato il dirty, es.
      // ha davvero scelto una data), non se ne pusha un secondo — si
      // "promuove" quello esistente a proteggere le modifiche reali, così
      // da qui in poi segue le regole del ramo dirty (ri-arm su ogni pop).
      if (fantasmaAttivoRef.current) {
        fantasmaDaFocusRef.current = false
      } else {
        fantasmaAttivoRef.current = true
        window.history.pushState({ __districoModaleFantasma: true }, '', window.location.href)
      }
    } else if (eraSporco && !oraSporco && fantasmaAttivoRef.current) {
      fantasmaAttivoRef.current = false
      consumandoFantasmaRef.current = true
      window.history.back()
    }
  }

  // Arma il fantasma al focus di un campo data/ora (potenziale apertura di
  // un picker nativo), lo rilascia al blur se non è mai stato consumato da
  // un Back fisico né promosso a "dirty" nel frattempo (altrimenti
  // resterebbe un fantasma orfano in history, che confonderebbe il conteggio
  // di chiudiConPulizia — go(-2) presume un solo fantasma). Scoped ai soli
  // input nativi con un picker a overlay (date/time/datetime-local): non i
  // <select> usati per gli slot orari, mai segnalati con lo stesso problema.
  function isCampoConPicker(el: EventTarget | null): el is HTMLInputElement {
    return el instanceof HTMLInputElement && ['date', 'time', 'datetime-local'].includes(el.type)
  }

  function onFocusBox(e: React.FocusEvent<HTMLDivElement>) {
    if (!bloccaBackConModifiche || !isCampoConPicker(e.target)) return
    if (!fantasmaAttivoRef.current) {
      fantasmaAttivoRef.current = true
      fantasmaDaFocusRef.current = true
      window.history.pushState({ __districoModaleFantasma: true }, '', window.location.href)
    }
    // Se un fantasma "da focus" è già attivo (spostamento diretto da un
    // campo data/ora a un altro, es. tap sul campo Fine subito dopo Inizio),
    // non ne serve un secondo: lo stesso resta valido, il rilascio rimandato
    // di onBlurBox sotto lo riconoscerà ancora "voluto" e non lo consumerà.
  }

  function onBlurBox(e: React.FocusEvent<HTMLDivElement>) {
    if (!bloccaBackConModifiche || !isCampoConPicker(e.target)) return
    // Non rilasciare subito: se questo blur è seguito a ruota da un focus su
    // un ALTRO campo data/ora (tap diretto da un campo all'altro, focus/blur
    // sono sincroni in sequenza mentre history.back() è asincrono sotto il
    // cofano) vogliamo mantenere lo stesso fantasma invece di rilasciarlo e
    // riarmarne subito un secondo — rischio concreto di corsa tra la back()
    // in sospeso e una pushState eseguita nel frattempo. Rimandata a un
    // microtask, quando l'eventuale nuovo focus si è già stabilizzato.
    queueMicrotask(() => {
      if (isCampoConPicker(document.activeElement)) return
      if (fantasmaAttivoRef.current && fantasmaDaFocusRef.current) {
        fantasmaAttivoRef.current = false
        fantasmaDaFocusRef.current = false
        consumandoFantasmaRef.current = true
        window.history.back()
      }
    })
  }

  // Chiusura "vera" unificata: se un fantasma è ancora sulla history (mai
  // consumato da un back fisico, es. chiusura via X/backdrop/Esc/dialog con
  // guardia ancora intatta), due passi indietro in un colpo solo; altrimenti
  // il solo onChiudi del chiamante (router.back(), invariato). Usata sia dal
  // ramo "nessuna guardia" di richiediChiusura sia come onChiudi esposto ai
  // discendenti via Context — un solo punto che sa come "ripulire" il
  // fantasma prima di uscire davvero.
  function chiudiConPulizia() {
    if (bloccaBackConModifiche && fantasmaAttivoRef.current) {
      fantasmaAttivoRef.current = false
      window.history.go(-2)
      return
    }
    onChiudi()
  }

  function richiediChiusura() {
    if (guardiaRef.current) guardiaRef.current()
    else chiudiConPulizia()
  }

  // "Latest ref": aggiornata in un effect dopo ogni render (mai durante il
  // render stesso — il linting di questo progetto, react-hooks/refs, lo
  // vieta esplicitamente), letta dai listener Esc/popstate sotto. Gli
  // effetti di mount/unmount dei listener dipendono solo da `aperto`, non
  // devono ri-registrarsi ad ogni render — ma devono comunque invocare
  // sempre la richiediChiusura più recente (che chiude sulla guardia/
  // onChiudi correnti), non quella catturata al momento del mount.
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

  // Listener popstate dedicato al tasto Back fisico — separato dal keydown
  // Esc sopra perché deve poter distinguere il pop "fantasma" (silenzioso,
  // nostro) da un vero tentativo dell'utente, e perché la sua stessa
  // esistenza è condizionata a bloccaBackConModifiche (nessun listener
  // aggiuntivo per "Aggiungi attività" o altri usi di Modal).
  useEffect(() => {
    if (!aperto || !bloccaBackConModifiche) return

    function onPopState() {
      if (consumandoFantasmaRef.current) {
        // Pop auto-generato dalla pulizia in registraGuardia (dirty tornato
        // pulito restando aperti) — nessun dialog, non è l'utente.
        consumandoFantasmaRef.current = false
        return
      }
      if (guardiaRef.current) {
        // Il fantasma è stato appena consumato da QUESTO pop fisico: la
        // Modal resta montata (stessa URL del fantasma), lo stato del form
        // è intatto. Ri-armato SUBITO, prima ancora di sapere cosa deciderà
        // l'utente nel dialog: se sceglie di restare (Annulla, stato locale
        // interno al satellite — Modal non ne viene mai a conoscenza), un
        // secondo Back deve trovare di nuovo un fantasma pronto ad
        // assorbirlo, non passare "a vuoto" dritto alla navigazione reale.
        // Se invece l'utente conferma l'uscita, chiudiConPulizia() lo
        // consuma lui con go(-2) — coerente in entrambi i casi.
        window.history.pushState({ __districoModaleFantasma: true }, '', window.location.href)
        fantasmaAttivoRef.current = true
        guardiaRef.current()
        return
      }
      if (fantasmaDaFocusRef.current) {
        // Bug Android picker data (vedi commento su fantasmaDaFocusRef più
        // sopra): il fantasma "da focus" appena consumato aveva esattamente
        // la stessa URL della modale — il pop non ha quindi causato alcuna
        // navigazione visibile, l'ha solo assorbito. Nessun dialog (nessuna
        // modifica reale da confermare, dirty è falso) e nessun ri-arm (a
        // differenza del ramo dirty sopra): un secondo Back dell'utente deve
        // poter uscire davvero, non restare intrappolato mentre il campo
        // data ha ancora il focus.
        fantasmaAttivoRef.current = false
        fantasmaDaFocusRef.current = false
        return
      }
      // else: nessuna guardia attiva — non c'era alcun fantasma da
      // consumare (mai pushato), quindi questo è un back reale e Next lo
      // gestisce da sé smontando questa route/Modal normalmente.
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [aperto, bloccaBackConModifiche])

  if (!aperto) return null

  return createPortal(
    <ModalContesto.Provider
      value={{ onChiudi: chiudiConPulizia, registraGuardia }}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
        <div className="fixed inset-0 bg-black/40" onClick={richiediChiusura} aria-hidden="true" />

        {/* Allineamento dimensioni/margini alla Modal di test (2026-08-11,
            vedi CLAUDE.md — verifica e allineamento modali satellite):
            componente/wrapper condiviso da tutti gli 8 satelliti reali, ora
            sulla stessa identica classe della Modal di test invece di un
            pattern divergente (prima: bordo a bordo su mobile, max-w-lg/
            max-h-[85vh] su desktop).

            Mobile: `fixed inset-5` — margine assoluto di 20px su tutti e 4 i
            lati (1.25rem esatti in Tailwind), fisso indipendentemente dalla
            dimensione dello schermo. `fixed` toglie il box dal flusso, quindi
            il centraggio flex del contenitore genitore (`items-center
            justify-center`) non lo riguarda più su mobile — stesso principio
            di modal-test.tsx. Essendo a pixel fissi (non `vh`), sidesteppa
            da solo il bug iOS Safari `vh`-vs-viewport-massimo che il vecchio
            `max-h-[92vh]`/`dvh` risolveva (vedi docs/audit-ios.md §7, che
            aveva già notato come modal-test.tsx non fosse esposto a quel
            bug proprio per questo) — `useAltezzaMassimaMobile()` sopra resta
            comunque come rete di sicurezza per il solo caso tastiera
            virtuale (che i pixel fissi di `inset-5` da soli non coprono).

            Desktop (sm:): torna al centraggio flex normale
            (`sm:relative sm:inset-auto`), `sm:max-w-[640px]`/`sm:max-h-[80vh]`
            — stessi valori esatti della Modal di test (non più `max-w-lg`/
            `85vh`), scelti lì "a metà del range 600-700px indicato" più
            un'altezza in vh coerente (nessun bug vh sul desktop, dove il
            problema del toolbar collassabile non esiste).

            `rounded-2xl` non più condizionato a `sm:`: la Modal di test è
            arrotondata anche su mobile (il vecchio bordo-a-bordo non lo era,
            essendo `w-full` senza margine). */}
        <div
          className="fixed inset-5 flex flex-col overflow-hidden rounded-2xl bg-white sm:relative sm:inset-auto sm:w-full sm:max-w-[640px] sm:max-h-[80vh]"
          style={altezzaMassimaMobile !== undefined ? { maxHeight: altezzaMassimaMobile } : undefined}
          onFocus={onFocusBox}
          onBlur={onBlurBox}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{titolo}</p>
            <button
              type="button"
              onClick={richiediChiusura}
              aria-label="Chiudi"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <IconaChiudi className="h-5 w-5" />
            </button>
          </div>

          <div className="grow overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </div>
    </ModalContesto.Provider>,
    document.body,
  )
}
