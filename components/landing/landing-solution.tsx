'use client'

import { useSyncExternalStore } from 'react'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Sezione 4 — "Solution" (2026-08-21, vedi CLAUDE.md). Una delle 5 foto
// "Personaggi" (scene di congedo artigiano-cliente, già convertite in webp
// e ottimizzate in una sessione precedente — non ancora usate nel markup
// fino ad ora) scelta a caso al caricamento della pagina, come richiesto
// ("random client-side, non serve rotazione automatica nel tempo").
//
// `useSyncExternalStore`, non `useEffect`+`setState`: quest'ultimo è stato
// il primo tentativo, scartato per due motivi — (1) `setState` sincrono
// dentro un effect senza sottoscrizione a un vero sistema esterno è
// esplicitamente sconsigliato dalla regola `react-hooks/set-state-in-effect`
// del progetto (errore, non warning); (2) `useState(() => scelta random)`
// diretto varrebbe sia in fase di render server sia nel primo render client
// pre-idratazione, ma `Math.random()` produce un valore diverso ad ogni
// chiamata — mismatch di idratazione reale. La scelta casuale è invece
// esattamente il caso d'uso per cui `useSyncExternalStore` esiste: un dato
// esterno a React (qui: la sola volta in cui vale la pena chiamare
// `Math.random()`, memorizzata a livello di modulo) che deve restare
// STABILE per l'intera vita della pagina — `getSnapshot` la calcola una
// sola volta e la mette in cache, `getServerSnapshot` (sempre `FOTO[0]`,
// deterministica) copre sia il render server sia il primo render client
// pre-idratazione, poi lo snapshot "vero" prende il sopravvento — nessun
// mismatch, nessun setState in un effect.
const FOTO = [
  { src: '/landing/personaggi/c_falegname.webp', alt: 'Un falegname stringe la mano al cliente a fine lavoro' },
  { src: '/landing/personaggi/c_idraulico.webp', alt: 'Un idraulico stringe la mano al cliente a fine lavoro' },
  { src: '/landing/personaggi/c_elettricista.webp', alt: 'Un elettricista stringe la mano al cliente a fine lavoro' },
  { src: '/landing/personaggi/c_imbianchino.webp', alt: 'Un imbianchino stringe la mano al cliente a fine lavoro' },
  { src: '/landing/personaggi/c_vetraio.webp', alt: 'Un vetraio stringe la mano al cliente a fine lavoro' },
]

let fotoScelta: (typeof FOTO)[number] | null = null
function leggiFotoScelta() {
  if (!fotoScelta) {
    fotoScelta = FOTO[Math.floor(Math.random() * FOTO.length)]
  }
  return fotoScelta
}
function leggiFotoDefault() {
  return FOTO[0]
}
// Nessun aggiornamento da sottoscrivere dopo la scelta iniziale — la foto
// resta fissa per tutta la vita della pagina, `subscribe` non deve mai
// notificare React di un cambiamento.
function nessunaSottoscrizione() {
  return () => {}
}

export function LandingSolution() {
  const foto = useSyncExternalStore(nessunaSottoscrizione, leggiFotoScelta, leggiFotoDefault)

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-lg text-gray-700">
              Districo ti dà l&apos;abitudine di lavorare con ordine, fin dal primo cliente — anche quando i clienti
              sono tanti e i cantieri si sovrappongono.
            </p>
            <p className="mt-4 text-lg text-gray-700">
              Ogni lavoro segue lo stesso percorso chiaro, dal primo contatto alla consegna: sai sempre cosa manca,
              cosa è in ritardo, cosa devi ancora dire a ciascun cliente. Non perché sei più veloce. Perché sai
              sempre a che punto sei, con ognuno dei tuoi clienti.
            </p>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.src} alt={foto.alt} className="aspect-[9/16] w-full object-cover" />
            </div>
            <p className="mt-4 text-center text-sm text-gray-500 italic">
              Questo è ciò che il cliente ricorda: non quanto ci hai messo, ma che hai mantenuto quello che avevi
              detto.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
