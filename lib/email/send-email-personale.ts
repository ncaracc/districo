import nodemailer from 'nodemailer'

// A differenza di lib/email/send-email.ts (SMTP di sistema Aruba, usato solo per
// gli inviti "a quattro mani"), qui il transport è costruito al volo con le
// credenziali SMTP personali dell'artigiano che sta inviando: il mittente reale
// è la sua email, non un indirizzo di sistema. Nessuna cache del transporter tra
// chiamate (credenziali diverse per ogni artigiano, connessione una tantum).
export async function sendEmailPersonale({
  smtp,
  mittenteNome,
  to,
  subject,
  html,
}: {
  smtp: { host: string; porta: number; username: string; password: string; sicurezza: 'ssl' | 'starttls' | 'nessuna' }
  mittenteNome: string
  to: string
  subject: string
  html: string
}) {
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.porta,
    secure: smtp.sicurezza === 'ssl',
    requireTLS: smtp.sicurezza === 'starttls',
    auth: { user: smtp.username, pass: smtp.password },
  })

  await transporter.sendMail({
    from: `${mittenteNome} <${smtp.username}>`,
    to,
    subject,
    html,
  })
}

// Traduce gli errori grezzi di nodemailer/SMTP (spesso criptici, in inglese, a
// volte solo un codice numerico del server) in un messaggio comprensibile per
// l'artigiano. Usata da testaCredenzialiSmtp() — non tocca inviaOrdineSatellite,
// che resta con il suo messaggio generico esistente, fuori dallo scope di questa
// aggiunta.
export function traduciErroreSmtp(err: unknown): string {
  const code = (err as { code?: string } | null)?.code
  const responseCode = (err as { responseCode?: number } | null)?.responseCode

  if (code === 'EAUTH' || responseCode === 535 || responseCode === 534) {
    return 'Autenticazione fallita: verifica username e password.'
  }
  if (
    code === 'ECONNECTION' ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKET' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'EDNS'
  ) {
    return 'Impossibile raggiungere il server: verifica host e porta.'
  }
  return 'Invio fallito: verifica le credenziali e riprova.'
}
