// Flag "landing in modalità coming soon" (2026-08-19 sera, vedi CLAUDE.md).
//
// Sostituisce TEMPORANEAMENTE il contenuto di app/page.tsx con la sola
// sezione LandingComingSoon (components/landing/landing-coming-soon.tsx) —
// tutte le altre sezioni della landing definitiva (Hero, Il caos, Filo
// logico, Come funziona, Funzioni per fase, Personaggi, Beta, Pricing, FAQ,
// CTA finale) restano intatte nel repo, semplicemente non renderizzate
// finché questo flag resta `true` — nessuna riscrittura necessaria per
// riattivarle, basta rimettere il flag a `false`.
export const LANDING_COMING_SOON = true
