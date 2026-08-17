import Link from 'next/link'
import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { MESTIERI } from '@/lib/landing/mestieri'
import { CTA_LANDING_CLASSI } from '@/lib/landing/cta'

// Sezione 1 — Hero (2026-08-19, vedi CLAUDE.md). Solo testo + CTA, nessuna
// immagine: le illustrazioni fornite (caos/filo logico/personaggi) hanno
// già ciascuna la propria sezione dedicata più sotto, ripeterne una qui
// sopra sarebbe ridondante — l'hero lascia invece spazio alla striscia dei
// 5 mestieri, prima anticipazione visiva di "pensato per artigiani diversi"
// prima ancora di arrivare alla sezione "Il caos".
export function LandingHero() {
  return (
    <section id="top" className="border-b border-gray-100 bg-white pt-14 pb-16 sm:pt-20 sm:pb-24">
      <div className={`${CONTENITORE_LARGO} px-4 text-center`}>
        <p className="text-sm font-medium tracking-wide text-gray-500 uppercase">Per artigiani, non per un solo mestiere</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Un lavoro alla volta, dall&apos;inizio alla fine, senza perdere niente per strada
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          Districo segue ogni tuo lavoro dalla trattativa al montaggio: preventivi, misure, acquisti, cantiere. Sempre
          chiaro cosa è già fatto e cosa manca — mai un ordine imposto, solo la situazione reale sotto controllo.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registrazione"
            className={`w-full rounded-lg px-6 py-3 text-base font-semibold sm:w-auto ${CTA_LANDING_CLASSI}`}
          >
            Inizia la prova gratuita di 60 giorni
          </Link>
          <a
            href="#come-funziona"
            className="w-full rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            Vedi come funziona
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-400">Nessun pagamento richiesto per iniziare.</p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {MESTIERI.map((m) => (
            <span key={m.slug} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
              {m.label}
            </span>
          ))}
          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">e ogni altro mestiere</span>
        </div>
      </div>
    </section>
  )
}
