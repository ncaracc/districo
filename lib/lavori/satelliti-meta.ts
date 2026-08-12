export type TipoSatellite =
  | 'appuntamento'
  | 'preventivo'
  | 'progetto'
  | 'acquisti'
  | 'campione'
  | 'costruzione'
  | 'noleggio'
  | 'chiusura'
  | 'acconto'

export type Acconto = { etichetta: string; data: string | null; importo: number }

export type SottotipoAppuntamento = 'briefing' | 'verifica_misure' | 'montaggio'

export const SOTTOTIPO_APPUNTAMENTO_LABEL: Record<SottotipoAppuntamento, string> = {
  briefing: 'Briefing',
  verifica_misure: 'Verifica misure',
  montaggio: 'Montaggio',
}

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
  progetto_accettato: boolean
  campione_consegnato: boolean
  campione_data_consegna: string | null
  ordinato: boolean
  chiusura_conclusa: boolean
  chiusura_data: string | null
  chiusura_acconti: Acconto[]
  // Acconto (2026-08-11, vedi CLAUDE.md): intenzionalmente indipendente da
  // chiusura_acconti sopra, due meccanismi distinti. Importo riusa
  // valore_complessivo, Note riusa descrizione_libera (già nel tipo).
  acconto_data: string | null
  acconto_incassato: boolean
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

// --- Progetto ---
// Sprint C (documenti) 2026-08-02: singolo flag booleano progetto_accettato,
// non più il vecchio stato a 5 valori condiviso con Campione (che a sua
// volta ha lasciato quel modello nel Sprint D produzione del 2/8, vedi
// coloreCampione più sotto). Semaforo derivato dagli allegati caricati
// invece che da transizioni manuali — stessa priorità di colorePreventivo
// (accettato sempre verde, indipendentemente dagli allegati).
export function coloreProgetto(accettato: boolean, haAllegati: boolean): ColoreSemaforo {
  if (accettato) return 'green'
  if (!haAllegati) return 'red'
  return 'yellow'
}

export function labelStatoProgetto(accettato: boolean, haAllegati: boolean): string {
  if (accettato) return 'Accettato'
  if (!haAllegati) return 'Nessun allegato'
  return 'In attesa'
}

// --- Campione ---
// Sprint D (produzione) 2026-08-02: ogni riga è un'istanza indipendente, non
// più un gruppo di revisioni raggruppate per "serie" (vedi CLAUDE.md). Se una
// campionatura "non va bene" se ne crea una nuova scollegata, non una
// revisione — nessun uso di revisione_di per le nuove righe.
//
// Restyling 2026-08-12 (vedi CLAUDE.md — mappatura campi Campionatura,
// sullo stesso template di Progetto/Acconto): semaforo ridisegnato,
// SOSTITUISCE quello del 2/8 — non più derivato da `descrizione` ma da
// `campione_data_consegna`, ora un campo Data liberamente editabile
// dall'utente (come l'omonimo campo Data di Acconto), non più un
// side-effect "leggi poi scrivi" legato alla transizione di
// campione_consegnato (comportamento precedente rimosso in
// aggiornaCampione() insieme a questo cambio). Rosso finché la Data non è
// valorizzata, giallo quando la Data è presente ma non ancora consegnato,
// verde quando consegnato=true (priorità massima, indipendente dagli altri
// campi — stessa priorità già in uso per Preventivo/Progetto/Acconto/
// Chiusura). Conseguenza accettata sui dati storici (verificato su
// Supabase Cloud prima di scrivere la migration 0040): 2 righe reali con
// descrizione già compilata ma nessuna data di consegna passano da giallo a
// rosso — nessun backfill possibile/sensato (nessuna data equivalente da
// cui derivarla), stesso principio già accettato per altri cambi di
// semaforo su dati storici (es. Campione 2/8, Acquisto 3/8).
export function coloreCampione(dataConsegna: string | null, consegnato: boolean): ColoreSemaforo {
  if (consegnato) return 'green'
  if (!dataConsegna) return 'red'
  return 'yellow'
}

export function labelStatoCampione(dataConsegna: string | null, consegnato: boolean): string {
  if (consegnato) return 'Consegnato'
  if (!dataConsegna) return 'Data da inserire'
  return 'In attesa'
}

// Ricostruisce la catena di revisioni (root -> ultima) a partire da un insieme piatto
// di satelliti che condividono la stessa catena — usata oggi solo dal Preventivo, per
// mostrare eventuali catene storiche precedenti alla revisione satelliti dell'1/8
// (nessuna nuova riga preventivo genera più revisione_di da allora).
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
// Revisione 2026-08-03 (vedi CLAUDE.md): sostituito il vecchio stato a 3
// valori testuali (da_acquistare/acquistato/ricevuto) con un solo flag
// booleano `ordinato`, commit definitivo mai reversibile via app — nessun
// concetto di "merce ricevuta". Rosso finché manca fornitore o non esiste
// ancora nessuna referenza (lavoro_satellite_articolo); giallo quando
// entrambi presenti e non ancora ordinato (tutto modificabile); verde solo a
// ordinato=true, priorità massima (a quel punto il record è comunque di
// sola lettura, indipendentemente da fornitore/righe).
export function coloreAcquisti(ordinato: boolean, haFornitore: boolean, haRighe: boolean): ColoreSemaforo {
  if (ordinato) return 'green'
  if (!haFornitore || !haRighe) return 'red'
  return 'yellow'
}

