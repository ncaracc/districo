import type { Metadata } from 'next'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingProblem } from '@/components/landing/landing-problem'
import { LandingAgitation } from '@/components/landing/landing-agitation'
import { LandingSolution } from '@/components/landing/landing-solution'
import { LandingTecnicoComeFunziona } from '@/components/landing/landing-tecnico-come-funziona'
import { LandingTecnicoFunzioniFase } from '@/components/landing/landing-tecnico-funzioni-fase'
import { LandingPricing } from '@/components/landing/landing-pricing'
import { LandingBeta } from '@/components/landing/landing-beta'
import { LandingFaq } from '@/components/landing/landing-faq'

// Landing page pubblica (2026-08-19, vedi CLAUDE.md) — route '/'. Un utente
// già loggato non raggiunge mai questo componente: il middleware lo
// reindirizza a /lavori PRIMA che la pagina venga renderizzata.
//
// Landing definitiva (2026-08-21, sostituisce la modalità "coming soon"
// temporanea del 19/8 — vedi CLAUDE.md): framework Problem/Agitation/
// Solution seguito da due sezioni tecniche, poi Pricing (prima CTA
// principale della pagina), Beta testing e FAQ (2026-08-21, sessioni
// successive). Le sezioni ancora non pronte del brief (Pratico, Recensioni,
// Footer dedicato) restano da costruire — struttura volutamente un
// componente per sezione, così aggiungerle in futuro significa importare
// un nuovo componente qui sotto, non toccare quelli già scritti. Nessun
// header
// sticky separato: l'header (logo + "Accedi") vive dentro LandingHero
// stessa, overlay trasparente sull'immagine — vedi il commento di testa di
// quel componente. Nessun selettore "che artigiano sei" (piano abbandonato,
// vedi CLAUDE.md): il messaggio è universale, non differenziato per
// mestiere — nessuno stato/contesto condiviso tra sezioni necessario.
// SiteFooter (app/layout.tsx) resta il footer di questa pagina come di ogni
// altra, invariato: la sezione "Footer" del brief, quando pronta, sarà
// valutata a parte.
export const metadata: Metadata = {
  title: "Districo — l'assistente per l'artigiano",
  description:
    'Districo segue ogni lavoro artigianale dal primo contatto alla consegna: sai sempre cosa manca, cosa è in ritardo, cosa devi ancora dire a ciascun cliente.',
}

export default function LandingPage() {
  return (
    <main>
      <LandingHero />
      <LandingProblem />
      <LandingAgitation />
      <LandingSolution />
      <LandingTecnicoComeFunziona />
      <LandingTecnicoFunzioniFase />
      <LandingPricing />
      <LandingBeta />
      <LandingFaq />
    </main>
  )
}
