// Unificazione Dashboard + Conclusi in un'unica vista con filtri (2026-08-16,
// vedi CLAUDE.md): tipi/costanti puri condivisi tra page.tsx (Server
// Component, valida il param e passa p_filtro alla RPC) e i componenti di
// rendering (chip filtro, KPI, ordinamento) — nessun import da next/headers
// o dipendenza server-only qui, importabile ovunque.
//
// Chiave 'completati' rinominata da 'conclusi' (sessione 2026-08-17, vedi
// CLAUDE.md): il vecchio filtro "Conclusi" mostrava insieme completato+
// rifiutato, ridondante col chip "Rifiutati" già esistente — ora filtra
// solo stato='completato' (migration 0050).

export type FiltroLavori = 'in-corso' | 'completati' | 'rifiutati' | 'tutti'

export const FILTRO_DEFAULT: FiltroLavori = 'in-corso'

// Valore del param URL (`filtro`) -> valore passato a p_filtro della RPC
// lavori_dashboard() (nomi diversi: qui trattino, lato SQL underscore, per
// restare coerenti con le convenzioni rispettive di URL/SQL).
const FILTRO_A_P_FILTRO: Record<FiltroLavori, string> = {
  'in-corso': 'in_corso',
  completati: 'completati',
  rifiutati: 'rifiutati',
  tutti: 'tutti',
}

export function pFiltroSql(filtro: FiltroLavori): string {
  return FILTRO_A_P_FILTRO[filtro]
}

export function parseFiltro(valore: string | undefined): FiltroLavori {
  if (valore === 'completati' || valore === 'rifiutati' || valore === 'tutti') return valore
  return FILTRO_DEFAULT
}

export const FILTRO_LABEL: Record<FiltroLavori, string> = {
  'in-corso': 'In corso',
  completati: 'Completati',
  rifiutati: 'Rifiutati',
  tutti: 'Tutti',
}

// Etichetta del 1° KPI ("conteggio del filtro corrente"), decisa in sessione
// (2026-08-16, vedi CLAUDE.md): non un semplice "Totale lavori" fisso, cambia
// per filtro in modo che il numero resti sempre leggibile senza dover
// guardare quale chip è attiva.
export const FILTRO_LABEL_CONTEGGIO: Record<FiltroLavori, string> = {
  'in-corso': 'Totale lavori in corso',
  completati: 'Totale lavori completati',
  rifiutati: 'Totale lavori rifiutati',
  tutti: 'Totale lavori',
}

type LavoroOrdinabile = {
  id: string
  created_at: string
  data_decisione_preventivo: string | null
}

// Ordinamento — dipende dal filtro attivo (deciso con l'utente in sessione,
// vedi CLAUDE.md): 'in-corso' e 'tutti' per data di creazione crescente
// (meno recenti in cima); 'completati' per chiusuraDataPerLavoroId
// decrescente (più recenti in cima, dato già disponibile su
// lavoro_satellite tipo 'chiusura' — nessuna colonna diretta su lavoro, va
// passato dal chiamante dopo una query mirata, stesso pattern già in uso
// nella vecchia pagina Conclusi); 'rifiutati' per data_decisione_preventivo
// decrescente (proxy verificato della data di rifiuto, vedi migration
// 0049) — un Lavoro rifiutato non ha quasi mai una Chiusura, chiusura_data
// non sarebbe un proxy affidabile lì. In entrambi i casi "decrescente", un
// Lavoro privo della data rilevante finisce in fondo (mai in cima con un
// valore arbitrario) — caso ormai solo teorico per 'completati' dal
// 2026-08-17 (uno stato 'completato' richiede il gate di Chiusura Lavoro,
// che valorizza sempre chiusura_data), lasciato comunque per difesa.
export function ordinaLavori<T extends LavoroOrdinabile>(
  lavori: T[],
  filtro: FiltroLavori,
  chiusuraDataPerLavoroId: Map<string, string | null>,
): T[] {
  if (filtro === 'in-corso' || filtro === 'tutti') {
    return [...lavori].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }
  if (filtro === 'rifiutati') {
    return [...lavori].sort((a, b) => {
      const da = a.data_decisione_preventivo
      const db = b.data_decisione_preventivo
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return new Date(db).getTime() - new Date(da).getTime()
    })
  }
  // 'completati'
  return [...lavori].sort((a, b) => {
    const da = chiusuraDataPerLavoroId.get(a.id)
    const db = chiusuraDataPerLavoroId.get(b.id)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return new Date(db).getTime() - new Date(da).getTime()
  })
}
