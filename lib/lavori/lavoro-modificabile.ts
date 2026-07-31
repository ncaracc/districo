import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export const ERRORE_LAVORO_COMPLETATO = 'Lavoro completato: riaprirlo per modificare'

// Un Lavoro completato è di sola lettura sui satelliti (aggiunta/modifica/
// eliminazione, incluso allegati): l'unico modo per tornare a modificarlo è
// "Riapri lavoro" (vedi CLAUDE.md). Verifica sempre lo stato reale del Lavoro
// collegato al satellite (mai il lavoroId passato dal client per un satellite
// diverso), per non fidarsi di un parametro che nell'azione server serve solo
// a costruire il path di revalidate.
export async function assertLavoroModificabile(
  supabase: SupabaseServerClient,
  lavoroId: string,
): Promise<{ ok: false; error: string } | null> {
  const { data } = await supabase.from('lavoro').select('stato').eq('id', lavoroId).maybeSingle()
  if (data?.stato === 'completato') return { ok: false, error: ERRORE_LAVORO_COMPLETATO }
  return null
}

export async function assertSatelliteModificabile(
  supabase: SupabaseServerClient,
  satelliteId: string,
): Promise<{ ok: false; error: string } | null> {
  const { data: satellite } = await supabase
    .from('lavoro_satellite')
    .select('lavoro_id')
    .eq('id', satelliteId)
    .maybeSingle()

  // Riga inesistente: nessun blocco qui, la query di scrittura successiva
  // (0 righe interessate/errore FK) resta l'unica fonte di verità in quel caso.
  if (!satellite) return null

  return assertLavoroModificabile(supabase, satellite.lavoro_id)
}
