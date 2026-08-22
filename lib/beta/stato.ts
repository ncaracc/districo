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
