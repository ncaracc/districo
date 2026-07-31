import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LavoroStatoAzioni } from '@/components/lavoro-stato-azioni'
import { LavoroSegnaCompletato } from '@/components/lavoro-segna-completato'
import { LavoroRiapri } from '@/components/lavoro-riapri'
import { LavoroInfo } from '@/components/lavoro-info'
import { LavoroSatelliteTabella, type RigaSatellite } from '@/components/lavoro-satelliti-tabella'
import { SatelliteAppuntamento } from '@/components/satellite-appuntamento'
import { SatelliteNuovoAppuntamento } from '@/components/satellite-nuovo-appuntamento'
import { RevisionabileChain } from '@/components/satellite-revisionabile'
import { SatelliteNuovaSerieCampione } from '@/components/satellite-nuova-serie-campione'
import { SatelliteOrdine } from '@/components/satellite-ordine'
import { SatelliteNuovoOrdine } from '@/components/satellite-nuovo-ordine'
import { SatelliteCostruzione } from '@/components/satellite-costruzione'
import { SatelliteNoleggio } from '@/components/satellite-noleggio'
import {
  SOTTOTIPO_APPUNTAMENTO_LABEL,
  STATO_COSTRUZIONE_LABEL,
  costruisciCatena,
  coloreCostruzione,
  coloreOrdine,
  coloreRevisionabile,
  labelStatoAppuntamento,
  labelStatoNoleggio,
  labelStatoOrdine,
  labelStatoRevisionabile,
  raggruppaPerSerie,
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

  const briefing = satelliti.find((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'briefing')
  const progettoSatelliti = satelliti.filter((s) => s.tipo === 'progetto')
  const preventivoSatelliti = satelliti.filter((s) => s.tipo === 'preventivo')
  const campioneSatelliti = satelliti.filter((s) => s.tipo === 'campione')

  const appuntamentiVerificaMisure = satelliti
    .filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'verifica_misure')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const appuntamentiMontaggio = satelliti
    .filter((s) => s.tipo === 'appuntamento' && s.tipo_appuntamento === 'montaggio')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
  const acquistiSatelliti = satelliti.filter((s) => s.tipo === 'acquisti')
  const lavorazioneEsternaSatelliti = satelliti.filter((s) => s.tipo === 'lavorazione_esterna')
  const costruzioneSatellite = satelliti.find((s) => s.tipo === 'costruzione')
  const noleggioSatellite = satelliti.find((s) => s.tipo === 'noleggio')

  const fornitoreSedeIds = [
    ...new Set([...acquistiSatelliti, ...lavorazioneEsternaSatelliti].map((s) => s.fornitore_sede_id).filter((v): v is string => !!v)),
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

  // I satelliti di esecuzione (creati automaticamente all'accettazione) restano
  // nel database anche se il Lavoro torna a 'opportunita' (reversibilità
  // accettato -> opportunita, 26/7) — qui si nascondono semplicemente dalla UI
  // finché il lavoro non è di nuovo accettato o completato, senza eliminare nulla.
  const haEsecuzione =
    (lavoro.stato === 'accettato' || lavoro.stato === 'completato') &&
    (appuntamentiVerificaMisure.length > 0 ||
      appuntamentiMontaggio.length > 0 ||
      acquistiSatelliti.length > 0 ||
      lavorazioneEsternaSatelliti.length > 0 ||
      !!costruzioneSatellite ||
      !!noleggioSatellite)

  // Distinta da haEsecuzione (che dipende dai satelliti già esistenti): governa
  // la disponibilità dei flussi "+ Aggiungi satellite" per i tipi di esecuzione
  // in base allo stato del Lavoro, non a cosa esiste già oggi — altrimenti, se
  // l'ultimo satellite di un tipo di esecuzione viene eliminato dalla tabella,
  // non ci sarebbe più alcun modo per aggiungerne uno nuovo pur restando il
  // Lavoro accettato.
  const faseEsecuzione = lavoro.stato === 'accettato' || lavoro.stato === 'completato'

  // Lavoro completato = sola lettura su tutti i satelliti (vedi CLAUDE.md):
  // isOwnerEffettivo riusa lo stesso meccanismo di sola lettura già previsto
  // per il ruolo "ospite" (isOwner=false) in ogni componente satellite, invece
  // di introdurne uno nuovo — nessuna modifica ai componenti satellite stessi.
  // isOwner "vero" resta usato per la tabella (mostra comunque la colonna
  // Azioni, con matita/cestino disabilitati, non nascosti).
  const completato = lavoro.stato === 'completato'
  const isOwnerEffettivo = !!isOwner && !completato

  // --- Righe della tabella riepilogativa satelliti ---
  const righeTabella: RigaSatellite[] = []

  if (briefing) {
    righeTabella.push({
      key: 'briefing',
      satelliteId: briefing.id,
      nome: 'Briefing',
      colore: briefing.concluso ? 'green' : 'red',
      statoLabel: labelStatoAppuntamento(briefing.concluso, false),
      contenuto: (
        <SatelliteAppuntamento
          satellite={briefing}
          lavoroId={lavoro.id}
          titolo="Briefing"
          allegati={allegatiById[briefing.id] ?? []}
          isOwner={isOwnerEffettivo}
          mostraNonNecessario={false}
        />
      ),
    })
  }

  if (progettoSatelliti.length > 0) {
    const catena = [...costruisciCatena(progettoSatelliti)].reverse()
    const corrente = catena[0]
    const statoEff = statoEffettivoById[corrente.id] ?? corrente.stato ?? ''
    righeTabella.push({
      key: 'progetto',
      satelliteId: corrente.id,
      nome: 'Progetto',
      colore: coloreRevisionabile('progetto', statoEff),
      statoLabel: labelStatoRevisionabile('progetto', statoEff),
      contenuto: (
        <RevisionabileChain
          tipo="progetto"
          titolo="Progetto"
          catena={catena}
          statoEffettivoById={statoEffettivoById}
          allegatiById={allegatiById}
          isOwner={isOwnerEffettivo}
          lavoroId={lavoro.id}
        />
      ),
    })
  }

  if (preventivoSatelliti.length > 0) {
    const catena = [...costruisciCatena(preventivoSatelliti)].reverse()
    const corrente = catena[0]
    const statoEff = statoEffettivoById[corrente.id] ?? corrente.stato ?? ''
    righeTabella.push({
      key: 'preventivo',
      satelliteId: corrente.id,
      nome: 'Preventivo',
      colore: coloreRevisionabile('preventivo', statoEff),
      statoLabel: labelStatoRevisionabile('preventivo', statoEff),
      contenuto: (
        <RevisionabileChain
          tipo="preventivo"
          titolo="Preventivo"
          catena={catena}
          statoEffettivoById={statoEffettivoById}
          allegatiById={allegatiById}
          isOwner={isOwnerEffettivo}
          lavoroId={lavoro.id}
          mostraValore
        />
      ),
    })
  }

  for (const g of raggruppaPerSerie(campioneSatelliti)) {
    const catena = [...costruisciCatena(g.satelliti)].reverse()
    const corrente = catena[0]
    const statoEff = statoEffettivoById[corrente.id] ?? corrente.stato ?? ''
    righeTabella.push({
      key: `campione-${g.serie}`,
      satelliteId: corrente.id,
      nome: `Campione (${g.serie})`,
      colore: coloreRevisionabile('campione', statoEff),
      statoLabel: labelStatoRevisionabile('campione', statoEff),
      contenuto: (
        <RevisionabileChain
          tipo="campione"
          titolo={g.serie}
          catena={catena}
          statoEffettivoById={statoEffettivoById}
          allegatiById={allegatiById}
          isOwner={isOwnerEffettivo}
          lavoroId={lavoro.id}
          mostraDescrizione
          storicoConStatoReale
        />
      ),
    })
  }

  if (haEsecuzione) {
    appuntamentiVerificaMisure.forEach((a, i) => {
      const nome = appuntamentiVerificaMisure.length > 1 ? `Verifica misure ${i + 1}` : 'Verifica misure'
      righeTabella.push({
        key: `app-vm-${a.id}`,
        satelliteId: a.id,
        nome,
        colore: a.concluso || a.non_necessario ? 'green' : 'red',
        statoLabel: labelStatoAppuntamento(a.concluso, a.non_necessario),
        contenuto: (
          <SatelliteAppuntamento
            satellite={a}
            lavoroId={lavoro.id}
            titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'verifica_misure']}
            allegati={allegatiById[a.id] ?? []}
            isOwner={isOwnerEffettivo}
            mostraNonNecessario
          />
        ),
      })
    })

    acquistiSatelliti.forEach((s, i) => {
      const base = satelliteTipoLabelBreve(s)
      const nome = acquistiSatelliti.length > 1 ? `${base} ${i + 1}` : base
      righeTabella.push({
        key: `acquisti-${s.id}`,
        satelliteId: s.id,
        nome,
        colore: coloreOrdine('acquisti', s.stato ?? ''),
        statoLabel: labelStatoOrdine('acquisti', s.stato ?? ''),
        contenuto: (
          <SatelliteOrdine
            satellite={s}
            righe={righePerSatellite[s.id] ?? []}
            fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
            lavoroId={lavoro.id}
            isOwner={isOwnerEffettivo}
          />
        ),
      })
    })

    lavorazioneEsternaSatelliti.forEach((s, i) => {
      const base = satelliteTipoLabelBreve(s)
      const nome = lavorazioneEsternaSatelliti.length > 1 ? `${base} ${i + 1}` : base
      righeTabella.push({
        key: `lavorazione-esterna-${s.id}`,
        satelliteId: s.id,
        nome,
        colore: coloreOrdine('lavorazione_esterna', s.stato ?? ''),
        statoLabel: labelStatoOrdine('lavorazione_esterna', s.stato ?? ''),
        contenuto: (
          <SatelliteOrdine
            satellite={s}
            righe={righePerSatellite[s.id] ?? []}
            fornitoreSedeLabel={s.fornitore_sede_id ? labelPerSedeId.get(s.fornitore_sede_id) ?? null : null}
            lavoroId={lavoro.id}
            isOwner={isOwnerEffettivo}
          />
        ),
      })
    })

    if (costruzioneSatellite) {
      const stato = costruzioneSatellite.stato ?? 'da_iniziare'
      righeTabella.push({
        key: 'costruzione',
        satelliteId: costruzioneSatellite.id,
        nome: 'Costruzione',
        colore: coloreCostruzione(stato),
        statoLabel: STATO_COSTRUZIONE_LABEL[stato] ?? stato,
        contenuto: <SatelliteCostruzione satellite={costruzioneSatellite} lavoroId={lavoro.id} isOwner={isOwnerEffettivo} />,
      })
    }

    if (noleggioSatellite) {
      righeTabella.push({
        key: 'noleggio',
        satelliteId: noleggioSatellite.id,
        nome: 'Noleggio',
        colore: noleggioSatellite.prenotazione_effettuata || noleggioSatellite.non_necessario ? 'green' : 'red',
        statoLabel: labelStatoNoleggio(noleggioSatellite.prenotazione_effettuata, noleggioSatellite.non_necessario),
        contenuto: <SatelliteNoleggio satellite={noleggioSatellite} lavoroId={lavoro.id} isOwner={isOwnerEffettivo} />,
      })
    }

    appuntamentiMontaggio.forEach((a, i) => {
      const nome = appuntamentiMontaggio.length > 1 ? `Montaggio ${i + 1}` : 'Montaggio'
      righeTabella.push({
        key: `app-montaggio-${a.id}`,
        satelliteId: a.id,
        nome,
        colore: a.concluso || a.non_necessario ? 'green' : 'red',
        statoLabel: labelStatoAppuntamento(a.concluso, a.non_necessario),
        contenuto: (
          <SatelliteAppuntamento
            satellite={a}
            lavoroId={lavoro.id}
            titolo={SOTTOTIPO_APPUNTAMENTO_LABEL[a.tipo_appuntamento ?? 'montaggio']}
            allegati={allegatiById[a.id] ?? []}
            isOwner={isOwnerEffettivo}
            mostraNonNecessario
          />
        ),
      })
    })
  }

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

      {lavoro.stato === 'opportunita' && (
        <div className="mb-8">
          {isOwner ? (
            <LavoroStatoAzioni lavoroId={lavoro.id} />
          ) : (
            <p className="text-sm text-gray-500">Lavoro ancora in fase di opportunità.</p>
          )}
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
        aggiungi={
          <>
            <SatelliteNuovaSerieCampione lavoroId={lavoro.id} />
            {faseEsecuzione && (
              <>
                <SatelliteNuovoAppuntamento lavoroId={lavoro.id} />
                <SatelliteNuovoOrdine lavoroId={lavoro.id} tipo="acquisti" />
                <SatelliteNuovoOrdine lavoroId={lavoro.id} tipo="lavorazione_esterna" />
              </>
            )}
          </>
        }
      />

      {lavoro.stato === 'accettato' && isOwner && (
        <div className="mt-6 space-y-3">
          <LavoroSegnaCompletato
            lavoroId={lavoro.id}
            pronto={!!pronto}
            mancanti={satellitiBloccantiMontaggio(satelliti, statoEffettivoById).map(satelliteTipoLabelBreve)}
          />
          <LavoroRiapri lavoroId={lavoro.id} statoAttuale="accettato" />
        </div>
      )}
    </div>
  )
}
