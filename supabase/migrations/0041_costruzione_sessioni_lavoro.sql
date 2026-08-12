-- =============================================================
-- Restyling modale satellite Costruzione (vedi CLAUDE.md — mappatura campi
-- Costruzione): sostituisce il vecchio stato a 3 valori testuali
-- (da_iniziare/in_corso/completata) + singola coppia data_inizio/data_fine
-- con un elenco libero di sessioni di lavoro (`sessioni_lavoro`, jsonb,
-- array di `{inizio, fine}` — fine nullable per una sessione ancora
-- aperta) più il flag booleano `concluso` (colonna già esistente, condivisa
-- con Appuntamento — vedi verifica preliminare sotto). Nome della colonna
-- deliberatamente generico ("sessioni_lavoro", non "sessioni_costruzione"):
-- verrà riusata identica da Montaggio in una sessione futura dedicata
-- (Montaggio è oggi un sottotipo di Appuntamento, struttura diversa — non
-- affrontato qui).
--
-- Verifica preliminare punto 2 (riuso di `concluso`): verificato che la
-- colonna non abbia alcun CHECK che la scopi a tipo='appuntamento' (è un
-- semplice boolean, default false, dalla 0012) e che il trigger
-- set_satellite_data_ultimo_cambio_stato() la osservi già
-- incondizionatamente per tipo (non filtrato per tipo='appuntamento') —
-- riuso sicuro, nessuna migrazione al trigger necessaria. Il KPI 3
-- (tempo medio preventivo, 0034) filtra esplicitamente
-- tipo='appuntamento' and tipo_appuntamento='briefing' prima di leggere
-- concluso — riusarla per Costruzione non altera quel calcolo.
--
-- Verifica preliminare punto 1 (dati reali): 5 righe tipo='costruzione' su
-- Supabase Cloud, verificate prima di scrivere questa migration — 2 con
-- stato='completata' e data_inizio/data_fine reali valorizzati (da
-- migrare), 3 con stato='da_iniziare' e nessuna data (nessun dato da
-- migrare, sessioni_lavoro='[]' è già lo stato corretto).
-- =============================================================

alter table lavoro_satellite
  add column sessioni_lavoro jsonb not null default '[]'::jsonb;

-- Migrazione dati: le 2 righe reali con data_inizio/data_fine diventano la
-- prima (e finora unica) sessione dell'array; concluso backfillato dal
-- vecchio stato. data_inizio/data_fine/stato NON droppate (restano in
-- schema per compatibilità storica, semplicemente non più lette/scritte
-- per tipo='costruzione' da qui in avanti — stesso trattamento già
-- riservato a data_presentazione/serie).
update lavoro_satellite
set
  sessioni_lavoro = jsonb_build_array(jsonb_build_object('inizio', data_inizio, 'fine', data_fine)),
  concluso = (stato = 'completata')
where tipo = 'costruzione'
  and data_inizio is not null;

-- costruzione non usa più affatto la colonna legacy `stato` (stesso
-- trattamento già riservato a preventivo/acquisti/chiusura/acconto).
alter table lavoro_satellite drop constraint lavoro_satellite_tipo_stato_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_stato_check
  check (
    (tipo = 'appuntamento' and stato is null)
    or (tipo = 'preventivo')
    or (tipo = 'progetto'
      and stato in ('in_preparazione', 'presentato', 'necessaria_revisione', 'accettato', 'non_necessario'))
    or (tipo = 'campione'
      and stato in ('in_preparazione', 'consegnato', 'necessario_nuovo_campione', 'approvato', 'non_necessario'))
    or (tipo = 'acquisti')
    or (tipo = 'costruzione')
    or (tipo = 'noleggio' and stato is null)
    or (tipo = 'chiusura')
    or (tipo = 'acconto')
  );

-- Gate "pronto per il montaggio": Costruzione bloccante finché concluso
-- non è true (era: stato <> 'completata').
create or replace function public.lavoro_pronto_per_montaggio(p_lavoro_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select not exists (
    select 1
    from lavoro_satellite ls
    where ls.lavoro_id = p_lavoro_id
      and not exists (
        select 1 from lavoro_satellite piu_recente
        where piu_recente.revisione_di = ls.id
      )
      and (
        (ls.tipo = 'preventivo' and not ls.preventivo_accettato)
        or (ls.tipo = 'progetto' and not coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and not coalesce(ls.campione_consegnato, false))
        or (ls.tipo = 'acquisti' and not coalesce(ls.ordinato, false))
        or (ls.tipo = 'costruzione' and not coalesce(ls.concluso, false))
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
      )
  );
$$;

-- Dashboard: rosso se sessioni_lavoro è vuoto (nessuna sessione ancora
-- avviata), verde se concluso=true (priorità massima, indipendente dalle
-- sessioni — stessa priorità già in uso per Preventivo/Progetto/Campione/
-- Acconto/Chiusura), giallo implicito (almeno una sessione, non concluso).
create or replace function public.lavori_dashboard()
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
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (
          ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
          and (ls.data_appuntamento is null or ls.data_appuntamento < now())
        )
        or (ls.tipo = 'preventivo' and not ls.preventivo_accettato and (ls.preventivo_rifiutato or ls.valore_complessivo is null))
        or (ls.tipo = 'chiusura' and not coalesce(ls.chiusura_conclusa, false))
        or (
          ls.tipo = 'acconto' and not coalesce(ls.acconto_incassato, false)
          and (ls.acconto_data is null or ls.valore_complessivo is null)
        )
      ) as rosso,
      ( (ls.tipo = 'progetto' and coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and coalesce(ls.campione_consegnato, false))
        or (ls.tipo = 'acquisti' and coalesce(ls.ordinato, false))
        or (ls.tipo = 'costruzione' and coalesce(ls.concluso, false))
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
        or (ls.tipo = 'chiusura' and coalesce(ls.chiusura_conclusa, false))
        or (ls.tipo = 'acconto' and coalesce(ls.acconto_incassato, false))
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
    select ls2.valore_complessivo
    from lavoro_satellite ls2
    where ls2.lavoro_id = l.id
      and ls2.tipo = 'preventivo'
      and not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls2.id)
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
