import { createClient } from '@/lib/supabase/server'

// Risolve id artigiano -> "Nome Cognome" per la UI del forum beta
// (2026-08-22, vedi CLAUDE.md). Passa da `beta_nomi_autori()` (SECURITY
// DEFINER, migration 0062) invece di una `select` diretta su `artigiano`:
// la RLS di quella tabella è "vede solo se stesso" (0001), un beta tester
// non potrebbe altrimenti leggere il nome di un ALTRO beta tester.
export async function risolviNomiAutori(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
) {
  const idsUnici = Array.from(new Set(ids))
  if (idsUnici.length === 0) return new Map<string, string>()

  const { data } = await supabase.rpc('beta_nomi_autori', { p_ids: idsUnici })
  return new Map((data ?? []).map((a) => [a.id, `${a.nome} ${a.cognome}`]))
}
