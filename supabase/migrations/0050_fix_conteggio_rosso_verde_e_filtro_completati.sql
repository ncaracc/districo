-- Sessione "rinomina filtro + incoerenza semaforo in elenco Lavori"
-- (2026-08-17, vedi CLAUDE.md). Due fix indipendenti nella stessa funzione,
-- entrambi richiedono solo `create or replace` (nessun cambio al return
-- type, quindi nessun `drop function` necessario a differenza di altre
-- volte in questo progetto).
--
-- =============================================================
-- PARTE 1 — bug reale: conteggio rosso/verde in elenco Lavori
-- (lavori_dashboard()) poteva mostrare un satellite CONTEMPORANEAMENTE
-- rosso E verde, gonfiando satelliti_rossi anche quando il Dettaglio
-- Lavoro (che usa coloreQualsiasiSatellite()/lib/lavori/satelliti-meta.ts,
-- la fonte di verità) mostrava correttamente tutto verde.
--
-- Causa esatta (riprodotta sui due Lavori segnalati dall'utente, "Manutenzione
-- armadio"/Lucchesi Milena e "Sistemazione ante Achille"/Cogefrin spa,
-- verificati via query dirette su Supabase Cloud prima di scrivere questa
-- migration): entrambi hanno un'Attività Montaggio con `concluso=true` ma
-- `sessioni_lavoro='[]'` (l'artigiano ha semplicemente spuntato "Concluso"
-- senza mai registrare una sessione di lavoro — flusso legittimo, nessun
-- vincolo lo impedisce). `coloreSessioniLavoro()` (satelliti-meta.ts) dà
-- priorità a `conclusa` (verde) indipendentemente dalle sessioni — ma il
-- predicato SQL `rosso` per costruzione/montaggio era
-- `jsonb_array_length(sessioni_lavoro) = 0`, SENZA il guard `not concluso`
-- che hanno invece appuntamento/preventivo/chiusura/acconto/spesa_non_
-- preventivata/progetto (tutti con un `not <flag verde>` esplicito nel
-- proprio predicato rosso, per costruzione garantire la mutua esclusione
-- con verde) — quindi per questi due tipi rosso e verde potevano risultare
-- entrambi true sulla stessa riga, e la riga finiva conteggiata in
-- entrambi `satelliti_rossi` e `satelliti_verdi` contemporaneamente.
--
-- Stesso identico difetto trovato per ispezione mirata (non ipotizzato)
-- anche su Campione: rosso = `campione_data_consegna is null`, senza guard
-- `not campione_consegnato` — un Campione con `campione_consegnato=true` e
-- `campione_data_consegna` mai valorizzata (la Data è liberamente
-- opzionale in UI, nulla obbliga a compilarla prima di spuntare
-- "Consegnato") avrebbe lo stesso identico problema, anche se non è quello
-- che ha causato i due casi segnalati (nessuno dei due Lavori ha
-- un'istanza Campione). Corretto per lo stesso motivo/simmetria, non per
-- analogia cieca: stessa classe di bug, stessa causa strutturale.
--
-- Verificati e ESCLUSI dallo stesso controllo tutti gli altri tipi:
-- progetto/preventivo/appuntamento/chiusura/acconto/spesa_non_preventivata
-- hanno già il guard esplicito nel proprio predicato rosso (mutua
-- esclusione strutturale). Acquisti (`ordinato` verde, fornitore/righe
-- mancanti rosso) verificato SICURO nonostante l'assenza di un guard
-- simmetrico: `impostaOrdinatoAcquisto(true)` richiede fornitore+referenze
-- già persistiti (lib/lavori/satelliti.ts, invariato), e
-- `lavoro_satellite.fornitore_sede_id` referenzia `fornitore_sede(id)`
-- SENZA `on delete cascade`/`set null` (0009) — un fornitore referenziato
-- non può essere eliminato (FK RESTRICT di default), quindi fornitore_sede_id
-- non può mai tornare null dopo che ordinato=true. Nessun fix necessario lì.
--
-- Fix: aggiunto il guard mancante (`not coalesce(<flag verde>, false)`) ai
-- tre predicati rosso — stessa identica priorità già codificata in
-- coloreSessioniLavoro()/coloreCampione(), ora anche lato SQL. Non cambia
-- alcun'altra logica (giallo resta `rilevante and not rosso and not
-- verde`, si ottiene automaticamente il colore corretto una volta risolta
-- l'ambiguità rosso/verde).
--
-- =============================================================
-- PARTE 2 — filtro "Conclusi" -> "Completati": mostrava insieme
-- completato+rifiutato, ridondante col chip "Rifiutati" già esistente.
-- p_filtro='completati' (rinominato da 'conclusi') ora filtra solo
-- stato='completato'. Nessun cambio alla formula KPI "Valore totale
-- generato" (kpi_dashboard(), CTE valore_generato): già filtrata su
-- `stato = 'completato'` fin dalla 0049 — i Rifiutati non hanno mai
-- contribuito a quel KPI, nessuna migrazione necessaria per quella parte.
-- =============================================================

create or replace function public.lavori_dashboard(p_filtro text default 'in_corso')
returns table (
  id                          uuid,
  titolo                      text,
  stato                       text,
  cliente_id                  uuid,
  created_at                  timestamptz,
  punteggio_urgenza           numeric,
  satelliti_rossi             integer,
  satelliti_gialli            integer,
  satelliti_verdi             integer,
  valore_preventivo_accettato numeric,
  data_decisione_preventivo   timestamptz,
  ha_appuntamento_scaduto     boolean,
  ha_acconto_incassato        boolean
)
language sql
stable
set search_path = public
as $$
  select
    l.id,
    l.titolo,
    l.stato,
    l.cliente_id,
    l.created_at,
    coalesce(sum(
      case when s.rilevante and not s.verde
        then extract(epoch from (now() - s.data_ultimo_cambio_stato)) / 86400.0
             * case when s.rosso then 1.0 else 0.5 end
        else 0
      end
    ), 0) as punteggio_urgenza,
    count(*) filter (where s.rilevante and s.rosso)::integer                    as satelliti_rossi,
    count(*) filter (where s.rilevante and not s.rosso and not s.verde)::integer as satelliti_gialli,
    count(*) filter (where s.rilevante and s.verde)::integer                     as satelliti_verdi,
    pv.valore_complessivo as valore_preventivo_accettato,
    pv.data_ultimo_cambio_stato as data_decisione_preventivo,
    coalesce(bool_or(s.scaduto), false) as ha_appuntamento_scaduto,
    coalesce(bool_or(s.acconto_incassato), false) as ha_acconto_incassato
  from lavoro l
  join lavoro_artigiani la
    on la.lavoro_id    = l.id
   and la.artigiano_id = auth.uid()
   and la.stato        = 'accettato'
  left join lateral (
    select
      ls.data_ultimo_cambio_stato,
      not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id) as rilevante,
      ( (
          ls.tipo = 'progetto' and not coalesce(ls.progetto_accettato, false)
          and not exists (select 1 from lavoro_satellite_allegato a where a.satellite_id = ls.id)
        )
        or (
          ls.tipo = 'campione' and not coalesce(ls.campione_consegnato, false)
          and ls.campione_data_consegna is null
        )
        or (
          ls.tipo = 'acquisti'
          and (
            ls.fornitore_sede_id is null
            or not exists (select 1 from lavoro_satellite_articolo a where a.satellite_id = ls.id)
          )
        )
        or (
          ls.tipo = 'costruzione' and not coalesce(ls.concluso, false)
          and jsonb_array_length(ls.sessioni_lavoro) = 0
        )
        or (
          ls.tipo = 'montaggio' and not coalesce(ls.concluso, false)
          and jsonb_array_length(ls.sessioni_lavoro) = 0
        )
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (
          ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
          and (ls.data_appuntamento is null or ls.data_appuntamento < now())
        )
        or (ls.tipo = 'preventivo' and not ls.preventivo_accettato and (ls.preventivo_rifiutato or ls.valore_complessivo is null))
        or (
          ls.tipo = 'chiusura'
          and not coalesce(ls.chiusura_incassata, false)
          and not coalesce(ls.chiusura_conclusa, false)
        )
        or (
          ls.tipo = 'acconto' and not coalesce(ls.acconto_incassato, false)
          and (ls.acconto_data is null or ls.valore_complessivo is null)
        )
        or (
          ls.tipo = 'spesa_non_preventivata' and not coalesce(ls.spesa_accettata, false)
          and (ls.spesa_data is null or ls.valore_complessivo is null)
        )
      ) as rosso,
      ( (ls.tipo = 'progetto' and coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and coalesce(ls.campione_consegnato, false))
        or (ls.tipo = 'acquisti' and coalesce(ls.ordinato, false))
        or (ls.tipo = 'costruzione' and coalesce(ls.concluso, false))
        or (ls.tipo = 'montaggio' and coalesce(ls.concluso, false))
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
        or (
          ls.tipo = 'chiusura'
          and coalesce(ls.chiusura_incassata, false)
          and coalesce(ls.chiusura_conclusa, false)
        )
        or (ls.tipo = 'acconto' and coalesce(ls.acconto_incassato, false))
        or (ls.tipo = 'spesa_non_preventivata' and coalesce(ls.spesa_accettata, false))
      ) as verde,
      (
        ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
        and ls.data_appuntamento is not null and ls.data_appuntamento < now()
      ) as scaduto,
      (ls.tipo = 'acconto' and coalesce(ls.acconto_incassato, false)) as acconto_incassato
    from lavoro_satellite ls
    where ls.lavoro_id = l.id
  ) s on true
  left join lateral (
    select ls2.valore_complessivo, ls2.data_ultimo_cambio_stato
    from lavoro_satellite ls2
    where ls2.lavoro_id = l.id
      and ls2.tipo = 'preventivo'
      and not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls2.id)
    order by ls2.data_creazione desc
    limit 1
  ) pv on true
  where case p_filtro
    when 'in_corso'   then l.stato in ('opportunita', 'accettato')
    when 'completati' then l.stato = 'completato'
    when 'rifiutati'  then l.stato = 'rifiutato'
    else true -- 'tutti' o valore non riconosciuto: nessun filtro di stato
  end
  group by l.id, l.titolo, l.stato, l.cliente_id, l.created_at, pv.valore_complessivo, pv.data_ultimo_cambio_stato
  order by l.created_at asc;
$$;

-- Grant invariati (stessa firma di funzione, nessun drop eseguito).
