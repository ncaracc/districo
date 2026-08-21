import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { ICONA_ATTIVITA } from '@/components/icone-attivita'
import { LABEL_ATTIVITA, type ChiaveAttivita } from '@/lib/lavori/attivita-ordine'

// Sezione 6 — "Tecnico (Funzioni per fase)" (2026-08-21, vedi CLAUDE.md).
// Icone/etichette riusate esattamente da `icone-attivita.tsx`/
// `attivita-ordine.ts` (la mappatura icona↔tipo di Attività già in uso
// nella griglia "Aggiungi attività" dell'app, 2026-08-19) — nessuna nuova
// icona, nessun porting di icone Tabler reali (il progetto non le ha mai
// avute, vedi commento di testa di `icone-attivita.tsx`).
//
// Solo icona + nome, come richiesto esplicitamente (nessuna descrizione).
// Ordine e raggruppamento Trattativa/Esecuzione presi alla lettera dal
// brief di questa sessione, non da `ORDINE_ATTIVITA` (lib/lavori/
// attivita-ordine.ts): quell'ordine serve l'app operativa — qui la
// classificazione narrativa richiesta è diversa (es. Progetto raggruppato
// sotto "Esecuzione", non subito dopo Briefing) e va rispettata così com'è.
// Chiusura Lavoro non compare in nessuna delle due righe: arriva sempre per
// ultima e in automatico, citata solo nel testo di chiusura — coerente con
// `RIPETIBILE_ATTIVITA.chiusura === false` e la creazione automatica alla
// chiusura del Lavoro (vedi CLAUDE.md, Principi architetturali).
const TRATTATIVA: ChiaveAttivita[] = ['briefing', 'preventivo', 'campionatura', 'verifica_misure', 'acconto']
const ESECUZIONE: ChiaveAttivita[] = ['progetto', 'acquisto', 'noleggio', 'costruzione', 'montaggio']

function RigaAttivita({ titolo, chiavi }: { titolo: string; chiavi: ChiaveAttivita[] }) {
  return (
    <div>
      <h3 className="text-center text-sm font-semibold tracking-wide text-gray-500 uppercase sm:text-left">{titolo}</h3>
      <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5">
        {chiavi.map((chiave) => {
          const Icona = ICONA_ATTIVITA[chiave]
          return (
            <div key={chiave} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                <Icona className="h-6 w-6" />
              </span>
              <span className="text-xs font-medium text-gray-900 sm:text-sm">{LABEL_ATTIVITA[chiave]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LandingTecnicoFunzioniFase() {
  return (
    <section id="funzioni" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <p className="mx-auto max-w-2xl text-center text-lg text-gray-700">
          Un&apos;icona per ogni tipo di attività, sempre la stessa in tutta l&apos;app. La riconosci a colpo
          d&apos;occhio, lavoro dopo lavoro.
        </p>

        <div className="mt-12 space-y-12">
          <RigaAttivita titolo="Durante la trattativa" chiavi={TRATTATIVA} />
          <RigaAttivita titolo="Durante l'esecuzione" chiavi={ESECUZIONE} />
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-gray-600">
          La Chiusura Lavoro arriva sempre per ultima, in automatico — non un&apos;attività da ricordarti di
          aggiungere.
        </p>
      </div>
    </section>
  )
}
