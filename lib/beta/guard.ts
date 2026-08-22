import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Guard per le sotto-pagine del forum vero e proprio (/beta/[id],
// /beta/nuovo — 2026-08-22, vedi CLAUDE.md). `/beta` stessa NON usa più
// questo guard: è ora il punto di ingresso unico per TUTTI gli artigiani
// autenticati (mostra il forum o il mini-sito a seconda di
// `beta_tester`/`is_admin`) — chi non ha ancora accesso non deve mai
// atterrare per sbaglio su un thread o sul form "nuovo post" indovinando
// l'URL, da qui il redirect a `/beta` stessa (non più a `/lavori`: `/beta`
// è ormai sempre una destinazione valida per chiunque sia autenticato).
export async function richiedeAccessoBeta() {
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

  if (!artigiano?.beta_tester && !artigiano?.is_admin) redirect('/beta')

  return { supabase, user, isAdmin: !!artigiano.is_admin }
}
