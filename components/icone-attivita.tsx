// Icone per la griglia "Aggiungi attività" (restyling 2026-08-19, vedi
// CLAUDE.md). Il prompt originale indicava icone "tabler icons" (`ti-*`) —
// discrepanza corretta senza bisogno di fermarsi: il progetto non ha MAI
// avuto una libreria di icone (vedi commento di testa in `components/
// icons.tsx`, "nessuna libreria di icone nel progetto, solo SVG inline",
// principio deliberato fin da luglio) — introdurne una ora, per una sola
// griglia, avrebbe rotto quella convenzione. Le 12 icone qui sotto sono SVG
// disegnati a mano nello stesso stile stroke-based delle icone esistenti
// (viewBox 24×24, `fill="none" stroke="currentColor" strokeWidth="1.8"`),
// scelte per rappresentare lo stesso concetto del nome tabler richiesto
// (es. `ti-message-2` → fumetto di conversazione), non un porting 1:1 del
// tracciato SVG originale.
//
// Una icona per `ChiaveAttivita` (lib/lavori/attivita-ordine.ts) — mappa
// `ICONA_ATTIVITA` in fondo al file, unico punto da cui la griglia in
// `lavoro-satelliti-tabella.tsx` risolve icona↔tipo, nessun secondo switch
// da tenere allineato.

import type { ChiaveAttivita } from '@/lib/lavori/attivita-ordine'

type IconaProps = { className?: string }

// Briefing — fumetto di conversazione (ti-message-2).
function IconaBriefing({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9.5L5 20v-3.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 10h10M7 13h6" strokeLinecap="round" />
    </svg>
  )
}

// Progetto — riga/squadra diagonale con tacche (ti-ruler-2), ruotata per
// distinguerla dalla riga dritta di Verifica misure.
function IconaProgetto({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <g transform="rotate(45 12 12)">
        <rect x="4" y="9.5" width="16" height="5" rx="1.2" strokeLinejoin="round" />
        <path d="M7.5 9.5v2.3M11 9.5v1.6M14.5 9.5v2.3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

// Preventivo — documento con una riga di totale a doppio tratto in fondo
// (ti-file-invoice), stesso corpo di IconaDocumento (icons.tsx) ma con un
// motivo diverso in coda per distinguerlo visivamente.
function IconaPreventivo({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M6.5 2.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 6.5 2.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 2.5V7a1 1 0 0 0 1 1h4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 12h7M8.5 15h7" strokeLinecap="round" />
      <path d="M8.5 17.7h7M8.5 19h7" strokeLinecap="round" />
    </svg>
  )
}

// Acconto — moneta con simbolo di valuta stilizzato (ti-coin).
function IconaAcconto({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.7 8.8a4.3 4.3 0 1 0 0 6.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 10.3h5.3M7.5 13.7h4.3" strokeLinecap="round" />
    </svg>
  )
}

// Attività non preventivate — quadrato arrotondato con un più (ti-square-
// rounded-plus).
function IconaSpesaNonPreventivata({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  )
}

// Campionatura — tavolozza da pittore con macchie di colore (ti-palette).
function IconaCampionatura({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M12 3.5c-4.7 0-8.5 3.6-8.5 8 0 3 2 4.3 3.8 4.3.9 0 1.2-.5 1.2-1.1 0-.5-.3-.9-.3-1.6 0-.9.8-1.6 1.8-1.6h2.2c2.8 0 5.3-1.7 5.3-5C17.5 5.7 15.2 3.5 12 3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="10.7" cy="6.9" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="7.3" r="0.95" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Verifica misure — riga dritta orizzontale con tacche (ti-ruler),
// distinta dalla riga diagonale di Progetto.
function IconaVerificaMisure({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="2.5" y="8" width="19" height="8" rx="1.3" strokeLinejoin="round" />
      <path d="M6 8v3M9.5 8v2M13 8v3M16.5 8v2" strokeLinecap="round" />
    </svg>
  )
}

// Acquisto — carrello della spesa (ti-shopping-cart).
function IconaAcquisto({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7a2 2 0 0 0 2-1.6L20 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="16.5" cy="20" r="1.3" />
    </svg>
  )
}

// Noleggio — furgone (ti-truck), coerente col principio "Noleggio =
// noleggio di un furgone/mezzo di trasporto" (CLAUDE.md, Principi
// architetturali).
function IconaNoleggio({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M2.5 6.5h11.5v9h-11.5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10h3.3l3.2 3v2.5H14Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.7" r="1.7" />
      <circle cx="16.5" cy="17.7" r="1.7" />
    </svg>
  )
}

// Costruzione — martello (ti-hammer): testa rettangolare larga (non
// arrotondata a "lucchetto", primo tentativo scartato dopo verifica
// visiva — leggeva come una chiave) perpendicolare a un manico stretto,
// entrambi ruotati insieme per l'inclinazione diagonale tipica dell'icona.
function IconaCostruzione({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <g transform="rotate(45 12 12)">
        <rect x="6.8" y="2.7" width="10.4" height="5" rx="1.1" strokeLinejoin="round" />
        <rect x="10.6" y="7.7" width="2.8" height="12.3" rx="1" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// Montaggio — chiave inglese (ti-tool).
function IconaMontaggio({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path
        d="M17.3 6.3a4 4 0 0 1-5.2 5.2L6.5 17.2a1.6 1.6 0 0 1-2.3-2.3l5.7-5.6a4 4 0 0 1 5.2-5.2l-2.6 2.6 1.4 1.4 2.6-2.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Chiusura Lavoro — coppa (ti-trophy).
function IconaChiusuraAttivita({ className }: IconaProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M7 5.5H4.7A2.2 2.2 0 0 0 5 9.9 4.6 4.6 0 0 0 8 11.4M17 5.5h2.3a2.2 2.2 0 0 1-.3 4.4 4.6 4.6 0 0 1-3 1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 12.7v3.3" strokeLinecap="round" />
      <path d="M9.3 20h5.4" strokeLinecap="round" />
      <path d="M9.8 20c0-1.9 2.2-2 2.2-4 0 2 2.2 2.1 2.2 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const ICONA_ATTIVITA: Record<ChiaveAttivita, (props: IconaProps) => React.JSX.Element> = {
  briefing: IconaBriefing,
  progetto: IconaProgetto,
  preventivo: IconaPreventivo,
  acconto: IconaAcconto,
  spesa_non_preventivata: IconaSpesaNonPreventivata,
  campionatura: IconaCampionatura,
  verifica_misure: IconaVerificaMisure,
  acquisto: IconaAcquisto,
  costruzione: IconaCostruzione,
  noleggio: IconaNoleggio,
  montaggio: IconaMontaggio,
  chiusura: IconaChiusuraAttivita,
}
