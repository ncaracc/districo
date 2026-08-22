import { RichiediPostoButton } from '@/components/beta/richiedi-posto-button'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Mini-sito beta (2026-08-22, vedi CLAUDE.md) — mostrato al posto del
// forum su /beta per chi non ha ancora `beta_tester=true`. Copy ripresa
// dalla Sezione 8 della landing (`components/landing/landing-beta.tsx`,
// stesso tono/testo, "Districo è ancora giovane...") — qui però il
// bottone scrive davvero una richiesta in DB invece di aprire un
// `mailto:`, e il conteggio posti è reale (non un testo statico).
export function MiniSitoBeta({
  disponibili,
  totali,
  richiestaBetaAt,
}: {
  disponibili: number
  totali: number
  richiestaBetaAt: string | null
}) {
  const giaRichiesto = !!richiestaBetaAt
  const postiEsauriti = disponibili <= 0

  return (
    <div className={CONTENITORE_STRETTO}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Beta testing — posti limitati</h1>
        <p className="mt-4 text-gray-700">
          Districo è ancora giovane, e voglio seguire da vicino chi lo prova per primo. Per questo il programma beta
          è aperto a un numero ristretto di artigiani.
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

        <p className="mt-8 text-sm font-medium text-gray-900">
          {disponibili} posti su {totali} disponibili
        </p>

        <div className="mt-4 flex justify-center">
          {giaRichiesto ? (
            <p className="text-sm text-gray-500">Richiesta inviata, ti risponderemo appena possibile.</p>
          ) : postiEsauriti ? (
            <p className="max-w-md text-sm italic text-gray-500">
              I posti sono al momento esauriti. Il programma potrebbe riaprire più avanti con una nuova tranche.
            </p>
          ) : (
            <RichiediPostoButton />
          )}
        </div>
      </div>
    </div>
  )
}
