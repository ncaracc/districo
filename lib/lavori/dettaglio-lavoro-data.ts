import {
  attivitaRilevantiPerChiusura,
  calcolaCostoManodopera,
  coloreQualsiasiSatellite,
  costruisciCatena,
  type Satellite,
  type SatelliteAllegato,
  type SatelliteArticolo,
} from '@/lib/lavori/satelliti-meta'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): estrae
// il blocco di data-fetching che prima viveva solo dentro
// app/(app)/lavori/[id]/page.tsx (una singola chiamata) — ora condiviso
// anche dalle nuove route @modal/(.)attivita/[attivitaId] e
// attivita/[attivitaId] (pagina piena di fallback), che devono costruire lo
// stesso identico contenuto satellite mostrato dalla tabella, ma raggiunte
// da un URL diretto senza passare da page.tsx. Nessuna ottimizzazione
// "fetch solo il satellite richiesto": lavoro_satellite per un Lavoro è
// sempre una tabella piccola (poche decine di righe al massimo) e più tipi
// (Preventivo/Chiusura) hanno comunque bisogno dell'intero insieme
// (catena di revisioni, riepilogo costi aggregato) — rifare la stessa
// query completa in ogni route è la scelta più semplice e priva di rischio
// di divergenza, non una query via via più larga.
export type DatiLavoroSatelliti = {
  lavoro: {
    id: string
    titolo: string
    descrizione: string | null
    stato: string
    cliente_id: string
    // Aggiunta 2026-08-17 (vedi CLAUDE.md — "Scheda di lavoro" PDF): "Aperto:
    // {data}" nell'header della prima pagina — nessun altro consumer prima
    // d'ora, colonna già esistente a schema (mai letta da questo loader).
    created_at: string
    accettato_at: string | null
    completato_at: string | null
    data_lavoro: string | null
    indirizzo: string | null
    civico: string | null
    cap: string | null
    citta: string | null
    sigla_provincia: string | null
    nazione: string | null
  }
  clienteNome: string | null
  isOwner: boolean
  completato: boolean
  // Lavoro completato = sola lettura su tutti i satelliti (vedi CLAUDE.md):
  // isOwnerEffettivo riusa lo stesso meccanismo di sola lettura già previsto
  // per il ruolo "ospite" (isOwner=false) in ogni componente satellite.
  isOwnerEffettivo: boolean
  satelliti: Satellite[]
  allegatiById: Record<string, SatelliteAllegato[]>
  righePerSatellite: Record<string, SatelliteArticolo[]>
  labelPerSedeId: Map<string, string>
  categorieAcquisto: { id: string; nome: string }[]
  // Preventivo "rilevante" (corrente, non superato da una revisione più
  // recente) — stessa logica già usata dal fix Valore Dashboard (0033) e dal
  // KPI 2 (0034). preventivoCatena è l'intera catena (più recente -> più
  // vecchia), serve a SatellitePreventivo per l'eventuale storico.
  valorePreventivo: number | null
  preventivoCatena: Satellite[]
  // I 5 campi calcolati di Chiusura Lavoro (restyling 2026-08-13, vedi
  // CLAUDE.md), tutti sola lettura, mai `null` (ogni componente è già
  // coalesce-ato a 0 individualmente prima di combinarli — un Lavoro senza
  // Preventivo valorizzato o senza Acconti incassati contribuisce comunque
  // con un numero reale, non con un "dato mancante"). speseComplessive
  // rinominato da costiSostenuti (unico consumer era già Chiusura Lavoro,
  // nessun altro chiamante da preservare) per allinearsi al nome richiesto
  // dalla nuova struttura della modale ("Spese complessive").
  valoreComplessivo: number
  speseComplessive: number
  margine: number
  accontiComplessivi: number
  importoDaIncassare: number
  // Costo manodopera Costruzione/Montaggio (2026-08-19, vedi CLAUDE.md —
  // tariffe orarie e costo manodopera): già sottratti da `margine` sopra,
  // esposti anche singolarmente per le due righe dedicate di Chiusura
  // Lavoro e per la riga "Costo manodopera stimato" dei due satelliti
  // stessi — congelati se il Lavoro è chiuso, altrimenti calcolati dal
  // vivo (vedi il commento dettagliato nel corpo della funzione).
  costoManodoperaCostruzione: number
  costoManodoperaMontaggio: number
  // Tariffe orarie VIVE dell'artigiano owner del Lavoro — usate SOLO dal
  // ramo editabile di SatelliteCostruzione/SatelliteMontaggio per il
  // ricalcolo reattivo prima del salvataggio (mai per il ramo di sola
  // lettura, che usa i due campi congelati-o-vivi sopra).
  tariffaOrariaCostruzione: number
  tariffaOrariaMontaggio: number
  // Vincolo "Contrassegna il lavoro come chiuso." (2026-08-13, vedi
  // CLAUDE.md): true solo se TUTTE le Attività esistenti del Lavoro
  // (Chiusura esclusa) sono verdi — usato da SatelliteChiusura per
  // disabilitare la checkbox e mostrare il conteggio di quelle mancanti.
  tutteAttivitaVerdi: boolean
  attivitaNonVerdiCount: number
  progettoEsiste: boolean
  preventivoEsiste: boolean
  chiusuraEsiste: boolean
  // Costruzione/Montaggio non più ripetibili (2026-08-12, vedi CLAUDE.md) —
  // stesso trattamento di progettoEsiste/preventivoEsiste/chiusuraEsiste,
  // usati da LavoroSatelliteTabella per escluderli da "Aggiungi attività"
  // appena esiste già un'istanza per il Lavoro.
  costruzioneEsiste: boolean
  montaggioEsiste: boolean
}

