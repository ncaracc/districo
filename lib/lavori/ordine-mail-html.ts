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
//
// Revisione 2026-08-18 (vedi CLAUDE.md — sessione "allineamento allo
// standard"): due correzioni rispetto alla sessione precedente — (1) il
// banner si sposta dalla testa al fondo della mail (dopo il Congedo); lo
// swap responsivo a due immagini (orizzontale su schermi larghi, impilata
// sotto i 480px, via media query) RESTA — richiesta iniziale corretta a
// metà sessione dall'utente dopo una lettura sbagliata da parte mia (avevo
// capito "elimina lo swap", in realtà andava mantenuto identico) — l'unico
// intervento reale è che ORA entrambe le varianti sono esplicitamente
// centrate rispetto al corpo della mail (`align="center"` sulla cella,
// oltre a `margin:0 auto` sulle immagini: la versione orizzontale prima
// non aveva né l'uno né l'altro, si affidava solo a `width:100%` per
// riempire la cella — sufficiente nella maggior parte dei client, ma non
// un vero centraggio esplicito, e client basati sul motore Word di Outlook
// desktop non garantiscono che un `<a>`/`<img>` senza `align`/margin
// espliciti restino centrati); (2) la tabella referenze perde le colonne
// di prezzo (unitario e totale riga/complessivo): il prezzo resta un dato
// interno (modale Acquisto, per Spese complessive/Margine), non da
// comunicare al fornitore nell'ordine — CORREGGE la decisione della
// sessione precedente che le aveva introdotte.
import { siteUrl } from '@/lib/email/templates'
import { testoConABr } from '@/lib/lavori/mail-ordine-testo'

function escapeHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export type RigaEmail = {
  descrizione: string
  coloreFinitura: string | null
  quantita: number
}

// Banner cliccabile in fondo alla mail — swap responsivo invariato (due
// <img>, una mostrata via CSS/media query, l'altra nascosta di default e
// mostrata sotto i 480px): la versione ORIZZONTALE resta il default/
// fallback (client come Outlook desktop ignorano le media query e mostrano
// sempre e solo lo stato "a riposo" del primo <img>). Entrambe le varianti
// ora esplicitamente centrate (2026-08-18): `margin:0 auto` su ciascuna
// immagine (già presente sull'impilata, aggiunto qui anche
// all'orizzontale) — il vero centraggio bulletproof viene però
// dall'`align="center"` sulla `<td>` chiamante (vedi corpoMailOrdine),
// tecnica standard per le mail perché non tutti i client rispettano CSS
// margin/auto su elementi block. Larghezza dell'orizzontale allineata al
// resto del contenuto (544px = 600 − 28px di padding per lato, stessa
// larghezza utile del testo/tabella sopra), non più piena larghezza della
// card come nell'header di prima: a fondo mail, dentro la stessa cella con
// lo stesso padding orizzontale del testo, risulta visivamente allineata/
// centrata sotto il Congedo invece che a filo bordo.
function bannerHtml(): string {
  const base = siteUrl()
  const orizzontale = `${base}/email-assets/ordine-banner-orizzontale.png`
  const impilato = `${base}/email-assets/ordine-banner-impilato.png`
  return `
    <a href="${base}" target="_blank" style="display:block; text-decoration:none; border:0;">
      <img src="${orizzontale}" alt="Districo" width="544" class="banner-orizzontale" style="display:block; width:100%; max-width:544px; height:auto; margin:0 auto; border:0;" />
      <img src="${impilato}" alt="Districo" width="280" class="banner-impilato" style="display:none; width:100%; max-width:280px; height:auto; margin:0 auto; border:0;" />
    </a>
  `
}

// Colonne: solo descrizione e quantità (2026-08-18, vedi commento in testa
// al file — il prezzo non è più mostrato al fornitore).
function tabellaReferenzeHtml(righe: RigaEmail[]): string {
  const th = 'padding:8px 6px; border-bottom:2px solid #111827; font-size:11px; text-transform:uppercase; letter-spacing:0.03em; color:#6b7280; font-weight:600;'
  const td = 'padding:8px 6px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#111827;'

  const righeHtml = righe
    .map((r) => {
      const descrizione = escapeHtml(r.descrizione) + (r.coloreFinitura ? ` — ${escapeHtml(r.coloreFinitura)}` : '')
      const quantitaTesto = String(r.quantita).replace('.', ',')
      return `
        <tr>
          <td style="${td}">${descrizione}</td>
          <td align="right" style="${td}">${quantitaTesto}</td>
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
        </tr>
      </thead>
      <tbody>
        ${righeHtml}
      </tbody>
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
}: {
  apertura: string
  congedo: string
  righe: RigaEmail[]
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
            <td style="padding:24px 28px; font-family:Arial,sans-serif; font-size:15px; line-height:1.6; color:#111827;">
              <p style="margin:0 0 18px;">${testoConABr(escapeHtml(apertura))}</p>
              ${tabellaReferenzeHtml(righe)}
              <p style="margin:22px 0 0;">${testoConABr(escapeHtml(congedo))}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 28px 28px; text-align:center;">${bannerHtml()}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
