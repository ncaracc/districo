'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { cifraPassword, decifraPassword } from '@/lib/crypto/credenziali-smtp'
import { sendEmailPersonale, traduciErroreSmtp } from '@/lib/email/send-email-personale'

type AzioneResult = { ok: true } | { ok: false; error: string }
type TestSmtpResult = { ok: true; email: string } | { ok: false; error: string }

type ObiettiviKpiFields = {
  targetPreventivoGiorni: number
  targetProgettoGiorni: number
  targetProduzioneGiorni: number
  targetMontaggioGiorni: number
  kpiFinestraMesi: number
}

export async function aggiornaObiettiviKpi(fields: ObiettiviKpiFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { error } = await supabase
    .from('artigiano')
    .update({
      target_preventivo_giorni: fields.targetPreventivoGiorni,
      target_progetto_giorni: fields.targetProgettoGiorni,
      target_produzione_giorni: fields.targetProduzioneGiorni,
      target_montaggio_giorni: fields.targetMontaggioGiorni,
      kpi_finestra_mesi: fields.kpiFinestraMesi,
    })
    .eq('id', user.id)

  if (error) {
    console.error('aggiornaObiettiviKpi: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  // /statistiche non esiste più (unificazione Dashboard/Conclusi, 2026-08-16,
  // vedi CLAUDE.md) — i lavori conclusi/rifiutati vivono ora dentro /lavori
  // con un filtro, stessa revalidatePath('/lavori') qui sotto li copre già.
  revalidatePath('/profilo/impostazioni')
  revalidatePath('/lavori')
  return { ok: true }
}

// Testo mail ordine — Apertura/Congedo personalizzabili PER TONO
// (2026-08-19, vedi CLAUDE.md — CORREGGE il design del 17/8, una singola
// coppia): il tono si sceglie ora al momento dell'invio (vedi
// components/satellite-ordine.tsx/lib/lavori/ordini-email.ts), perché
// dipende dal fornitore a cui si scrive, non è una preferenza fissa
// dell'artigiano — servono quindi due coppie indipendenti, entrambe
// opzionali (null = usa il default applicativo di quel tono). Stringa
// vuota (o di soli spazi) trattata come "non impostato" (null), stesso
// principio già in uso per gli altri campi opzionali dei form di questo
// file (es. coloreFinitura in referenze.ts). Il valore SALVATO quando non
// è vuoto resta però quello originale, non `.trim()`-ato: i default
// (DEFAULT_APERTURA_*/CONGEDO_*, lib/lavori/mail-ordine-testo.ts)
// terminano deliberatamente con un `\n` (riga vuota prima dell'elenco
// referenze) — un `.trim()` incondizionato lo avrebbe silenziosamente
// perso ad ogni salvataggio, bug riprodotto e corretto nella sessione del
// 17/8, stessa cautela mantenuta qui.
type TestoMailFields = {
  aperturaFormale: string
  congedoFormale: string
  aperturaInformale: string
  congedoInformale: string
}

export async function aggiornaTestoMail(fields: TestoMailFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { error } = await supabase
    .from('artigiano')
    .update({
      mail_ordine_apertura_formale: fields.aperturaFormale.trim() ? fields.aperturaFormale : null,
      mail_ordine_congedo_formale: fields.congedoFormale.trim() ? fields.congedoFormale : null,
      mail_ordine_apertura_informale: fields.aperturaInformale.trim() ? fields.aperturaInformale : null,
      mail_ordine_congedo_informale: fields.congedoInformale.trim() ? fields.congedoInformale : null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('aggiornaTestoMail: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}

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

// Testa le credenziali SMTP personali GIÀ SALVATE (non i valori eventualmente
// modificati e non ancora inviati nel form): apre una connessione reale e invia
// un'email di prova all'artigiano stesso (mittente e destinatario coincidono),
// stessa infrastruttura di invio già usata per gli ordini
// (lib/email/send-email-personale.ts) — nessun meccanismo separato.
export async function testaCredenzialiSmtp(): Promise<TestSmtpResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('nome, email, smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza')
    .eq('id', user.id)
    .maybeSingle()

  if (
    !artigiano ||
    !artigiano.smtp_host ||
    !artigiano.smtp_porta ||
    !artigiano.smtp_username ||
    !artigiano.smtp_password_cifrata ||
    !artigiano.smtp_sicurezza
  ) {
    return { ok: false, error: 'Nessuna credenziale SMTP salvata: configurale e salvale prima di testarle.' }
  }

  try {
    await sendEmailPersonale({
      smtp: {
        host: artigiano.smtp_host,
        porta: artigiano.smtp_porta,
        username: artigiano.smtp_username,
        password: decifraPassword(artigiano.smtp_password_cifrata),
        sicurezza: artigiano.smtp_sicurezza,
      },
      mittenteNome: artigiano.nome,
      to: artigiano.email,
      subject: 'Test credenziali SMTP - Districo',
      html: '<p>Questa email conferma che le tue credenziali SMTP personali su Districo funzionano correttamente.</p>',
    })
  } catch (err) {
    console.error('testaCredenzialiSmtp: invio fallito', err)
    return { ok: false, error: traduciErroreSmtp(err) }
  }

  return { ok: true, email: artigiano.email }
}
