import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { KpiDurateNeutro } from '@/components/kpi-durate-neutro'

const STATO_LABEL: Record<string, string> = {
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

export default async function StatistichePage() {
  const supabase = await createClient()

  const [{ data: lavori }, { data: kpiGrezzo }] = await Promise.all([
    supabase
      .from('lavoro')
      .select('id, titolo, stato, cliente_id, data_lavoro')
      .in('stato', ['completato', 'rifiutato'])
      .order('data_lavoro', { ascending: false, nullsFirst: false }),
    supabase.rpc('kpi_durate'),
  ])
  const kpi = kpiGrezzo?.[0] ?? null

  const clienteIds = [...new Set((lavori ?? []).map((l) => l.cliente_id))]
  const { data: clienti } =
    clienteIds.length > 0 ? await supabase.from('cliente').select('id, nome').in('id', clienteIds) : { data: [] }
  const nomeClientePerId = new Map((clienti ?? []).map((c) => [c.id, c.nome]))

  return (
    // "Breakout" dal max-w-2xl del layout condiviso, stesso pattern di
    // app/(app)/lavori/page.tsx (Dashboard) — scoped a lg: in su per lo
    // stesso motivo lì documentato (min-width automatico di <main> come
    // flex item nel root layout).
    <div className="lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2">
      <div className="lg:px-12">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Lavori conclusi</h1>

        <KpiDurateNeutro kpi={kpi} />

        <h2 className="mb-3 text-sm font-semibold text-gray-700">Lavori chiusi</h2>

        {!lavori || lavori.length === 0 ? (
          <p className="text-sm text-gray-500">Nessun lavoro completato o rifiutato.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {lavori.map((l) => (
              <li key={l.id}>
                <Link href={`/lavori/${l.id}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{l.titolo}</p>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {STATO_LABEL[l.stato] ?? l.stato}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">{nomeClientePerId.get(l.cliente_id)}</p>
                    {l.data_lavoro && (
                      <p className="text-xs text-gray-500">{new Date(`${l.data_lavoro}T00:00:00`).toLocaleDateString('it-IT')}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
