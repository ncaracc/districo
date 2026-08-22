// Label/colore badge stato Post_Beta — stesso pattern di
// lib/lavori/stato-lavoro.ts (palette satura, coerente col semaforo delle
// attività). Verde = aperto (si può ancora scrivere), grigio = chiuso.
export const STATO_POST_BETA_LABEL: Record<string, string> = {
  aperto: 'Aperto',
  chiuso: 'Chiuso',
}

export const STATO_POST_BETA_COLORE: Record<string, string> = {
  aperto: 'bg-green-500 text-white',
  chiuso: 'bg-gray-400 text-white',
}

// Tipo post (2026-08-22 sera, vedi CLAUDE.md — post "Info" per gli annunci
// admin): badge visivo mostrato solo per tipo='info' — il caso normale
// 'discussione' non ha bisogno di alcuna etichetta, stesso principio già
// seguito per il badge "nascosto" (visibile solo quando si applica).
// Azzurro (non uno stato "a LED"): rosso/giallo/verde restano riservati ai
// semafori delle Attività Lavoro, stesso accento già in uso per le CTA
// della landing.
export const TIPO_POST_BETA_INFO_COLORE = 'bg-sky-100 text-sky-700'
