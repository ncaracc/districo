import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LavoroStatoAzioni } from '@/components/lavoro-stato-azioni'
import { LavoroSegnaCompletato } from '@/components/lavoro-segna-completato'
import { SatelliteAppuntamento } from '@/components/satellite-appuntamento'
import { SatelliteNuovoAppuntamento } from '@/components/satellite-nuovo-appuntamento'
import { RevisionabileChain } from '@/components/satellite-revisionabile'
import { SatelliteCampione } from '@/components/satellite-campione'
import { SatelliteOrdine } from '@/components/satellite-ordine'
import { SatelliteNuovoOrdine } from '@/components/satellite-nuovo-ordine'
import { SatelliteCostruzione } from '@/components/satellite-costruzione'
import { SatelliteNoleggio } from '@/components/satellite-noleggio'
import {
  SOTTOTIPO_APPUNTAMENTO_LABEL,
  costruisciCatena,
  type Satellite,
  type SatelliteAllegato,
  type SatelliteArticolo,
} from '@/lib/lavori/satelliti-meta'

const STATO_LAVORO_LABEL: Record<string, string> = {
  opportunita: 'Opportunità',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  completato: 'Completato',
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

  const [{ data: cliente }, { data: isOwner }, { data: satellitiGrezzi }, { data: statoEffettivoGrezzo }, { data: pronto }] =
    await Promise.all([
      supabase.from('cliente').select('id, nome').eq('id', lavoro.cliente_id).maybeSingle(),
      supabase.rpc('is_owner_del_lavoro', { p_lavoro_id: id }),
      supabase.from('lavoro_satellite').select('*').eq('lavoro_id', id),
      supabase.rpc('lavoro_satellite_stato_effettivo', { p_lavoro_id: id }),
      supabase.rpc('lavoro_pronto_per_montaggio', { p_lavoro_id: id }),
    ])

  const satelliti: Satellite[] = satellitiGrezzi ?? []
  const satelliteIds = satelliti.map((s) => s.id)

  const [{ data: allegatiGrezzi }, { data: righeGrezze }] = await Promise.all([
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_allegato').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteAllegato[] }),
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_articolo').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteArticolo[] }),
  ])

  const allegati: SatelliteAllegato[] = allegatiGrezzi ?? []
  const allegatiById: Record<string, SatelliteAllegato[]> = {}
  for (const a of allegati) {
    ;(allegatiById[a.satellite_id] ??= []).push(a)
  }

  const righe: SatelliteArticolo[] = righeGrezze ?? []
  const righePerSatellite: Record<string, SatelliteArticolo[]> = {}
  for (const r of righe) {
    ;(righePerSatellite[r.satellite_id] ??= []).push(r)
  }

  const statoEffettivoById: Record<string, string> = {}
  for (const s of statoEffettivoGrezzo ?? []) {
    if (s.stato_effettivo) statoEffettivoById[s.satellite_id] = s.stato_effettivo
  }

  const briefing = satelliti.find((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'briefing')
  const progettoSatelliti = satelliti.filter((s) => s.tipo === 'progetto')
  const preventivoSatelliti = satelliti.filter((s) => s.tipo === 'preventivo')
  const campioneSatelliti = satelliti.filter((s) => s.tipo === 'campione')

  const appuntamentiVerificaMisure = satelliti
    .filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'verifica_misure')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const appuntamentiMontaggio = satelliti
    .filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'montaggio')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const acquistiSatelliti = satelliti.filter((s) => s.tipo === 'acquisti')
  const lavorazioneEsternaSatelliti = satelliti.filter((s) => s.tipo === 'lavorazione_esterna')
  const costruzioneSatellite = satelliti.find((s) => s.tipo === 'costruzione')
  const noleggioSatellite = satelliti.find((s) => s.tipo === 'noleggio')

  const fornitoreSedeIds = [
    ...new Set([...acquistiSatelliti, ...lavorazioneEsternaSatelliti].map((s) => s.fornitore_sede_id).filter((v): v is string => !!v)),
  ]
  const { data: fornitoreSedi } =
    fornitoreSedeIds.length > 0
      ? await supabase.from('fornitore_sede').select('id, fornitore_id, nome, citta').in('id', fornitoreSedeIds)
      : { data: [] }

  const fornitoreIds = [...new Set((fornitoreSedi ?? []).map((s) => s.fornitore_id))]
  const { data: fornitori } =
    fornitoreIds.length > 0
      ? await supabase.from('fornitore').select('id, ragione_sociale').in('id', fornitoreIds)
      : { data: [] }

  const ragioneSocialePerFornitoreId = new Map((fornitori ?? []).map((f) => [f.id, f.ragione_sociale]))
  const labelPerSedeId = new Map(
    (fornitoreSedi ?? []).map((s) => [
      s.id,
      `${ragioneSocialePerFornitoreId.get(s.fornitore_id) ?? '—'} — ${s.nome}${s.citta ? ` (${s.citta})` : ''}`,
    ]),
  )

  const haEsecuzione =
    appuntamentiVerificaMisure.length > 0 ||
    appuntamentiMontaggio.length > 0 ||
    acquistiSatelliti.length > 0 ||
    lavorazioneEsternaSatelliti.length > 0 ||
    !!costruzioneSatellite ||
    !!noleggioSatellite

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
        ) : lavoro.stato === 'accettato' ? (
          <div className="space-y-2">
            {lavoro.accettato_at && (
              <p className="text-sm text-gray-500">
                Lavoro accettato il {new Date(lavoro.accettato_at).toLocaleDateString('it-IT')}
              </p>
            )}
            {isOwner && <LavoroSegnaCompletato lavoroId={lavoro.id} pronto={!!pronto} />}
          </div>
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
          <SatelliteAppuntamento
            satellite={briefing}
            lavoroId={lavoro.id}
            titolo="Briefing"
            allegati={allegatiById[briefing.id] ?? []}
            isOwner={!!isOwner}
            mostraNonNecessario={false}
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

        {haEsecuzione && (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Esecuzione</h2>

            {appuntamentiVerificaMisure.map((a) => (
              <SatelliteAppuntamento
                key={a.id}
                satellite={a}
                lavoroId={lavoro.id}
                titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'verifica_misure']}
                allegati={allegatiById[a.id] ?? []}
                isOwner={!!isOwner}
                mostraNonNecessario
              />
            ))}
            {isOwner && <SatelliteNuovoAppuntamento lavoroId={lavoro.id} />}

            {acquistiSatelliti.map((s) => (
              <SatelliteOrdine
                key={s.id}
                satellite={s}
                righe={righePerSatellite[s.id] ?? []}
                fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
                lavoroId={lavoro.id}
                isOwner={!!isOwner}
              />
            ))}
            {isOwner && <SatelliteNuovoOrdine lavoroId={lavoro.id} tipo="acquisti" />}

            {lavorazioneEsternaSatelliti.map((s) => (
              <SatelliteOrdine
                key={s.id}
                satellite={s}
                righe={righePerSatellite[s.id] ?? []}
                fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
                lavoroId={lavoro.id}
                isOwner={!!isOwner}
              />
            ))}
            {isOwner && <SatelliteNuovoOrdine lavoroId={lavoro.id} tipo="lavorazione_esterna" />}

            {costruzioneSatellite && (
              <SatelliteCostruzione satellite={costruzioneSatellite} lavoroId={lavoro.id} isOwner={!!isOwner} />
            )}

            {noleggioSatellite && (
              <SatelliteNoleggio satellite={noleggioSatellite} lavoroId={lavoro.id} isOwner={!!isOwner} />
            )}

            {appuntamentiMontaggio.map((a) => (
              <SatelliteAppuntamento
                key={a.id}
                satellite={a}
                lavoroId={lavoro.id}
                titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'montaggio']}
                allegati={allegatiById[a.id] ?? []}
                isOwner={!!isOwner}
                mostraNonNecessario
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
