import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNomeInvitante } from '@/lib/lavoro-artigiani/dettagli'
import { InvitoPendingCard } from './invito-pending-card'

const STATO_LABEL: Record<string, string> = {
  trattativa: 'In trattativa',
  esecuzione: 'In esecuzione',
  chiuso: 'Chiuso',
}

const DOT_COLOR = { rosso: 'bg-red-500', giallo: 'bg-yellow-500', verde: 'bg-green-500' } as const

function RiepilogoSatelliti({
  rossi,
  gialli,
  verdi,
}: {
  rossi: number
  gialli: number
  verdi: number
}) {
  if (rossi + gialli + verdi === 0) {
    return <span className="text-xs text-gray-400">Nessun satellite</span>
  }
  return (
    <div className="flex items-center gap-3 text-xs text-gray-600">
      {rossi > 0 && (
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${DOT_COLOR.rosso}`} />
          {rossi}
        </span>
      )}
      {gialli > 0 && (
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${DOT_COLOR.giallo}`} />
          {gialli}
        </span>
      )}
      {verdi > 0 && (
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${DOT_COLOR.verde}`} />
          {verdi}
        </span>
      )}
    </div>
  )
}

export default async function LavoriPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: inviti } = await supabase
    .from('lavoro_artigiani')
    .select('id, lavoro_id')
    .eq('artigiano_id', user.id)
    .eq('stato', 'invitato')

  const admin = createAdminClient()
  const invitiConDettagli = await Promise.all(
    (inviti ?? []).map(async (invito) => {
      const [{ data: lavoro }, nomeInvitante] = await Promise.all([
        admin.from('lavoro').select('titolo').eq('id', invito.lavoro_id).single(),
        getNomeInvitante(admin, invito.lavoro_id),
      ])
      return { id: invito.id, lavoroTitolo: lavoro?.titolo ?? 'Lavoro', nomeInvitante }
    }),
  )

  const { data: lavori } = await supabase.rpc('lavori_dashboard')

  const clienteIds = [...new Set((lavori ?? []).map((l) => l.cliente_id))]

  const { data: clienti } =
    clienteIds.length > 0
      ? await supabase.from('cliente').select('id, nome').in('id', clienteIds)
      : { data: [] }
  const nomeClientePerId = new Map((clienti ?? []).map((c) => [c.id, c.nome]))

  return (
    <div>
      {invitiConDettagli.length > 0 && (
        <div className="mb-6 space-y-3">
          {invitiConDettagli.map((invito) => (
            <InvitoPendingCard key={invito.id} {...invito} />
          ))}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/lavori/nuovo"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + Nuovo Lavoro
        </Link>
      </div>

      {!lavori || lavori.length === 0 ? (
        <p className="text-sm text-gray-500">Non hai ancora nessun lavoro aperto.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {lavori.map((l) => (
            <li key={l.id}>
              <Link
                href={`/lavori/${l.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">{l.titolo}</p>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {STATO_LABEL[l.stato] ?? l.stato}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">{nomeClientePerId.get(l.cliente_id)}</p>
                  <RiepilogoSatelliti
                    rossi={l.satelliti_rossi}
                    gialli={l.satelliti_gialli}
                    verdi={l.satelliti_verdi}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
