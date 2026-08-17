import type { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/landing-header'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingCaos } from '@/components/landing/landing-caos'
import { LandingFiloLogico } from '@/components/landing/landing-filo-logico'
import { LandingComeFunziona } from '@/components/landing/landing-come-funziona'
import { LandingFunzioniFase } from '@/components/landing/landing-funzioni-fase'
import { LandingPersonaggi } from '@/components/landing/landing-personaggi'
import { LandingBeta } from '@/components/landing/landing-beta'
import { LandingPricing } from '@/components/landing/landing-pricing'
import { LandingFaq } from '@/components/landing/landing-faq'
import { LandingCtaFinale } from '@/components/landing/landing-cta-finale'

// Landing page pubblica (2026-08-19, vedi CLAUDE.md) — sostituisce il
// redirect incondizionato a /lavori che occupava questa route (nessuna home
// pubblica esisteva prima d'ora, l'utente anonimo che visitava '/' veniva
// comunque intercettato prima da middleware.ts e rimbalzato su /login).
// Un utente già loggato non raggiunge mai questo componente: il middleware
// lo reindirizza a /lavori PRIMA che la pagina venga renderizzata (stesso
// redirect di sempre, invariato) — nessun controllo di sessione ripetuto
// qui.
//
// Header pubblico dedicato (LandingHeader) al posto dell'AppNav interno:
// l'AppNav si nasconde da solo su '/' per un anonimo (vedi PAGINE_PUBBLICHE
// in components/app-nav.tsx). Il Footer non ha invece bisogno di un
// componente dedicato ("Footer", sezione 11 del brief): SiteFooter è già
// renderizzato incondizionatamente da app/layout.tsx in fondo a ogni
// pagina, landing compresa — riusarlo qui sarebbe una duplicazione.
export const metadata: Metadata = {
  title: "Districo — l'assistente per l'artigiano",
  description:
    'Districo segue ogni lavoro artigianale dalla trattativa al montaggio: preventivi, misure, acquisti, cantiere, sempre chiaro cosa manca. Prova gratuita di 60 giorni.',
}

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingCaos />
        <LandingFiloLogico />
        <LandingComeFunziona />
        <LandingFunzioniFase />
        <LandingPersonaggi />
        <LandingBeta />
        <LandingPricing />
        <LandingFaq />
        <LandingCtaFinale />
      </main>
    </>
  )
}
