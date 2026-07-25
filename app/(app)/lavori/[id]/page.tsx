import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LavoroStatoAzioni } from '@/components/lavoro-stato-azioni'
import { SatelliteBriefing } from '@/components/satellite-briefing'
import { RevisionabileChain } from '@/components/satellite-revisionabile'
import { SatelliteCampione } from '@/components/satellite-campione'
import { costruisciCatena, type Satellite, type SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

const STATO_LAVORO_LABEL: Record<string, string> = {
  opportunita: 'Opportunità',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

const TIPI_ESECUZIONE = ['acquisti', 'lavorazione_esterna', 'costruzione', 'noleggio']

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

  const [{ data: cliente }, { data: isOwner }, { data: satellitiGrezzi }, { data: statoEffettivoGrezzo }] =
    await Promise.all([
      supabase.from('cliente').select('id, nome').eq('id', lavoro.cliente_id).maybeSingle(),
      supabase.rpc('is_owner_del_lavoro', { p_lavoro_id: id }),
      supabase.from('lavoro_satellite').select('*').eq('lavoro_id', id),
      supabase.rpc('lavoro_satellite_stato_effettivo', { p_lavoro_id: id }),
    ])

  const satelliti: Satellite[] = satellitiGrezzi ?? []
  const satelliteIds = satelliti.map((s) => s.id)

  const { data: allegatiGrezzi } =
    satelliteIds.length > 0
      ? await supabase.from('lavoro_satellite_allegato').select('*').in('satellite_id', satelliteIds)
      : { data: [] as SatelliteAllegato[] }

  const allegati: SatelliteAllegato[] = allegatiGrezzi ?? []
  const allegatiById: Record<string, SatelliteAllegato[]> = {}
  for (const a of allegati) {
    ;(allegatiById[a.satellite_id] ??= []).push(a)
  }

  const statoEffettivoById: Record<string, string> = {}
  for (const s of statoEffettivoGrezzo ?? []) {
    if (s.stato_effettivo) statoEffettivoById[s.satellite_id] = s.stato_effettivo
  }

  const briefing = satelliti.find((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'briefing')
  const progettoSatelliti = satelliti.filter((s) => s.tipo === 'progetto')
  const preventivoSatelliti = satelliti.filter((s) => s.tipo === 'preventivo')
  const campioneSatelliti = satelliti.filter((s) => s.tipo === 'campione')

  const satellitiEsecuzione = satelliti.filter(
    (s) => TIPI_ESECUZIONE.includes(s.tipo) || (s.tipo === 'appuntamento' && s.tipo_appuntamento !== 'briefing'),
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
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {STATO_LAVORO_LABEL[lavoro.stato] ?? lavoro.stato}
        </span>
      </div>

      <div className="mb-8">
        {lavoro.stato === 'opportunita' ? (
          isOwner ? (
            <LavoroStatoAzioni lavoroId={lavoro.id} />
          ) : (
            <p className="text-sm text-gray-500">Lavoro ancora in fase di opportunità.</p>
          )
        ) : (
          lavoro.accettato_at && (
            <p className="text-sm text-gray-500">
              Lavoro accettato il {new Date(lavoro.accettato_at).toLocaleDateString('it-IT')}
            </p>
          )
        )}
      </div>

      <div className="space-y-4">
        {briefing && (
          <SatelliteBriefing
            satellite={briefing}
            lavoroId={lavoro.id}
            allegati={allegatiById[briefing.id] ?? []}
            isOwner={!!isOwner}
          />
        )}

        {progettoSatelliti.length > 0 && (
          <RevisionabileChain
            tipo="progetto"
            titolo="Progetto"
            catena={[...costruisciCatena(progettoSatelliti)].reverse()}
            statoEffettivoById={statoEffettivoById}
            allegatiById={allegatiById}
            isOwner={!!isOwner}
            lavoroId={lavoro.id}
          />
        )}

        {preventivoSatelliti.length > 0 && (
          <RevisionabileChain
            tipo="preventivo"
            titolo="Preventivo"
            catena={[...costruisciCatena(preventivoSatelliti)].reverse()}
            statoEffettivoById={statoEffettivoById}
            allegatiById={allegatiById}
            isOwner={!!isOwner}
            lavoroId={lavoro.id}
            mostraValore
          />
        )}

        {(campioneSatelliti.length > 0 || isOwner) && (
          <SatelliteCampione
            satelliti={campioneSatelliti}
            statoEffettivoById={statoEffettivoById}
            allegatiById={allegatiById}
            isOwner={!!isOwner}
            lavoroId={lavoro.id}
          />
        )}

        {lavoro.stato !== 'opportunita' && satellitiEsecuzione.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              {satellitiEsecuzione.length} elementi in preparazione, dettaglio nel prossimo aggiornamento.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
