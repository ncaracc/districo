import { ORDINE_ATTIVITA, LABEL_ATTIVITA, type ChiaveAttivita } from '@/lib/lavori/attivita-ordine'
import type { MestiereSlug } from './mestieri'

// Dati della sezione "Funzioni per fase" (2026-08-19, vedi CLAUDE.md — landing
// page). Icone ed etichette NON duplicate qui: riusa ICONA_ATTIVITA
// (components/icone-attivita.tsx) e LABEL_ATTIVITA/ORDINE_ATTIVITA
// (lib/lavori/attivita-ordine.ts), unica fonte di verità già esistente per
// entrambe — coerente con la richiesta di riusare esattamente le icone già
// in uso nell'app, non sceglierne di nuove.
//
// Nota per chi riprende: il prompt di questa sessione le descriveva come
// "icone Tabler" — discrepanza già corretta senza bisogno di fermarsi nella
// sessione che le ha introdotte (2026-08-19, restyling "Aggiungi attività"):
// il progetto non ha mai avuto una libreria di icone, sono 12 SVG disegnati
// a mano nello stesso stile stroke-based (vedi icone-attivita.tsx). Riusate
// qui tali e quali, non ridisegnate.

export { ORDINE_ATTIVITA, LABEL_ATTIVITA }
export type { ChiaveAttivita }

// Una riga di descrizione generica (cosa traccia l'Attività, indipendente
// dal mestiere) per ciascuna delle 12 ChiaveAttivita.
export const DESCRIZIONE_ATTIVITA: Record<ChiaveAttivita, string> = {
  briefing: 'Il primo confronto con il cliente: cosa serve, cosa si aspetta.',
  progetto: 'Disegni e misure di progetto, con gli allegati tutti in un posto solo.',
  preventivo: 'Il valore del lavoro, accettato o rifiutato dal cliente.',
  acconto: 'Ogni acconto incassato, con data e importo.',
  spesa_non_preventivata: 'Le spese impreviste emerse durante il lavoro, da far accettare al cliente.',
  campionatura: 'I campioni proposti, fino alla consegna di quello scelto.',
  verifica_misure: 'Il sopralluogo per confermare le misure prima di produrre.',
  acquisto: "L'ordine al fornitore: referenze, quantità, conferma.",
  costruzione: 'Le sessioni di lavorazione in laboratorio, ora per ora.',
  noleggio: 'Il furgone prenotato quando serve trasportare il lavoro.',
  montaggio: 'Le sessioni di montaggio in cantiere, fino alla consegna.',
  chiusura: 'Il conto finale: valore, spese, margine, incassato.',
}

