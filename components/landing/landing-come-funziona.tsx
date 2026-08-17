import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { ScreenshotPlaceholder } from './screenshot-placeholder'
import { DOT_COLOR } from '@/lib/lavori/satelliti-meta'

// Sezione 4 — "Come funziona" (2026-08-19, vedi CLAUDE.md): 4 passi che
// ricalcano il percorso reale di un Lavoro nell'app (Cliente+Lavoro ->
// trattativa via Attività libere -> esecuzione via Fasi -> Chiusura Lavoro
// con i calcoli automatici), non un flusso generico inventato per il
// marketing. Ogni passo ha un riquadro segnaposto per lo screenshot reale
// (non ancora disponibile) con un'etichetta che descrive esattamente cosa
// dovrà mostrare — vedi screenshot-placeholder.tsx.
const PASSI = [
  {
    numero: '1',
    titolo: 'Apri il Lavoro, collega il Cliente',
    testo: 'Un Lavoro nasce sempre legato a un Cliente esistente o nuovo — tutto lo storico resta a portata di mano da entrambe le parti.',
    screenshot: 'Screenshot: form "Nuovo lavoro" con selezione del Cliente',
  },
  {
    numero: '2',
    titolo: 'Segui la trattativa passo per passo',
    testo: 'Briefing, Progetto, Preventivo, Acconto: le Attività di trattativa si aprono quando servono, ciascuna con un semaforo che dice a che punto è.',
    screenshot: 'Screenshot: Dettaglio Lavoro con elenco Attività e semafori rosso/giallo/verde',
  },
  {
    numero: '3',
    titolo: "Passa all'esecuzione",
    testo: 'Campionatura, Verifica misure, Acquisto, Costruzione, Noleggio, Montaggio: le stesse regole, ora applicate al cantiere o al laboratorio.',
    screenshot: 'Screenshot: satellite Costruzione con le sessioni di lavoro registrate',
  },
  {
    numero: '4',
    titolo: 'Chiudi solo quando è davvero pronto',
    testo: 'Il Lavoro si chiude quando ogni Attività è verde — Districo calcola da solo valore, spese e margine finali.',
    screenshot: 'Screenshot: modale "Chiusura Lavoro" con Valore complessivo, Spese, Margine',
  },
]

export function LandingComeFunziona() {
  return (
    <section id="come-funziona" className="scroll-mt-24 bg-gray-50 py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Come funziona</h2>
          <p className="mt-4 text-gray-600">Quattro passi, sempre nello stesso ordine con cui lavori davvero.</p>
        </div>

        <div className="mt-12 space-y-12">
          {PASSI.map((p, i) => (
            <div
              key={p.numero}
              className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                  {p.numero}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{p.titolo}</h3>
                <p className="mt-2 text-gray-600">{p.testo}</p>
              </div>
              <ScreenshotPlaceholder label={p.screenshot} />
            </div>
          ))}
        </div>

        {/* Legenda del semaforo, richiamata al punto 2 — spiega il vero
            significato dei colori "a LED" già usati in tutta l'app (vedi
            CLAUDE.md, UI/Stile), non un elemento decorativo nuovo. */}
        <div className="mx-auto mt-14 flex max-w-xl flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:justify-center sm:gap-8">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT_COLOR.red}`} />
            <span className="text-sm text-gray-600">Da iniziare</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT_COLOR.yellow}`} />
            <span className="text-sm text-gray-600">In corso</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT_COLOR.green}`} />
            <span className="text-sm text-gray-600">Fatto</span>
          </div>
        </div>
      </div>
    </section>
  )
}
