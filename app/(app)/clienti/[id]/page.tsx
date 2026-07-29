import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClienteForm } from '@/components/cliente-form'

const STATO_LABEL: Record<string, string> = {
  opportunita: 'Opportunità',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

export default async function ClienteDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('cliente')
    .select('id, nome, telefono, email, indirizzo, note')
    .eq('id', id)
    .maybeSingle()

  if (!cliente) notFound()

  const { data: lavori } = await supabase
    .from('lavoro')
    .select('id, titolo, stato')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  return (
    // "Breakout" dal max-w-2xl del layout condiviso, stesso pattern di
    // app/(app)/lavori/page.tsx (Dashboard) — scoped a lg: in su per lo
    // stesso motivo lì documentato (min-width automatico di <main> come
    // flex item nel root layout).
    <div className="lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2">
      <div className="lg:px-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{cliente.nome || 'Modifica cliente'}</h1>
          <Link
            href={`/lavori/nuovo?clienteId=${cliente.id}`}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Nuovo lavoro
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Dati cliente</h2>
            <ClienteForm
              clienteId={cliente.id}
              initialValues={{
                nome: cliente.nome,
                telefono: cliente.telefono ?? '',
                email: cliente.email ?? '',
                indirizzo: cliente.indirizzo ?? '',
                note: cliente.note ?? '',
              }}
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Lavori associati</h2>

            {!lavori || lavori.length === 0 ? (
              <p className="text-sm text-gray-500">Nessun lavoro registrato per questo cliente.</p>
            ) : (
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                {lavori.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/lavori/${l.id}`}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{l.titolo}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{STATO_LABEL[l.stato] ?? l.stato}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
