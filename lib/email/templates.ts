// Esportata (2026-08-17, vedi CLAUDE.md — mail ordine in HTML con banner):
// riusata anche da lib/lavori/ordini-email.ts per il link cliccabile del
// banner e per l'URL assoluto dei PNG del banner — le email HTML non
// possono riferire asset con un percorso relativo, serve sempre un dominio
// completo, stesso principio già in uso qui per i link di conferma email.
export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://www.districo.it'
}

export function invitoLavoroEmail({
  nomeInvitante,
  lavoroTitolo,
  token,
}: {
  nomeInvitante: string
  lavoroTitolo: string
  token: string
}) {
  const link = `${siteUrl()}/invito/${token}`
  return {
    subject: `${nomeInvitante} ti ha invitato a collaborare su Districo`,
    html: `
      <div style="font-family: sans-serif; color: #111; max-width: 480px; margin: 0 auto;">
        <p>Ciao,</p>
        <p><strong>${nomeInvitante}</strong> ti ha invitato a collaborare al lavoro
        "<strong>${lavoroTitolo}</strong>" su Districo.</p>
        <p>
          <a href="${link}" style="display: inline-block; background: #111; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none;">
            Accetta l'invito
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">Il link è valido per 10 giorni. Se non ti aspettavi questo invito, puoi ignorare questa email.</p>
      </div>
    `,
  }
}
