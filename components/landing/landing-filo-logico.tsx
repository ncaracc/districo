import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Sezione 3 — "Il filo logico Districo" (2026-08-19, vedi CLAUDE.md):
// immagine di sintesi + i 3 principi cardine del prodotto, riformulati in
// linguaggio semplice per un pubblico non tecnico a partire da "Principi
// architetturali" di CLAUDE.md (nessun vincolo di prerequisito reale tra
// Attività — l'artigiano decide, l'app traccia).
const PUNTI = [
  {
    titolo: 'Trattativa libera',
    testo: 'Briefing, preventivo, acconti: le Attività si aprono quando servono, nell’ordine che usi davvero tu.',
  },
  {
    titolo: 'Esecuzione tracciata',
    testo: 'Campionatura, acquisti, cantiere: ogni fase avanza, ma resta sempre chiaro cosa manca per andare avanti.',
  },
  {
    titolo: 'Mai un blocco imposto',
    testo: 'Districo segnala con un semaforo cosa è aperto o in ritardo — decide sempre l’artigiano, non l’app.',
  },
]

export function LandingFiloLogico() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/filo-logico/filo-logico.jpg"
              alt="Il filo logico che collega ogni fase del lavoro in Districo"
              className="w-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Il filo logico Districo</h2>
            <p className="mt-4 text-gray-600">
              Tutto quel disordine, ridotto a un unico percorso chiaro: dalla prima chiacchierata con il cliente
              fino al montaggio, ogni lavoro segue lo stesso filo — senza due sistemi diversi per trattativa ed
              esecuzione.
            </p>

            <dl className="mt-8 space-y-6">
              {PUNTI.map((p) => (
                <div key={p.titolo} className="flex gap-4">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gray-900" />
                  <div>
                    <dt className="font-semibold text-gray-900">{p.titolo}</dt>
                    <dd className="mt-1 text-sm text-gray-600">{p.testo}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
