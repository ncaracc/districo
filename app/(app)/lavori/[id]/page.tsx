import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LavoroSegnaCompletato } from '@/components/lavoro-segna-completato'
import { LavoroRiapri } from '@/components/lavoro-riapri'
import { LavoroInfo } from '@/components/lavoro-info'
import { LavoroSatelliteTabella, type RigaSatellite } from '@/components/lavoro-satelliti-tabella'
import { SatelliteAppuntamento } from '@/components/satellite-appuntamento'
import { SatellitePreventivo } from '@/components/satellite-preventivo'
import { SatelliteProgetto } from '@/components/satellite-progetto'
import { SatelliteCampione } from '@/components/satellite-campione'
import { SatelliteOrdine } from '@/components/satellite-ordine'
import { SatelliteCostruzione } from '@/components/satellite-costruzione'
import { SatelliteNoleggio } from '@/components/satellite-noleggio'
import { POSIZIONE_ATTIVITA } from '@/lib/lavori/attivita-ordine'
import {
  SOTTOTIPO_APPUNTAMENTO_LABEL,
  STATO_COSTRUZIONE_LABEL,
  costruisciCatena,
  coloreAcquisti,
  coloreAppuntamento,
  coloreCampione,
  coloreCostruzione,
  colorePreventivo,
  coloreProgetto,
  labelStatoAcquisti,
  labelStatoAppuntamento,
  labelStatoCampione,
  labelStatoNoleggio,
  labelStatoPreventivo,
  labelStatoProgetto,
  satelliteTipoLabelBreve,
  satellitiBloccantiMontaggio,
  type Satellite,
  type SatelliteAllegato,
  type SatelliteArticolo,
} from '@/lib/lavori/satelliti-meta'

