'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Pagina admin /admin/utenti (2026-08-22, vedi CLAUDE.md). Chiama la
// funzione SQL SECURITY DEFINER `admin_imposta_beta_tester()` (migration
// 0058) — quella verifica `is_admin` internamente, indipendentemente dal
// guard di `app/(admin)/layout.tsx`: anche se questa action venisse
// invocata in qualche modo da un non-admin, il DB rifiuterebbe comunque
// l'update.
export async function impostaBetaTester(artigianoId: string, valore: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_imposta_beta_tester', {
    p_artigiano_id: artigianoId,
    p_valore: valore,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utenti')
}
