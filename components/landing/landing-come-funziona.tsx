import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { DOT_COLOR } from '@/lib/lavori/satelliti-meta'

// Sezione 4 — "Come funziona" (2026-08-19, vedi CLAUDE.md): 4 passi che
// ricalcano il percorso reale di un Lavoro nell'app (Cliente+Lavoro ->
// trattativa via Attività libere -> esecuzione via Fasi -> Chiusura Lavoro
// con i calcoli automatici), non un flusso generico inventato per il
// marketing. Screenshot reali sostituiti ai 4 placeholder tratteggiati
// (2026-08-19, stesso giorno — `public/landing/screenshots/`,
// `screenshot-placeholder.tsx` eliminato: zero altri chiamanti dopo questa
// sostituzione). Ogni immagine verificata contro il testo/didascalia già
// scritti prima di sostituire (nessuna riscrittura del copy): tutte e 4
// coerenti, nessuna richiesta di conferma necessaria.
const PASSI = [
  {
    numero: '1',
    titolo: 'Apri il Lavoro, collega il Cliente',
    testo: 'Un Lavoro nasce sempre legato a un Cliente esistente o nuovo — tutto lo storico resta a portata di mano da entrambe le parti.',
    immagine: '/landing/screenshots/nuovo_lavoro.png',
    alt: 'Form "Nuovo lavoro" con selezione del Cliente',
  },
  {
    numero: '2',
    titolo: 'Segui la trattativa passo per passo',
    testo: 'Briefing, Progetto, Preventivo, Acconto: le Attività di trattativa si aprono quando servono, ciascuna con un semaforo che dice a che punto è.',
    immagine: '/landing/screenshots/elenco_attivita.png',
    alt: 'Dettaglio Lavoro con elenco Attività e semafori rosso/giallo/verde',
  },
  {
    numero: '3',
    titolo: "Passa all'esecuzione",
    testo: 'Campionatura, Verifica misure, Acquisto, Costruzione, Noleggio, Montaggio: le stesse regole, ora applicate al cantiere o al laboratorio.',
    immagine: '/landing/screenshots/costruzione.png',
    alt: 'Satellite Costruzione con le sessioni di lavoro registrate',
  },
  {
    numero: '4',
    titolo: 'Chiudi solo quando è davvero pronto',
    testo: 'Il Lavoro si chiude quando ogni Attività è verde — Districo calcola da solo valore, spese e margine finali.',
    immagine: '/landing/screenshots/chiusura.png',
    alt: 'Modale "Chiusura Lavoro" con Valore complessivo, Spese, Margine',
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
              {/* rounded-xl/overflow-hidden: stessa cornice delle card
                  Personaggi (shadow-sm); border aggiunto (assente lì) —
                  quelle foto riempiono il riquadro edge-to-edge, questi
                  screenshot hanno margini bianchi propri e senza un bordo
                  si confonderebbero con lo sfondo bg-gray-50 della
                  sezione. Nessun aspect ratio forzato/object-cover: sono
                  screenshot di UI, non foto — ritagliarli per riempire un
                  riquadro fisso rischierebbe di tagliare pulsanti/testo,
                  mostrati quindi alla loro proporzione naturale. */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.immagine} alt={p.alt} className="h-auto w-full" />
              </div>
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
