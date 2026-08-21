import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Sezione 2 — "Problem" (2026-08-21, prima sezione del nuovo framework
// Problem/Agitation/Solution, vedi CLAUDE.md). Le 4 domande che un cliente
// si aspetta di vedersi rispondere fin dal primo contatto — icone generiche
// disegnate a mano nello stesso stile stroke-based già in uso in tutto il
// progetto (viewBox 24×24, `stroke="currentColor"`, nessuna libreria di
// icone), non le icone di `ICONA_ATTIVITA` (quelle rappresentano i tipi di
// Attività dell'app, un concetto diverso da queste 4 domande generiche —
// riusate invece in Sezione 6, dove il concetto corrisponde davvero).
// Cerchio icona in bg-gray-900/testo bianco: stessa palette bianco/nero/
// grigio della guida di stile, nessun colore "a LED" fuori dal suo uso
// riservato agli stati.

type IconaProps = { className?: string }

function IconaCome({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M9 8.5a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1-1.5 2.1v.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconaQuantoCosta({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.7 8.8a4.3 4.3 0 1 0 0 6.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 10.3h5.3M7.5 13.7h4.3" strokeLinecap="round" />
    </svg>
  )
}

function IconaCosaServe({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="5" y="4" width="14" height="17" rx="1.6" strokeLinejoin="round" />
      <path d="M9 3.3h6a1 1 0 0 1 1 1V6H8V4.3a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M8.3 11.3 10 13l3.7-3.7M8.3 16.3 10 18l3.7-3.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconaQuantoTempo({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.3l3.6 2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const DOMANDE = [
  { titolo: 'Come', testo: 'Qual è la soluzione tecnica al suo problema', Icona: IconaCome },
  { titolo: 'Quanto costa', testo: 'Il preventivo, formale o informale che sia', Icona: IconaQuantoCosta },
  { titolo: 'Cosa serve', testo: 'Lavori preliminari, dettagli tecnici o estetici da definire', Icona: IconaCosaServe },
  { titolo: 'Quanto tempo', testo: 'Quanto dovrà aspettare', Icona: IconaQuantoTempo },
]

export function LandingProblem() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <p className="mx-auto max-w-3xl text-center text-lg text-gray-700">
          Un cliente si rivolge a te quando ha un problema: un desiderio da realizzare o, semplicemente, un fastidio
          da risolvere. Dal primo contatto inizia a costruirsi un rapporto di fiducia, che nasce da quattro semplici
          domande alle quali il cliente si aspetta risposte chiare fin dall&apos;inizio:
        </p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOMANDE.map(({ titolo, testo, Icona }) => (
            <div key={titolo} className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white">
                <Icona className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold text-gray-900">{titolo}</h3>
              <p className="mt-2 text-sm text-gray-600">{testo}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-gray-600">
          Quattro domande semplici, se segui un cliente alla volta. La difficoltà comincia quando i clienti diventano
          tanti.
        </p>
      </div>
    </section>
  )
}
