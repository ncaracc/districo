import crypto from 'node:crypto'

// Cifratura a riposo della password SMTP personale di ciascun artigiano
// (colonna artigiano.smtp_password_cifrata). AES-256-GCM: cifrario simmetrico
// con autenticazione integrata (rileva manomissioni del ciphertext), stesso
// algoritmo raccomandato di default da Node — nessuna libreria aggiuntiva.
// La chiave vive solo nell'ambiente applicativo (env SMTP_CREDENZIALI_KEY),
// mai nel database: chi ha accesso solo al DB (es. dump, SQL Editor) non può
// decifrare le password anche avendo il ciphertext.
const ALGORITMO = 'aes-256-gcm'

function chiave(): Buffer {
  const raw = process.env.SMTP_CREDENZIALI_KEY
  if (!raw) {
    throw new Error(
      'SMTP_CREDENZIALI_KEY non configurata: necessaria per cifrare/decifrare le credenziali SMTP personali',
    )
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) {
    throw new Error('SMTP_CREDENZIALI_KEY deve essere una chiave AES-256 codificata in base64 (32 byte)')
  }
  return buf
}

// Formato: <iv>.<authTag>.<ciphertext>, ciascuno base64.
export function cifraPassword(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITMO, chiave(), iv)
  const cifrato = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, cifrato].map((b) => b.toString('base64')).join('.')
}

export function decifraPassword(ciphertext: string): string {
  const [ivB64, tagB64, datiB64] = ciphertext.split('.')
  if (!ivB64 || !tagB64 || !datiB64) {
    throw new Error('Formato del ciphertext SMTP non valido')
  }
  const decipher = crypto.createDecipheriv(ALGORITMO, chiave(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(datiB64, 'base64')), decipher.final()]).toString('utf8')
}
