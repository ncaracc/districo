import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

// secure/requireTLS derivati dalla porta, non più da SMTP_SECURE: dopo la scoperta
// del blocco Hetzner sulla porta 465 in uscita (vedi CLAUDE.md), il canale passa
// a 587/STARTTLS — derivarli dalla porta evita che i due valori possano
// disallinearsi (es. porta 587 con SMTP_SECURE ancora 'true' per dimenticanza).
// La variabile d'ambiente SMTP_SECURE non viene più letta, resta innocua se
// ancora presente in produzione.
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT)
    const secure = port === 465
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      requireTLS: !secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // Timeout espliciti (fix emerso da un blocco di rete in uscita sulla porta
      // 465 su apphub): senza questi, i default di nodemailer sono lunghissimi
      // (connectionTimeout 2 min, socketTimeout 10 min) e un blocco di rete si
      // traduce in un'attesa percepita come infinita invece di un errore chiaro.
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 12000,
    })
  }
  return transporter
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  await getTransporter().sendMail({
    from: `Districo <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
}
