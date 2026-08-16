-- Sessione "unificazione Dashboard e Conclusi in un'unica vista con filtri +
-- ricerca cliente" (2026-08-16, vedi CLAUDE.md). Le due pagine (Dashboard su
-- lavori_dashboard(), Conclusi su una query diretta senza satelliti/valore)
-- diventano un'unica pagina /lavori con un filtro di stato — come suggerito
-- dalla verifica preliminare, la si ottiene parametrizzando la RPC già
-- esistente invece di introdurne una seconda quasi identica.
--
-- =============================================================
-- PARTE 1 — lavori_dashboard(p_filtro): where clause parametrizzata,
-- return type invariato salvo una colonna nuova (vedi sotto). DROP
-- necessario: aggiungere una colonna al return type di una funzione non è
-- possibile con il solo CREATE OR REPLACE (stesso limite già incontrato
-- più volte in questo progetto, es. 0028/0043).
--
-- Quattro filtri (stessa semantica decisa con l'utente in sessione):
--   'in_corso'  (default) -> stato in ('opportunita','accettato') — la
--                            vecchia Dashboard, invariata.
--   'conclusi'             -> stato in ('completato','rifiutato') — la
--                            vecchia pagina Conclusi, invariata.
--   'rifiutati'            -> stato = 'rifiutato'.
--   qualunque altro valore -> nessun filtro di stato ("Tutti").
--
-- Nuova colonna data_decisione_preventivo: momento in cui il Preventivo
-- rilevante è stato accettato/rifiutato (data_ultimo_cambio_stato dello
-- stesso satellite già letto per valore_preventivo_accettato, nessuna
-- query aggiuntiva). Serve all'ordinamento del filtro 'rifiutati' in
-- application code: un Lavoro rifiutato non ha quasi mai una Chiusura
-- (rimossa quando lo stato esce da 'accettato' senza diventare
-- 'completato', vedi CLAUDE.md 2026-08-13), quindi chiusura_data non è un
-- proxy affidabile della data di rifiuto lì. Verificato con l'utente che
-- impostaPreventivoDecisione() è l'UNICO punto del codice che porta
-- lavoro.stato a 'rifiutato' (grep mirato su tutto app/lib), sempre
-- contestualmente a preventivo_rifiutato=true sullo stesso satellite:
-- data_ultimo_cambio_stato del Preventivo è quindi un proxy affidabile,
-- nessuna nuova colonna/migrazione dati necessaria.
-- =============================================================

drop function if exists public.lavori_dashboard();

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
        or (ls.tipo = 'campione' and ls.campione_data_consegna is null)
        or (
          ls.tipo = 'acquisti'
          and (
            ls.fornitore_sede_id is null
            or not exists (select 1 from lavoro_satellite_articolo a where a.satellite_id = ls.id)
          )
        )
        or (ls.tipo = 'costruzione' and jsonb_array_length(ls.sessioni_lavoro) = 0)
        or (ls.tipo = 'montaggio' and jsonb_array_length(ls.sessioni_lavoro) = 0)
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
    when 'in_corso'  then l.stato in ('opportunita', 'accettato')
    when 'conclusi'  then l.stato in ('completato', 'rifiutato')
    when 'rifiutati' then l.stato = 'rifiutato'
    else true -- 'tutti' o valore non riconosciuto: nessun filtro di stato
  end
  group by l.id, l.titolo, l.stato, l.cliente_id, l.created_at, pv.valore_complessivo, pv.data_ultimo_cambio_stato
  order by l.created_at asc;
$$;

revoke execute on function public.lavori_dashboard(text) from public;
revoke execute on function public.lavori_dashboard(text) from anon;
grant execute on function public.lavori_dashboard(text) to authenticated;

-- =============================================================
-- PARTE 2 — kpi_dashboard(): una colonna nuova, valore_totale_completati,
-- per il KPI "Valore totale generato" mostrato sul filtro 'conclusi' (i KPI
-- economici/di conteggio esistenti restano quelli di sempre, riletti in
-- application code per filtro invece che qui — solo questo, genuinamente
-- nuovo, richiede un'aggregazione SQL). Stessa formula di "Valore
-- complessivo" già stabilita per Chiusura Lavoro (2026-08-13): Preventivo
-- rilevante + Attività non preventivate accettate, sommato sui soli Lavori
-- stato='completato' (Rifiutati esclusi: per definizione non hanno un
-- valore "generato"). Riusa le CTE preventivo_corrente/
-- spesa_non_preventivata_somma già presenti, nessuna nuova query separata.
-- =============================================================

drop function if exists public.kpi_dashboard();

create or replace function public.kpi_dashboard()
returns table (
  lavori_in_corso               integer,
  importo_lavori_accettati      numeric,
  valore_totale_completati      numeric,
  tempo_preventivo_giorni       numeric,
  tempo_preventivo_campione     integer,
  tempo_completamento_giorni    numeric,
  tempo_completamento_campione  integer
)
language sql
stable
set search_path = public
as $$
  with finestra as (
    select coalesce(a.kpi_finestra_mesi, 12) as mesi
    from artigiano a
    where a.id = auth.uid()
  ),
  lavori_propri as (
    select l.*
    from lavoro l
    join lavoro_artigiani la
      on la.lavoro_id    = l.id
     and la.artigiano_id = auth.uid()
     and la.stato        = 'accettato'
  ),
  in_corso as (
    select count(*)::integer as n
    from lavori_propri
    where stato in ('opportunita', 'accettato')
  ),
  preventivo_corrente as (
    select
      ls.lavoro_id,
      ls.valore_complessivo,
      ls.preventivo_accettato,
      ls.preventivo_rifiutato,
      ls.data_ultimo_cambio_stato
    from lavoro_satellite ls
    where ls.tipo = 'preventivo'
      and not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id)
  ),
  spesa_non_preventivata_somma as (
    select ls.lavoro_id, coalesce(sum(ls.valore_complessivo), 0) as totale
    from lavoro_satellite ls
    where ls.tipo = 'spesa_non_preventivata' and ls.spesa_accettata = true
    group by ls.lavoro_id
  ),
  acconto_incassato_somma as (
    select ls.lavoro_id, coalesce(sum(ls.valore_complessivo), 0) as totale
    from lavoro_satellite ls
    where ls.tipo = 'acconto' and ls.acconto_incassato = true
    group by ls.lavoro_id
  ),
  importo as (
    select coalesce(sum(
      coalesce(pc.valore_complessivo, 0) + coalesce(snp.totale, 0) - coalesce(ai.totale, 0)
    ), 0) as totale
    from lavori_propri l
    left join preventivo_corrente pc on pc.lavoro_id = l.id
    left join spesa_non_preventivata_somma snp on snp.lavoro_id = l.id
    left join acconto_incassato_somma ai on ai.lavoro_id = l.id
    where l.stato = 'accettato'
  ),
  -- KPI nuovo ("Valore totale generato", filtro Conclusi): stessa formula
  -- di importo sopra ma senza sottrarre gli acconti (qui non interessa
  -- quanto resta da incassare, solo quanto il Lavoro ha generato in
  -- totale) e sul perimetro stato='completato'.
  valore_generato as (
    select coalesce(sum(
      coalesce(pc.valore_complessivo, 0) + coalesce(snp.totale, 0)
    ), 0) as totale
    from lavori_propri l
    left join preventivo_corrente pc on pc.lavoro_id = l.id
    left join spesa_non_preventivata_somma snp on snp.lavoro_id = l.id
    where l.stato = 'completato'
  ),
  primo_briefing as (
    select ls.lavoro_id, min(ls.data_ultimo_cambio_stato) as data_briefing
    from lavoro_satellite ls
    where ls.tipo = 'appuntamento'
      and ls.tipo_appuntamento = 'briefing'
      and ls.concluso = true
    group by ls.lavoro_id
  ),
  tempo_preventivo as (
    select
      avg(extract(epoch from (pc.data_ultimo_cambio_stato - pb.data_briefing)) / 86400.0) as media,
      count(*) as n
    from lavori_propri l
    join preventivo_corrente pc on pc.lavoro_id = l.id
    join primo_briefing pb on pb.lavoro_id = l.id
    cross join finestra f
    where (pc.preventivo_accettato or pc.preventivo_rifiutato)
      and pc.data_ultimo_cambio_stato >= now() - (f.mesi || ' months')::interval
  ),
  tempo_completamento as (
    select
      avg(extract(epoch from (l.completato_at - l.data_lavoro::timestamptz)) / 86400.0) as media,
      count(*) as n
    from lavori_propri l
    cross join finestra f
    where l.stato = 'completato'
      and l.completato_at is not null
      and l.completato_at >= now() - (f.mesi || ' months')::interval
  )
  select
    in_corso.n,
    importo.totale,
    valore_generato.totale,
    tempo_preventivo.media,      tempo_preventivo.n::integer,
    tempo_completamento.media,   tempo_completamento.n::integer
  from in_corso, importo, valore_generato, tempo_preventivo, tempo_completamento;
$$;

revoke execute on function public.kpi_dashboard() from public;
revoke execute on function public.kpi_dashboard() from anon;
grant execute on function public.kpi_dashboard() to authenticated;
