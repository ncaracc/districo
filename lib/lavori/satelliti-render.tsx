import type { ReactNode } from 'react'
import type { DatiLavoroSatelliti } from '@/lib/lavori/dettaglio-lavoro-data'
import { POSIZIONE_ATTIVITA } from '@/lib/lavori/attivita-ordine'
import {
  coloreAcconto,
  coloreAcquisti,
  coloreAppuntamento,
  coloreCampione,
  coloreChiusura,
  coloreSessioniLavoro,
  colorePreventivo,
  coloreProgetto,
  coloreSpesaNonPreventivata,
  labelStatoAcconto,
  labelStatoAcquisti,
  labelStatoAppuntamento,
  labelStatoCampione,
  labelStatoChiusura,
  labelStatoSessioniLavoro,
  labelStatoNoleggio,
  labelStatoPreventivo,
  labelStatoProgetto,
  labelStatoSpesaNonPreventivata,
  satelliteTipoLabelBreve,
  DOT_COLOR,
  type ColoreSemaforo,
  type Satellite,
} from '@/lib/lavori/satelliti-meta'
import { SatelliteAppuntamento } from '@/components/satellite-appuntamento'
import { SatellitePreventivo } from '@/components/satellite-preventivo'
import { SatelliteProgetto } from '@/components/satellite-progetto'
import { SatelliteAcconto } from '@/components/satellite-acconto'
import { SatelliteCampione } from '@/components/satellite-campione'
import { SatelliteOrdine } from '@/components/satellite-ordine'
import { SatelliteCostruzione } from '@/components/satellite-costruzione'
import { SatelliteMontaggio } from '@/components/satellite-montaggio'
import { SatelliteNoleggio } from '@/components/satellite-noleggio'
import { SatelliteSpesaNonPreventivata } from '@/components/satellite-spesa-non-preventivata'
import { SatelliteChiusura } from '@/components/satellite-chiusura'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): estrae
// la costruzione delle righe/del contenuto satellite che prima viveva
// interamente dentro app/(app)/lavori/[id]/page.tsx. Due responsabilità
// separate rispetto al vecchio codice (che le teneva insieme in un solo
// forEach per tipo, con RigaSatellite.contenutoModifica/contenutoLettura
// pre-costruiti lì per tutte le righe):
//  - raggruppaSatelliti/costruisciVoci: SOLO i metadati di riepilogo
//    (satelliteId/nome/colore/statoLabel/posizione) per la tabella — usata
//    da page.tsx, nessun JSX satellite costruito qui (non più necessario:
//    la tabella non apre più una Modal locale, naviga soltanto).
//  - costruisciContenutoAttivita: il contenuto React di UN satellite
//    specifico (stesso identico switch per tipo che prima viveva nei
//    forEach di page.tsx, invariato — "il contenuto delle modali già
//    implementate non va toccato nella logica interna") — usata dalle
//    nuove route @modal/(.)attivita/[attivitaId] e attivita/[attivitaId]
//    (pagina piena di fallback), MAI dalla tabella.
// Composizione condivisa pallino+nome per il titolo — usata sia dalla route
// intercettata (@modal, overlay) sia dalla pagina piena di fallback
// (attivita/[attivitaId]), stesso identico markup del vecchio titoloModale
// di lavoro-satelliti-tabella.tsx (Sprint UI-4, 6/8): sempre pallino+nome,
// incondizionatamente (ogni riga reale aveva già titoloConPallino=true,
// nessuna eccezione da distinguere più, vedi CLAUDE.md).
export function titoloConPallino(nome: string, colore: ColoreSemaforo): ReactNode {
  return (
    <span className="flex items-center gap-2 text-base">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[colore]}`} />
      {nome}
    </span>
  )
}

type Gruppi = {
  briefing: Satellite[]
  progetto: Satellite[]
  acconto: Satellite[]
  campione: Satellite[]
  verificaMisure: Satellite[]
  montaggio: Satellite[]
  acquisti: Satellite[]
  costruzione: Satellite[]
  noleggio: Satellite[]
  speseNonPreventivate: Satellite[]
  chiusura: Satellite[]
}

function raggruppaSatelliti(satelliti: Satellite[]): Gruppi {
  const perData = (a: Satellite, b: Satellite) => a.data_creazione.localeCompare(b.data_creazione)
  return {
    briefing: satelliti.filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'briefing').sort(perData),
    progetto: satelliti.filter((s) => s.tipo === 'progetto'),
    acconto: satelliti.filter((s) => s.tipo === 'acconto').sort(perData),
    campione: satelliti.filter((s) => s.tipo === 'campione').sort(perData),
    verificaMisure: satelliti.filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'verifica_misure').sort(perData),
    // Montaggio promosso a tipo autonomo il 2026-08-12 (vedi CLAUDE.md): non
    // più derivato da tipo_appuntamento, stesso filtro diretto su `tipo`
    // già in uso per costruzione/noleggio/ecc. poco più sotto.
    montaggio: satelliti.filter((s) => s.tipo === 'montaggio').sort(perData),
    acquisti: satelliti.filter((s) => s.tipo === 'acquisti').sort(perData),
    costruzione: satelliti.filter((s) => s.tipo === 'costruzione').sort(perData),
    noleggio: satelliti.filter((s) => s.tipo === 'noleggio').sort(perData),
    speseNonPreventivate: satelliti.filter((s) => s.tipo === 'spesa_non_preventivata').sort(perData),
    chiusura: satelliti.filter((s) => s.tipo === 'chiusura'),
  }
}

// Nome numerato quando c'è più di un'istanza dello stesso tipo (es.
// "Campionatura 2") — stesso pattern già in uso per Briefing/Acconto/
// Campionatura/Costruzione/Noleggio/Verifica misure/Montaggio.
function nomeNumerato(gruppo: Satellite[], satelliteId: string, base: string): string {
  const indice = gruppo.findIndex((s) => s.id === satelliteId)
  return gruppo.length > 1 ? `${base} ${indice + 1}` : base
}

export type VoceAttivita = {
  satelliteId: string
  nome: string
  colore: ColoreSemaforo
  statoLabel: string
  posizione: number
}

// Riepilogo per la tabella (nessun contenuto JSX satellite: la tabella non
// apre più una Modal locale, naviga soltanto verso l'URL dell'attività).
export function costruisciVociAttivita(dati: DatiLavoroSatelliti): VoceAttivita[] {
  const g = raggruppaSatelliti(dati.satelliti)
  const voci: VoceAttivita[] = []

  g.briefing.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.briefing, s.id, 'Briefing'),
      colore: coloreAppuntamento(s.concluso, s.data_appuntamento),
      statoLabel: labelStatoAppuntamento(s.concluso, s.data_appuntamento),
      posizione: POSIZIONE_ATTIVITA.briefing,
    })
  })

  if (g.progetto.length > 0) {
    const s = g.progetto[0]
    const haAllegati = (dati.allegatiById[s.id] ?? []).length > 0
    voci.push({
      satelliteId: s.id,
      nome: 'Progetto',
      colore: coloreProgetto(s.progetto_accettato, haAllegati),
      statoLabel: labelStatoProgetto(s.progetto_accettato, haAllegati),
      posizione: POSIZIONE_ATTIVITA.progetto,
    })
  }

  const preventivoCorrente = dati.preventivoCatena[0] ?? null
  if (preventivoCorrente) {
    voci.push({
      satelliteId: preventivoCorrente.id,
      nome: 'Preventivo',
      colore: colorePreventivo(
        preventivoCorrente.preventivo_accettato,
        preventivoCorrente.preventivo_rifiutato,
        preventivoCorrente.valore_complessivo,
      ),
      statoLabel: labelStatoPreventivo(
        preventivoCorrente.preventivo_accettato,
        preventivoCorrente.preventivo_rifiutato,
        preventivoCorrente.valore_complessivo,
      ),
      posizione: POSIZIONE_ATTIVITA.preventivo,
    })
  }

  g.acconto.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.acconto, s.id, 'Acconto'),
      colore: coloreAcconto(s.acconto_data, s.valore_complessivo, s.acconto_incassato),
      statoLabel: labelStatoAcconto(s.acconto_data, s.valore_complessivo, s.acconto_incassato),
      posizione: POSIZIONE_ATTIVITA.acconto,
    })
  })

  g.campione.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.campione, s.id, 'Campionatura'),
      colore: coloreCampione(s.campione_data_consegna, s.campione_consegnato),
      statoLabel: labelStatoCampione(s.campione_data_consegna, s.campione_consegnato),
      posizione: POSIZIONE_ATTIVITA.campionatura,
    })
  })

  g.verificaMisure.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.verificaMisure, s.id, 'Verifica misure'),
      colore: coloreAppuntamento(s.concluso, s.data_appuntamento),
      statoLabel: labelStatoAppuntamento(s.concluso, s.data_appuntamento),
      posizione: POSIZIONE_ATTIVITA.verifica_misure,
    })
  })

  g.acquisti.forEach((s) => {
    const base = satelliteTipoLabelBreve(s)
    const haFornitore = !!s.fornitore_sede_id
    const haRighe = (dati.righePerSatellite[s.id] ?? []).length > 0
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.acquisti, s.id, base),
      colore: coloreAcquisti(s.ordinato, haFornitore, haRighe),
      statoLabel: labelStatoAcquisti(s.ordinato, haFornitore, haRighe),
      posizione: POSIZIONE_ATTIVITA.acquisto,
    })
  })

  g.costruzione.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.costruzione, s.id, 'Costruzione'),
      colore: coloreSessioniLavoro(s.sessioni_lavoro, s.concluso),
      statoLabel: labelStatoSessioniLavoro(s.sessioni_lavoro, s.concluso),
      posizione: POSIZIONE_ATTIVITA.costruzione,
    })
  })

  g.noleggio.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.noleggio, s.id, 'Noleggio'),
      colore: s.prenotazione_effettuata ? 'green' : 'red',
      statoLabel: labelStatoNoleggio(s.prenotazione_effettuata),
      posizione: POSIZIONE_ATTIVITA.noleggio,
    })
  })

  g.montaggio.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.montaggio, s.id, 'Montaggio'),
      colore: coloreSessioniLavoro(s.sessioni_lavoro, s.concluso),
      statoLabel: labelStatoSessioniLavoro(s.sessioni_lavoro, s.concluso),
      posizione: POSIZIONE_ATTIVITA.montaggio,
    })
  })

  g.speseNonPreventivate.forEach((s) => {
    voci.push({
      satelliteId: s.id,
      nome: nomeNumerato(g.speseNonPreventivate, s.id, 'Attività non preventivate'),
      colore: coloreSpesaNonPreventivata(s.spesa_data, s.valore_complessivo, s.spesa_accettata),
      statoLabel: labelStatoSpesaNonPreventivata(s.spesa_data, s.valore_complessivo, s.spesa_accettata),
      posizione: POSIZIONE_ATTIVITA.spesa_non_preventivata,
    })
  })

  if (g.chiusura.length > 0) {
    const s = g.chiusura[0]
    voci.push({
      satelliteId: s.id,
      nome: 'Chiusura Lavoro',
      colore: coloreChiusura(s.chiusura_incassata, s.chiusura_conclusa),
      statoLabel: labelStatoChiusura(s.chiusura_incassata, s.chiusura_conclusa),
      posizione: POSIZIONE_ATTIVITA.chiusura,
    })
  }

  voci.sort((a, b) => a.posizione - b.posizione)
  return voci
}

export type ContenutoAttivita = {
  nome: string
  colore: ColoreSemaforo
  contenuto: ReactNode
}

// Contenuto di UN satellite specifico, per le nuove route
// @modal/(.)attivita/[attivitaId] e attivita/[attivitaId] — stesso identico
// switch per tipo/tipo_appuntamento che prima viveva nei forEach di
// page.tsx, invariato campo per campo (stessi componenti, stesse prop).
// Ritorna null se l'id non corrisponde a nessun satellite di questo Lavoro.
export function costruisciContenutoAttivita(dati: DatiLavoroSatelliti, satelliteId: string, isOwner: boolean): ContenutoAttivita | null {
  const satellite = dati.satelliti.find((s) => s.id === satelliteId)
  if (!satellite) return null

  const g = raggruppaSatelliti(dati.satelliti)
  const lavoroId = dati.lavoro.id
  const allegati = dati.allegatiById[satelliteId] ?? []

  if (satellite.tipo === 'appuntamento') {
    if (satellite.tipo_appuntamento === 'briefing') {
      return {
        nome: nomeNumerato(g.briefing, satelliteId, 'Briefing'),
        colore: coloreAppuntamento(satellite.concluso, satellite.data_appuntamento),
        contenuto: <SatelliteAppuntamento satellite={satellite} lavoroId={lavoroId} allegati={allegati} isOwner={isOwner} />,
      }
    }
    // verifica_misure (unico altro sottotipo rimasto — montaggio promosso a
    // tipo autonomo il 2026-08-12, vedi CLAUDE.md, gestito nel proprio ramo
    // `satellite.tipo === 'montaggio'` più sotto).
    return {
      nome: nomeNumerato(g.verificaMisure, satelliteId, 'Verifica misure'),
      colore: coloreAppuntamento(satellite.concluso, satellite.data_appuntamento),
      contenuto: <SatelliteAppuntamento satellite={satellite} lavoroId={lavoroId} allegati={allegati} isOwner={isOwner} />,
    }
  }

  if (satellite.tipo === 'progetto') {
    const haAllegati = allegati.length > 0
    return {
      nome: 'Progetto',
      colore: coloreProgetto(satellite.progetto_accettato, haAllegati),
      contenuto: <SatelliteProgetto satellite={satellite} allegati={allegati} isOwner={isOwner} lavoroId={lavoroId} />,
    }
  }

  if (satellite.tipo === 'preventivo') {
    // Sempre la catena/corrente completa, indipendentemente da quale
    // revisione specifica ha risolto la ricerca — un solo Preventivo per
    // Lavoro concettualmente, stesso trattamento di page.tsx.
    const corrente = dati.preventivoCatena[0] ?? satellite
    return {
      nome: 'Preventivo',
      colore: colorePreventivo(corrente.preventivo_accettato, corrente.preventivo_rifiutato, corrente.valore_complessivo),
      contenuto: (
        <SatellitePreventivo catena={dati.preventivoCatena} allegatiById={dati.allegatiById} isOwner={isOwner} lavoroId={lavoroId} />
      ),
    }
  }

  if (satellite.tipo === 'acconto') {
    return {
      nome: nomeNumerato(g.acconto, satelliteId, 'Acconto'),
      colore: coloreAcconto(satellite.acconto_data, satellite.valore_complessivo, satellite.acconto_incassato),
      contenuto: <SatelliteAcconto satellite={satellite} allegati={allegati} isOwner={isOwner} lavoroId={lavoroId} />,
    }
  }

  if (satellite.tipo === 'campione') {
    return {
      nome: nomeNumerato(g.campione, satelliteId, 'Campionatura'),
      colore: coloreCampione(satellite.campione_data_consegna, satellite.campione_consegnato),
      contenuto: <SatelliteCampione satellite={satellite} allegati={allegati} isOwner={isOwner} lavoroId={lavoroId} />,
    }
  }

  if (satellite.tipo === 'acquisti') {
    const base = satelliteTipoLabelBreve(satellite)
    const haFornitore = !!satellite.fornitore_sede_id
    const righe = dati.righePerSatellite[satelliteId] ?? []
    return {
      nome: nomeNumerato(g.acquisti, satelliteId, base),
      colore: coloreAcquisti(satellite.ordinato, haFornitore, righe.length > 0),
      contenuto: (
        <SatelliteOrdine
          satellite={satellite}
          righe={righe}
          allegati={allegati}
          fornitoreSedeLabel={satellite.fornitore_sede_id ? dati.labelPerSedeId.get(satellite.fornitore_sede_id) ?? null : null}
          categorie={dati.categorieAcquisto}
          lavoroId={lavoroId}
          isOwner={isOwner}
        />
      ),
    }
  }

  if (satellite.tipo === 'costruzione') {
    return {
      nome: nomeNumerato(g.costruzione, satelliteId, 'Costruzione'),
      colore: coloreSessioniLavoro(satellite.sessioni_lavoro, satellite.concluso),
      contenuto: <SatelliteCostruzione satellite={satellite} lavoroId={lavoroId} allegati={allegati} isOwner={isOwner} />,
    }
  }

  if (satellite.tipo === 'montaggio') {
    return {
      nome: nomeNumerato(g.montaggio, satelliteId, 'Montaggio'),
      colore: coloreSessioniLavoro(satellite.sessioni_lavoro, satellite.concluso),
      contenuto: <SatelliteMontaggio satellite={satellite} lavoroId={lavoroId} allegati={allegati} isOwner={isOwner} />,
    }
  }

  if (satellite.tipo === 'noleggio') {
    return {
      nome: nomeNumerato(g.noleggio, satelliteId, 'Noleggio'),
      colore: satellite.prenotazione_effettuata ? 'green' : 'red',
      contenuto: (
        <SatelliteNoleggio
          satellite={satellite}
          fornitoreSedeLabel={satellite.fornitore_sede_id ? dati.labelPerSedeId.get(satellite.fornitore_sede_id) ?? null : null}
          allegati={allegati}
          lavoroId={lavoroId}
          isOwner={isOwner}
        />
      ),
    }
  }

  if (satellite.tipo === 'spesa_non_preventivata') {
    return {
      nome: nomeNumerato(g.speseNonPreventivate, satelliteId, 'Attività non preventivate'),
      colore: coloreSpesaNonPreventivata(satellite.spesa_data, satellite.valore_complessivo, satellite.spesa_accettata),
      contenuto: <SatelliteSpesaNonPreventivata satellite={satellite} allegati={allegati} isOwner={isOwner} lavoroId={lavoroId} />,
    }
  }

  // chiusura
  return {
    nome: 'Chiusura Lavoro',
    colore: coloreChiusura(satellite.chiusura_incassata, satellite.chiusura_conclusa),
    contenuto: (
      <SatelliteChiusura
        satellite={satellite}
        lavoroId={lavoroId}
        isOwner={isOwner}
        valoreComplessivo={dati.valoreComplessivo}
        speseComplessive={dati.speseComplessive}
        margine={dati.margine}
        accontiComplessivi={dati.accontiComplessivi}
        importoDaIncassare={dati.importoDaIncassare}
      />
    ),
  }
}
