import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { inputClass } from '@/lib/input-class'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('cliente').select('id, nome, telefono, email, indirizzo').order('nome')
  if (q) query = query.ilike('nome', `%${q}%`)

  const { data: clienti } = await query

  return (
    // Contenitore largo (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts), stesso usato ora da tutte
    // le pagine principali (Dashboard, Fornitori, dettaglio Lavoro, Conclusi).
    <div className={CONTENITORE_LARGO}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
        <Link
          href="/clienti/nuovo"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + Nuovo cliente
        </Link>
      </div>

      <form className="mb-6">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Cerca per nome..."
          className={inputClass()}
        />
      </form>

      {!clienti || clienti.length === 0 ? (
        <p className="text-sm text-gray-500">
          {q ? 'Nessun cliente trovato.' : 'Non hai ancora nessun cliente. Creane uno per iniziare.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Nome</th>
                <th className="hidden px-4 py-3 md:table-cell">Indirizzo</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="px-4 py-3">Telefono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clienti.map((c) => (
                <tr key={c.id} className="group">
                  <td className="p-0">
                    <Link
                      href={`/clienti/${c.id}`}
                      className="block px-4 py-3 font-medium text-gray-900 transition-colors group-hover:bg-gray-50"
                    >
                      {c.nome}
                    </Link>
                  </td>
                  <td className="hidden p-0 md:table-cell">
                    <Link
                      href={`/clienti/${c.id}`}
                      className="block px-4 py-3 text-gray-500 transition-colors group-hover:bg-gray-50"
                    >
                      {c.indirizzo || '—'}
                    </Link>
                  </td>
                  <td className="hidden p-0 md:table-cell">
                    <Link
                      href={`/clienti/${c.id}`}
                      className="block px-4 py-3 text-gray-500 transition-colors group-hover:bg-gray-50"
                    >
                      {c.email || '—'}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link
                      href={`/clienti/${c.id}`}
                      className="block px-4 py-3 text-gray-500 transition-colors group-hover:bg-gray-50"
                    >
                      {c.telefono || '—'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
