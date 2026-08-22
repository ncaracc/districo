// Sezione 1 — Hero (2026-08-21, landing definitiva, vedi CLAUDE.md).
// Riusa esattamente il markup/immagine/posizionamento testo della Hero
// costruita per la modalità "coming soon" (2026-08-19/21) — <picture>
// responsive desktop/mobile, testo overlay ancorato sulla fascia di cielo
// pulita, header trasparente autonomo (logo + "Accedi") sovrapposto
// all'immagine. Unica differenza: rimossa la riga "Coming soon" (il resto
// del copy — headline e payoff — era già lo stesso testo definitivo
// richiesto per questa sezione, nessuna riscrittura necessaria). Nessuna
// CTA principale qui (arriverà con la sezione Commerciale, non ancora
// pronta) — "Accedi" resta l'unico link, esattamente dove già posizionato.
//
// Nessun header sticky separato sopra questa sezione: l'header vive dentro
// l'Hero stessa (overlay trasparente sull'immagine) — aggiungerne un
// secondo sopra duplicherebbe logo/login. Le sezioni successive non hanno
// quindi un logo/accesso visibile finché non si torna in cima: accettato,
// coerente con l'istruzione esplicita di riusare la Hero così com'è.
import Link from 'next/link'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

export function LandingHero() {
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

      {/* Bug reale scoperto il 2026-08-22 sera (segnalato dall'utente: "vedo
          la scritta [Accedi] ma non posso cliccarci", non un problema
          estetico): questo div NON è `absolute` (resta nel flusso flex
          della section, `items-start`) — il suo box, padding-top incluso
          (19svh/13svh, ben più alto dei ~64px dell'header), parte dalla
          stessa y=0 dell'header. Stesso z-index (10) dell'header ma
          successivo nel DOM: a parità di z-index vince l'ordine DOM, quindi
          quest'area di padding — visivamente vuota, nessun figlio la
          occupa — intercettava comunque i click destinati all'header
          sottostante (verificato con `elementFromPoint`: restituiva questo
          div, non il link). `pointer-events-none` qui + `pointer-events-auto`
          sui due figli (h1/p, mai interattivi di per sé, ma servono comunque
          a permettere selezione testo/eventuali link futuri al loro interno)
          risolve senza toccare layout/z-index/ordine DOM. */}
      <div
        className={`${CONTENITORE_LARGO} relative z-10 px-4 pt-[19svh] text-center sm:pt-[13svh] pointer-events-none`}
      >
        <h1 className="pointer-events-auto mx-auto max-w-3xl text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-4xl md:text-5xl">
          La velocità misura quanto ci metti. La puntualità, quanto sei affidabile.
        </h1>
        <p className="pointer-events-auto mt-5 font-serif text-lg text-white/90 italic drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:text-xl">
          l&apos;assistente per l&apos;artigiano
        </p>
      </div>
    </section>
  )
}
