-- =============================================================
-- KPI di durata (tempo di preventivazione/progetto, accettazione ->
-- produzione, durata montaggio) + target configurabili per artigiano.
-- Vedi CLAUDE.md, sezione "KPI di durata" per la diagnosi che ha preceduto
-- questa migration e il dettaglio delle formule.
-- =============================================================

-- 1) Colonne timestamp immutabili aggiuntive -----------------------------

-- lavoro_satellite.data_presentazione: valorizzata una sola volta, alla
-- prima transizione a "presentato" per un satellite Preventivo/Progetto
-- (gestito in lib/lavori/satelliti.ts, impostaStatoRevisionabile) — mai
-- più sovrascritta da transizioni successive sulla stessa riga, a
-- differenza di data_ultimo_cambio_stato che viene invece sovrascritta a
-- ogni cambio (vedi trigger set_satellite_data_ultimo_cambio_stato, 0009/0012).
alter table lavoro_satellite
  add column data_presentazione timestamptz;

-- lavoro.prima_accettazione_at: valorizzata una sola volta alla prima
-- transizione del Lavoro a "accettato" (gestito in lib/lavori/actions.ts,
-- segnaLavoroStato), IMMUTABILE dopo il primo set — a differenza di
-- accettato_at (0001) che viene sovrascritta a ogni ri-accettazione dopo
-- un ciclo accettato -> opportunita -> accettato (reversibilità del 26/7).
--
-- lavoro.completato_at: valorizzata quando il Lavoro passa a "completato"
-- (segnaLavoroStato), azzerata esplicitamente da riapriLavoro() quando il
-- lavoro torna indietro da completato, per non lasciare un timestamp
-- fantasma di un completamento poi annullato.
alter table lavoro
  add column prima_accettazione_at timestamptz,
  add column completato_at timestamptz;

-- 2) Target KPI configurabili per artigiano ------------------------------
-- Nessuna RLS aggiuntiva necessaria: le policy "artigiano vede/aggiorna
-- solo se stesso" (0001) coprono già queste colonne, stesso trattamento
-- già riservato alle colonne SMTP personali (0014).
alter table artigiano
  add column target_preventivo_giorni integer not null default 10,
  add column target_progetto_giorni integer not null default 7,
  add column target_produzione_giorni integer not null default 60,
  add column target_montaggio_giorni integer not null default 7,
  add column kpi_finestra_mesi integer not null default 12;

-- 3) lavori_dashboard(): aggiunta colonna "valore" ------------------------
-- Valore dell'ultimo Preventivo accettato per il Lavoro (join laterale
-- separato da quello già esistente per rossi/gialli/verdi, perché qui
-- serve solo la riga preventivo con stato='accettato', non un aggregato
-- su tutti i satelliti). Nessun'altra modifica alla funzione.
--
-- drop esplicito necessario: Postgres non permette a CREATE OR REPLACE di
-- cambiare l'elenco delle colonne OUT di una funzione già esistente
-- (errore 42P13 "cannot change return type of existing function").
drop function if exists public.lavori_dashboard();

create function public.lavori_dashboard()
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
  valore_preventivo_accettato numeric
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
    pv.valore_complessivo as valore_preventivo_accettato
  from lavoro l
  join lavoro_artigiani la
    on la.lavoro_id    = l.id
   and la.artigiano_id = auth.uid()
   and la.stato        = 'accettato'
  left join lateral (
    select
      ls.data_ultimo_cambio_stato,
      not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id) as rilevante,
      ( (ls.tipo in ('preventivo', 'progetto') and ls.stato = 'in_preparazione')
        or (ls.tipo = 'campione' and ls.stato = 'in_preparazione')
        or (ls.tipo = 'acquisti' and ls.stato = 'da_acquistare')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato = 'da_ordinare')
        or (ls.tipo = 'costruzione' and ls.stato = 'da_iniziare')
        or (ls.tipo = 'noleggio' and coalesce(ls.non_necessario, false) is not true and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true and coalesce(ls.non_necessario, false) is not true)
      ) as rosso,
      ( (ls.tipo in ('preventivo', 'progetto') and ls.stato in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato = 'ricevuto')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato = 'completato')
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and (coalesce(ls.non_necessario, false) or coalesce(ls.prenotazione_effettuata, false)))
        or (ls.tipo = 'appuntamento' and (coalesce(ls.concluso, false) or coalesce(ls.non_necessario, false)))
      ) as verde
    from lavoro_satellite ls
    where ls.lavoro_id = l.id
  ) s on true
  left join lateral (
    select ls2.valore_complessivo
    from lavoro_satellite ls2
    where ls2.lavoro_id = l.id
      and ls2.tipo = 'preventivo'
      and ls2.stato = 'accettato'
    order by ls2.data_creazione desc
    limit 1
  ) pv on true
  where l.stato in ('opportunita', 'accettato')
  group by l.id, l.titolo, l.stato, l.cliente_id, l.created_at, pv.valore_complessivo
  order by punteggio_urgenza desc, l.created_at desc;
