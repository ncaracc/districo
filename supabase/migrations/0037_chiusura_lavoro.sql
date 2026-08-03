-- =============================================================
-- Nuova attività "Chiusura Lavoro" (vedi CLAUDE.md): auto-creata insieme a
-- Briefing e Preventivo, non ripetibile, sempre ultima nell'ordine
-- visualizzato. Il suo semaforo verde (chiusura_conclusa=true) è il nuovo
-- (e unico) meccanismo che porta lavoro.stato a 'completato' — sostituisce
-- il vecchio bottone manuale "Segna lavoro completato", rimosso il 3/8.
-- Nessuna tabella Pagamento separata: gli acconti vivono come JSON dentro
-- questo stesso satellite (chiusura_acconti), righe libere non normalizzate.
-- =============================================================

alter table lavoro_satellite
  add column chiusura_conclusa boolean not null default false,
  add column chiusura_data timestamptz,
  add column chiusura_acconti jsonb not null default '[]'::jsonb;

alter table lavoro_satellite add constraint lavoro_satellite_chiusura_tipo_check
  check (
    tipo = 'chiusura'
    or (chiusura_conclusa = false and chiusura_data is null and chiusura_acconti = '[]'::jsonb)
  );

alter table lavoro_satellite drop constraint lavoro_satellite_tipo_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_check
  check (tipo in (
    'appuntamento', 'preventivo', 'progetto', 'acquisti', 'campione', 'costruzione', 'noleggio', 'chiusura'
  ));

-- chiusura non usa affatto la colonna legacy `stato` (stesso trattamento già
-- riservato a preventivo/acquisti).
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
    or (tipo = 'costruzione'
      and stato in ('da_iniziare', 'in_corso', 'completata'))
    or (tipo = 'noleggio' and stato is null)
    or (tipo = 'chiusura')
  );

-- Auto-creazione: Briefing + Preventivo + Chiusura Lavoro (era solo
-- Briefing+Preventivo dalla 0036).
create or replace function public.crea_satelliti_iniziali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into lavoro_satellite (lavoro_id, tipo, tipo_appuntamento, concluso)
    values (new.id, 'appuntamento', 'briefing', false);

  insert into lavoro_satellite (lavoro_id, tipo)
    values (new.id, 'preventivo');

  insert into lavoro_satellite (lavoro_id, tipo)
    values (new.id, 'chiusura');

  return new;
end;
$$;

-- Traccia il cambio anche sul nuovo flag, stesso principio già seguito per
-- ogni altro flag booleano aggiunto in precedenza.
create or replace function public.set_satellite_data_ultimo_cambio_stato()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stato is distinct from old.stato
     or new.concluso is distinct from old.concluso
     or new.prenotazione_effettuata is distinct from old.prenotazione_effettuata
     or new.preventivo_accettato is distinct from old.preventivo_accettato
     or new.preventivo_rifiutato is distinct from old.preventivo_rifiutato
     or new.progetto_accettato is distinct from old.progetto_accettato
     or new.campione_consegnato is distinct from old.campione_consegnato
     or new.ordinato is distinct from old.ordinato
     or new.chiusura_conclusa is distinct from old.chiusura_conclusa then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- Dashboard: Chiusura Lavoro partecipa al conteggio rosso/verde come
-- qualunque altra attività (nessuna eccezione — altrimenti, non comparendo
-- in nessuna delle due condizioni esistenti, sarebbe sempre "giallo" per
-- default, indipendentemente dal suo stato reale). In pratica un Lavoro
-- 'accettato' mostrerà sempre almeno un rosso (Chiusura) finché non viene
-- davvero chiuso — a quel punto lavoro.stato diventa 'completato' e il
-- Lavoro esce comunque dalla dashboard (where l.stato in ('opportunita',
-- 'accettato')), quindi non c'è un vero stato "tutto verde inclusa
-- Chiusura" visibile qui: è corretto, coerente col significato del nome.
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
  ha_appuntamento_scaduto     boolean
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
    coalesce(bool_or(s.scaduto), false) as ha_appuntamento_scaduto
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
        or (ls.tipo = 'campione' and (ls.descrizione is null or btrim(ls.descrizione) = ''))
        or (
          ls.tipo = 'acquisti'
          and (
            ls.fornitore_sede_id is null
            or not exists (select 1 from lavoro_satellite_articolo a where a.satellite_id = ls.id)
          )
        )
        or (ls.tipo = 'costruzione' and ls.stato = 'da_iniziare')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (
          ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
          and (ls.data_appuntamento is null or ls.data_appuntamento < now())
        )
        or (ls.tipo = 'preventivo' and not ls.preventivo_accettato and (ls.preventivo_rifiutato or ls.valore_complessivo is null))
        or (ls.tipo = 'chiusura' and not coalesce(ls.chiusura_conclusa, false))
      ) as rosso,
      ( (ls.tipo = 'progetto' and coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and coalesce(ls.campione_consegnato, false))
        or (ls.tipo = 'acquisti' and coalesce(ls.ordinato, false))
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
        or (ls.tipo = 'chiusura' and coalesce(ls.chiusura_conclusa, false))
      ) as verde,
      (
        ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
        and ls.data_appuntamento is not null and ls.data_appuntamento < now()
      ) as scaduto
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
