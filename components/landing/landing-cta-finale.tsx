import Link from 'next/link'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Sezione 10 — CTA finale (2026-08-19, vedi CLAUDE.md): stesso sfondo scuro
// della sezione "Il caos" (unico altro punto della pagina a usarlo) — non
// casuale, chiude il cerchio narrativo aperto lì: dal caos iniziale a un
// invito diretto a lasciarlo alle spalle.
export function LandingCtaFinale() {
  return (
    <section className="bg-gray-900 py-16 sm:py-24">
      <div className={`${CONTENITORE_STRETTO} px-4 text-center`}>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Il prossimo lavoro può iniziare già in ordine</h2>
        <p className="mt-4 text-gray-400">60 giorni di prova gratuita, nessun pagamento richiesto per iniziare.</p>
        <Link
          href="/registrazione"
          className="mt-8 inline-block rounded-lg bg-white px-6 py-3 text-base font-medium text-gray-900 transition-colors hover:bg-gray-100"
        >
          Inizia la prova gratuita
        </Link>
      </div>
    </section>
  )
}
