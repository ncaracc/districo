import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { MESTIERI } from '@/lib/landing/mestieri'

// Sezione 2 — "Il caos": 5 scene, una per mestiere (2026-08-19, vedi
// CLAUDE.md). Sfondo scuro deliberato (unico punto della pagina, sezioni 1/
// 3/4/5/6/7/8/9/10 restano tutte su bianco/grigio chiaro): rende
// visivamente il "prima" caotico prima che la sezione 3 ("Il filo logico")
// mostri il "dopo" ordinato — contrasto narrativo, non una nuova palette
// permanente (i colori restano neutri, nessun colore "a LED" introdotto
// qui).
export function LandingCaos() {
  return (
    <section className="bg-gray-900 py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Il caos che conosci già</h2>
          <p className="mt-4 text-gray-400">
            Misure su un post-it, preventivi a memoria, appuntamenti segnati ovunque tranne che in un posto solo.
            Ogni mestiere ha il suo disordine — Districo li conosce tutti.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {MESTIERI.map((m) => (
            <div key={m.slug} className="overflow-hidden rounded-xl bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.immagineCaos} alt={`Il caos quotidiano di un ${m.label.toLowerCase()}`} className="aspect-[9/16] w-full object-cover" />
              <div className="p-4">
                <p className="text-sm font-semibold text-white">{m.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{m.didascaliaCaos}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
