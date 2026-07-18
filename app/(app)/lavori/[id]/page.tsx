import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SegnaAccettatoButton } from '@/components/segna-accettato-button'
import { NuovaAttivitaForm } from '@/components/nuova-attivita-form'
import { AttivitaCard, type Attivita } from '@/components/attivita-card'

const STATO_LAVORO_LABEL: Record<string, string> = {
  trattativa: 'In trattativa',
  esecuzione: 'In esecuzione',
  chiuso: 'Chiuso',
}

const PRIORITA_STATO: Record<Attivita['stato'], number> = {
  bloccata: 0,
  in_corso: 1,
  da_fare: 2,
  fatta: 3,
}

export default async function LavoroDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lavoro } = await supabase
    .from('lavoro')
    .select('id, titolo, descrizione, stato, cliente_id, accettato_at')
    .eq('id', id)
    .maybeSingle()

  if (!lavoro) notFound()

  const [{ data: cliente }, { data: isOwner }, { data: attivitaGrezze }] = await Promise.all([
    supabase.from('cliente').select('id, nome').eq('id', lavoro.cliente_id).maybeSingle(),
    supabase.rpc('is_owner_del_lavoro', { p_lavoro_id: id }),
    supabase
      .from('attivita')
      .select('id, tipo, stato, data_appuntamento, commenti, importo, revisione_di')
      .eq('lavoro_id', id),
  ])

  const attivita = [...(attivitaGrezze ?? [])].sort(
    (a, b) => PRIORITA_STATO[a.stato] - PRIORITA_STATO[b.stato],
  )

  return (
    <div>
      <div className="mb-2">
        {cliente && (
          <Link
            href={`/clienti/${cliente.id}`}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← {cliente.nome}
          </Link>
        )}
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lavoro.titolo}</h1>
          {lavoro.descrizione && (
            <p className="mt-1 text-sm text-gray-600">{lavoro.descrizione}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
          {STATO_LAVORO_LABEL[lavoro.stato] ?? lavoro.stato}
        </span>
      </div>

      <div className="mb-8">
        {lavoro.accettato_at ? (
          <p className="text-sm text-gray-500">
            Lavoro accettato il {new Date(lavoro.accettato_at).toLocaleDateString('it-IT')}
          </p>
        ) : isOwner ? (
          <SegnaAccettatoButton lavoroId={lavoro.id} />
        ) : (
          <p className="text-sm text-gray-500">Lavoro non ancora accettato.</p>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Attività</h2>
      </div>

      {isOwner && (
        <div className="mb-4">
          <NuovaAttivitaForm lavoroId={lavoro.id} />
        </div>
      )}

      {attivita.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nessuna attività ancora. Nessuna è obbligatoria: aggiungi solo quelle che servono.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {attivita.map((a) => (
            <AttivitaCard key={a.id} attivita={a} lavoroId={lavoro.id} isOwner={!!isOwner} />
          ))}
        </ul>
      )}
    </div>
  )
}
