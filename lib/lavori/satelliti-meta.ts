export type TipoSatellite =
  | 'appuntamento'
  | 'preventivo'
  | 'progetto'
  | 'acquisti'
  | 'campione'
  | 'costruzione'
  | 'noleggio'

export type SottotipoAppuntamento = 'briefing' | 'verifica_misure' | 'montaggio'

export const SOTTOTIPO_APPUNTAMENTO_LABEL: Record<SottotipoAppuntamento, string> = {
  briefing: 'Briefing',
  verifica_misure: 'Verifica misure',
  montaggio: 'Montaggio',
}

// Preventivo non fa più parte di questo gruppo dalla revisione satelliti del
// 1/8: usa un modello a due flag booleani indipendenti (vedi colorePreventivo/
// labelStatoPreventivo/azioniPossibiliPreventivo più sotto), non più il vecchio
// stato a 5 valori condiviso con Progetto/Campione.
export type TipoRevisionabile = 'progetto' | 'campione'

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
  data_appuntamento: string | null
  revisione_di: string | null
  valore_complessivo: number | null
  serie: string | null
  fornitore_sede_id: string | null
  descrizione_libera: string | null
  acquisto_categoria: string | null
  data_invio_ordine: string | null
  contatto_invio_id: string | null
  data_inizio: string | null
  data_fine: string | null
  prenotazione_effettuata: boolean
  data_da: string | null
  data_a: string | null
  costo: number | null
  preventivo_accettato: boolean
  preventivo_rifiutato: boolean
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
  etichetta: string
  data_caricamento: string
}

export type ColoreSemaforo = 'red' | 'yellow' | 'green'

export const DOT_COLOR: Record<ColoreSemaforo, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
}

// --- Progetto ---
// (Preventivo usava lo stesso modello fino alla revisione satelliti del 1/8:
// ora ha due flag booleani indipendenti, vedi colorePreventivo più sotto.)
export const STATI_PROGETTO = [
  'in_preparazione',
  'presentato',
  'necessaria_revisione',
  'accettato',
  'non_necessario',
] as const

export const STATO_PROGETTO_LABEL: Record<string, string> = {
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
  return tipo === 'campione' ? STATO_CAMPIONE_LABEL[stato] ?? stato : STATO_PROGETTO_LABEL[stato] ?? stato
}

// necessaria_revisione/necessario_nuovo_campione sono un rifiuto esplicito del
// cliente (richiede un nuovo tentativo), non una semplice attesa di risposta
// come presentato/consegnato — trattati come rosso, non giallo, per tutti i
// tipi revisionabili (coerenza tra preventivo/progetto/campione).
export function coloreRevisionabile(tipo: TipoRevisionabile, stato: string): ColoreSemaforo {
  if (stato === 'in_preparazione') return 'red'
  if (tipo === 'campione') {
    if (stato === 'approvato' || stato === 'non_necessario') return 'green'
    if (stato === 'necessario_nuovo_campione') return 'red'
    return 'yellow' // consegnato
  }
  if (stato === 'accettato' || stato === 'non_necessario') return 'green'
  if (stato === 'necessaria_revisione') return 'red'
  return 'yellow' // presentato
}

// Stato che, se impostato, genera automaticamente una nuova revisione collegata.
export function generaNuovaRevisione(tipo: TipoRevisionabile, nuovoStato: string): boolean {
  return tipo === 'campione' ? nuovoStato === 'necessario_nuovo_campione' : nuovoStato === 'necessaria_revisione'
}

type AzionePossibile = {
  stato: StatoRevisionabile
  label: string
  variante: 'primary' | 'warn' | 'muted'
  // Messaggio di conferma nativa da mostrare prima di eseguire l'azione — solo
  // per le transizioni di correzione (es. annullare un'accettazione), non per
  // il normale avanzamento in avanti, per prevenire un click accidentale che
  // annullerebbe un'accettazione già registrata.
  conferma?: string
}

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
        ]
      case 'non_necessario':
        // Correzione di un "non necessario" impostato per errore, stesso
        // principio di "Annulla accettazione": richiede conferma esplicita.
        return [
          {
            stato: 'in_preparazione',
            label: 'Annulla non necessario',
            variante: 'muted',
            conferma: 'Annullare "non necessario"? Il satellite tornerà allo stato "In preparazione".',
          },
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
      ]
    case 'accettato':
      // Correzione di un'accettazione impostata per errore (click accidentale),
      // non un avanzamento — richiede conferma esplicita, a differenza delle
      // altre transizioni. Non disponibile per Campione (non richiesto).
      return [
        {
          stato: 'presentato',
          label: 'Annulla accettazione',
          variante: 'muted',
          conferma: 'Annullare l\'accettazione? Il satellite tornerà allo stato "Presentato".',
        },
      ]
    case 'non_necessario':
      // Stessa correzione di "Annulla accettazione", per il ramo alternativo
      // di stato verde (non_necessario invece di accettato).
      return [
        {
          stato: 'in_preparazione',
          label: 'Annulla non necessario',
          variante: 'muted',
          conferma: 'Annullare "non necessario"? Il satellite tornerà allo stato "In preparazione".',
        },
      ]
    default:
      return []
  }
}

