export type KpiDashboard = {
  lavori_in_corso: number
  importo_lavori_accettati: number
  // Nuovo il 2026-08-16 (unificazione Dashboard/Conclusi, vedi CLAUDE.md):
  // solo per il filtro "Conclusi" ("Valore totale generato").
  valore_totale_completati: number
  tempo_preventivo_giorni: number | null
  tempo_preventivo_campione: number
  tempo_completamento_giorni: number | null
  tempo_completamento_campione: number
}

// campione=0: nessun dato ancora disponibile nella finestra rolling (KPI 3/4,
// media storica) — non è un valore "cattivo", è semplicemente assente, quindi
// va mostrato come "Dati insufficienti" invece di un numero fuorviante. I KPI
// 1/2 (conteggio/somma puntuali, non storici) non usano questa funzione: uno
// zero reale è una risposta valida, non "dati insufficienti".
export function formattaGiorni(mediaGiorni: number | null, campione: number): string {
  if (campione === 0 || mediaGiorni === null) return '—'
  return mediaGiorni.toFixed(1)
}
