import Link from 'next/link'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'
import { CTA_LANDING_CLASSI } from '@/lib/landing/cta'

// Sezione 10 — CTA finale (2026-08-19, vedi CLAUDE.md): stesso sfondo scuro
// della sezione "Il caos" (unico altro punto della pagina a usarlo) — non
// casuale, chiude il cerchio narrativo aperto lì: dal caos iniziale a un
// invito diretto a lasciarlo alle spalle. Bottone allineato allo stesso
// azzurro delle altre CTA (era bianco fino alla sessione "colore CTA",
// 2026-08-19) — verificato che bg-sky-500 si distingua bene anche su
// questo sfondo scuro (~6.4:1 contrasto bottone/sfondo pagina, oltre alla
// soglia 3:1 richiesta per i componenti non testuali).
export function LandingCtaFinale() {
  return (
    <section className="bg-gray-900 py-16 sm:py-24">
      <div className={`${CONTENITORE_STRETTO} px-4 text-center`}>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Il prossimo lavoro può iniziare già in ordine</h2>
        <p className="mt-4 text-gray-400">60 giorni di prova gratuita, nessun pagamento richiesto per iniziare.</p>
        <Link
          href="/registrazione"
          className={`mt-8 inline-block rounded-lg px-6 py-3 text-base font-semibold ${CTA_LANDING_CLASSI}`}
        >
          Inizia la prova gratuita
        </Link>
      </div>
    </section>
  )
}