// Un esempio concreto per ciascuna combinazione Attività × Mestiere (60
// stringhe) — mostrato in base al mestiere selezionato nel selettore della
// sezione. Numeri di esempio inventati a scopo puramente illustrativo,
// nessun dato reale.
export const ESEMPIO_ATTIVITA_MESTIERE: Record<ChiaveAttivita, Record<MestiereSlug, string>> = {
  briefing: {
    falegname: 'Una libreria su misura: dimensioni del muro, essenza del legno, stile.',
    idraulico: 'Perdita in bagno da riparare: il cliente descrive dove e da quando.',
    vetraio: 'Vetrata da sostituire dopo la grandinata: misure a occhio, da confermare.',
    fabbro: 'Cancello nuovo per il giardino: altezza, larghezza, tipo di apertura.',
    elettricista: 'Impianto da adeguare in un appartamento ristrutturato: quante prese, dove.',
  },
  progetto: {
    falegname: 'Disegno della libreria con misure e finiture, allegato in PDF.',
    idraulico: 'Schema della nuova disposizione dei sanitari.',
    vetraio: "Rendering della vetrata con profili e verso d'apertura.",
    fabbro: 'Bozzetto del cancello con le misure esatte del vano.',
    elettricista: "Schema unifilare del nuovo impianto.",
  },
  preventivo: {
    falegname: '€2.400 per la libreria su misura, in attesa di conferma.',
    idraulico: '€680 per la sostituzione dei sanitari, accettato.',
    vetraio: '€1.150 per la vetrata su misura, in attesa.',
    fabbro: '€1.800 per il cancello in ferro battuto, accettato.',
    elettricista: "€3.200 per l'adeguamento dell'impianto, in attesa.",
  },
  acconto: {
    falegname: "€800 incassati all'accettazione del preventivo.",
    idraulico: '€200 di acconto prima di ordinare i sanitari.',
    vetraio: '€400 incassati per bloccare la lastra in produzione.',
    fabbro: '€600 di acconto prima di tagliare il ferro.',
    elettricista: '€1.000 incassati prima di aprire il cantiere.',
  },
  spesa_non_preventivata: {
    falegname: "Una maniglia speciale chiesta all'ultimo: €45 da aggiungere al conto.",
    idraulico: 'Un raccordo non previsto: €18 da segnare e far accettare.',
    vetraio: 'Un profilo extra per un angolo non standard: €60.',
    fabbro: 'Una zincatura in più richiesta dal cliente: €90.',
    elettricista: 'Una presa aggiuntiva chiesta a lavori iniziati: €35.',
  },
  campionatura: {
    falegname: 'Tre finiture di legno proposte, una consegnata e scelta.',
    idraulico: 'Due modelli di rubinetteria da far vedere in showroom.',
    vetraio: 'Un campione di vetro satinato da approvare.',
    fabbro: 'Due colori di verniciatura a polvere da confrontare.',
    elettricista: 'Due modelli di placche da mostrare al cliente.',
  },
  verifica_misure: {
    falegname: "Sopralluogo per confermare l'altezza esatta del muro prima del taglio.",
    idraulico: "Verifica delle distanze tra gli scarichi prima dell'ordine.",
    vetraio: 'Misura del vano finestra prima di ordinare la lastra.',
    fabbro: 'Rilievo del vano cancello, compresi i dislivelli del terreno.',
    elettricista: 'Verifica dei punti luce prima di stendere i cavi.',
  },
  acquisto: {
    falegname: 'Pannelli e ferramenta ordinati al fornitore, con codice e quantità.',
    idraulico: 'Sanitari e rubinetteria ordinati, in attesa di conferma.',
    vetraio: 'Lastra di vetro ordinata con le misure esatte.',
    fabbro: 'Profili in ferro e vernice ordinati al fornitore.',
    elettricista: 'Cavi, prese e quadro ordinati per il cantiere.',
  },
  costruzione: {
    falegname: '6 ore in laboratorio per tagliare e montare i pannelli.',
    idraulico: '2 ore in officina per preparare le tubazioni su misura.',
    vetraio: '3 ore in laboratorio per tagliare e molare la lastra.',
    fabbro: '8 ore di saldatura e assemblaggio in officina.',
    elettricista: '1 ora per preparare il quadro elettrico in laboratorio.',
  },
  noleggio: {
    falegname: 'Furgone prenotato per consegnare la libreria montata.',
    idraulico: 'Furgone prenotato per trasportare i sanitari in cantiere.',
    vetraio: 'Furgone con cavalletti prenotato per la lastra grande.',
    fabbro: 'Furgone prenotato per portare il cancello in cantiere.',
    elettricista: 'Furgone prenotato per il materiale del cantiere.',
  },
  montaggio: {
    falegname: '4 ore per montare la libreria in casa del cliente.',
    idraulico: '3 ore per installare i nuovi sanitari.',
    vetraio: '2 ore per montare la vetrata in cantiere.',
    fabbro: '5 ore per montare e regolare il cancello.',
    elettricista: "6 ore per cablare e collaudare l'impianto.",
  },
  chiusura: {
    falegname: 'Valore €2.400, spese €900, margine €1.500: lavoro chiuso e incassato.',
    idraulico: 'Valore €680, spese €210, margine €470: lavoro chiuso.',
    vetraio: 'Valore €1.150, spese €480, margine €670: lavoro chiuso.',
    fabbro: 'Valore €1.800, spese €650, margine €1.150: lavoro chiuso.',
    elettricista: 'Valore €3.200, spese €1.100, margine €2.100: lavoro chiuso.',
  },
}