export default async function LavoroDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lavoro } = await supabase
    .from('lavoro')
    .select(
      'id, titolo, descrizione, stato, cliente_id, accettato_at, completato_at, data_lavoro, indirizzo, civico, cap, citta, sigla_provincia, nazione',
    )
    .eq('id', id)
    .maybeSingle()

  if (!lavoro) notFound()

  const [{ data: isOwner }, { data: satellitiGrezzi }, { data: statoEffettivoGrezzo }, { data: pronto }] =
    await Promise.all([
      supabase.rpc('is_owner_del_lavoro', { p_lavoro_id: id }),
      supabase.from('lavoro_satellite').select('*').eq('lavoro_id', id),
      supabase.rpc('lavoro_satellite_stato_effettivo', { p_lavoro_id: id }),
      supabase.rpc('lavoro_pronto_per_montaggio', { p_lavoro_id: id }),
    ])

  const satelliti: Satellite[] = satellitiGrezzi ?? []
  const satelliteIds = satelliti.map((s) => s.id)

  const [{ data: allegatiGrezzi }, { data: righeGrezze }] = await Promise.all([
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_allegato').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteAllegato[] }),
    satelliteIds.length > 0
      ? supabase.from('lavoro_satellite_articolo').select('*').in('satellite_id', satelliteIds)
      : Promise.resolve({ data: [] as SatelliteArticolo[] }),
  ])

  const allegati: SatelliteAllegato[] = allegatiGrezzi ?? []
  const allegatiById: Record<string, SatelliteAllegato[]> = {}
  for (const a of allegati) {
    ;(allegatiById[a.satellite_id] ??= []).push(a)
  }

  const righe: SatelliteArticolo[] = righeGrezze ?? []
  const righePerSatellite: Record<string, SatelliteArticolo[]> = {}
  for (const r of righe) {
    ;(righePerSatellite[r.satellite_id] ??= []).push(r)
  }

  const statoEffettivoById: Record<string, string> = {}
  for (const s of statoEffettivoGrezzo ?? []) {
    if (s.stato_effettivo) statoEffettivoById[s.satellite_id] = s.stato_effettivo
  }

  const briefingSatelliti = satelliti
    .filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'briefing')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const progettoSatelliti = satelliti.filter((s) => s.tipo === 'progetto')
  const preventivoSatelliti = satelliti.filter((s) => s.tipo === 'preventivo')
  const campioneSatelliti = satelliti
    .filter((s) => s.tipo === 'campione')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))

  const appuntamentiVerificaMisure = satelliti
    .filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'verifica_misure')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const appuntamentiMontaggio = satelliti
    .filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'montaggio')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const acquistiSatelliti = satelliti
    .filter((s) => s.tipo === 'acquisti')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const costruzioneSatelliti = satelliti
    .filter((s) => s.tipo === 'costruzione')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const noleggioSatelliti = satelliti
    .filter((s) => s.tipo === 'noleggio')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))

  const fornitoreSedeIds = [
    ...new Set(
      [...acquistiSatelliti, ...noleggioSatelliti].map((s) => s.fornitore_sede_id).filter((v): v is string => !!v),
    ),
  ]
  const { data: fornitoreSedi } =
    fornitoreSedeIds.length > 0
      ? await supabase.from('fornitore_sede').select('id, fornitore_id, nome, citta').in('id', fornitoreSedeIds)
      : { data: [] }

  const fornitoreIds = [...new Set((fornitoreSedi ?? []).map((s) => s.fornitore_id))]
  const { data: fornitori } =
    fornitoreIds.length > 0
      ? await supabase.from('fornitore').select('id, ragione_sociale').in('id', fornitoreIds)
      : { data: [] }

  const ragioneSocialePerFornitoreId = new Map((fornitori ?? []).map((f) => [f.id, f.ragione_sociale]))
  const labelPerSedeId = new Map(
    (fornitoreSedi ?? []).map((s) => [
      s.id,
      `${ragioneSocialePerFornitoreId.get(s.fornitore_id) ?? '—'} — ${s.nome}${s.citta ? ` (${s.citta})` : ''}`,
    ]),
  )

  // Categorie acquisto libere dell'artigiano (Profilo/Impostazioni), per il
  // form "Acquisto" nel modale "Aggiungi attività".
  const { data: categorieAcquisto } = isOwner
    ? await supabase.from('categoria_acquisto').select('id, nome').order('nome')
    : { data: [] }

  // Lavoro completato = sola lettura su tutti i satelliti (vedi CLAUDE.md):
  // isOwnerEffettivo riusa lo stesso meccanismo di sola lettura già previsto
  // per il ruolo "ospite" (isOwner=false) in ogni componente satellite, invece
  // di introdurne uno nuovo — nessuna modifica ai componenti satellite stessi.
  // isOwner "vero" resta usato per la tabella (mostra comunque la colonna
  // Azioni, con matita/cestino disabilitati, non nascosti).
  const completato = lavoro.stato === 'completato'
  const isOwnerEffettivo = !!isOwner && !completato

  // --- Righe della tabella riepilogativa attività ---
  // Costruite senza un ordine particolare, poi ordinate esplicitamente in
  // base a POSIZIONE_ATTIVITA (unica fonte di verità, vedi
  // lib/lavori/attivita-ordine.ts) — un sort stabile mantiene l'ordine di
  // inserimento tra istanze dello stesso tipo (es. due Acquisti), coerente
  // con "la nuova istanza va subito dopo l'ultima esistente dello stesso tipo".
  const righeTabella: (RigaSatellite & { posizione: number })[] = []

  briefingSatelliti.forEach((s, i) => {
    const nome = briefingSatelliti.length > 1 ? `Briefing ${i + 1}` : 'Briefing'
    righeTabella.push({
      satelliteId: s.id,
      nome,
      colore: coloreAppuntamento(s.concluso, s.data_appuntamento),
      statoLabel: labelStatoAppuntamento(s.concluso, s.data_appuntamento),
      posizione: POSIZIONE_ATTIVITA.briefing,
      contenutoModifica: (
        <SatelliteAppuntamento
          satellite={s}
          lavoroId={lavoro.id}
          titolo={nome}
          allegati={allegatiById[s.id] ?? []}
          isOwner={isOwnerEffettivo}
        />
      ),
      contenutoLettura: (
        <SatelliteAppuntamento
          satellite={s}
          lavoroId={lavoro.id}
          titolo={nome}
          allegati={allegatiById[s.id] ?? []}
          isOwner={false}
        />
      ),
    })
  })

  if (progettoSatelliti.length > 0) {
    // Non più una catena di revisioni dallo Sprint C (2/8): un solo
    // satellite per Lavoro (non ripetibile, "Aggiungi attività" lo propone
    // solo se assente) — si prende direttamente, nessun costruisciCatena.
    const corrente = progettoSatelliti[0]
    const haAllegati = (allegatiById[corrente.id] ?? []).length > 0
    righeTabella.push({
      satelliteId: corrente.id,
      nome: 'Progetto',
      colore: coloreProgetto(corrente.progetto_accettato, haAllegati),
      statoLabel: labelStatoProgetto(corrente.progetto_accettato, haAllegati),
      posizione: POSIZIONE_ATTIVITA.progetto,
      contenutoModifica: (
        <SatelliteProgetto
          satellite={corrente}
          allegati={allegatiById[corrente.id] ?? []}
          isOwner={isOwnerEffettivo}
          lavoroId={lavoro.id}
        />
      ),
      contenutoLettura: (
        <SatelliteProgetto
          satellite={corrente}
          allegati={allegatiById[corrente.id] ?? []}
          isOwner={false}
          lavoroId={lavoro.id}
        />
      ),
    })
  }

  if (preventivoSatelliti.length > 0) {
    const catena = [...costruisciCatena(preventivoSatelliti)].reverse()
    const corrente = catena[0]
    righeTabella.push({
      satelliteId: corrente.id,
      nome: 'Preventivo',
      colore: colorePreventivo(corrente.preventivo_accettato, corrente.preventivo_rifiutato, corrente.valore_complessivo),
      statoLabel: labelStatoPreventivo(corrente.preventivo_accettato, corrente.preventivo_rifiutato, corrente.valore_complessivo),
      posizione: POSIZIONE_ATTIVITA.preventivo,
      contenutoModifica: (
        <SatellitePreventivo catena={catena} allegatiById={allegatiById} isOwner={isOwnerEffettivo} lavoroId={lavoro.id} />
      ),
      contenutoLettura: (
        <SatellitePreventivo catena={catena} allegatiById={allegatiById} isOwner={false} lavoroId={lavoro.id} />
      ),
    })
  }

  // Ogni riga è un'istanza indipendente (Sprint D, produzione, 2/8, vedi
  // CLAUDE.md): niente più raggruppamento per serie/revisione_di — una riga
  // per satellite, stesso pattern di numerazione già in uso per
  // Costruzione/Noleggio/Briefing quando ce n'è più di una.
  campioneSatelliti.forEach((s, i) => {
    const nome = campioneSatelliti.length > 1 ? `Campionatura ${i + 1}` : 'Campionatura'
    righeTabella.push({
      satelliteId: s.id,
      nome,
      colore: coloreCampione(s.descrizione, s.campione_consegnato),
      statoLabel: labelStatoCampione(s.descrizione, s.campione_consegnato),
      posizione: POSIZIONE_ATTIVITA.campionatura,
      contenutoModifica: (
        <SatelliteCampione satellite={s} allegati={allegatiById[s.id] ?? []} isOwner={isOwnerEffettivo} lavoroId={lavoro.id} />
      ),
      contenutoLettura: (
        <SatelliteCampione satellite={s} allegati={allegatiById[s.id] ?? []} isOwner={false} lavoroId={lavoro.id} />
      ),
    })
  })

  appuntamentiVerificaMisure.forEach((a, i) => {
    const nome = appuntamentiVerificaMisure.length > 1 ? `Verifica misure ${i + 1}` : 'Verifica misure'
    righeTabella.push({
      satelliteId: a.id,
      nome,
      colore: coloreAppuntamento(a.concluso, a.data_appuntamento),
      statoLabel: labelStatoAppuntamento(a.concluso, a.data_appuntamento),
      posizione: POSIZIONE_ATTIVITA.verifica_misure,
      contenutoModifica: (
        <SatelliteAppuntamento
          satellite={a}
          lavoroId={lavoro.id}
          titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'verifica_misure']}
          allegati={allegatiById[a.id] ?? []}
          isOwner={isOwnerEffettivo}
        />
      ),
      contenutoLettura: (
        <SatelliteAppuntamento
          satellite={a}
          lavoroId={lavoro.id}
          titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'verifica_misure']}
          allegati={allegatiById[a.id] ?? []}
          isOwner={false}
        />
      ),
    })
  })

  acquistiSatelliti.forEach((s, i) => {
    const base = satelliteTipoLabelBreve(s)
    const nome = acquistiSatelliti.length > 1 ? `${base} ${i + 1}` : base
    const haFornitore = !!s.fornitore_sede_id
    const haRighe = (righePerSatellite[s.id] ?? []).length > 0
    righeTabella.push({
      satelliteId: s.id,
      nome,
      colore: coloreAcquisti(s.ordinato, haFornitore, haRighe),
      statoLabel: labelStatoAcquisti(s.ordinato, haFornitore, haRighe),
      posizione: POSIZIONE_ATTIVITA.acquisto,
      contenutoModifica: (
        <SatelliteOrdine
          satellite={s}
          righe={righePerSatellite[s.id] ?? []}
          allegati={allegatiById[s.id] ?? []}
          fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
          categorie={categorieAcquisto ?? []}
          lavoroId={lavoro.id}
          isOwner={isOwnerEffettivo}
        />
      ),
      contenutoLettura: (
        <SatelliteOrdine
          satellite={s}
          righe={righePerSatellite[s.id] ?? []}
          allegati={allegatiById[s.id] ?? []}
          fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
          categorie={categorieAcquisto ?? []}
          lavoroId={lavoro.id}
          isOwner={false}
        />
      ),
    })
  })

  costruzioneSatelliti.forEach((s, i) => {
    const nome = costruzioneSatelliti.length > 1 ? `Costruzione ${i + 1}` : 'Costruzione'
    const stato = s.stato ?? 'da_iniziare'
    righeTabella.push({
      satelliteId: s.id,
      nome,
      colore: coloreCostruzione(stato),
      statoLabel: STATO_COSTRUZIONE_LABEL[stato] ?? stato,
      posizione: POSIZIONE_ATTIVITA.costruzione,
      contenutoModifica: <SatelliteCostruzione satellite={s} lavoroId={lavoro.id} isOwner={isOwnerEffettivo} />,
      contenutoLettura: <SatelliteCostruzione satellite={s} lavoroId={lavoro.id} isOwner={false} />,
    })
  })

  noleggioSatelliti.forEach((s, i) => {
    const nome = noleggioSatelliti.length > 1 ? `Noleggio ${i + 1}` : 'Noleggio'
    righeTabella.push({
      satelliteId: s.id,
      nome,
      colore: s.prenotazione_effettuata ? 'green' : 'red',
      statoLabel: labelStatoNoleggio(s.prenotazione_effettuata),
      posizione: POSIZIONE_ATTIVITA.noleggio,
      contenutoModifica: (
        <SatelliteNoleggio
          satellite={s}
          fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
          lavoroId={lavoro.id}
          isOwner={isOwnerEffettivo}
        />
      ),
      contenutoLettura: (
        <SatelliteNoleggio
          satellite={s}
          fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
          lavoroId={lavoro.id}
          isOwner={false}
        />
      ),
    })
  })

  appuntamentiMontaggio.forEach((a, i) => {
    const nome = appuntamentiMontaggio.length > 1 ? `Montaggio ${i + 1}` : 'Montaggio'
    righeTabella.push({
      satelliteId: a.id,
      nome,
      colore: coloreAppuntamento(a.concluso, a.data_appuntamento),
      statoLabel: labelStatoAppuntamento(a.concluso, a.data_appuntamento),
      posizione: POSIZIONE_ATTIVITA.montaggio,
      contenutoModifica: (
        <SatelliteAppuntamento
          satellite={a}
          lavoroId={lavoro.id}
          titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'montaggio']}
          allegati={allegatiById[a.id] ?? []}
          isOwner={isOwnerEffettivo}
        />
      ),
      contenutoLettura: (
        <SatelliteAppuntamento
          satellite={a}
          lavoroId={lavoro.id}
          titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'montaggio']}
          allegati={allegatiById[a.id] ?? []}
          isOwner={false}
        />
      ),
    })
  })

  righeTabella.sort((a, b) => a.posizione - b.posizione)

  const progettoEsiste = progettoSatelliti.length > 0
  const preventivoEsiste = preventivoSatelliti.length > 0

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/lavori"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="mb-6">
        <LavoroInfo
          lavoroId={lavoro.id}
          isOwner={!!isOwner}
          stato={lavoro.stato}
          accettatoAt={lavoro.accettato_at}
          completatoAt={lavoro.completato_at}
          fields={{
            titolo: lavoro.titolo,
            descrizione: lavoro.descrizione,
            data_lavoro: lavoro.data_lavoro,
            indirizzo: lavoro.indirizzo,
            civico: lavoro.civico,
            cap: lavoro.cap,
            citta: lavoro.citta,
            sigla_provincia: lavoro.sigla_provincia,
            nazione: lavoro.nazione,
          }}
        />
      </div>

      {lavoro.stato === 'opportunita' && preventivoSatelliti.length > 0 && !isOwner && (
        <div className="mb-8">
          <p className="text-sm text-gray-500">Lavoro ancora in fase di opportunità.</p>
        </div>
      )}

      {isOwner && (lavoro.stato === 'completato' || lavoro.stato === 'rifiutato') && (
        <div className="mb-8">
          <LavoroRiapri lavoroId={lavoro.id} statoAttuale={lavoro.stato} />
        </div>
      )}

      <LavoroSatelliteTabella
        righe={righeTabella}
        lavoroId={lavoro.id}
        isOwner={!!isOwner}
        completato={completato}
        progettoEsiste={progettoEsiste}
        preventivoEsiste={preventivoEsiste}
        categorieAcquisto={categorieAcquisto ?? []}
      />

      {lavoro.stato === 'accettato' && isOwner && (
        <div className="mt-6 space-y-3">
          <LavoroSegnaCompletato
            lavoroId={lavoro.id}
            pronto={!!pronto}
            mancanti={satellitiBloccantiMontaggio(satelliti, statoEffettivoById).map(satelliteTipoLabelBreve)}
          />
        </div>
      )}
    </div>
  )
}