$$;

revoke execute on function public.lavori_dashboard() from public;
revoke execute on function public.lavori_dashboard() from anon;
grant execute on function public.lavori_dashboard() to authenticated;

-- 4) kpi_durate(): media in giorni dei 4 KPI per l'artigiano corrente -----
-- SECURITY INVOKER (default, non specificato esplicitamente = invoker):
-- ogni CTE filtra esplicitamente per lavoro_artigiani.artigiano_id =
-- auth.uid(), stesso pattern già in uso in lavori_dashboard() — nessun
-- dato di altri artigiani mai esposto. La finestra temporale (mesi) è
-- letta dal profilo dell'artigiano chiamante (artigiano.kpi_finestra_mesi),
-- non passata dall'esterno.
--
-- Ogni CTE aggregata (avg/count senza group by) restituisce sempre
-- esattamente una riga anche a fronte di zero risultati (avg=null,
-- count=0) — la UI usa il conteggio (*_campione) per distinguere "nessun
-- dato ancora disponibile" da "media pari a un valore reale".
create or replace function public.kpi_durate()
returns table (
  tempo_preventivazione_giorni   numeric,
  tempo_preventivazione_campione integer,
  tempo_progetto_giorni          numeric,
  tempo_progetto_campione        integer,
  tempo_produzione_giorni        numeric,
  tempo_produzione_campione      integer,
  tempo_montaggio_giorni         numeric,
  tempo_montaggio_campione       integer
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
  preventivi as (
    select
      avg(extract(epoch from (ls.data_presentazione - ls.data_creazione)) / 86400.0) as media,
      count(*) as n
    from lavoro_satellite ls
    join lavoro l on l.id = ls.lavoro_id
    join lavoro_artigiani la on la.lavoro_id = l.id and la.artigiano_id = auth.uid() and la.stato = 'accettato'
    cross join finestra f
    where ls.tipo = 'preventivo'
      and ls.data_presentazione is not null
      and ls.data_presentazione >= now() - (f.mesi || ' months')::interval
  ),
  progetti as (
    select
      avg(extract(epoch from (ls.data_presentazione - ls.data_creazione)) / 86400.0) as media,
      count(*) as n
    from lavoro_satellite ls
    join lavoro l on l.id = ls.lavoro_id
    join lavoro_artigiani la on la.lavoro_id = l.id and la.artigiano_id = auth.uid() and la.stato = 'accettato'
    cross join finestra f
    where ls.tipo = 'progetto'
      and ls.data_presentazione is not null
      and ls.data_presentazione >= now() - (f.mesi || ' months')::interval
  ),
  produzione as (
    select
      avg(extract(epoch from (ls.data_inizio - l.prima_accettazione_at)) / 86400.0) as media,
      count(*) as n
    from lavoro_satellite ls
    join lavoro l on l.id = ls.lavoro_id
    join lavoro_artigiani la on la.lavoro_id = l.id and la.artigiano_id = auth.uid() and la.stato = 'accettato'
    cross join finestra f
    where ls.tipo = 'costruzione'
      and ls.data_inizio is not null
      and l.prima_accettazione_at is not null
      and ls.data_inizio >= now() - (f.mesi || ' months')::interval
  ),
  montaggio as (
    select
      avg(extract(epoch from (l.completato_at - primo_montaggio.data_creazione)) / 86400.0) as media,
      count(*) as n
    from lavoro l
    join lavoro_artigiani la on la.lavoro_id = l.id and la.artigiano_id = auth.uid() and la.stato = 'accettato'
    cross join finestra f
    join lateral (
      select ls.data_creazione
      from lavoro_satellite ls
      where ls.lavoro_id = l.id
        and ls.tipo = 'appuntamento'
        and ls.tipo_appuntamento = 'montaggio'
      order by ls.data_creazione asc
      limit 1
    ) primo_montaggio on true
    where l.completato_at is not null
      and l.completato_at >= now() - (f.mesi || ' months')::interval
  )
  select
    preventivi.media, preventivi.n::integer,
    progetti.media,   progetti.n::integer,
    produzione.media, produzione.n::integer,
    montaggio.media,  montaggio.n::integer
  from preventivi, progetti, produzione, montaggio;
$$;

revoke execute on function public.kpi_durate() from public;
revoke execute on function public.kpi_durate() from anon;
grant execute on function public.kpi_durate() to authenticated;
