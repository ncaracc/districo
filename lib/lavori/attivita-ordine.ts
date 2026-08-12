// Ordine logico fisso delle 9 tipologie di attività (Sprint "fondamenta"
// 2026-08-02, vedi CLAUDE.md) — unica fonte di verità per: (a) l'ordine di
// visualizzazione nella tabella attività del Lavoro, (b) l'ordine delle
// opzioni nel modale "Aggiungi attività". Non corrisponde 1:1 a `tipo` di
// `lavoro_satellite`: l'Appuntamento si divide in due voci distinte
// (Briefing/Verifica misure, uno per `tipo_appuntamento`) — Montaggio, un
// tempo un terzo sottotipo di Appuntamento, è un `ChiaveAttivita`/`tipo` DB
// autonomo dal 2026-08-12 (vedi CLAUDE.md), semplicemente non più derivato
// da alcun `tipo_appuntamento`. I nomi "campionatura"/"acquisto" restano
// solo l'etichetta UI dei `tipo` DB "campione"/"acquisti" (invariati a
// schema, vedi CLAUDE.md).
export type ChiaveAttivita =
  | 'briefing'
  | 'progetto'
  | 'preventivo'
  | 'acconto'
  | 'campionatura'
  | 'verifica_misure'
  | 'acquisto'
  | 'costruzione'
  | 'noleggio'
  | 'montaggio'
  | 'chiusura'

export const ORDINE_ATTIVITA: ChiaveAttivita[] = [
  'briefing',
  'progetto',
  'preventivo',
  // Acconto (2026-08-11, vedi CLAUDE.md): posizionata subito dopo
  // Preventivo su richiesta esplicita, nessun vincolo condizionale (non
  // subordinata all'accettazione del Preventivo).
  'acconto',
  'campionatura',
  'verifica_misure',
  'acquisto',
  'costruzione',
  'noleggio',
  'montaggio',
  'chiusura',
]

export const POSIZIONE_ATTIVITA: Record<ChiaveAttivita, number> = Object.fromEntries(
  ORDINE_ATTIVITA.map((chiave, i) => [chiave, i + 1]),
) as Record<ChiaveAttivita, number>

export const LABEL_ATTIVITA: Record<ChiaveAttivita, string> = {
  briefing: 'Briefing',
  progetto: 'Progetto',
  preventivo: 'Preventivo',
  acconto: 'Acconto',
  campionatura: 'Campionatura',
  verifica_misure: 'Verifica misure',
  acquisto: 'Acquisto',
  costruzione: 'Costruzione',
  noleggio: 'Noleggio',
  montaggio: 'Montaggio',
  chiusura: 'Chiusura Lavoro',
}

// Non ripetibili (al più un'istanza per Lavoro, escluse da "Aggiungi
// attività" appena ne esiste già una): Progetto, Preventivo, Chiusura
// (Chiusura aggiunta il 3/8, auto-creata come Preventivo — l'opzione resta
// comunque per i Lavori vecchi creati prima di questa modifica), più
// Costruzione e Montaggio (cambiati da ripetibili a non ripetibili il
// 2026-08-12, vedi CLAUDE.md — decisione presa quando entrambi hanno
// guadagnato la gestione di sessioni multiple al proprio interno: non serve
// più creare istanze separate, una sola istanza copre già più sessioni di
// lavoro discontinue).
// Ripetibili (sempre proposte, indipendentemente da quante istanze esistano
// già): Briefing (auto-creato alla creazione del Lavoro per comodità di
// partenza, MA resta ripetibile — l'utente può servirsi di più briefing
// successivi, es. manca un partecipante o servono nuove condizioni per
// procedere), Campionatura, Acconto (2026-08-11, nessun vincolo su un
// Preventivo accettato), Verifica misure, Noleggio.
// Acquisto: ripetibilità lasciata invariata qui (`true`) — decisione
// esplicitamente rimandata a una sessione futura dedicata (2026-08-12, vedi
// CLAUDE.md), non toccata in questo giro.
export const RIPETIBILE_ATTIVITA: Record<ChiaveAttivita, boolean> = {
  briefing: true,
  progetto: false,
  preventivo: false,
  acconto: true,
  campionatura: true,
  verifica_misure: true,
  acquisto: true,
  costruzione: false,
  noleggio: true,
  montaggio: false,
  chiusura: false,
}
