'use client'

import { useState } from 'react'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Sezione 9 — FAQ (2026-08-19, vedi CLAUDE.md): accordion minimale, un solo
// elemento aperto alla volta (indice, non un Set — non serve aprirne più di
// una in una pagina di marketing letta rapidamente). Contenuto derivato solo
// da fatti già decisi/documentati in CLAUDE.md — nessuna promessa non
// verificabile (es. niente "i tuoi dati sono sul cloud europeo" non
// confermato altrove).
const DOMANDE = [
  {
    domanda: 'Districo è pensato solo per un mestiere?',
    risposta:
      'No. È pensato per artigiani di mestieri diversi — falegnami, idraulici, vetrai, fabbri, elettricisti e altri — non per un solo settore verticale.',
  },
  {
    domanda: 'Come funziona la prova gratuita?',
    risposta:
      'Hai 60 giorni di accesso completo, senza alcun pagamento richiesto per iniziare. Alla scadenza puoi scegliere il piano mensile o annuale se decidi di continuare.',
  },
  {
    domanda: 'Cosa succede se non scelgo un piano dopo la prova?',
    risposta: 'Nessun addebito automatico: puoi continuare a valutare con calma, senza sorprese sul conto.',
  },
  {
    domanda: 'Posso lavorare un lavoro insieme a un collega?',
    risposta:
      'Sì, un Lavoro può essere condiviso "a quattro mani" tra due artigiani: entrambi lo vedono e possono seguirlo.',
  },
  {
    domanda: 'Districo mi impone un ordine da seguire?',
    risposta:
      'No. Puoi fare un preventivo senza misure confermate, acquistare materiale senza acconti incassati: Districo traccia cosa manca con un semaforo, ma decidi sempre tu come procedere.',
  },
  {
    domanda: 'Come funziona il programma beta tester?',
    risposta:
      'Segnalaci cosa non funziona o cosa manca: in cambio hai 6 mesi di accesso completo gratuito, e ogni funzionalità nata da una tua segnalazione resta gratuita per te per sempre.',
  },
]

export function LandingFaq() {
  const [aperta, setAperta] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_STRETTO} px-4`}>
        <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">Domande frequenti</h2>

        <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
          {DOMANDE.map((d, i) => {
            const attiva = aperta === i
            return (
              <div key={d.domanda}>
                <button
                  type="button"
                  onClick={() => setAperta(attiva ? null : i)}
                  aria-expanded={attiva}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-medium text-gray-900">{d.domanda}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${attiva ? 'rotate-45' : ''}`}
                  >
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </button>
                {attiva && <p className="pb-5 text-sm leading-relaxed text-gray-600">{d.risposta}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
