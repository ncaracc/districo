// "Scheda di lavoro" PDF (2026-08-17, vedi CLAUDE.md) — costruisce l'elenco
// ordinato di blocchi da stampare, uno per ciascuna istanza di Attività (più
// istanze per i tipi ripetibili, un solo blocco segnaposto per i tipi
// assenti) — stesso ordine/raggruppamento/numerazione già in uso per la
// tabella attività del Dettaglio Lavoro (raggruppaSatelliti/nomeNumerato/
// labelAcquisto, riusate da satelliti-render.tsx, nessuna duplicazione).
//
// Principio non negoziabile (vedi CLAUDE.md): NESSUN dato economico. Ogni
// campo incluso qui è stato verificato uno per uno contro la mappatura
// richiesta — importi/prezzi/margine/costo manodopera non compaiono in
// nessun blocco, anche quando la colonna sorgente (es. valore_complessivo di
// Acconto/Attività non preventivate) esiste sul satellite.
import type { DatiLavoroSatelliti } from '@/lib/lavori/dettaglio-lavoro-data'
import { raggruppaSatelliti, nomeNumerato, labelAcquisto } from '@/lib/lavori/satelliti-render'
import { ORDINE_ATTIVITA, LABEL_ATTIVITA, type ChiaveAttivita } from '@/lib/lavori/attivita-ordine'
import {
  coloreAppuntamento,
  coloreProgetto,
  colorePreventivo,
  coloreAcconto,
  coloreSpesaNonPreventivata,
  coloreCampione,
  coloreAcquisti,
  coloreSessioniLavoro,
  coloreNoleggio,
  coloreChiusura,
  labelStatoAppuntamento,
  labelStatoProgetto,
  labelStatoCampione,
  labelStatoSessioniLavoro,
  type ColoreSemaforo,
  type Satellite,
} from '@/lib/lavori/satelliti-meta'

export type BloccoScheda = {
  chiave: ChiaveAttivita
  titolo: string
  // null = attività non ancora creata per questo Lavoro (semaforo vuoto,
  // nessuna informazione) — distinto da un colore reale, mai confuso con
  // "rosso" (che indica un'attività creata ma non ancora avviata).
  colore: ColoreSemaforo | null
  righe: string[]
}

// Confronto per istante esatto (timestamptz) reso nel fuso orario italiano,
// non quello del processo Node — la generazione del PDF gira lato server in
// un container Docker sempre in UTC (verificato, vedi CLAUDE.md), diverso
// dal fuso del browser dell'artigiano che vede questi stessi orari senza
// alcuna conversione esplicita altrove nel progetto. Senza `timeZone`
// esplicito, un appuntamento fissato per le 09:00 (ora italiana) apparirebbe
// come "07:00"/"08:00" nel PDF a seconda della stagione — bug non ovvio,
// stesso tipo di problema già documentato altrove in questo progetto per il
// confronto data/ora di coloreAppuntamento. I soli campi Data (senza orario,
// es. campione_data_consegna) non necessitano di questo accorgimento: una
// colonna `date` non ha componente orario da fuorviare.
const FUSO = 'Europe/Rome'

function fmtData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: FUSO })
}

