export type KpiDurate = {
  tempo_preventivazione_giorni: number | null
  tempo_preventivazione_campione: number
  tempo_progetto_giorni: number | null
  tempo_progetto_campione: number
  tempo_produzione_giorni: number | null
  tempo_produzione_campione: number
  tempo_montaggio_giorni: number | null
  tempo_montaggio_campione: number
}

export type SemaforoKpi = 'verde' | 'giallo' | 'rosso' | 'neutro'

// neutro: nessun dato ancora disponibile nella finestra temporale (campione=0)
// — non è un valore "cattivo" (rosso), è semplicemente assente, quindi va
// mostrato come stato neutro invece di un colore fuorviante.
export function semaforoKpi(mediaGiorni: number | null, campione: number, targetGiorni: number): SemaforoKpi {
  if (campione === 0 || mediaGiorni === null) return 'neutro'
  if (mediaGiorni <= targetGiorni) return 'verde'
  if (mediaGiorni <= targetGiorni * 1.2) return 'giallo'
  return 'rosso'
}

export function formattaGiorni(mediaGiorni: number | null, campione: number): string {
  if (campione === 0 || mediaGiorni === null) return '—'
  return mediaGiorni.toFixed(1)
}
