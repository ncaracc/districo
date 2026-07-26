export type TipoSatellite =
  | 'appuntamento'
  | 'preventivo'
  | 'progetto'
  | 'acquisti'
  | 'lavorazione_esterna'
  | 'campione'
  | 'costruzione'
  | 'noleggio'

export type SottotipoAppuntamento = 'briefing' | 'verifica_misure' | 'montaggio'

export const SOTTOTIPO_APPUNTAMENTO_LABEL: Record<SottotipoAppuntamento, string> = {
  briefing: 'Briefing',
  verifica_misure: 'Verifica misure',
  montaggio: 'Montaggio',
}

export type TipoRevisionabile = 'preventivo' | 'progetto' | 'campione'

export type StatoRevisionabile =
  | 'in_preparazione'
  | 'presentato'
  | 'necessaria_revisione'
  | 'accettato'
  | 'non_necessario'
  | 'consegnato'
  | 'necessario_nuovo_campione'
  | 'approvato'

export type Satellite = {
  id: string
  lavoro_id: string
  tipo: TipoSatellite
  stato: string | null
  descrizione: string | null
  tipo_appuntamento: SottotipoAppuntamento | null
  concluso: boolean
  non_necessario: boolean
  data_appuntamento: string | null
  revisione_di: string | null
  valore_complessivo: number | null
  serie: string | null
  fornitore_sede_id: string | null
  descrizione_libera: string | null
  acquisto_categoria: 'materiale' | 'ferramenta' | null
  data_invio_ordine: string | null
  contatto_invio_id: string | null
  data_inizio: string | null
  data_fine: string | null
  prenotazione_effettuata: boolean
  data_da: string | null
  data_a: string | null
  costo: number | null
  data_creazione: string
  data_ultimo_cambio_stato: string
}

export type SatelliteArticolo = {
  id: string
  satellite_id: string
  descrizione: string
  colore_finitura: string | null
  quantita: number
}

export type SatelliteAllegato = {
  id: string
  satellite_id: string
  nome_file: string
  storage_path: string
  data_caricamento: string
}

export type ColoreSemaforo = 'red' | 'yellow' | 'green'

export const DOT_COLOR: Record<ColoreSemaforo, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
}

// --- Progetto / Preventivo ---
export const STATI_PROGETTO_PREVENTIVO = [
  'in_preparazione',
  'presentato',
  'necessaria_revisione',
  'accettato',
  'non_necessario',
] as const

export const STATO_PROGETTO_PREVENTIVO_LABEL: Record<string, string> = {
  in_preparazione: 'In preparazione',
  presentato: 'Presentato',
  necessaria_revisione: 'Necessaria revisione',
  accettato: 'Accettato',
  non_necessario: 'Non necessario',
}

// --- Campione ---
export const STATI_CAMPIONE = [
  'in_preparazione',
  'consegnato',
  'necessario_nuovo_campione',
  'approvato',
  'non_necessario',
] as const

export const STATO_CAMPIONE_LABEL: Record<string, string> = {
  in_preparazione: 'In preparazione',
  consegnato: 'Consegnato',
  necessario_nuovo_campione: 'Necessario nuovo campione',
  approvato: 'Approvato',
  non_necessario: 'Non necessario',
}

export function labelStatoRevisionabile(tipo: TipoRevisionabile, stato: string): string {
  return tipo === 'campione' ? STATO_CAMPIONE_LABEL[stato] ?? stato : STATO_PROGETTO_PREVENTIVO_LABEL[stato] ?? stato
}

export function coloreRevisionabile(tipo: TipoRevisionabile, stato: string): ColoreSemaforo {
  if (stato === 'in_preparazione') return 'red'
  if (tipo === 'campione') {
    if (stato === 'approvato' || stato === 'non_necessario') return 'green'
    return 'yellow' // consegnato, necessario_nuovo_campione
  }
  if (stato === 'accettato' || stato === 'non_necessario') return 'green'
  return 'yellow' // presentato, necessaria_revisione
}

// Stato che, se impostato, genera automaticamente una nuova revisione collegata.
export function generaNuovaRevisione(tipo: TipoRevisionabile, nuovoStato: string): boolean {
  return tipo === 'campione' ? nuovoStato === 'necessario_nuovo_campione' : nuovoStato === 'necessaria_revisione'
}

type AzionePossibile = { stato: StatoRevisionabile; label: string; variante: 'primary' | 'warn' | 'muted' }