export function labelStatoAcquisti(ordinato: boolean, haFornitore: boolean, haRighe: boolean): string {
  if (ordinato) return 'Ordinato'
  if (!haFornitore || !haRighe) return 'Da completare'
  return 'In preparazione'
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

const TIPO_SATELLITE_LABEL_BREVE: Record<TipoSatellite, string> = {
  appuntamento: 'Appuntamento',
  preventivo: 'Preventivo',
  progetto: 'Progetto',
  acquisti: 'Acquisto',
  campione: 'Campionatura',
  costruzione: 'Costruzione',
  noleggio: 'Noleggio',
  chiusura: 'Chiusura Lavoro',
  acconto: 'Acconto',
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

// Confronto per orario esatto (non per sola data di calendario): un
// appuntamento fissato per "oggi alle 11:58" diventa rosso non appena passano
// le 11:58, non a mezzanotte — cambio richiesto dall'utente il 2/8 dopo aver
// verificato dal vivo che la granularità a giornata intera (decisione
// originale dello Sprint B) non corrispondeva all'uso reale atteso. Confronto
// tra due istanti assoluti (entrambi timestamptz): nessuna dipendenza dal
// fuso orario del processo Node, a differenza della vecchia
// implementazione basata su `setHours(0,0,0,0)` (che troncava a mezzanotte
// nel fuso orario locale del server — un bug distinto scoperto durante
// l'indagine su questo stesso cambio, ora eliminato come effetto collaterale
// del passaggio al confronto per istante esatto). Stessa funzione riusata dal
// calcolo colore/label qui sotto e, in forma equivalente, dalla migration
// SQL lato dashboard.
function dataNonAncoraPassata(dataAppuntamento: string): boolean {
  return new Date(dataAppuntamento).getTime() >= Date.now()
}

// Calcolo dinamico a lettura (mai scritto/salvato): concluso=true è sempre
// verde indipendentemente dalla data, anche se questa è nel passato o mai
// stata impostata — priorità esplicita del documento di revisione.
export function coloreAppuntamento(concluso: boolean, dataAppuntamento: string | null): ColoreSemaforo {
  if (concluso) return 'green'
  if (!dataAppuntamento) return 'red'
  return dataNonAncoraPassata(dataAppuntamento) ? 'yellow' : 'red'
}

// Label distinte per i due casi rosso (nessuna data vs. data scaduta) e per
// il giallo, anche se in due dei tre casi rosso il colore risultante è
// identico — permette di distinguere a colpo d'occhio "va ancora fissato"
// da "fissato ma saltato/non aggiornato".
export function labelStatoAppuntamento(concluso: boolean, dataAppuntamento: string | null): string {
  if (concluso) return 'Concluso'
  if (!dataAppuntamento) return 'Da fissare'
  return dataNonAncoraPassata(dataAppuntamento) ? 'In programma' : 'Data scaduta'
}

export function labelStatoNoleggio(prenotazioneEffettuata: boolean): string {
  return prenotazioneEffettuata ? 'Prenotato' : 'Da prenotare'
}

// Chiusura Lavoro (2026-08-03, vedi CLAUDE.md): semaforo binario come
// Noleggio, nessun giallo. Verde = chiusura_conclusa=true, l'unico
// meccanismo che porta lavoro.stato a 'completato' (impostaChiusuraConclusa,
// lib/lavori/satelliti.ts).
export function labelStatoChiusura(concluso: boolean): string {
  return concluso ? 'Concluso' : 'Da chiudere'
}

// --- Acconto (2026-08-11, vedi CLAUDE.md) ---
// Semaforo dedicato, non riusa nessuna funzione degli altri tipi: verde ha
// priorità massima (incassato=true, indipendentemente dagli altri campi —
// stessa priorità già in uso per Preventivo/Progetto/Campione/Chiusura),
// rosso finché Data e Importo non sono ENTRAMBI valorizzati (non basta
// uno solo), giallo quando entrambi presenti ma non ancora incassato.
// `not incassato` esplicito nel rosso (non solo implicito nell'ordine dei
// controlli) per restare coerente con l'equivalente SQL in
// lavori_dashboard() (migration 0038), dove rosso/verde sono due espressioni
// booleane indipendenti e devono restare mutuamente esclusive per non
// contare due volte la stessa riga.
export function coloreAcconto(dataAcconto: string | null, valoreComplessivo: number | null, incassato: boolean): ColoreSemaforo {
  if (incassato) return 'green'
  if (!dataAcconto || valoreComplessivo == null) return 'red'
  return 'yellow'
}

export function labelStatoAcconto(dataAcconto: string | null, valoreComplessivo: number | null, incassato: boolean): string {
  if (incassato) return 'Incassato'
  if (!dataAcconto || valoreComplessivo == null) return 'Da completare'
  return 'In attesa'
}
