-- =============================================================
-- Sprint E (dashboard) 2026-08-03 — nuovi 4 KPI, sostituiscono i 4
-- precedenti (kpi_durate(), migration 0018_kpi_durate_e_target.sql).
-- Vedi CLAUDE.md per il dettaglio di ciascun criterio di calcolo,
-- deciso esplicitamente dall'utente (quali stati includere, quale
-- Briefing usare se multipli, quali esiti Preventivo contano).
--
-- kpi_durate() viene rimossa: non più referenziata da nessuna pagina
-- dopo questo sprint (Dashboard usa solo la nuova kpi_dashboard(),
-- "Lavori conclusi" non mostra più alcun KPI su decisione esplicita
-- dell'utente — i KPI 1/2 nuovi descrivono lavori in corso, non
-- chiusi, quindi non avrebbe senso mostrarli lì).
--
-- Nessun semaforo/target in questo sprint: a differenza dei 4 KPI
-- precedenti (colore vs artigiano.target_*_giorni), il prompt di
-- questo sprint non menziona alcun confronto con un obiettivo — i 4
-- nuovi KPI sono mostrati come numeri semplici, stesso trattamento sia
-- per i 2 conteggi/somme (KPI 1/2, sempre un valore reale anche se
-- zero) sia per le 2 medie rolling (KPI 3/4, "Dati insufficienti" se
-- campione=0, stesso pattern già in uso). Le colonne
-- artigiano.target_preventivo_giorni/target_progetto_giorni/
-- target_produzione_giorni/target_montaggio_giorni restano a schema
-- (non droppate, fuori scope) ma non sono più lette da nessun KPI
-- dopo questo sprint — solo kpi_finestra_mesi resta effettivamente
-- usata (finestra rolling di KPI 3/4).
-- =============================================================

drop function if exists public.kpi_durate();

create function public.kpi_dashboard()
returns table (
  lavori_in_corso               integer,
  importo_lavori_accettati      numeric,
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
  -- Lavori dell'artigiano chiamante (owner o ospite accettato), stesso
  -- pattern di lavori_dashboard()/kpi_durate() — RLS su lavoro_satellite
  -- ("lettura chi è nel lavoro") scopa comunque correttamente anche le
  -- CTE sottostanti che leggono quella tabella senza join esplicito a
  -- lavoro_artigiani, essendo questa funzione security invoker.
  lavori_propri as (
    select l.*
    from lavoro l
    join lavoro_artigiani la
      on la.lavoro_id    = l.id
     and la.artigiano_id = auth.uid()
     and la.stato        = 'accettato'
  ),
  -- KPI 1: conteggio puntuale, nessuna finestra temporale (non è una
  -- media storica) — un lavoro è "in corso" se non ancora deciso
  -- (opportunita) o già accettato ma non ancora completato/rifiutato.
  in_corso as (
    select count(*)::integer as n
    from lavori_propri
    where stato in ('opportunita', 'accettato')
  ),
  -- Riga Preventivo "rilevante" (corrente, non superata da una
  -- revisione più recente) per ciascun Lavoro — stessa identica logica
  -- del gate lavoro_pronto_per_montaggio()/lavori_dashboard() e del fix
  -- Valore Dashboard (migration 0033).
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
  -- KPI 2: somma puntuale (nessuna finestra), SOLO stato='accettato'
  -- esatto (un lavoro completato non conta più qui, per scelta esplicita
  -- dell'utente — non è "quanto ho accettato nel tempo", è "quanto ho
  -- attualmente accettato e non ancora completato/rifiutato").
  importo as (
    select coalesce(sum(pc.valore_complessivo), 0) as totale
    from lavori_propri l
    join preventivo_corrente pc on pc.lavoro_id = l.id
    where l.stato = 'accettato'
  ),
  -- Primo Briefing concluso cronologicamente per Lavoro (MIN, gestisce
  -- il caso di più istanze di Briefing sullo stesso Lavoro, ripetibile
  -- dallo Sprint "fondamenta" del 2/8). data_ultimo_cambio_stato si
  -- aggiorna già correttamente al cambio di `concluso` (trigger
  -- set_satellite_data_ultimo_cambio_stato, esteso in tal senso dalla
  -- 0012, confermato ancora attivo nella sua ultima definizione nella
  -- 0030) — nessuna colonna dedicata necessaria. Limite noto e
  -- accettato: se un Briefing viene concluso, poi riaperto e riconcluso,
  -- riflette l'ultimo cambio non il primo (caso limite raro, non gestito
  -- qui, si applicherebbe comunque a qualunque colonna basata su questo
  -- stesso trigger).
  primo_briefing as (
    select ls.lavoro_id, min(ls.data_ultimo_cambio_stato) as data_briefing
    from lavoro_satellite ls
    where ls.tipo = 'appuntamento'
      and ls.tipo_appuntamento = 'briefing'
      and ls.concluso = true
    group by ls.lavoro_id
  ),
  -- KPI 3: media rolling (finestra su kpi_finestra_mesi, ancorata alla
  -- data dell'esito preventivo). Entrambi gli esiti (accettato O
  -- rifiutato) contano come "completato" ai fini di questo KPI, per
  -- scelta esplicita dell'utente.
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
  -- KPI 4: media rolling (finestra su completato_at). data_lavoro (non
  -- created_at) è la colonna di "apertura" corretta: è quella mostrata
  -- in UI come "Aperto il" (redesign dettaglio Lavoro del 31/7),
  -- editabile dall'artigiano — created_at è il timestamp tecnico di
  -- inserimento della riga, non il concetto di "apertura lavoro" a cui
  -- il prompt fa riferimento. data_lavoro è un date: cast a timestamptz
  -- (mezzanotte) per la sottrazione con completato_at, coerente con la
  -- granularità a giorni dell'intero KPI.
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
    tempo_preventivo.media,      tempo_preventivo.n::integer,
    tempo_completamento.media,   tempo_completamento.n::integer
  from in_corso, importo, tempo_preventivo, tempo_completamento;
$$;

revoke execute on function public.kpi_dashboard() from public;
revoke execute on function public.kpi_dashboard() from anon;
grant execute on function public.kpi_dashboard() to authenticated;
