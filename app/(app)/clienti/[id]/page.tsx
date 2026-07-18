import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClienteForm } from '@/components/cliente-form'

const STATO_LABEL: Record<string, string> = {
  trattativa: 'In trattativa',
  esecuzione: 'In esecuzione',
  chiuso: 'Chiuso',
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{cliente.nome}</h1>
        <p className="mt-1 text-sm text-gray-500">Modifica i dati del cliente</p>
      </div>

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

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Lavori associati</h2>
        {!lavori || lavori.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun lavoro registrato per questo cliente.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {lavori.map((l) => (
              <li key={l.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{l.titolo}</p>
                <p className="mt-0.5 text-xs text-gray-500">{STATO_LABEL[l.stato] ?? l.stato}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
