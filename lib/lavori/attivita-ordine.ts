// Ordine logico fisso delle 9 tipologie di attività (Sprint "fondamenta"
// 2026-08-02, vedi CLAUDE.md) — unica fonte di verità per: (a) l'ordine di
// visualizzazione nella tabella attività del Lavoro, (b) l'ordine delle
// opzioni nel modale "Aggiungi attività". Non corrisponde 1:1 a `tipo` di
// `lavoro_satellite`: l'Appuntamento si divide in tre voci distinte
// (Briefing/Verifica misure/Montaggio, uno per `tipo_appuntamento`), e i nomi
// "campionatura"/"acquisto" sono solo l'etichetta UI dei `tipo` DB
// "campione"/"acquisti" (invariati a schema, vedi CLAUDE.md).
export type ChiaveAttivita =
  | 'briefing'
  | 'progetto'
  | 'preventivo'
  | 'campionatura'
  | 'verifica_misure'
  | 'acquisto'
  | 'costruzione'
  | 'noleggio'
  | 'montaggio'

export const ORDINE_ATTIVITA: ChiaveAttivita[] = [
  'briefing',
  'progetto',
  'preventivo',
  'campionatura',
  'verifica_misure',
  'acquisto',
  'costruzione',
  'noleggio',
  'montaggio',
]

export const POSIZIONE_ATTIVITA: Record<ChiaveAttivita, number> = Object.fromEntries(
  ORDINE_ATTIVITA.map((chiave, i) => [chiave, i + 1]),
) as Record<ChiaveAttivita, number>

export const LABEL_ATTIVITA: Record<ChiaveAttivita, string> = {
  briefing: 'Briefing',
  progetto: 'Progetto',
  preventivo: 'Preventivo',
  campionatura: 'Campionatura',
  verifica_misure: 'Verifica misure',
  acquisto: 'Acquisto',
  costruzione: 'Costruzione',
  noleggio: 'Noleggio',
  montaggio: 'Montaggio',
}

// Progetto e Preventivo sono le uniche due non ripetibili: al più un'istanza
// per Lavoro, quindi compaiono in "Aggiungi attività" solo se non esistono
// già. Tutte le altre sono ripetibili — sempre proposte, indipendentemente da
// quante istanze esistano già.
export const RIPETIBILE_ATTIVITA: Record<ChiaveAttivita, boolean> = {
  briefing: true,
  progetto: false,
  preventivo: false,
  campionatura: true,
  verifica_misure: true,
  acquisto: true,
  costruzione: true,
  noleggio: true,
  montaggio: true,
}
