import Link from 'next/link'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Sezione unica della landing in modalità "coming soon" (2026-08-19 sera,
// vedi CLAUDE.md e lib/landing/coming-soon.ts). Immagine di sfondo a piena
// altezza/larghezza viewport (public/landing/hero/HeroCover.webp) con un
// overlay scuro semitrasparente per garantire la leggibilità del testo — i
// soggetti della foto occupano la fascia centrale/bassa, il testo resta
// quindi nella metà superiore.
//
// Header ridotto sovrapposto in overlay trasparente (nessuna barra di
// sfondo propria, si appoggia direttamente sullo stesso overlay scuro
// dell'immagine): logo in versione chiara (filtro CSS sul file esistente,
// nessun nuovo asset — lo stesso principio già in uso altrove nel progetto
// per non introdurre varianti duplicate di un asset quando basta un
// filtro) + solo "Accedi" (nessun "Prova gratis"/altra CTA, come da
// richiesta esplicita — non c'è ancora nulla da vendere in questa fase).
//
// Overlay/contrasto — valutati sulla foto reale (5 artigiani in Piazza
// Maggiore/Bologna, cielo chiaro in alto, facciate calde nella fascia
// centrale, soggetti fino al bordo inferiore): un overlay scuro uniforme
// bg-black/50 da solo non basta a portare testo bianco sopra soglia WCAG
// AA nella zona del cielo (molto chiara) — soprattutto rilevante per
// l'header, che su viewport molto alti (mobile, object-cover ritaglia in
// larghezza non in altezza) ricade proprio lì. Aggiunto quindi un
// gradiente extra dietro l'header (nero→trasparente, primi ~30svh) più un
// text-shadow su titolo/payoff/header — non un'alternativa all'overlay ma
// un margine di sicurezza aggiuntivo, robusto anche se il soggetto dietro
// al testo varia leggermente tra viewport diversi.
export function LandingComingSoon() {
  return (
    <section className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-gray-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/hero/HeroCover.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-0 h-[30svh] bg-gradient-to-b from-black/60 to-transparent"
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

      <div className={`${CONTENITORE_LARGO} relative z-10 px-4 pt-20 pb-24 text-center sm:pt-16`}>
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