// Prossime transizioni manuali disponibili dallo stato attuale (solo sulla revisione
// corrente/leaf di una catena: le revisioni superate non hanno azioni).
export function azioniPossibiliRevisionabile(tipo: TipoRevisionabile, statoAttuale: string): AzionePossibile[] {
  if (tipo === 'campione') {
    switch (statoAttuale) {
      case 'in_preparazione':
        return [
          { stato: 'consegnato', label: 'Segna come consegnato', variante: 'primary' },
          { stato: 'non_necessario', label: 'Segna come non necessario', variante: 'muted' },
        ]
      case 'consegnato':
        return [
          { stato: 'necessario_nuovo_campione', label: 'Richiedi nuovo campione', variante: 'warn' },
          { stato: 'approvato', label: 'Segna come approvato', variante: 'primary' },
          { stato: 'non_necessario', label: 'Segna come non necessario', variante: 'muted' },
        ]
      default:
        return []
    }
  }

  switch (statoAttuale) {
    case 'in_preparazione':
      return [
        { stato: 'presentato', label: 'Segna come presentato', variante: 'primary' },
        { stato: 'non_necessario', label: 'Segna come non necessario', variante: 'muted' },
      ]
    case 'presentato':
      return [
        { stato: 'necessaria_revisione', label: 'Richiedi nuova revisione', variante: 'warn' },
        { stato: 'accettato', label: 'Segna come accettato', variante: 'primary' },
        { stato: 'non_necessario', label: 'Segna come non necessario', variante: 'muted' },
      ]
    default:
      return []
  }
}

// Ricostruisce la catena di revisioni (root -> ultima) a partire da un insieme piatto
// di satelliti che condividono la stessa catena (stesso tipo, o stessa serie per campione).
export function costruisciCatena(satelliti: Satellite[]): Satellite[] {
  const root = satelliti.find((s) => !s.revisione_di)
  if (!root) return []

  const ordinata: Satellite[] = [root]
  let corrente = root
  for (;;) {
    const successivo = satelliti.find((s) => s.revisione_di === corrente.id)
    if (!successivo) break
    ordinata.push(successivo)
    corrente = successivo
  }
  return ordinata
}

// --- Acquisti / Lavorazione esterna ---
export type TipoOrdine = 'acquisti' | 'lavorazione_esterna'

export type StatoOrdine = 'da_acquistare' | 'acquistato' | 'ricevuto' | 'da_ordinare' | 'ordinato' | 'completato'

export const STATO_ORDINE_LABEL: Record<TipoOrdine, Record<string, string>> = {
  acquisti: { da_acquistare: 'Da acquistare', acquistato: 'Acquistato', ricevuto: 'Ricevuto' },
  lavorazione_esterna: { da_ordinare: 'Da ordinare', ordinato: 'Ordinato', completato: 'Completato' },
}

const STATO_INIZIALE_ORDINE = { acquisti: 'da_acquistare', lavorazione_esterna: 'da_ordinare' } satisfies Record<TipoOrdine, StatoOrdine>
const STATO_FINALE_ORDINE = { acquisti: 'ricevuto', lavorazione_esterna: 'completato' } satisfies Record<TipoOrdine, StatoOrdine>

export function statoInizialeOrdine(tipo: TipoOrdine): StatoOrdine {
  return STATO_INIZIALE_ORDINE[tipo]
}

export function labelStatoOrdine(tipo: TipoOrdine, stato: string): string {
  return STATO_ORDINE_LABEL[tipo][stato] ?? stato
}

export function coloreOrdine(tipo: TipoOrdine, stato: string): ColoreSemaforo {
  if (stato === STATO_INIZIALE_ORDINE[tipo]) return 'red'
  if (stato === STATO_FINALE_ORDINE[tipo]) return 'green'
  return 'yellow'
}

export function azioniPossibiliOrdine(tipo: TipoOrdine, statoAttuale: string): { stato: StatoOrdine; label: string }[] {
  const [rosso, giallo, verde] = Object.keys(STATO_ORDINE_LABEL[tipo]) as StatoOrdine[]
  if (statoAttuale === rosso) return [{ stato: giallo, label: `Segna come ${STATO_ORDINE_LABEL[tipo][giallo].toLowerCase()}` }]
  if (statoAttuale === giallo) return [{ stato: verde, label: `Segna come ${STATO_ORDINE_LABEL[tipo][verde].toLowerCase()}` }]
  return []
}

export const ACQUISTO_CATEGORIA_LABEL: Record<string, string> = {
  materiale: 'Materiale',
  ferramenta: 'Ferramenta',
}

// --- Costruzione ---
export const STATO_COSTRUZIONE_LABEL: Record<string, string> = {
  da_iniziare: 'Da iniziare',
  in_corso: 'In corso',
  completata: 'Completata',
}

