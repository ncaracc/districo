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

  const { data: propriLavori } = await supabase
    .from('lavoro_artigiani')
    .select('lavoro_id')
    .eq('artigiano_id', user.id)
    .eq('stato', 'accettato')

  const lavoroIds = [...new Set((propriLavori ?? []).map((r) => r.lavoro_id))]

  const { data: lavori } =
    lavoroIds.length > 0
      ? await supabase
          .from('lavoro')
          .select('id, titolo, stato, cliente_id, created_at')
          .in('id', lavoroIds)
          .order('created_at', { ascending: false })
      : { data: [] }

  const clienteIds = [...new Set((lavori ?? []).map((l) => l.cliente_id))]

  const { data: clienti } =
    clienteIds.length > 0
      ? await supabase.from('cliente').select('id, nome').in('id', clienteIds)
      : { data: [] }
  const nomeClientePerId = new Map((clienti ?? []).map((c) => [c.id, c.nome]))

  const { data: attivita } =
    lavoroIds.length > 0
      ? await supabase.from('attivita').select('lavoro_id, stato').in('lavoro_id', lavoroIds)
      : { data: [] }

  const conteggioPerLavoro = new Map<string, { aperte: number; bloccate: number }>()
  for (const a of attivita ?? []) {
    const curr = conteggioPerLavoro.get(a.lavoro_id) ?? { aperte: 0, bloccate: 0 }
    if (a.stato !== 'fatta') curr.aperte += 1
    if (a.stato === 'bloccata') curr.bloccate += 1
    conteggioPerLavoro.set(a.lavoro_id, curr)
  }

  return (
    <div>
      {invitiConDettagli.length > 0 && (
        <div className="mb-6 space-y-3">
          {invitiConDettagli.map((invito) => (
            <InvitoPendingCard key={invito.id} {...invito} />
          ))}
        </div>
      )}

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Lavori</h1>

      {!lavori || lavori.length === 0 ? (
        <p className="text-sm text-gray-500">
          Non hai ancora nessun lavoro. Puoi crearne uno dal dettaglio di un cliente.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {lavori.map((l) => {
            const conteggio = conteggioPerLavoro.get(l.id)
            return (
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
                  <p className="mt-0.5 text-xs text-gray-500">
                    {nomeClientePerId.get(l.cliente_id)}
                    {conteggio && conteggio.aperte > 0 && (
                      <span className={conteggio.bloccate > 0 ? 'ml-2 text-red-600' : 'ml-2 text-gray-500'}>
                        · {conteggio.aperte} attività aperte
                        {conteggio.bloccate > 0 ? ` (${conteggio.bloccate} bloccate)` : ''}
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
