// Corpo HTML della mail ordine ai fornitori (2026-08-17, vedi CLAUDE.md —
// "mail d'ordine ai fornitori in HTML con banner responsive", completa la
// sessione precedente che aveva introdotto Apertura/Congedo come testo
// semplice). Modulo puro (nessun 'use server'/'use client', nessuna query)
// — riceve solo dati già caricati da lib/lavori/ordini-email.ts, costruisce
// markup. Tabelle per il layout, CSS inline ovunque (niente flexbox/grid,
// niente <style> per il layout stesso — solo per lo swap responsivo dei due
// banner, unico punto dove un <style> in <head> è realmente necessario):
// compatibilità client mail (Outlook desktop in particolare non supporta
// flexbox/grid e ignora le media query, vedi sotto).
import { siteUrl } from '@/lib/email/templates'
import { testoConABr } from '@/lib/lavori/mail-ordine-testo'
import { formattaValuta } from '@/lib/formato-valuta'

function escapeHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export type RigaEmail = {
  descrizione: string
  coloreFinitura: string | null
  quantita: number
  prezzoUnitario: number | null
}

// Banner cliccabile, con lo swap responsivo standard per le mail (due <img>,
// una mostrata via CSS/media query, l'altra nascosta di default e mostrata
// sotto i 480px) — la versione ORIZZONTALE è il default/fallback: molti
// client (Outlook desktop su Word/mso in testa) ignorano del tutto le media
// query e mostrano sempre e solo lo stato "a riposo" del primo <img> (quindi
// deve essere quella pensata per essere vista anche su schermi larghi,
// mai quella verticale/più stretta). La versione impilata resta con
// `display:none` inline come stato di riposo, ribaltato a `block` solo
// dalla media query — stesso pattern richiesto esplicitamente.
function bannerHtml(): string {
  const base = siteUrl()
  const orizzontale = `${base}/email-assets/ordine-banner-orizzontale.png`
  const impilato = `${base}/email-assets/ordine-banner-impilato.png`
  return `
    <a href="${base}" target="_blank" style="display:block; text-decoration:none; border:0;">
      <img src="${orizzontale}" alt="Districo" width="600" class="banner-orizzontale" style="display:block; width:100%; max-width:600px; height:auto; border:0;" />
      <img src="${impilato}" alt="Districo" width="300" class="banner-impilato" style="display:none; width:100%; max-width:300px; height:auto; margin:0 auto; border:0;" />
    </a>
  `
}

// Colonne: descrizione, quantità, prezzo unitario, totale riga — riga finale
// col totale complessivo (decisione esplicita di questa sessione, INVERTE
// la scelta del 14/8 "il prezzo resta fuori dall'email": qui il prezzo
// unitario/totale sono richiesti esplicitamente in tabella, coerente con
// una mail che è a tutti gli effetti un ordine d'acquisto — vedi CLAUDE.md
// per il dettaglio). `prezzoUnitario` può essere `null` solo per dati
// storici pre-migration (righe "ad hoc" senza prezzo mai valorizzato,
// vedi CLAUDE.md 2026-08-17 sessione precedente) — mostrato "—" in quel
// caso, il totale riga/complessivo restano comunque quelli persistiti
// (calcolati server-side, coalesce-ati a 0 per le righe senza prezzo).
function tabellaReferenzeHtml(righe: RigaEmail[], totaleComplessivo: number): string {
  const th = 'padding:8px 6px; border-bottom:2px solid #111827; font-size:11px; text-transform:uppercase; letter-spacing:0.03em; color:#6b7280; font-weight:600;'
  const td = 'padding:8px 6px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#111827;'

  const righeHtml = righe
    .map((r) => {
      const descrizione = escapeHtml(r.descrizione) + (r.coloreFinitura ? ` — ${escapeHtml(r.coloreFinitura)}` : '')
      const quantitaTesto = String(r.quantita).replace('.', ',')
      const prezzoTesto = r.prezzoUnitario != null ? formattaValuta(r.prezzoUnitario, 1) : '—'
      const totaleRiga = r.prezzoUnitario != null ? r.prezzoUnitario * r.quantita : 0
      const totaleTesto = r.prezzoUnitario != null ? formattaValuta(totaleRiga, 2) : '—'
      return `
        <tr>
          <td style="${td}">${descrizione}</td>
          <td align="right" style="${td}">${quantitaTesto}</td>
          <td align="right" style="${td}">${prezzoTesto}</td>
          <td align="right" style="${td}">${totaleTesto}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:Arial,sans-serif; margin-top:4px;">
      <thead>
        <tr>
          <th align="left" style="${th}">Descrizione</th>
          <th align="right" style="${th}">Quantità</th>
          <th align="right" style="${th}">Prezzo unit.</th>
          <th align="right" style="${th}">Totale</th>
        </tr>
      </thead>
      <tbody>
        ${righeHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" align="right" style="padding:12px 6px 4px; font-family:Arial,sans-serif; font-size:14px; font-weight:700; color:#111827;">Totale</td>
          <td align="right" style="padding:12px 6px 4px; font-family:Arial,sans-serif; font-size:14px; font-weight:700; color:#111827;">${formattaValuta(totaleComplessivo, 2)}</td>
        </tr>
      </tfoot>
    </table>
  `
}

// Documento HTML completo (non un frammento, a differenza di
// lib/email/templates.ts:invitoLavoroEmail — qui serve un vero <head> per
// il <style> con la media query dello swap banner, che va dichiarato lì,
// non inline, per poter essere ignorato in blocco dai client che non lo
// supportano invece di essere applicato parzialmente).
export function corpoMailOrdine({
  apertura,
  congedo,
  righe,
  totaleComplessivo,
}: {
  apertura: string
  congedo: string
  righe: RigaEmail[]
  totaleComplessivo: number
}): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style type="text/css">
  body, table, td { margin:0; padding:0; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  .banner-impilato { display:none; }
  @media only screen and (max-width: 480px) {
    .banner-orizzontale { display:none !important; }
    .banner-impilato { display:block !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
          <tr>
            <td>${bannerHtml()}</td>
          </tr>
          <tr>
            <td style="padding:24px 28px; font-family:Arial,sans-serif; font-size:15px; line-height:1.6; color:#111827;">
              <p style="margin:0 0 18px;">${testoConABr(escapeHtml(apertura))}</p>
              ${tabellaReferenzeHtml(righe, totaleComplessivo)}
              <p style="margin:22px 0 0;">${testoConABr(escapeHtml(congedo))}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
