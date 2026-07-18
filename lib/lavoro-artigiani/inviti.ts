'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send-email'
import { invitoLavoroEmail } from '@/lib/email/templates'

const SCADENZA_INVITO_GIORNI = 10

type InvitaResult =
  | { ok: true; esito: 'notifica_in_app' | 'email_inviata' }
  | { ok: false; error: string }

export async function invitaArtigiano(lavoroId: string, email: string): Promise<InvitaResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const [{ data: invitante }, { data: lavoro }] = await Promise.all([
    supabase.from('artigiano').select('nome, cognome').eq('id', user.id).single(),
    supabase.from('lavoro').select('titolo').eq('id', lavoroId).single(),
  ])
  if (!invitante || !lavoro) return { ok: false, error: 'Lavoro non trovato' }

  const admin = createAdminClient()
  const { data: esistente } = await admin
    .from('artigiano')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (esistente) {
    const { error } = await supabase.from('lavoro_artigiani').insert({
      lavoro_id: lavoroId,
      artigiano_id: esistente.id,
      email_invitata: email,
      ruolo: 'ospite',
      stato: 'invitato',
    })
    if (error) return { ok: false, error: mapInsertError(error.code) }
    revalidatePath('/lavori')
    return { ok: true, esito: 'notifica_in_app' }
  }

  const token = randomUUID()
  const scadenza = new Date(Date.now() + SCADENZA_INVITO_GIORNI * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('lavoro_artigiani').insert({
    lavoro_id: lavoroId,
    email_invitata: email,
    ruolo: 'ospite',
    stato: 'invitato',
    token_invito: token,
    scadenza_invito: scadenza,
  })
  if (error) return { ok: false, error: mapInsertError(error.code) }

  const { subject, html } = invitoLavoroEmail({
    nomeInvitante: `${invitante.nome} ${invitante.cognome}`,
    lavoroTitolo: lavoro.titolo,
    token,
  })
  await sendEmail({ to: email, subject, html })

  revalidatePath('/lavori')
  return { ok: true, esito: 'email_inviata' }
}

export async function rinviaInvito(invitoId: string): Promise<InvitaResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { data: invito } = await supabase
    .from('lavoro_artigiani')
    .select('lavoro_id, email_invitata')
    .eq('id', invitoId)
    .single()
  if (!invito) return { ok: false, error: 'Invito non trovato' }

  const [{ data: invitante }, { data: lavoro }] = await Promise.all([
    supabase.from('artigiano').select('nome, cognome').eq('id', user.id).single(),
    supabase.from('lavoro').select('titolo').eq('id', invito.lavoro_id).single(),
  ])
  if (!invitante || !lavoro) return { ok: false, error: 'Lavoro non trovato' }

  const token = randomUUID()
  const scadenza = new Date(Date.now() + SCADENZA_INVITO_GIORNI * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('lavoro_artigiani')
    .update({ token_invito: token, scadenza_invito: scadenza, stato: 'invitato' })
    .eq('id', invitoId)
  if (error) return { ok: false, error: 'Errore nel rinnovo invito' }

  const { subject, html } = invitoLavoroEmail({
    nomeInvitante: `${invitante.nome} ${invitante.cognome}`,
    lavoroTitolo: lavoro.titolo,
    token,
  })
  await sendEmail({ to: invito.email_invitata, subject, html })

  revalidatePath('/lavori')
  return { ok: true, esito: 'email_inviata' }
}

export async function accettaInvito(invitoId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lavoro_artigiani')
    .update({ stato: 'accettato' })
    .eq('id', invitoId)
  if (error) return { ok: false as const, error: 'Errore nell’accettare l’invito' }
  revalidatePath('/lavori')
  return { ok: true as const }
}

export async function rifiutaInvito(invitoId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lavoro_artigiani')
    .update({ stato: 'rifiutato' })
    .eq('id', invitoId)
  if (error) return { ok: false as const, error: 'Errore nel rifiutare l’invito' }
  revalidatePath('/lavori')
  return { ok: true as const }
}

function mapInsertError(code: string | undefined) {
  if (code === '23505') return 'Questo artigiano è già stato invitato a questo lavoro'
  return 'Errore nell’invio dell’invito'
}
