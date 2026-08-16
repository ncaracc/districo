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
  altezzaAdattiva = false,
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
  // Altezza adattiva al contenuto su mobile (2026-08-19, vedi CLAUDE.md —
  // "altezza modale Aggiungi attività"): opt-in, default false — tutte le
  // modali satellite restano sull'altezza standard di sempre (`inset-5`,
  // occupa quasi tutto lo schermo indipendentemente dal contenuto). Solo
  // "Aggiungi attività" (griglia di icone, molto più corta del contenuto
  // tipico di un satellite) la passa `true`. Su desktop (`sm:`) NESSUNA
  // differenza rispetto al comportamento standard: verificato che lì il box
  // è già "adattivo" per costruzione — `sm:relative` (non `fixed`/`inset-*`)
  // lo lascia nel flusso normale del flex del backdrop, la sua altezza è
  // quindi già determinata dal contenuto con `sm:max-h-[80vh]` come solo
  // tetto, mai un'altezza forzata — il problema segnalato è specificamente
  // dell'`inset-5` di mobile, che fissa CONTEMPORANEAMENTE top e bottom
  // (quindi l'altezza) indipendentemente da quanto contenuto c'è.
  altezzaAdattiva?: boolean
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
  // Quando serve una guardia (dirty vero, o un campo data/ora ha il focus —
  // vedi sotto), pushiamo una voce di history duplicata con la STESSA URL
  // corrente (`fantasmaAttivoRef`). Un primo tasto Back fisico pop-a quella
  // voce senza alcun cambio di URL/route (Next non ha nulla da fare, la vede
  // identica) — il nostro listener popstate lo intercetta e mostra il
  // dialog di conferma esistente (solo se dirty è vero), la Modal resta
  // montata con tutto lo stato in corso intatto (mai smontata, a differenza
  // di un tentativo "preveni poi ripristina" che arriverebbe sempre troppo
  // tardi). Se l'utente conferma di uscire, un `history.go(-2)` (fantasma +
  // voce reale) porta via davvero in un colpo solo.
  const fantasmaAttivoRef = useRef(false)
  // true solo mentre un NOSTRO history.back() di rilascio è "in volo" (dal
  // momento in cui lo chiamiamo al popstate che lo conferma) — il
  // conseguente popstate va riconosciuto come nostro, non come un tentativo
  // di uscita dell'utente.
  const consumandoFantasmaRef = useRef(false)

  // --- Bug Android: picker data nativo che chiude la modale (audit 2026-08,
  // vedi docs/audit-2026-08.md) — il fantasma sopra si armava solo quando
  // `dirty` diventava vero: se l'utente apriva il picker nativo della Data
  // (primo campo di un form ancora "pulito", es. Acconto) e lo dismetteva
  // con il tasto Back fisico PRIMA di selezionare una data — su alcuni
  // dispositivi/versioni Android (Samsung One UI, riportato) quel Back non
  // restava confinato al picker ma si propagava al browser come un vero
  // back di pagina — non esisteva ancora alcun fantasma ad assorbirlo,
  // quindi arrivava come navigazione reale e chiudeva l'intera modale.
  // `pickerApertoRef` traccia se un campo con un picker nativo ha il focus
  // in questo momento: un fantasma va tenuto attivo anche solo per questo,
  // non solo per `dirty` vero (vedi `vogliamoFantasma()`/`sincronizzaFantasma()`).
  const pickerApertoRef = useRef(false)

  // Vogliamo un fantasma attivo se c'è una modifica non salvata (guardia
  // presente) OPPURE se un campo con un picker nativo ha il focus in questo
  // momento (potenziale picker aperto, vedi sopra).
  function vogliamoFantasma() {
    return guardiaRef.current !== null || pickerApertoRef.current
  }

  // Riconcilia lo stato desiderato (vogliamoFantasma()) con quello che
  // crediamo reale (fantasmaAttivoRef) — chiamata ogni volta che uno dei due
  // input di vogliamoFantasma() può essere cambiato (guardiaRef via
  // registraGuardia, pickerApertoRef via onFocusBox/onBlurBox) E dopo la
  // conferma di un rilascio (vedi onPopState).
  //
  // Bug trovato in audit successivo (vedi CLAUDE.md/docs/audit-2026-08.md,
  // "Briefing — chiusura modale al salvataggio della Descrizione"): un
  // `history.back()` di rilascio è ASINCRONO sotto il cofano — se un nuovo
  // "vogliamo" scattava PRIMA che quel back() completasse davvero (es.
  // un'altra modifica subito dopo un Salva riuscito, non necessariamente sullo
  // stesso campo), la pushState veniva comunque eseguita SUBITO dalla
  // posizione ancora corrente; il back() tardivo, eseguendo poi per davvero,
  // consumava allora IL FANTASMA SBAGLIATO — quello appena pushato per la
  // modifica reale, non quello obsoleto che dovevamo rilasciare noi — con la
  // modale che si chiudeva in modo silenzioso e imprevedibile (esattamente
  // come il bug Android, stessa famiglia di sintomi, causa diversa: lì la
  // corsa era tra un back() esterno/nativo e una pushState nostra, qui è tra
  // un back() NOSTRO di rilascio e una pushState nostra successiva).
  //
  // Fix strutturale: mentre un rilascio è "in volo" (consumandoFantasmaRef),
  // non si pusha mai un nuovo fantasma — ci si limita ad aspettare il
  // popstate di conferma, e si ri-sincronizza da lì (onPopState sotto),
  // quando la posizione in history è quella vera. Nessuna finestra di corsa
  // residua, indipendentemente da QUANTO tempo passa tra il rilascio e la
  // richiesta successiva (a differenza di un semplice queueMicrotask, che
  // avrebbe coperto solo eventi sincroni nello stesso turno).
  function sincronizzaFantasma() {
    if (!bloccaBackConModifiche || consumandoFantasmaRef.current) return

    const vogliamo = vogliamoFantasma()
    if (vogliamo && !fantasmaAttivoRef.current) {
      fantasmaAttivoRef.current = true
      window.history.pushState({ __districoModaleFantasma: true }, '', window.location.href)
    } else if (!vogliamo && fantasmaAttivoRef.current) {
      fantasmaAttivoRef.current = false
      consumandoFantasmaRef.current = true
      window.history.back()
    }
  }

  function registraGuardia(guardia: Guardia | null) {
    guardiaRef.current = guardia
    sincronizzaFantasma()
  }

  // Campi con un picker nativo a overlay (date/time/datetime-local): non i
  // <select> usati per gli slot orari, mai segnalati con lo stesso problema.
  function isCampoConPicker(el: EventTarget | null): el is HTMLInputElement {
    return el instanceof HTMLInputElement && ['date', 'time', 'datetime-local'].includes(el.type)
  }

  function onFocusBox(e: React.FocusEvent<HTMLDivElement>) {
    if (!isCampoConPicker(e.target)) return
    pickerApertoRef.current = true
    sincronizzaFantasma()
  }

  function onBlurBox(e: React.FocusEvent<HTMLDivElement>) {
    if (!isCampoConPicker(e.target)) return
    pickerApertoRef.current = false
    // Nessun queueMicrotask qui (a differenza di una versione precedente):
    // il tap diretto da un campo data/ora a un altro (blur+focus sincroni
    // in sequenza) è già gestito correttamente da sincronizzaFantasma()
    // stessa — onFocusBox del campo successivo, eseguito subito dopo
    // sincronicamente, trova il rilascio appena avviato "in volo"
    // (consumandoFantasmaRef) e non fa nulla; la ri-sincronizzazione vera
    // avviene quando il popstate di conferma arriva (onPopState sotto),
    // trovando pickerApertoRef già tornato vero — nessun fantasma orfano,
    // nessun doppio rilascio, indipendentemente dal timing esatto.
    sincronizzaFantasma()
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

  // Stesso pattern "latest ref" di richiediChiusuraRef sopra, per lo stesso
  // motivo: il listener popstate sotto dipende solo da `[aperto,
  // bloccaBackConModifiche]`, non deve ri-registrarsi ad ogni render, ma
  // deve comunque poter richiamare una sincronizzaFantasma "fresca" (non
  // che il suo comportamento cambi mai in pratica — legge solo da ref e da
  // `bloccaBackConModifiche`, già nelle dipendenze dell'effect — ma
  // soddisfa comunque react-hooks/exhaustive-deps in modo corretto invece
  // di silenziarlo).
  const sincronizzaFantasmaRef = useRef(sincronizzaFantasma)
  useEffect(() => {
    sincronizzaFantasmaRef.current = sincronizzaFantasma
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
        // Il nostro back() di rilascio (da sincronizzaFantasma) è stato
        // confermato: la posizione in history ora è quella vera. Ri-
        // sincronizza da qui — se nel frattempo (durante l'attesa
        // asincrona) tornava a servire un fantasma (nuovo dirty, o un
        // campo data/ora ha ripreso il focus), pushane uno ora, senza
        // corse: è esattamente il fix del bug "chiusura al secondo
        // salvataggio" (vedi commento su sincronizzaFantasma più sopra).
        consumandoFantasmaRef.current = false
        sincronizzaFantasmaRef.current()
        return
      }
      if (!fantasmaAttivoRef.current) {
        // Nessun fantasma nostro da consumare: back reale, Next lo gestisce
        // da sé smontando questa route/Modal normalmente.
        return
      }
      // Da qui in poi: un pop ESTERNO (Back fisico dell'utente, o un
      // picker nativo Android che si propaga al browser) ha appena
      // consumato un fantasma che credevamo attivo.
      if (guardiaRef.current) {
        // Dirty reale: la Modal resta montata (stessa URL del fantasma),
        // lo stato del form è intatto. Ri-armato SUBITO, prima ancora di
        // sapere cosa deciderà l'utente nel dialog: se sceglie di restare
        // (Annulla, stato locale interno al satellite — Modal non ne viene
        // mai a conoscenza), un secondo Back deve trovare di nuovo un
        // fantasma pronto ad assorbirlo. Se invece conferma l'uscita,
        // chiudiConPulizia() lo consuma lui con go(-2) — coerente in
        // entrambi i casi.
        window.history.pushState({ __districoModaleFantasma: true }, '', window.location.href)
        fantasmaAttivoRef.current = true
        guardiaRef.current()
        return
      }
      // Non dirty: il fantasma era lì solo per un possibile picker aperto
      // (bug Android) — nessuna modifica reale da confermare, nessun
      // dialog, nessun ri-arm: un secondo Back dell'utente deve poter
      // uscire davvero, non restare intrappolato mentre il campo data ha
      // ancora il focus. Risincronizza solo lo stato (il pop l'ha già
      // consumato per davvero).
      fantasmaAttivoRef.current = false
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
          className={
            altezzaAdattiva
              ? // Adattiva su mobile (2026-08-19): stessa tecnica già in uso
                // per il desktop (`sm:relative`, mai `fixed`) — il box resta
                // nel flusso normale del flex del backdrop (`items-center
                // justify-center` sul contenitore sopra), quindi si centra
                // verticalmente da solo in base alla propria altezza reale,
                // niente `inset-*` che fissi top+bottom indipendentemente
                // dal contenuto. `w-[calc(100%-2.5rem)]`/`max-h-[calc(100%-
                // 2.5rem)]` replicano lo stesso budget di margine di
                // `inset-5` (20px+20px = 2.5rem) ma come tetto, non come
                // dimensione forzata — stessi identici margini laterali/
                // massimi visti finora, cambia solo che l'altezza reale può
                // essere inferiore al tetto quando il contenuto è corto.
                'relative w-[calc(100%-2.5rem)] max-h-[calc(100%-2.5rem)] flex flex-col overflow-hidden rounded-2xl bg-white sm:w-full sm:max-w-[640px] sm:max-h-[80vh]'
              : 'fixed inset-5 flex flex-col overflow-hidden rounded-2xl bg-white sm:relative sm:inset-auto sm:w-full sm:max-w-[640px] sm:max-h-[80vh]'
          }
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
