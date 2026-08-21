import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Sezione 3 — "Agitation" (2026-08-21, vedi CLAUDE.md). Sfondo scuro
// (bg-gray-900, palette bianco/nero/grigio — non un colore "a LED", solo il
// tono opposto della Hero/Problem per segnare il cambio di registro) e
// contenitore stretto (CONTENITORE_STRETTO, colonna singola di lettura):
// testo che si accumula in paragrafi ravvicinati invece delle card ordinate
// di Problem, per rinforzare visivamente la sensazione di accumulo/
// pressione richiesta esplicitamente — nessuna griglia, nessuna icona.
export function LandingAgitation() {
  return (
    <section className="bg-gray-900 py-16 text-white sm:py-24">
      <div className={`${CONTENITORE_STRETTO} px-4`}>
        <p className="text-lg leading-relaxed text-gray-300">
          Finché segui un cliente alla volta, è facile. Il problema comincia quando i cantieri aperti sono tanti, e
          ogni impegno preso si somma agli altri.
        </p>
        <p className="mt-6 text-lg leading-relaxed text-gray-300">
          Vai dal fornitore oggi per consegnare un lavoro e domani per ritirarne un altro — mezza giornata che
          potevi risparmiare con un solo viaggio. Due sopralluoghi nello stesso pomeriggio, alle 14:30 e alle 18:00,
          con ore morte in mezzo. Due lavori portati avanti in parallelo, &ldquo;tanto va tagliato lo stesso
          materiale&rdquo; — e il rischio di errore raddoppia.
        </p>
        <p className="mt-6 text-lg leading-relaxed text-gray-300">
          Piccole cose, prese singolarmente. Ma si accumulano, e quando il caos prende il sopravvento:
        </p>

        <ul className="mt-6 space-y-2 border-l-2 border-gray-700 pl-5">
          <li className="text-lg leading-snug text-gray-200">I clienti si fanno più pressanti</li>
          <li className="text-lg leading-snug text-gray-200">I flussi di cassa diventano confusi e incerti</li>
          <li className="text-lg leading-snug text-gray-200">Si fanno scelte sbagliate, dettate dalla fretta</li>
          <li className="text-lg leading-snug text-gray-200">
            Si prendono più impegni di quelli che si possono davvero portare a termine
          </li>
          <li className="text-lg leading-snug text-gray-200">Si finisce per vivere nell&apos;ansia</li>
        </ul>

        <p className="mt-8 text-lg leading-relaxed font-medium text-white">
          Buona volontà, voglia di fare, rispetto per i clienti — non mancano. Manca il tempo per essere
          organizzati.
        </p>
      </div>
    </section>
  )
}
