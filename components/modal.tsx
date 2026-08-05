'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconaChiudi } from '@/components/icons'

type Guardia = () => void

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

  useEffect(() => {
    if (!ctx) return
    ctx.registraGuardia(dirty ? onTentativoChiusura : null)
    return () => ctx.registraGuardia(null)
  }, [ctx, dirty, onTentativoChiusura])

  return ctx?.onChiudi ?? (() => {})
}

// Modale generica riusata per la vista/modifica di un satellite (vedi
// lavoro-satelliti-tabella.tsx): centrata verticalmente sia su mobile sia su
// desktop (fix 2026-08-06, vedi CLAUDE.md — prima del fix, su mobile restava
// ancorata al fondo schermo come un bottom-sheet, comportamento preesistente
// dal 31/7 mai notato finché la Modal aveva sempre altezza fissa; con
// max-h-[92vh] introdotto dallo Sprint UI-2 un form corto rendeva quel
// bottom-sheet visibile per la prima volta, con un vuoto sopra — l'utente ha
// confermato di preferire il centraggio uniforme, non di voler ripristinare
// il vecchio comportamento). Su mobile può comunque arrivare quasi a schermo
// intero per un form lungo (tetto 92vh, comodo per scrivere note lunghe con
// la tastiera aperta), su desktop resta più stretta (max-w-lg). Monta i
// figli così come sono — non introduce una modalità "sola lettura" propria,
// il componente satellite esistente resta l'unica fonte di verità su
// editabile/sola lettura in base al ruolo.
export function Modal({
  aperto,
  onChiudi,
  titolo,
  children,
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
}) {
  // Ref, non state: la guardia cambia spesso (ogni tasto digitato in un
  // campo del form aggiorna `dirty`) e non deve mai causare un re-render
  // della Modal stessa — viene solo letta al momento del tentativo di
  // chiusura (X/backdrop/Esc).
  const guardiaRef = useRef<Guardia | null>(null)

  function richiediChiusura() {
    if (guardiaRef.current) guardiaRef.current()
    else onChiudi()
  }

  // "Latest ref": aggiornata in un effect dopo ogni render (mai durante il
  // render stesso — il linting di questo progetto, react-hooks/refs, lo
  // vieta esplicitamente), letta dal listener Esc sotto. L'effetto di
  // mount/unmount del listener dipende solo da `aperto`, non deve
  // ri-registrarsi ad ogni render — ma deve comunque invocare sempre la
  // richiediChiusura più recente (che chiude sulla guardia/onChiudi
  // correnti), non quella catturata al momento del mount.
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
    <ModalContesto.Provider
      value={{ onChiudi, registraGuardia: (guardia) => { guardiaRef.current = guardia } }}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
        <div className="fixed inset-0 bg-black/40" onClick={richiediChiusura} aria-hidden="true" />

        {/* max-h, non h-: stesso principio già in uso da sempre su desktop
            (sm:max-h-[85vh]), esteso a mobile durante lo Sprint UI-2 (bottone
            Salva flottante, vedi CLAUDE.md) — con un'altezza fissa, un form
            corto (es. Appuntamento: Data+Descrizione) lasciava un vuoto sotto
            la barra Salva invece di restarle incollata (sticky non "aggancia"
            nulla se il contenuto non arriva a richiedere scroll). Con max-h
            la Modal si dimensiona sul contenuto fino al tetto del 92%
            viewport (ancora "full-screen" per un form lungo, come da intento
            originale del 31/7 — "comodo per scrivere note lunghe" — semplicemente
            non più forzato anche quando il contenuto è breve). */}
        <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-white sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:rounded-2xl">
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
