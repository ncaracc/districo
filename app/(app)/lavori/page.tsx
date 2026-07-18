import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNomeInvitante } from '@/lib/lavoro-artigiani/dettagli'
import { InvitoPendingCard } from './invito-pending-card'

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

  return (
    <div>
      {invitiConDettagli.length > 0 && (
        <div className="mb-6 space-y-3">
          {invitiConDettagli.map((invito) => (
            <InvitoPendingCard key={invito.id} {...invito} />
          ))}
        </div>
      )}
      <p className="text-sm text-gray-500">Lista lavori — da implementare</p>
    </div>
  )
}