function fmtDataOra(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function placeholder(chiave: ChiaveAttivita): BloccoScheda {
  return { chiave, titolo: LABEL_ATTIVITA[chiave], colore: null, righe: [] }
}

// Riga di stato "Concluso — 26/07/2026" (Briefing/Verifica misure): solo la
// data quando presente, nessuna riga separata "Data:" per questi due tipi —
// stesso stile compatto già validato nella bozza di riferimento.
function rigaStatoAppuntamento(s: Satellite): string {
  const stato = labelStatoAppuntamento(s.concluso, s.data_appuntamento)
  return s.data_appuntamento ? `${stato} — ${fmtDataOra(s.data_appuntamento)}` : stato
}

function bloccoRighe(articoli: { descrizione: string; colore_finitura: string | null; quantita: number; referenza?: { codice: string | null } | null }[]): string[] {
  if (articoli.length === 0) return ['Referenze: —']
  return articoli.map((a, i) => {
    const finitura = a.colore_finitura ? ` (${a.colore_finitura})` : ''
    const codice = a.referenza?.codice ? ` — Cod. ${a.referenza.codice}` : ''
    const testo = `${a.descrizione}${finitura}${codice}, Qtà ${a.quantita}`
    return i === 0 ? `Referenze: ${testo}` : testo
  })
}

function bloccoSessioni(sessioni: { inizio: string; fine: string | null; persone: number }[]): string[] {
  if (sessioni.length === 0) return ['Nessuna sessione registrata.']
  return sessioni.map((s, i) => {
    const fine = s.fine ? fmtDataOra(s.fine) : 'in corso'
    const persone = s.persone ?? 1
    // "->" ASCII, non "→" (bug reale scoperto in test visivo, 2026-08-17):
    // il font standard Helvetica di @react-pdf/renderer (PDFKit, encoding
    // WinAnsi, non embeddato) non copre il glifo freccia — veniva sostituito
    // con un carattere sbagliato (apostrofo), verificato sia nel testo
    // estratto sia visivamente nel PDF renderizzato. L'em-dash "—" usato
    // altrove in questo file è invece nel set WinAnsi, nessun problema lì.
    return `Sessione ${i + 1}: ${fmtDataOra(s.inizio)} -> ${fine} — ${persone} person${persone === 1 ? 'a' : 'e'}`
  })
}

export function costruisciBlocchiScheda(dati: DatiLavoroSatelliti): BloccoScheda[] {
  const g = raggruppaSatelliti(dati.satelliti)
  const blocchi: BloccoScheda[] = []

  for (const chiave of ORDINE_ATTIVITA) {
    switch (chiave) {
      case 'briefing': {
        if (g.briefing.length === 0) {
          blocchi.push(placeholder('briefing'))
          break
        }
        g.briefing.forEach((s) => {
          const allegati = dati.allegatiById[s.id] ?? []
          blocchi.push({
            chiave: 'briefing',
            titolo: nomeNumerato(g.briefing, s.id, 'Briefing'),
            colore: coloreAppuntamento(s.concluso, s.data_appuntamento),
            righe: [rigaStatoAppuntamento(s), ...(s.descrizione ? [s.descrizione] : []), `Allegati: ${allegati.length} file`],
          })
        })
        break
      }

      case 'progetto': {
        if (g.progetto.length === 0) {
          blocchi.push(placeholder('progetto'))
          break
        }
        const s = g.progetto[0]
        const allegati = dati.allegatiById[s.id] ?? []
        blocchi.push({
          chiave: 'progetto',
          titolo: 'Progetto',
          colore: coloreProgetto(s.progetto_accettato, allegati.length > 0),
          righe: [labelStatoProgetto(s.progetto_accettato, allegati.length > 0), `Allegati: ${allegati.length} file`],
        })
        break
      }

      case 'preventivo': {
        const s = dati.preventivoCatena[0] ?? null
        if (!s) {
          blocchi.push(placeholder('preventivo'))
          break
        }
        blocchi.push({
          chiave: 'preventivo',
          titolo: 'Preventivo',
          colore: colorePreventivo(s.preventivo_accettato, s.preventivo_rifiutato, s.valore_complessivo),
          righe: [`Data: ${fmtData(s.data_creazione)}`, `Note: ${s.descrizione_libera || '—'}`],
        })
        break
      }

      case 'acconto': {
        if (g.acconto.length === 0) {
          blocchi.push(placeholder('acconto'))
          break
        }
        g.acconto.forEach((s) => {
          blocchi.push({
            chiave: 'acconto',
            titolo: nomeNumerato(g.acconto, s.id, 'Acconto'),
            colore: coloreAcconto(s.acconto_data, s.valore_complessivo, s.acconto_incassato),
            righe: [`Data: ${fmtData(s.acconto_data)}`, `Note: ${s.descrizione_libera || '—'}`],
          })
        })
        break
      }

      case 'spesa_non_preventivata': {
        if (g.speseNonPreventivate.length === 0) {
          blocchi.push(placeholder('spesa_non_preventivata'))
          break
        }
        g.speseNonPreventivate.forEach((s) => {
          blocchi.push({
            chiave: 'spesa_non_preventivata',
            titolo: nomeNumerato(g.speseNonPreventivate, s.id, 'Attività non preventivate'),
            colore: coloreSpesaNonPreventivata(s.spesa_data, s.valore_complessivo, s.spesa_accettata),
            righe: [`Data: ${fmtData(s.spesa_data)}`, `Descrizione: ${s.descrizione_libera || '—'}`],
          })
        })
        break
      }

      case 'campionatura': {
        if (g.campione.length === 0) {
          blocchi.push(placeholder('campionatura'))
          break
        }
        g.campione.forEach((s) => {
          const righe = [
            labelStatoCampione(s.campione_data_consegna, s.campione_consegnato),
            `Esito: ${s.descrizione_libera || '—'}`,
          ]
          if (s.campione_data_consegna) righe.push(`Data consegna: ${fmtData(s.campione_data_consegna)}`)
          blocchi.push({
            chiave: 'campionatura',
            titolo: nomeNumerato(g.campione, s.id, 'Campionatura'),
            colore: coloreCampione(s.campione_data_consegna, s.campione_consegnato),
            righe,
          })
        })
        break
      }

      case 'verifica_misure': {
        if (g.verificaMisure.length === 0) {
          blocchi.push(placeholder('verifica_misure'))
          break
        }
        g.verificaMisure.forEach((s) => {
          blocchi.push({
            chiave: 'verifica_misure',
            titolo: nomeNumerato(g.verificaMisure, s.id, 'Verifica misure'),
            colore: coloreAppuntamento(s.concluso, s.data_appuntamento),
            righe: [
              rigaStatoAppuntamento(s),
              `Attività propedeutiche: ${s.descrizione || '—'}`,
              `Informazioni raccolte: ${s.descrizione_libera || '—'}`,
            ],
          })
        })
        break
      }

      case 'acquisto': {
        if (g.acquisti.length === 0) {
          blocchi.push(placeholder('acquisto'))
          break
        }
        g.acquisti.forEach((s) => {
          const haFornitore = !!s.fornitore_sede_id
          const righeArticoli = dati.righePerSatellite[s.id] ?? []
          blocchi.push({
            chiave: 'acquisto',
            titolo: labelAcquisto(s),
            colore: coloreAcquisti(s.ordinato, haFornitore, righeArticoli.length > 0),
            righe: [
              `Fornitore: ${s.fornitore_sede_id ? dati.labelPerSedeId.get(s.fornitore_sede_id) ?? '—' : '—'}`,
              `Categoria: ${s.acquisto_categoria || '—'}`,
              ...bloccoRighe(righeArticoli),
            ],
          })
        })
        break
      }

      case 'costruzione': {
        if (g.costruzione.length === 0) {
          blocchi.push(placeholder('costruzione'))
          break
        }
        const s = g.costruzione[0]
        blocchi.push({
          chiave: 'costruzione',
          titolo: 'Costruzione',
          colore: coloreSessioniLavoro(s.sessioni_lavoro, s.concluso),
          righe: [labelStatoSessioniLavoro(s.sessioni_lavoro, s.concluso), ...bloccoSessioni(s.sessioni_lavoro)],
        })
        break
      }

      case 'noleggio': {
        if (g.noleggio.length === 0) {
          blocchi.push(placeholder('noleggio'))
          break
        }
        g.noleggio.forEach((s) => {
          blocchi.push({
            chiave: 'noleggio',
            titolo: nomeNumerato(g.noleggio, s.id, 'Noleggio'),
            colore: coloreNoleggio(s.data_da, s.data_a, s.prenotazione_effettuata),
            righe: [
              `Da: ${fmtData(s.data_da)}   A: ${fmtData(s.data_a)}`,
              `Prenotazione: ${s.prenotazione_effettuata ? 'Confermata' : 'Da confermare'}`,
            ],
          })
        })
        break
      }

      case 'montaggio': {
        if (g.montaggio.length === 0) {
          blocchi.push(placeholder('montaggio'))
          break
        }
        const s = g.montaggio[0]
        blocchi.push({
          chiave: 'montaggio',
          titolo: 'Montaggio',
          colore: coloreSessioniLavoro(s.sessioni_lavoro, s.concluso),
          righe: [labelStatoSessioniLavoro(s.sessioni_lavoro, s.concluso), ...bloccoSessioni(s.sessioni_lavoro)],
        })
        break
      }

      case 'chiusura': {
        if (g.chiusura.length === 0) {
          blocchi.push(placeholder('chiusura'))
          break
        }
        const s = g.chiusura[0]
        blocchi.push({
          chiave: 'chiusura',
          titolo: 'Chiusura Lavoro',
          colore: coloreChiusura(s.chiusura_incassata, s.chiusura_conclusa),
          righe: [`Incassato: ${s.chiusura_incassata ? 'Sì' : 'No'}`, `Chiuso: ${s.chiusura_conclusa ? 'Sì' : 'No'}`],
        })
        break
      }
    }
  }

  return blocchi
}
