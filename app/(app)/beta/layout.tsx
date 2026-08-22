import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Sezione Beta tester (2026-08-22, vedi CLAUDE.md). Guard aggiuntivo oltre
// a quello già presente in app/(app)/layout.tsx (autenticazione + gate
// abbonamento, invariato) — qui: accesso solo a chi ha `beta_tester=true`
// OPPURE `is_admin=true` — l'admin deve poter sempre vedere/rispondere/
// moderare, anche se il suo account non è marcato beta tester. Nessun
// errore che riveli l'esistenza della sezione a chi non ha accesso,
// solo un redirect silenzioso — stesso principio già in uso per
// app/admin/layout.tsx.
export default async function BetaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('beta_tester, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!artigiano?.beta_tester && !artigiano?.is_admin) redirect('/lavori')

  return <>{children}</>
}
