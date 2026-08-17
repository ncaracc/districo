import Link from 'next/link'
import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { CTA_LANDING_CLASSI } from '@/lib/landing/cta'

// Sezione 8 — "Pricing" (2026-08-19, vedi CLAUDE.md): trial 60 giorni, poi
// €5/mese o €48/anno; beta tester 6 mesi gratis + funzionalità segnalate
// gratis per sempre. Nessuna integrazione Stripe reale in questa sessione
// (vedi "Prossimi passi aperti", CLAUDE.md: non pianificata) — i due piani
// portano entrambi a /registrazione, nessun pagamento raccolto qui, testo
// tenuto onesto di conseguenza ("nessun pagamento richiesto per iniziare",
// non "nessuna carta richiesta": non c'è alcuna raccolta di pagamento da
// evitare, il punto è che oggi non esiste affatto).
const PIANI = [
  {
    nome: 'Mensile',
    prezzo: '€5',
    periodo: '/mese',
    nota: 'dopo i 60 giorni di prova',
    evidenziato: false,
  },
  {
    nome: 'Annuale',
    prezzo: '€48',
    periodo: '/anno',
    nota: 'equivalente a €4/mese',
    evidenziato: true,
  },
]

export function LandingPricing() {
  return (
    <section id="prezzi" className="scroll-mt-24 bg-gray-50 py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Prezzi semplici, come tutto il resto</h2>
          <p className="mt-4 text-gray-600">60 giorni di prova gratuita su tutte le funzioni. Poi scegli come pagare, se decidi di restare.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          {PIANI.map((p) => (
            <div
              key={p.nome}
              className={`rounded-2xl border p-8 text-center ${
                p.evidenziato ? 'border-gray-900 bg-white shadow-sm' : 'border-gray-200 bg-white'
              }`}
            >
              {p.evidenziato && (
                <span className="inline-block rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
                  Conviene di più
                </span>
              )}
              <p className="mt-3 text-sm font-medium text-gray-500">{p.nome}</p>
              <p className="mt-2">
                <span className="text-4xl font-bold text-gray-900">{p.prezzo}</span>
                <span className="text-gray-500">{p.periodo}</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">{p.nota}</p>
              <Link
                href="/registrazione"
                className={`mt-6 block w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${CTA_LANDING_CLASSI}`}
              >
                Inizia la prova gratuita
              </Link>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-gray-900">Sei un beta tester?</p>
          <p className="mt-1 text-sm text-gray-600">
            6 mesi di accesso completo gratuito, poi le funzionalità nate da una tua segnalazione restano gratis per te
            per sempre.
          </p>
          <a href="#beta" className="mt-3 inline-block text-sm font-medium text-gray-900 underline underline-offset-2">
            Scopri il programma beta
          </a>
        </div>
      </div>
    </section>
  )
}