export function coloreCostruzione(stato: string): ColoreSemaforo {
  if (stato === 'da_iniziare') return 'red'
  if (stato === 'completata') return 'green'
  return 'yellow'
}

export function azioniPossibiliCostruzione(statoAttuale: string): { stato: string; label: string }[] {
  if (statoAttuale === 'da_iniziare') return [{ stato: 'in_corso', label: 'Segna come iniziata' }]
  if (statoAttuale === 'in_corso') return [{ stato: 'completata', label: 'Segna come completata' }]
  return []
}

// --- Gate "pronto per il montaggio" — versione informativa lato client ---
//
// Mirror in JS della stessa logica SQL di lavoro_pronto_per_montaggio()
// (migration 0012/0013/0017): non ricalcola il booleano (quello resta l'unica
// fonte di verità, riusato così com'è sia in UI sia — soprattutto —
// server-side in segnaLavoroStato() prima di accettare la transizione a
// "completato"), serve solo a derivare QUALI satelliti risultano bloccanti,
// per mostrare un messaggio "cosa manca" nella UI. Stessi criteri: revisioni
// superate (non l'ultima della catena) escluse, stato effettivo per
// preventivo/progetto/campione già risolto dal chiamante tramite
// lavoro_satellite_stato_effettivo(). Dalla 0017 gli appuntamenti NON sono
// più esclusi: contano come qualunque altro satellite (verde se
// concluso=true oppure non_necessario=true, stesso trattamento binario già
// in uso per noleggio).
export function satellitiBloccantiMontaggio(
  satelliti: Satellite[],
  statoEffettivoById: Record<string, string>,
): Satellite[] {
  const superati = new Set(satelliti.filter((s) => s.revisione_di).map((s) => s.revisione_di as string))

  return satelliti.filter((s) => {
    if (superati.has(s.id)) return false

    const stato = statoEffettivoById[s.id] ?? s.stato ?? ''
    switch (s.tipo) {
      case 'preventivo':
      case 'progetto':
        return stato !== 'accettato' && stato !== 'non_necessario'
      case 'campione':
        return stato !== 'approvato' && stato !== 'non_necessario'
      case 'acquisti':
        return stato !== 'ricevuto'
      case 'lavorazione_esterna':
        return stato !== 'completato'
      case 'costruzione':
        return stato !== 'completata'
      case 'noleggio':
        return !(s.non_necessario || s.prenotazione_effettuata)
      case 'appuntamento':
        return !(s.concluso || s.non_necessario)
      default:
        return false
    }
  })
}

const TIPO_SATELLITE_LABEL_BREVE: Record<TipoSatellite, string> = {
  appuntamento: 'Appuntamento',
  preventivo: 'Preventivo',
  progetto: 'Progetto',
  acquisti: 'Acquisti',
  lavorazione_esterna: 'Lavorazione esterna',
  campione: 'Campione',
  costruzione: 'Costruzione',
  noleggio: 'Noleggio',
}

// Etichetta breve per il messaggio "cosa manca" del gate montaggio — include la
// serie per il Campione (più catene indipendenti possono essere bloccanti
// contemporaneamente), la categoria per gli Acquisti quando presente, e il
// sottotipo specifico per gli Appuntamenti (Briefing/Verifica misure/
// Montaggio — più istanze dello stesso sottotipo possono essere bloccanti
// contemporaneamente, l'etichetta generica "Appuntamento" non basterebbe a
// distinguerle).
export function satelliteTipoLabelBreve(s: Satellite): string {
  if (s.tipo === 'appuntamento' && s.tipo_appuntamento) return SOTTOTIPO_APPUNTAMENTO_LABEL[s.tipo_appuntamento]
  const base = TIPO_SATELLITE_LABEL_BREVE[s.tipo] ?? s.tipo
  if (s.tipo === 'campione' && s.serie) return `${base} (${s.serie})`
  if (s.tipo === 'acquisti' && s.acquisto_categoria) return `${base} (${ACQUISTO_CATEGORIA_LABEL[s.acquisto_categoria]})`
  return base
}

export function raggruppaPerSerie(satelliti: Satellite[]): { serie: string; satelliti: Satellite[] }[] {
  const gruppi = new Map<string, Satellite[]>()
  for (const s of satelliti) {
    const chiave = s.serie ?? '—'
    const lista = gruppi.get(chiave) ?? []
    lista.push(s)
    gruppi.set(chiave, lista)
  }
  return Array.from(gruppi.entries()).map(([serie, satelliti]) => ({ serie, satelliti }))
}
