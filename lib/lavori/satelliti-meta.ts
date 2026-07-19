export type TipoSatellite =
  | 'appuntamento'
  | 'preventivo'
  | 'progetto'
  | 'acquisto_materiale'
  | 'acquisto_ferramenta'
  | 'lavorazione_esterna'
  | 'campione'

export const TIPI_SATELLITE: TipoSatellite[] = [
  'appuntamento',
  'preventivo',
  'progetto',
  'acquisto_materiale',
  'acquisto_ferramenta',
  'lavorazione_esterna',
  'campione',
]

export const TIPO_SATELLITE_LABEL: Record<TipoSatellite, string> = {
  appuntamento: 'Appuntamento',
  preventivo: 'Preventivo',
  progetto: 'Progetto',
  acquisto_materiale: 'Acquisto materiale',
  acquisto_ferramenta: 'Acquisto ferramenta',
  lavorazione_esterna: 'Lavorazione esterna',
  campione: 'Campione',
}

export type StatoSatellite =
  | 'fissato'
  | 'fatto'
  | 'in_preparazione'
  | 'presentato'
  | 'accettato'
  | 'da_acquistare'
  | 'acquistato'
  | 'ricevuto'
  | 'da_consegnare'
  | 'in_lavorazione'
  | 'completata'
  | 'da_preparare'
  | 'preparato'
  | 'ricevuto_dal_cliente'

// Sequenza di stati semaforo valida per ciascun tipo (deve restare in sync
// col check constraint di lavoro_satellite in 0009_lavoro_satellite.sql).
export const STATI_PER_TIPO: Record<TipoSatellite, StatoSatellite[]> = {
  appuntamento: ['fissato', 'fatto'],
  preventivo: ['in_preparazione', 'presentato', 'accettato'],
  progetto: ['in_preparazione', 'presentato', 'accettato'],
  acquisto_materiale: ['da_acquistare', 'acquistato', 'ricevuto'],
  acquisto_ferramenta: ['da_acquistare', 'acquistato', 'ricevuto'],
  lavorazione_esterna: ['da_consegnare', 'in_lavorazione', 'completata'],
  campione: ['da_preparare', 'preparato', 'ricevuto_dal_cliente'],
}

export const STATO_LABEL: Record<string, string> = {
  fissato: 'Fissato',
  fatto: 'Fatto',
  in_preparazione: 'In preparazione',
  presentato: 'Presentato',
  accettato: 'Accettato',
  da_acquistare: 'Da acquistare',
  acquistato: 'Acquistato',
  ricevuto: 'Ricevuto',
  da_consegnare: 'Da consegnare',
  in_lavorazione: 'In lavorazione',
  completata: 'Completata',
  da_preparare: 'Da preparare',
  preparato: 'Preparato',
  ricevuto_dal_cliente: 'Ricevuto dal cliente',
}

export type ColoreSemaforo = 'red' | 'yellow' | 'green'

export const DOT_COLOR: Record<ColoreSemaforo, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
}

export function coloreStato(tipo: TipoSatellite, stato: StatoSatellite): ColoreSemaforo {
  const stati = STATI_PER_TIPO[tipo]
  const idx: number = stati.indexOf(stato)
  if (idx === stati.length - 1) return 'green'
  if (idx <= 0) return 'red'
  return 'yellow'
}

// null se lo stato è già quello finale (verde) del proprio tipo
export function prossimoStato(tipo: TipoSatellite, stato: StatoSatellite): StatoSatellite | null {
  const stati = STATI_PER_TIPO[tipo]
  const idx: number = stati.indexOf(stato)
  if (idx === -1 || idx === stati.length - 1) return null
  return stati[idx + 1]
}

export const TIPI_CON_ARTICOLI: TipoSatellite[] = ['acquisto_materiale', 'acquisto_ferramenta']
export const TIPI_CON_FORNITORE: TipoSatellite[] = [
  'acquisto_materiale',
  'acquisto_ferramenta',
  'lavorazione_esterna',
]
export const TIPI_CON_REVISIONE: TipoSatellite[] = ['preventivo', 'progetto']
export const TIPI_CON_VALORE: TipoSatellite[] = [
  'preventivo',
  'progetto',
  'acquisto_materiale',
  'acquisto_ferramenta',
  'lavorazione_esterna',
]

export type Satellite = {
  id: string
  tipo: TipoSatellite
  stato: StatoSatellite
  nota: string | null
  tipo_appuntamento: string | null
  data_appuntamento: string | null
  revisione_di: string | null
  valore_complessivo: number | null
  fornitore_sede_id: string | null
  descrizione_libera: string | null
  data_creazione: string
}

export type SatelliteArticolo = {
  id: string
  satellite_id: string
  descrizione: string
  colore_finitura: string | null
  quantita: number
}

export type FornitoreOpzione = { id: string; label: string }