export async function caricaDatiLavoroSatelliti(
  supabase: SupabaseServerClient,
  lavoroId: string,
): Promise<DatiLavoroSatelliti | null> {
  const { data: lavoro } = await supabase
    .from('lavoro')
    .select(
      'id, titolo, descrizione, stato, cliente_id, created_at, accettato_at, completato_at, data_lavoro, indirizzo, civico, cap, citta, sigla_provincia, nazione',
    )
    .eq('id', lavoroId)
    .maybeSingle()

  if (!lavoro) return null

  const [{ data: isOwner }, { data: satellitiGrezzi }, { data: cliente }, { data: ownerRow }] = await Promise.all([
    supabase.rpc('is_owner_del_lavoro', { p_lavoro_id: lavoroId }),
    supabase.from('lavoro_satellite').select('*').eq('lavoro_id', lavoroId),
    supabase.from('cliente').select('nome').eq('id', lavoro.cliente_id).maybeSingle(),
    // Tariffe orarie manodopera (2026-08-19, vedi CLAUDE.md): la tariffa
    // applicata è quella dell'artigiano OWNER del Lavoro (non di chi sta
    // guardando la pagina) — stesso principio deterministico già usato in
    // satelliti.ts (aggiornaChiusuraFlags) per il congelamento, evita
    // l'ambiguità "tariffa di quale artigiano" su un Lavoro "a quattro
    // mani". Solo l'id qui, la riga artigiano vera e propria arriva sotto
    // insieme ad allegati/righe (dipende da questo risultato).
    supabase.from('lavoro_artigiani').select('artigiano_id').eq('lavoro_id', lavoroId).eq('ruolo', 'owner').maybeSingle(),
  ])

  const satelliti: Satellite[] = satellitiGrezzi ?? []
  const satelliteIds = satelliti.map((s) => s.id)

  const [{ data: allegatiGrezzi }, { data: righeGrezze }, { data: ownerArtigiano }] = await Promise.all([
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_allegato').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteAllegato[] }),
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_articolo').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteArticolo[] }),
    ownerRow?.artigiano_id
      ? supabase.from('artigiano').select('tariffa_oraria_costruzione, tariffa_oraria_montaggio').eq('id', ownerRow.artigiano_id).maybeSingle()
      : Promise.resolve({ data: null as { tariffa_oraria_costruzione: number; tariffa_oraria_montaggio: number } | null }),
  ])

  // Fallback ai default applicativi (stessi della migration 0054) se
  // l'owner non si trova per qualunque motivo — degradazione accettata,
  // stesso principio best-effort già in uso altrove in questo file.
  const tariffaOrariaCostruzione = ownerArtigiano?.tariffa_oraria_costruzione ?? 50
  const tariffaOrariaMontaggio = ownerArtigiano?.tariffa_oraria_montaggio ?? 30

  const allegati: SatelliteAllegato[] = allegatiGrezzi ?? []
  const allegatiById: Record<string, SatelliteAllegato[]> = {}
  for (const a of allegati) {
    ;(allegatiById[a.satellite_id] ??= []).push(a)
  }

  // Codice (2026-08-19, vedi CLAUDE.md — migration 0052): query separata
  // per gli id di Referenza usati dalle righe caricate sopra, non un embed
  // PostgREST (`select('*, referenza(codice)')`) — stesso principio già in
  // uso in tutto questo file (query parallele, unite lato JS): il progetto
  // non ha mai avuto un embed di relazione in nessun punto, e
  // `database.types.ts` è mantenuto a mano senza gli array `Relationships`
  // che la tipizzazione di un embed richiederebbe per restare corretta.
  // Nessun filtro `attiva`: una riga già collegata a una Referenza nel
  // frattempo disattivata deve continuare a mostrare il suo Codice storico
  // (stesso principio già seguito per descrizione/colore_finitura, mai
  // "persi" da un soft delete successivo).
  const referenzaIds = [...new Set((righeGrezze ?? []).map((r) => r.referenza_id).filter((id): id is string => id !== null))]
  const { data: referenzeCodici } =
    referenzaIds.length > 0
      ? await supabase.from('referenza').select('id, codice').in('id', referenzaIds)
      : { data: [] as { id: string; codice: string | null }[] }
  const codicePerReferenzaId = new Map((referenzeCodici ?? []).map((r) => [r.id, r.codice]))

  const righe: SatelliteArticolo[] = (righeGrezze ?? []).map((r) => ({
    ...r,
    referenza: r.referenza_id !== null ? { codice: codicePerReferenzaId.get(r.referenza_id) ?? null } : null,
  }))
  const righePerSatellite: Record<string, SatelliteArticolo[]> = {}
  for (const r of righe) {
    ;(righePerSatellite[r.satellite_id] ??= []).push(r)
  }

  const acquistiSatelliti = satelliti.filter((s) => s.tipo === 'acquisti')
  const noleggioSatelliti = satelliti.filter((s) => s.tipo === 'noleggio')

  // "Spese complessive" (Chiusura Lavoro, vedi CLAUDE.md): solo Acquisti già
  // ordinato=true e Noleggi già prenotazione_effettuata=true — le voci non
  // confermate non entrano nel riepilogo. Invariata dal 3/8 (era
  // "costiSostenuti"), solo rinominata.
  const speseComplessive = satelliti.reduce((somma, s) => {
    if (s.tipo === 'acquisti' && s.ordinato) return somma + (s.valore_complessivo ?? 0)
    if (s.tipo === 'noleggio' && s.prenotazione_effettuata) return somma + (s.costo ?? 0)
    return somma
  }, 0)

  const fornitoreSedeIds = [
    ...new Set([...acquistiSatelliti, ...noleggioSatelliti].map((s) => s.fornitore_sede_id).filter((v): v is string => !!v)),
  ]

  // fornitoreSedi e categorieAcquisto sono indipendenti tra loro (nessuno dei
  // due dipende dall'altro, entrambi dipendono solo da dati già disponibili
  // a questo punto) — eseguiti in parallelo con Promise.all, stesso pattern
  // già in uso più sopra in questa funzione. `fornitori` resta invece un
  // secondo giro obbligato: dipende da `fornitoreIds`, che si può calcolare
  // solo dopo aver letto `fornitoreSedi`.
  const [{ data: fornitoreSedi }, { data: categorieAcquisto }] = await Promise.all([
    fornitoreSedeIds.length > 0
      ? supabase.from('fornitore_sede').select('id, fornitore_id, nome, citta').in('id', fornitoreSedeIds)
      : Promise.resolve({ data: [] as { id: string; fornitore_id: string; nome: string; citta: string | null }[] }),
    // Categorie acquisto libere dell'artigiano (sezione "Catalogo", vedi
    // CLAUDE.md 2026-08-17 — prima in Profilo/Impostazioni), per il form
    // "Acquisto" nel modale "Aggiungi attività" e per la vista Acquisto.
    isOwner
      ? supabase.from('categoria_acquisto').select('id, nome').order('nome')
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ])

  const fornitoreIds = [...new Set((fornitoreSedi ?? []).map((s) => s.fornitore_id))]
  const { data: fornitori } =
    fornitoreIds.length > 0 ? await supabase.from('fornitore').select('id, ragione_sociale').in('id', fornitoreIds) : { data: [] }

  const ragioneSocialePerFornitoreId = new Map((fornitori ?? []).map((f) => [f.id, f.ragione_sociale]))
  const labelPerSedeId = new Map(
    (fornitoreSedi ?? []).map((s) => [
      s.id,
      `${ragioneSocialePerFornitoreId.get(s.fornitore_id) ?? '—'} — ${s.nome}${s.citta ? ` (${s.citta})` : ''}`,
    ]),
  )

  const completato = lavoro.stato === 'completato'
  const isOwnerEffettivo = !!isOwner && !completato

  const preventivoSatelliti = satelliti.filter((s) => s.tipo === 'preventivo')
  const preventivoCatena = preventivoSatelliti.length > 0 ? [...costruisciCatena(preventivoSatelliti)].reverse() : []
  const preventivoCorrente = preventivoCatena[0] ?? null
  const valorePreventivo = preventivoCorrente?.valore_complessivo ?? null

  // Vincolo "Contrassegna il lavoro come chiuso." (2026-08-13, vedi
  // CLAUDE.md): abilitabile solo se TUTTE le Attività esistenti (Chiusura
  // esclusa, revisioni Preventivo storiche superate escluse) sono verdi.
  // Reset automatico (scelta esplicita dell'utente tra due opzioni
  // presentate, non ambigua): se chiusura_conclusa era già `true` ma nel
  // frattempo qualcosa non è più verde (es. una nuova "Attività non
  // preventivate" appena creata, ancora rossa), il flag viene corretto a
  // `false` qui — al primo caricamento successivo alla regressione, non
  // solo bloccato per nuove modifiche. Mutazione in-place dell'oggetto
  // dentro `satelliti` (stesso riferimento restituito da `.find`): i
  // consumatori a valle (tabella, contenuto del satellite) vedono già il
  // valore corretto senza una seconda query. Gated su `isOwner`: un ospite
  // in sola lettura non avrebbe comunque permesso di scrittura via RLS —
  // degrado accettabile (il vincolo che conta davvero, impedire
  // lavoro.stato='completato' con attività non verdi, è comunque
  // ri-verificato in modo indipendente e autoritativo da
  // aggiornaChiusuraFlags() al momento del salvataggio). Scrittura
  // best-effort: un errore qui non deve mai bloccare il caricamento della
  // pagina, semplicemente non si corregge in questo giro.
  //
  // Spostato PRIMA del calcolo di Margine/costo manodopera (2026-08-19,
  // vedi CLAUDE.md): il congelamento del costo manodopera deve guardare il
  // valore FINALE/corretto di chiusura_conclusa (post reset automatico),
  // non quello letto a inizio funzione — altrimenti un Lavoro appena
  // "sbloccato" da questo reset mostrerebbe ancora per un istante un costo
  // congelato ormai scaduto.
  const chiusuraSatellite = satelliti.find((s) => s.tipo === 'chiusura') ?? null
  const attivitaRilevanti = attivitaRilevantiPerChiusura(satelliti)
  const attivitaNonVerdiCount = attivitaRilevanti.filter(
    (s) =>
      coloreQualsiasiSatellite(s, {
        haAllegati: (allegatiById[s.id] ?? []).length > 0,
        haRighe: (righePerSatellite[s.id] ?? []).length > 0,
      }) !== 'green',
  ).length
  const tutteAttivitaVerdi = attivitaNonVerdiCount === 0

  if (isOwner && chiusuraSatellite?.chiusura_conclusa && !tutteAttivitaVerdi) {
    const { error: resetErr } = await supabase
      .from('lavoro_satellite')
      .update({ chiusura_conclusa: false })
      .eq('id', chiusuraSatellite.id)
    if (!resetErr) chiusuraSatellite.chiusura_conclusa = false
  }

  // Chiusura Lavoro — campi calcolati (2026-08-13, vedi CLAUDE.md, esteso
  // 2026-08-19 con il costo manodopera): Valore complessivo = Preventivo
  // rilevante + Attività non preventivate accettate; Margine = Valore
  // complessivo - Spese complessive - Costo manodopera Costruzione - Costo
  // manodopera Montaggio; Acconti complessivi = somma degli Acconto con
  // acconto_incassato=true; Importo da incassare = Valore complessivo -
  // Acconti complessivi (normale che non sia zero finché non si incassa il
  // saldo finale — gli Acconto tracciano solo pagamenti parziali, nessun
  // avviso di incoerenza).
  const speseNonPreventivateAccettate = satelliti.reduce((somma, s) => {
    if (s.tipo === 'spesa_non_preventivata' && s.spesa_accettata) return somma + (s.valore_complessivo ?? 0)
    return somma
  }, 0)
  const accontiComplessivi = satelliti.reduce((somma, s) => {
    if (s.tipo === 'acconto' && s.acconto_incassato) return somma + (s.valore_complessivo ?? 0)
    return somma
  }, 0)
  const valoreComplessivo = (valorePreventivo ?? 0) + speseNonPreventivateAccettate

  // Costo manodopera Costruzione/Montaggio (2026-08-19, vedi CLAUDE.md):
  // se il Lavoro è chiuso E il valore congelato esiste (colonna
  // valorizzata alla chiusura, vedi aggiornaChiusuraFlags in satelliti.ts),
  // quello è la fonte di verità — mai ricalcolato con la tariffa corrente,
  // che potrebbe essere cambiata. Altrimenti (Lavoro non ancora chiuso, o
  // chiuso prima che questa colonna esistesse, vedi migration 0054) si
  // calcola dal vivo dalle sessioni attuali × la tariffa VIVA dell'owner.
  const costruzioneSatellite = satelliti.find((s) => s.tipo === 'costruzione') ?? null
  const montaggioSatellite = satelliti.find((s) => s.tipo === 'montaggio') ?? null
  const chiuso = !!chiusuraSatellite?.chiusura_conclusa
  const costoManodoperaCostruzione =
    chiuso && chiusuraSatellite?.chiusura_costo_manodopera_costruzione != null
      ? chiusuraSatellite.chiusura_costo_manodopera_costruzione
      : calcolaCostoManodopera(costruzioneSatellite?.sessioni_lavoro ?? [], tariffaOrariaCostruzione)
  const costoManodoperaMontaggio =
    chiuso && chiusuraSatellite?.chiusura_costo_manodopera_montaggio != null
      ? chiusuraSatellite.chiusura_costo_manodopera_montaggio
      : calcolaCostoManodopera(montaggioSatellite?.sessioni_lavoro ?? [], tariffaOrariaMontaggio)

  const margine = valoreComplessivo - speseComplessive - costoManodoperaCostruzione - costoManodoperaMontaggio
  const importoDaIncassare = valoreComplessivo - accontiComplessivi

  return {
    lavoro,
    clienteNome: cliente?.nome ?? null,
    isOwner: !!isOwner,
    completato,
    isOwnerEffettivo,
    satelliti,
    allegatiById,
    righePerSatellite,
    labelPerSedeId,
    categorieAcquisto: categorieAcquisto ?? [],
    valorePreventivo,
    preventivoCatena,
    valoreComplessivo,
    speseComplessive,
    margine,
    accontiComplessivi,
    importoDaIncassare,
    costoManodoperaCostruzione,
    costoManodoperaMontaggio,
    tariffaOrariaCostruzione,
    tariffaOrariaMontaggio,
    tutteAttivitaVerdi,
    attivitaNonVerdiCount,
    progettoEsiste: satelliti.some((s) => s.tipo === 'progetto'),
    preventivoEsiste: preventivoSatelliti.length > 0,
    chiusuraEsiste: satelliti.some((s) => s.tipo === 'chiusura'),
    costruzioneEsiste: satelliti.some((s) => s.tipo === 'costruzione'),
    montaggioEsiste: satelliti.some((s) => s.tipo === 'montaggio'),
  }
}
