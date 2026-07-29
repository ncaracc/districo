import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    // "Breakout" dal max-w-2xl del layout condiviso, stesso pattern di
    // app/(app)/lavori/page.tsx (Dashboard) — scoped a lg: in su per lo
    // stesso motivo lì documentato (min-width automatico di <main> come
    // flex item nel root layout).
    <div className="lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2">
      <div className="lg:px-12">
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors"
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
    </div>
  )
}
