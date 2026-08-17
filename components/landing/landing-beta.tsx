import Link from 'next/link'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'
import { CTA_LANDING_CLASSI } from '@/lib/landing/cta'

// Sezione 7 — "Beta testing" (2026-08-19, vedi CLAUDE.md). Nessun form di
// candidatura dedicato (nessun backend per raccoglierlo in questa sessione)
// — CTA verso l'email di contatto già in uso in tutta l'app (SiteFooter,
// mailto:info@districo.it), coerente con l'unico canale di contatto già
// esistente invece di introdurne uno nuovo. I due benefici (6 mesi gratis +
// funzionalità segnalate gratis per sempre) sono lo stesso testo ripreso
// anche nella sezione Pricing subito sotto — nessuna incoerenza tra le due.
export function LandingBeta() {
  return (
    <section id="beta" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_STRETTO} px-4 text-center`}>
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Diventa beta tester</h2>
        <p className="mt-4 text-gray-600">
          Districo è ancora giovane: le segnalazioni di chi lo usa ogni giorno in cantiere valgono più di qualsiasi
          nostra ipotesi. In cambio del tuo feedback:
        </p>

        <ul className="mx-auto mt-6 max-w-md space-y-3 text-left">
          <li className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gray-900" />
            <span className="text-sm text-gray-700">6 mesi di accesso completo gratuito, appena entri nel programma.</span>
          </li>
          <li className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gray-900" />
            <span className="text-sm text-gray-700">
              Ogni funzionalità nata da una tua segnalazione resta gratuita per te per sempre.
            </span>
          </li>
        </ul>

        <a
          href="mailto:info@districo.it?subject=Voglio%20essere%20beta%20tester%20di%20Districo"
          className={`mt-8 inline-block rounded-lg px-6 py-3 text-sm font-semibold ${CTA_LANDING_CLASSI}`}
        >
          Candidati come beta tester
        </a>
        <p className="mt-3 text-xs text-gray-400">
          Oppure inizia subito con la{' '}
          <Link href="/registrazione" className="underline underline-offset-2 hover:text-gray-600">
            prova gratuita di 60 giorni
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
