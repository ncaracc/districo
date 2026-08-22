'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Pagina admin /admin/utenti (2026-08-22, vedi CLAUDE.md). Chiama la
// funzione SQL SECURITY DEFINER `admin_imposta_beta_tester()` (migration
// 0058) — quella verifica `is_admin` internamente, indipendentemente dal
// guard di `app/admin/layout.tsx`: anche se questa action venisse
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

// Deroga manuale "accesso gratuito permanente" (2026-08-22, vedi CLAUDE.md
// — Principi architetturali, "Ruolo admin"): stesso pattern esatto di
// `impostaBetaTester` sopra, chiama `admin_imposta_accesso_gratuito()`
// (migration 0060, stessa verifica `is_admin` interna).
export async function impostaAccessoGratuito(artigianoId: string, valore: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_imposta_accesso_gratuito', {
    p_artigiano_id: artigianoId,
    p_valore: valore,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/utenti')
}

// Posti totali del programma beta (2026-08-22, mini-sito — vedi
// CLAUDE.md), `/admin/dashboard`. Update diretto, non una RPC: la RLS di
// `configurazione_beta` (migration 0064) è già "solo admin legge/
// modifica", nessun bisogno di una funzione SECURITY DEFINER dedicata.
export async function impostaPostiBetaTotali(valore: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('configurazione_beta')
    .update({ posti_beta_totali: valore })
    .eq('id', true)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/dashboard')
  revalidatePath('/beta')
}
