import type { createAdminClient } from '@/lib/supabase/admin'

export async function getNomeInvitante(
  admin: ReturnType<typeof createAdminClient>,
  lavoroId: string,
) {
  const { data: ownerRow } = await admin
    .from('lavoro_artigiani')
    .select('artigiano_id')
    .eq('lavoro_id', lavoroId)
    .eq('ruolo', 'owner')
    .maybeSingle()

  if (!ownerRow?.artigiano_id) return 'Un collega'

  const { data: owner } = await admin
    .from('artigiano')
    .select('nome, cognome')
    .eq('id', ownerRow.artigiano_id)
    .single()

  return owner ? `${owner.nome} ${owner.cognome}` : 'Un collega'
}
