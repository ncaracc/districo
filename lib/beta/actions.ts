'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Forum beta tester (2026-08-22, vedi CLAUDE.md). Ogni azione di scrittura
// "semplice" (nuovo messaggio, riapri, nascondi/mostra) passa da un
// insert/update diretto — la RLS di post_beta/messaggio_beta (migration
// 0062) concede già a ciascun chiamante esattamente i diritti giusti,
// nessuna funzione RPC dedicata necessaria per queste. Solo le due azioni
// composte (crea post + primo messaggio, chiudi + risposta) passano da
// una funzione SQL per l'atomicità (beta_crea_post/
// beta_chiudi_post_con_risposta) — vedi CLAUDE.md per il dettaglio.

export async function creaPostBeta(titolo: string, testo: string) {
  const supabase = await createClient()
  const { data: postId, error } = await supabase.rpc('beta_crea_post', {
    p_titolo: titolo,
    p_testo: testo,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/beta')
  redirect(`/beta/${postId}`)
}

export async function scriviMessaggioBeta(postId: string, testo: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')

  const { error } = await supabase.from('messaggio_beta').insert({
    post_id: postId,
    autore_id: user.id,
    testo,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/beta/${postId}`)
  revalidatePath('/beta')
}

export async function chiudiPostConRisposta(postId: string, testo: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('beta_chiudi_post_con_risposta', {
    p_post_id: postId,
    p_testo: testo,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/beta/${postId}`)
  revalidatePath('/beta')
}

export async function riapriPostBeta(postId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('post_beta')
    .update({ stato: 'aperto', chiuso_at: null })
    .eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath(`/beta/${postId}`)
  revalidatePath('/beta')
}

export async function nascondiPostBeta(postId: string, valore: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('post_beta').update({ nascosto: valore }).eq('id', postId)
  if (error) throw new Error(error.message)
  revalidatePath(`/beta/${postId}`)
  revalidatePath('/beta')
}

export async function nascondiMessaggioBeta(messaggioId: string, postId: string, valore: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('messaggio_beta').update({ nascosto: valore }).eq('id', messaggioId)
  if (error) throw new Error(error.message)
  revalidatePath(`/beta/${postId}`)
}
