import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Cartella rinominata da `(admin)` (route group, senza segmento URL) ad
// `admin` (segmento URL reale) il 2026-08-22 — vedi CLAUDE.md, sessione
// "pagina admin utenti". Bug preesistente scoperto testando questa
// sessione, mai notato prima: una route group produce un URL SENZA il
// prefisso tra parentesi — `app/(admin)/dashboard/page.tsx` risolveva a
// `/dashboard`, non `/admin/dashboard`. Invisibile finché nessun
// artigiano aveva mai `is_admin=true` (il redirect di un utente non
// autenticato/non-admin maschera comunque un 404 sulla route sbagliata,
// dato che il middleware reindirizza in base al solo pathname, non
// all'esistenza reale della pagina).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('is_admin')
    .eq('id', user.id)
    .single<{ is_admin: boolean }>()

  if (!artigiano?.is_admin) redirect('/lavori')

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Nav minimale tra le pagine admin (2026-08-22, aggiunta /admin/utenti
            — vedi CLAUDE.md): questa sezione non condivide l'AppNav
            dell'app normale (nessuna voce di menu pubblica verso /admin,
            per design — un solo admin, accesso diretto via URL), serve
            comunque un modo per muoversi tra le due pagine ora che sono
            due. */}
        <nav className="mb-6 flex gap-4 border-b border-gray-200 pb-3 text-sm">
          <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/admin/utenti" className="text-gray-600 hover:text-gray-900">
            Utenti
          </Link>
        </nav>
        {children}
      </main>
    </div>
  )
}
