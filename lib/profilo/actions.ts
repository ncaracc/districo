'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { cifraPassword } from '@/lib/crypto/credenziali-smtp'

type AzioneResult = { ok: true } | { ok: false; error: string }

type CredenzialiSmtpFields = {
  host: string
  porta: number
  username: string
  password: string // vuota = non modificare quella già salvata
  sicurezza: 'ssl' | 'starttls' | 'nessuna'
}

export async function aggiornaCredenzialiSmtp(fields: CredenzialiSmtpFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const update: {
    smtp_host: string | null
    smtp_porta: number | null
    smtp_username: string | null
    smtp_sicurezza: 'ssl' | 'starttls' | 'nessuna'
    smtp_password_cifrata?: string
  } = {
    smtp_host: fields.host.trim() || null,
    smtp_porta: fields.porta || null,
    smtp_username: fields.username.trim() || null,
    smtp_sicurezza: fields.sicurezza,
  }

  // La password non viene mai rimandata al client (vedi ProfiloSmtpForm): un campo
  // vuoto in submit significa "non modificarla", non "cancellala".
  if (fields.password.trim()) {
    update.smtp_password_cifrata = cifraPassword(fields.password.trim())
  }

  const { error } = await supabase.from('artigiano').update(update).eq('id', user.id)

  if (error) {
    console.error('aggiornaCredenzialiSmtp: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}
