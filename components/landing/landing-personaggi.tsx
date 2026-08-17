'use client'

import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { MESTIERI } from '@/lib/landing/mestieri'
import { useMestiere } from './mestiere-context'

// Sezione 6 — "Personaggi illustrati" (2026-08-19, vedi CLAUDE.md): i 5
// ritratti "al lavoro", in positivo rispetto alle scene di caos della
// sezione 2 — stesso ordine/stessi mestieri, per continuità visiva
// (chi ha visto il caos del falegname in sezione 2 ritrova lo stesso
// falegname qui, ora "in controllo").
//
// Personalizzazione per mestiere (2026-08-19, vedi CLAUDE.md — sessione
// "selettore che artigiano sei"): con un mestiere selezionato, quel
// ritratto passa in prima posizione ed è evidenziato con un bordo (stesso
// `ring-2 ring-gray-900 ring-offset-2` già usato per lo stato "attivo"
// dell'avatar in AppNav) — gli altri 4 restano visibili, come richiesto
// esplicitamente ("qui va bene mantenerli visibili come 'gli altri
// mestieri che serviamo'"), nessuno nascosto.
export function LandingPersonaggi() {
  const { mestiere, setMestiere } = useMestiere()
  const mestieriOrdinati = mestiere
    ? [...MESTIERI].sort((a, b) => (a.slug === mestiere ? -1 : b.slug === mestiere ? 1 : 0))
    : MESTIERI

  return (
    <section className="bg-gray-50 py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Un mestiere alla volta, tutti sotto controllo</h2>
          <p className="mt-4 text-gray-600">Districo non è pensato per un solo settore: è lo stesso strumento per mestieri diversi.</p>
          {mestiere && (
            <button
              type="button"
              onClick={() => setMestiere(null)}
              className="mt-3 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
            >
              vedi anche gli altri mestieri
            </button>
          )}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {mestieriOrdinati.map((m) => {
            const evidenziato = m.slug === mestiere
            return (
              <div
                key={m.slug}
                className={`overflow-hidden rounded-xl bg-white shadow-sm ${
                  evidenziato ? 'ring-2 ring-gray-900 ring-offset-2' : ''
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.immaginePersonaggio}
                  alt={`Un ${m.label.toLowerCase()} al lavoro con Districo`}
                  className="aspect-[9/16] w-full object-cover"
                />
                <p className="flex items-center justify-center gap-1.5 p-3 text-center text-sm font-medium text-gray-900">
                  {m.label}
                  {evidenziato && (
                    <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">tu</span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
