'use client'

import { CONTENITORE_STRETTO } from '@/lib/layout-container'
import { MESTIERI } from '@/lib/landing/mestieri'
import { useMestiere } from './mestiere-context'

// Sezione "Che artigiano sei" (2026-08-19, vedi CLAUDE.md — personalizzazione
// landing): subito dopo l'Hero, prima de "Il caos" come richiesto. Scrive
// nel MestiereContext condiviso — Il caos, Funzioni per fase e Personaggi
// illustrati leggono lo stesso stato per personalizzarsi di conseguenza
// (vedi mestiere-context.tsx).
//
// Click di nuovo sul mestiere già selezionato → deseleziona (torna a
// `null`, vista non filtrata): un piccolo bonus di comodità oltre ai link
// "vedi anche gli altri mestieri" nelle sezioni sotto, non richiesto
// esplicitamente ma coerente con `aria-pressed` già usato per pattern di
// selezione identici altrove (selettore Tono, filtro mestiere di "Funzioni
// per fase").
export function LandingSelettoreMestiere() {
  const { mestiere, setMestiere } = useMestiere()

  return (
    <section className="border-b border-gray-100 bg-white py-10">
      <div className={`${CONTENITORE_STRETTO} px-4 text-center`}>
        <h2 className="text-lg font-semibold text-gray-900">Dimmi che artigiano sei</h2>
        <p className="mt-1 text-sm text-gray-500">Ti mostriamo il resto della pagina con esempi pensati per il tuo mestiere.</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {MESTIERI.map((m) => {
            const attivo = m.slug === mestiere
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() => setMestiere(attivo ? null : m.slug)}
                aria-pressed={attivo}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  attivo ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
