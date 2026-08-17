import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { MESTIERI } from '@/lib/landing/mestieri'

// Sezione 6 — "Personaggi illustrati" (2026-08-19, vedi CLAUDE.md): i 5
// ritratti "al lavoro", in positivo rispetto alle scene di caos della
// sezione 2 — stesso ordine/stessi mestieri, per continuità visiva
// (chi ha visto il caos del falegname in sezione 2 ritrova lo stesso
// falegname qui, ora "in controllo").
export function LandingPersonaggi() {
  return (
    <section className="bg-gray-50 py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Un mestiere alla volta, tutti sotto controllo</h2>
          <p className="mt-4 text-gray-600">Districo non è pensato per un solo settore: è lo stesso strumento per mestieri diversi.</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {MESTIERI.map((m) => (
            <div key={m.slug} className="overflow-hidden rounded-xl bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.immaginePersonaggio} alt={`Un ${m.label.toLowerCase()} al lavoro con Districo`} className="aspect-[9/16] w-full object-cover" />
              <p className="p-3 text-center text-sm font-medium text-gray-900">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
