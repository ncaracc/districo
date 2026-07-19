import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase.from('cliente').select('id, nome, telefono, email').order('nome')
  if (q) query = query.ilike('nome', `%${q}%`)

  const { data: clienti } = await query

  return (
    <div>
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
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {clienti.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clienti/${c.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                {(c.telefono || c.email) && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[c.telefono, c.email].filter(Boolean).join(' · ')}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
