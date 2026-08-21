import Link from 'next/link'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Sezione unica della landing in modalità "coming soon" (2026-08-19 sera,
// vedi CLAUDE.md e lib/landing/coming-soon.ts). Immagine di sfondo a piena
// altezza/larghezza viewport, con overlay scuro per la leggibilità del
// testo.
//
// Hero responsive desktop/mobile (2026-08-21): due varianti dedicate,
// servite via <picture> — desktop.webp (16:9, 5 artigiani) da 640px in su,
// mobile.webp (9:16, 3 artigiani, zona cielo lasciata pulita apposta per il
// testo) sotto. Breakpoint 640px scelto perché è già lo standard "sm:" di
// Tailwind usato in tutto il resto dell'app per lo switch mobile/desktop
// (stesso breakpoint della Modal condivisa e della griglia icone di
// "Aggiungi attività", vedi CLAUDE.md 19/8). mobile.webp è anche l'<img>
// di fallback (browser senza supporto <picture>/media, o viewport sotto i
// 640px) — desktop.webp sostituisce via <source> sopra quella soglia.
// mobile.jpg originale (3,5MB) convertito e compresso in webp (~150KB,
// paragonabile a desktop.webp) — pesare 3,5MB su una connessione mobile
// sarebbe stato sproporzionato per una sola immagine hero.
//
// Posizionamento testo (2026-08-21, corregge la sessione precedente): in
// entrambe le foto il gruppo di persone occupa la fascia centrale/bassa,
// la zona di cielo "pulita" pensata per il testo è in alto — il blocco
// titolo/payoff/"Coming soon" era invece centrato nel viewport (flex
// items-center), finendo sovrapposto alle persone. Spostato in alto
// (position assoluta, offset in svh anziché un padding dentro un flex
// centrato, indipendente dall'altezza reale del contenuto testo) — offset
// diversi per mobile/desktop (stesso breakpoint sm: del resto della
// sezione) perché la proporzione della zona di cielo pulita differisce tra
// le due foto (verticale 9:16 su mobile ha una fascia di cielo/architettura
// più alta prima delle teste rispetto all'orizzontale 16:9 desktop).
//
// Overlay/contrasto — non solo bg-black/50 uniforme (insufficiente da solo
// sulla zona di cielo, molto chiara, per portare testo bianco sopra soglia
// WCAG AA): gradiente verticale nero→trasparente esteso ora fin oltre la
// nuova posizione del testo (non solo dietro l'header come nella versione
// precedente) più text-shadow su ogni riga di testo — margine di sicurezza
// aggiuntivo, robusto anche se il soggetto dietro al testo varia
// leggermente tra viewport diversi.
export function LandingComingSoon() {
  return (
    <section className="relative flex min-h-[100svh] w-full items-start justify-center overflow-hidden bg-gray-900">
      <picture>
        <source media="(min-width: 640px)" srcSet="/landing/hero/desktop.webp" />
        <img src="/landing/hero/mobile.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-0 h-[46svh] bg-gradient-to-b from-black/65 to-transparent sm:h-[34svh]"
        aria-hidden="true"
      />

      <header className="absolute inset-x-0 top-0 z-10">
        <div className={`${CONTENITORE_LARGO} flex items-center justify-between px-4 py-5 sm:py-6`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/districo_logo.svg"
            alt="Districo"
            className="h-8 w-auto brightness-0 invert drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] sm:h-9"
          />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] transition-colors hover:bg-white/10"
          >
            Accedi
          </Link>
        </div>
      </header>

      <div
        className={`${CONTENITORE_LARGO} relative z-10 px-4 pt-[19svh] text-center sm:pt-[13svh]`}
      >
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-4xl md:text-5xl">
          La velocità misura quanto ci metti. La puntualità, quanto sei affidabile.
        </h1>
        <p className="mt-5 font-serif text-lg text-white/90 italic drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:text-xl">
          l&apos;assistente per l&apos;artigiano
        </p>
        <p className="mt-3 text-sm font-medium tracking-wide text-white/80 uppercase drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
          Coming soon
        </p>
      </div>
    </section>
  )
}
