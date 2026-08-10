import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { inputClass } from '@/lib/input-class'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

export default async function FornitoriPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('fornitore').select('id, ragione_sociale, partita_iva').order('ragione_sociale')
  if (q) query = query.ilike('ragione_sociale', `%${q}%`)

  const { data: fornitori } = await query

  return (
    // Contenitore largo (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts), stesso usato ora da tutte
    // le pagine principali (Dashboard, Clienti, dettaglio Lavoro, Conclusi).
    <div className={CONTENITORE_LARGO}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fornitori</h1>
        <Link
          href="/fornitori/nuovo"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + Nuovo fornitore
        </Link>
      </div>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Cerca per ragione sociale..."
          className={inputClass()}
        />
      </form>

      {!fornitori || fornitori.length === 0 ? (
        <p className="text-sm text-gray-500">
          {q ? 'Nessun fornitore trovato.' : 'Nessun fornitore censito. Aggiungine uno per iniziare.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {fornitori.map((f) => (
            <li key={f.id}>
              <Link
                href={`/fornitori/${f.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{f.ragione_sociale}</p>
                {f.partita_iva && <p className="mt-0.5 text-xs text-gray-500">P.IVA {f.partita_iva}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