// --- Preventivo ---
// Modello a due flag booleani indipendenti (preventivo_accettato/
// preventivo_rifiutato), non più il vecchio stato a 5 valori condiviso con
// Progetto/Campione (revisione satelliti del 1/8). Mutuamente esclusivi in UI
// (impostaPreventivoDecisione in lib/lavori/satelliti.ts garantisce che
// impostarne uno azzeri l'altro), ma restano due colonne indipendenti a
// livello di schema.
export function colorePreventivo(accettato: boolean, rifiutato: boolean, valoreComplessivo: number | null): ColoreSemaforo {
  if (accettato) return 'green'
  if (rifiutato) return 'red'
  if (valoreComplessivo == null) return 'red'
  return 'yellow'
}

export function labelStatoPreventivo(accettato: boolean, rifiutato: boolean, valoreComplessivo: number | null): string {
  if (accettato) return 'Accettato'
  if (rifiutato) return 'Rifiutato'
  if (valoreComplessivo == null) return 'Valore da inserire'
  return 'In attesa'
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

// --- Acquisti ---
// Lavorazione_esterna esisteva come tipo satellite parallelo fino alla
// revisione satelliti del 1/8: ora è solo un'eventuale categoria libera
// dentro Acquisti (acquisto_categoria, testo definito dall'artigiano nelle
// proprie preferenze — vedi categoria_acquisto/lib/acquisti/categorie.ts),
// non più un tipo satellite a sé.
export type StatoAcquisti = 'da_acquistare' | 'acquistato' | 'ricevuto'

export const STATO_ACQUISTI_LABEL: Record<StatoAcquisti, string> = {
  da_acquistare: 'Da acquistare',
  acquistato: 'Acquistato',
  ricevuto: 'Ricevuto',
}

export function labelStatoAcquisti(stato: string): string {
  return STATO_ACQUISTI_LABEL[stato as StatoAcquisti] ?? stato
}

export function coloreAcquisti(stato: string): ColoreSemaforo {
  if (stato === 'da_acquistare') return 'red'
  if (stato === 'ricevuto') return 'green'
  return 'yellow'
}

export function azioniPossibiliAcquisti(statoAttuale: string): { stato: StatoAcquisti; label: string }[] {
  if (statoAttuale === 'da_acquistare') return [{ stato: 'acquistato', label: 'Segna come acquistato' }]
  if (statoAttuale === 'acquistato') return [{ stato: 'ricevuto', label: 'Segna come ricevuto' }]
  return []
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
// (migration 0012/0013/0017/0022): non ricalcola il booleano (quello resta
// l'unica fonte di verità, riusato così com'è sia in UI sia — soprattutto —
// server-side in completaLavoro() prima di accettare la transizione a
// "completato"), serve solo a derivare QUALI satelliti risultano bloccanti,
// per mostrare un messaggio "cosa manca" nella UI. Stessi criteri: revisioni
// superate (non l'ultima della catena) escluse, stato effettivo per
// progetto/campione già risolto dal chiamante tramite
// lavoro_satellite_stato_effettivo() (il Preventivo non ne fa più parte dalla
// revisione satelliti del 1/8: usa preventivo_accettato direttamente). Gli
// appuntamenti contano come qualunque altro satellite (verde solo se
// concluso=true — non_necessario rimosso, stesso trattamento per noleggio
// con prenotazione_effettuata).
export function satellitiBloccantiMontaggio(
  satelliti: Satellite[],
  statoEffettivoById: Record<string, string>,
): Satellite[] {
  const superati = new Set(satelliti.filter((s) => s.revisione_di).map((s) => s.revisione_di as string))

  return satelliti.filter((s) => {
    if (superati.has(s.id)) return false

    if (s.tipo === 'preventivo') return !s.preventivo_accettato

    const stato = statoEffettivoById[s.id] ?? s.stato ?? ''
    switch (s.tipo) {
      case 'progetto':
        return stato !== 'accettato' && stato !== 'non_necessario'
      case 'campione':
        return stato !== 'approvato' && stato !== 'non_necessario'
      case 'acquisti':
        return stato !== 'ricevuto'
      case 'costruzione':
        return stato !== 'completata'
      case 'noleggio':
        return !s.prenotazione_effettuata
      case 'appuntamento':
        return !s.concluso
      default:
        return false
    }
  })
}

const TIPO_SATELLITE_LABEL_BREVE: Record<TipoSatellite, string> = {
  appuntamento: 'Appuntamento',
  preventivo: 'Preventivo',
  progetto: 'Progetto',
  acquisti: 'Acquisto',
  campione: 'Campionatura',
  costruzione: 'Costruzione',
  noleggio: 'Noleggio',
}

// Etichetta breve per il messaggio "cosa manca" del gate montaggio — include la
// serie per il Campione (più catene indipendenti possono essere bloccanti
// contemporaneamente), la categoria per gli Acquisti quando presente (ora
// testo libero, mostrato così com'è), e il sottotipo specifico per gli
// Appuntamenti (Briefing/Verifica misure/Montaggio — più istanze dello
// stesso sottotipo possono essere bloccanti contemporaneamente, l'etichetta
// generica "Appuntamento" non basterebbe a distinguerle).
export function satelliteTipoLabelBreve(s: Satellite): string {
  if (s.tipo === 'appuntamento' && s.tipo_appuntamento) return SOTTOTIPO_APPUNTAMENTO_LABEL[s.tipo_appuntamento]
  const base = TIPO_SATELLITE_LABEL_BREVE[s.tipo] ?? s.tipo
  if (s.tipo === 'campione' && s.serie) return `${base} (${s.serie})`
  if (s.tipo === 'acquisti' && s.acquisto_categoria) return `${base} (${s.acquisto_categoria})`
  return base
}

// --- Etichette di stato per i tipi a semaforo binario (nessuna colonna
// `stato` testuale: appuntamento usa concluso, noleggio usa
// prenotazione_effettuata) — servono per la colonna STATO della tabella
// riepilogativa satelliti nel dettaglio Lavoro. "Non necessario" rimosso
// dalla revisione satelliti del 1/8 (0 righe lo usavano): se un'attività non
// serve, semplicemente non si crea.

// Confronto per sola data di calendario (non timestamp esatto): un
// appuntamento fissato per "oggi" resta giallo per l'intera giornata,
// invece di diventare rosso non appena passa l'orario esatto — coerente con
// la formulazione "data_appuntamento >= oggi" del documento di revisione
// (data, non datetime). Stessa funzione riusata dal calcolo colore/label qui
// sotto e, in forma equivalente, dalla migration SQL lato dashboard.
function dataOggiOFutura(dataAppuntamento: string): boolean {
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const data = new Date(dataAppuntamento)
  data.setHours(0, 0, 0, 0)
  return data.getTime() >= oggi.getTime()
}

// Calcolo dinamico a lettura (mai scritto/salvato): concluso=true è sempre
// verde indipendentemente dalla data, anche se questa è nel passato o mai
// stata impostata — priorità esplicita del documento di revisione.
export function coloreAppuntamento(concluso: boolean, dataAppuntamento: string | null): ColoreSemaforo {
  if (concluso) return 'green'
  if (!dataAppuntamento) return 'red'
  return dataOggiOFutura(dataAppuntamento) ? 'yellow' : 'red'
}

// Label distinte per i due casi rosso (nessuna data vs. data scaduta) e per
// il giallo, anche se in due dei tre casi rosso il colore risultante è
// identico — permette di distinguere a colpo d'occhio "va ancora fissato"
// da "fissato ma saltato/non aggiornato".
export function labelStatoAppuntamento(concluso: boolean, dataAppuntamento: string | null): string {
  if (concluso) return 'Concluso'
  if (!dataAppuntamento) return 'Da fissare'
  return dataOggiOFutura(dataAppuntamento) ? 'In programma' : 'Data scaduta'
}

export function labelStatoNoleggio(prenotazioneEffettuata: boolean): string {
  return prenotazioneEffettuata ? 'Prenotato' : 'Da prenotare'
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
