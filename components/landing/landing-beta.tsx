import { CONTENITORE_STRETTO } from '@/lib/layout-container'
import { CTA_SECONDARIA_CLASSI } from '@/lib/landing/cta'
import { BETA_PROGRAMMA_APERTO } from '@/lib/landing/beta'

// Sezione 8 — "Beta testing" (2026-08-21, vedi CLAUDE.md). Contenitore
// stretto (CONTENITORE_STRETTO), come l'Agitation — testo denso, colonna
// singola. CTA secondaria (contorno azzurro, vedi lib/landing/cta.ts) verso
// `mailto:info@districo.it` (stesso indirizzo già in uso nel Footer,
// components/site-footer.tsx) — nessun form/backend dedicato in questa
// sessione, coerente con "non ancora pronta" per la gestione strutturata
// delle richieste beta.
//
// Flag `BETA_PROGRAMMA_APERTO` (lib/landing/beta.ts): quando `false`,
// nasconde titolo/testo/elenco/CTA e mostra SOLO la nota conclusiva — quella
// nota resta invece sempre visibile in entrambi i casi, come richiesto
// esplicitamente ("questa riga deve restare visibile e sostituire l'intera
// sezione").
export function LandingBeta() {
  return (
    <section id="beta" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_STRETTO} px-4 text-center`}>
        {BETA_PROGRAMMA_APERTO && (
          <>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Beta testing — posti limitati</h2>
            <p className="mt-4 text-lg text-gray-700">
              Districo è ancora giovane, e voglio seguire da vicino chi lo prova per primo. Per questo il programma
              beta è aperto a un numero ristretto di artigiani.
            </p>

            <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-gray-700">
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>
                  <strong className="font-semibold text-gray-900">6 mesi di accesso gratuito.</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>
                  Se Districo si arricchisce di una nuova funzionalità, segnalata da te, avrai l&apos;accesso{' '}
                  <strong className="font-semibold text-gray-900">gratis per sempre</strong>.
                </span>
              </li>
            </ul>

            <p className="mt-6 text-gray-700">Le tue segnalazioni ci aiutano a crescere.</p>

            <div className="mt-8 flex justify-center">
              <a href="mailto:info@districo.it?subject=Candidatura%20beta%20testing" className={CTA_SECONDARIA_CLASSI}>
                Richiedi un posto
              </a>
            </div>
          </>
        )}

        <p className={`text-sm text-gray-500 italic ${BETA_PROGRAMMA_APERTO ? 'mt-6' : ''}`}>
          I posti sono limitati. Se il programma risulta chiuso, significa che li abbiamo esauriti — ma potremmo
          riaprirlo più avanti con una nuova tranche.
        </p>
      </div>
    </section>
  )
}
