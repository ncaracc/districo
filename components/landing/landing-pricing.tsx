import Link from 'next/link'
import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { CTA_PRINCIPALE_CLASSI } from '@/lib/landing/cta'

// Sezione 7 — "Pricing" (2026-08-21, vedi CLAUDE.md): prima sezione
// "Commerciale" del brief, prima CTA principale della pagina (le sezioni
// precedenti non ne avevano una, come deciso esplicitamente nella sessione
// Hero del 19/8 — "arriverà con la sezione Commerciale"). CTA verso
// `/registrazione`, lo stesso e unico flusso di iscrizione esistente
// nell'app: nessuna raccolta carta reale implementata in questa sessione
// (fuori scope — è una pagina di landing/copy, non un'integrazione di
// pagamento, coerente con "Futuro: app a pagamento con Stripe" ancora non
// pianificato, vedi CLAUDE.md).
export function LandingPricing() {
  return (
    <section id="prezzi" className="scroll-mt-24 bg-gray-50 py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <p className="mx-auto max-w-2xl text-center text-lg text-gray-700">
          60 giorni per provare Districo, gratis. Alla registrazione scegli il piano che preferisci — mensile o
          annuale — e registri la carta, ma non ti addebitiamo nulla fino alla fine del trial. Qualche giorno prima
          della scadenza ti mandiamo una mail di promemoria: se nel frattempo cambi idea, puoi annullare in
          qualsiasi momento senza costi. Altrimenti, allo scadere dei 60 giorni parte l&apos;addebito del piano che
          hai scelto.
        </p>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Mensile</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              €5<span className="text-base font-medium text-gray-500">/mese</span>
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-500">Annuale</p>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              €48<span className="text-base font-medium text-gray-500">/anno</span>
            </p>
            <p className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              Risparmi rispetto al mensile
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-xl text-center text-sm text-gray-500">
          Hai scelto il piano mensile? Nella mail di promemoria ti mostriamo quanto risparmieresti passando
          all&apos;annuale — cambiare è immediato, in qualsiasi momento.
        </p>

        <div className="mt-10 flex justify-center">
          <Link href="/registrazione" className={CTA_PRINCIPALE_CLASSI}>
            Inizia la prova gratuita
          </Link>
        </div>
      </div>
    </section>
  )
}
