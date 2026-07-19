import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SegnaAccettatoButton } from '@/components/segna-accettato-button'
import { SatellitiSection } from '@/components/satelliti-section'
import type { FornitoreOpzione, Satellite, SatelliteArticolo } from '@/lib/lavori/satelliti-meta'

const STATO_LAVORO_LABEL: Record<string, string> = {
  trattativa: 'In trattativa',
  esecuzione: 'In esecuzione',
  chiuso: 'Chiuso',
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
    .select('id, titolo, descrizione, stato, cliente_id, accettato_at, necessario_preventivo, necessario_progetto')
    .eq('id', id)
    .maybeSingle()

  if (!lavoro) notFound()

  const [{ data: cliente }, { data: isOwner }, { data: satellitiGrezzi }, { data: prontoData }] =
    await Promise.all([
      supabase.from('cliente').select('id, nome').eq('id', lavoro.cliente_id).maybeSingle(),
      supabase.rpc('is_owner_del_lavoro', { p_lavoro_id: id }),
      supabase
        .from('lavoro_satellite')
        .select(
          'id, tipo, stato, nota, tipo_appuntamento, data_appuntamento, revisione_di, valore_complessivo, fornitore_sede_id, descrizione_libera, data_creazione',
        )
        .eq('lavoro_id', id),
      supabase.rpc('lavoro_pronto_per_montaggio', { p_lavoro_id: id }),
    ])

  const satelliti: Satellite[] = satellitiGrezzi ?? []
  const satelliteIds = satelliti.map((s) => s.id)

  const [{ data: righeGrezze }, { data: fornitoreSedi }, { data: fornitoriGrezzi }] = await Promise.all([
    satelliteIds.length > 0
      ? supabase
          .from('lavoro_satellite_articolo')
          .select('id, satellite_id, articolo_id, descrizione, colore_finitura, quantita')
          .in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteArticolo[] }),
    supabase.from('fornitore_sede').select('id, fornitore_id, nome, citta'),
    supabase.from('fornitore').select('id, ragione_sociale'),
  ])

  const righeArticolo: SatelliteArticolo[] = righeGrezze ?? []

  const ragioneSocialeById = new Map((fornitoriGrezzi ?? []).map((f) => [f.id, f.ragione_sociale]))
  const fornitori: FornitoreOpzione[] = (fornitoreSedi ?? []).map((s) => ({
    id: s.id,
    label: `${ragioneSocialeById.get(s.fornitore_id) ?? '—'} — ${s.nome} (${s.citta})`,
  }))
  const fornitoreLabelById: Record<string, string> = Object.fromEntries(
    fornitori.map((f) => [f.id, f.label]),
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

      <div className="mb-8">
        <SatellitiSection
          lavoroId={lavoro.id}
          necessarioPreventivo={lavoro.necessario_preventivo}
          necessarioProgetto={lavoro.necessario_progetto}
          satelliti={satelliti}
          righeArticolo={righeArticolo}
          fornitori={fornitori}
          fornitoreLabelById={fornitoreLabelById}
          isOwner={!!isOwner}
          pronto={!!prontoData}
        />
      </div>
    </div>
  )
}
