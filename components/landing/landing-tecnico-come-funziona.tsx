import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Sezione 5 — "Tecnico (Come funziona)" (2026-08-21, vedi CLAUDE.md): 4
// passi che ricalcano il percorso reale di un Lavoro nell'app (apertura →
// trattativa → esecuzione → chiusura), con lo screenshot corrispondente
// (`public/landing/screenshots/`, già presenti da una sessione precedente).
//
// Media come unione discriminata (`tipo: 'img' | 'video'`), non un semplice
// `src` stringa: come richiesto esplicitamente ("in futuro questi verranno
// sostituiti da brevi video"), sostituire un passo con un video diventa un
// cambio di un solo oggetto dati (`{ tipo: 'video', src: '...' }` al posto
// di `{ tipo: 'img', src, alt }`) — `<MediaPasso>` risolve già entrambi i
// casi, nessuna modifica al resto del componente quando arriverà il video.
type MediaPasso = { tipo: 'img'; src: string; alt: string } | { tipo: 'video'; src: string }

const PASSI: { numero: string; titolo: string; testo: string; media: MediaPasso }[] = [
  {
    numero: '1',
    titolo: 'Apri un nuovo Lavoro',
    testo: 'Cliente, titolo, prima nota. Bastano pochi secondi per iniziare a tracciarlo.',
    media: { tipo: 'img', src: '/landing/screenshots/nuovo_lavoro.png', alt: 'Dettaglio di un nuovo Lavoro appena creato, con il Cliente collegato' },
  },
  {
    numero: '2',
    titolo: 'Segui la trattativa',
    testo:
      "Briefing, preventivo, sopralluoghi: aggiungi solo le attività che ti servono, nell'ordine che preferisci. Nessun passaggio obbligato.",
    media: { tipo: 'img', src: '/landing/screenshots/elenco_attivita.png', alt: 'Elenco delle Attività di un Lavoro con i relativi stati' },
  },
  {
    numero: '3',
    titolo: "Porta avanti l'esecuzione",
    testo:
      'Una volta accettato il lavoro, le fasi di produzione restano sempre visibili: sai cosa è in corso e cosa è ancora da chiudere.',
    media: { tipo: 'img', src: '/landing/screenshots/costruzione.png', alt: 'Satellite Costruzione con le sessioni di lavoro registrate' },
  },
  {
    numero: '4',
    titolo: 'Chiudi il lavoro',
    testo: 'Saldo registrato, lavoro concluso. Tutto lo storico resta a disposizione.',
    media: { tipo: 'img', src: '/landing/screenshots/chiusura.png', alt: 'Modale "Chiusura Lavoro" con saldo e riepilogo finale' },
  },
]

function MediaPasso({ media, className }: { media: MediaPasso; className?: string }) {
  if (media.tipo === 'video') {
    return <video src={media.src} autoPlay loop muted playsInline className={className} />
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.src} alt={media.alt} className={className} />
}

export function LandingTecnicoComeFunziona() {
  return (
    <section id="come-funziona" className="scroll-mt-24 bg-gray-50 py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <p className="mx-auto max-w-2xl text-center text-lg text-gray-700">
          Districo segue il tuo lavoro dal primo contatto alla consegna, in quattro passaggi.
        </p>

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
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <MediaPasso media={p.media} className="h-auto w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
