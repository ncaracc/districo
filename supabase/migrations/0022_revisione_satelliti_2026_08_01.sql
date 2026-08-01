-- =============================================================
-- Revisione satelliti 2026-08-01 (vedi CLAUDE.md, sezione dedicata):
-- rimozione del concetto "non necessario", nuovo modello Preventivo a
-- due flag booleani indipendenti, unificazione Acquisti/Lavorazione
-- esterna in un solo tipo satellite. Nessuna modifica a Progetto/
-- Campione (restano sul vecchio modello a 5 stati).
-- =============================================================

-- =============================================================
-- 1) RIMOZIONE "NON NECESSARIO"
--
-- Confermato: 0 righe con non_necessario=true su tutte le 76 esistenti
-- (vedi docs/fase0-discovery-2026-08-01.txt). Principio: se un'attività
-- non serve, semplicemente non si crea — non esiste più lo stato
-- "creata ma non necessaria" per appuntamento/noleggio.
-- =============================================================
alter table lavoro_satellite drop constraint lavoro_satellite_briefing_necessario_check;
alter table lavoro_satellite drop column non_necessario;

-- =============================================================
-- 2) ACQUISTI + LAVORAZIONE_ESTERNA — cancella tutto, ripartire puliti
--
-- Nessuna migrazione dati: l'utente ha confermato che le 5+5 righe
-- esistenti sono sacrificabili (nessun allegato collegato, verificato
-- nella discovery). Da qui in avanti esiste un solo tipo satellite
-- 'acquisti'; la distinzione avviene tramite acquisto_categoria (testo
-- libero, valori definiti dall'artigiano nella tabella già esistente
-- categoria_acquisto — dalla 0001, mai usata finora).
-- =============================================================
delete from lavoro_satellite where tipo in ('acquisti', 'lavorazione_esterna');

-- =============================================================
-- 3) PREVENTIVO — due nuove colonne booleane dedicate
--
-- Il vecchio campo `stato` NON viene rimosso dallo schema (condiviso
-- con altri tipi satellite: progetto, campione, acquisti, costruzione)
-- ma smette di essere letto/scritto dall'app per tipo='preventivo' —
-- resta come colonna storica per le righe esistenti.
-- =============================================================
alter table lavoro_satellite
  add column preventivo_accettato boolean not null default false,
  add column preventivo_rifiutato boolean not null default false;

-- Migrazione dei 12 record esistenti sul campo stato attuale:
--   stato='accettato' (5 righe, inclusa la revisione che supera la
--     riga storica id=49eec7d8-9edc-45e2-9009-2034cfe423c7)
--     -> preventivo_accettato=true
--   presentato/in_preparazione/necessaria_revisione (7 righe, inclusa
--     la riga storica 49eec7d8 stessa) -> entrambi false (default,
--     nessun update necessario)
update lavoro_satellite
  set preventivo_accettato = true
  where tipo = 'preventivo' and stato = 'accettato';

alter table lavoro_satellite add constraint lavoro_satellite_preventivo_esclusivo_check
  check (not (preventivo_accettato and preventivo_rifiutato));

alter table lavoro_satellite add constraint lavoro_satellite_preventivo_flags_tipo_check
  check (tipo = 'preventivo' or (preventivo_accettato = false and preventivo_rifiutato = false));

-- =============================================================
-- 4) NUOVI CHECK — tipo (senza lavorazione_esterna) e stato per tipo
--
-- tipo_stato_check: 'progetto' mantiene il vecchio vincolo a 5 stati
-- (invariato, indipendente da Preventivo). 'preventivo' non è più
-- vincolato sul valore di stato (colonna legacy, qualunque valore
-- residuo resta valido, semplicemente ignorato dall'app).
-- 'lavorazione_esterna' rimosso da entrambi i check.
-- =============================================================
alter table lavoro_satellite drop constraint lavoro_satellite_tipo_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_check
  check (tipo in (
    'appuntamento', 'preventivo', 'progetto', 'acquisti', 'campione', 'costruzione', 'noleggio'
  ));

alter table lavoro_satellite drop constraint lavoro_satellite_tipo_stato_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_stato_check
  check (
    (tipo = 'appuntamento' and stato is null)
    or (tipo = 'preventivo')
    or (tipo = 'progetto'
      and stato in ('in_preparazione', 'presentato', 'necessaria_revisione', 'accettato', 'non_necessario'))
    or (tipo = 'campione'
      and stato in ('in_preparazione', 'consegnato', 'necessario_nuovo_campione', 'approvato', 'non_necessario'))
    or (tipo = 'acquisti'
      and stato in ('da_acquistare', 'acquistato', 'ricevuto'))
    or (tipo = 'costruzione'
      and stato in ('da_iniziare', 'in_corso', 'completata'))
    or (tipo = 'noleggio' and stato is null)
  );

-- acquisto_categoria: da enum chiuso (materiale/ferramenta) a testo
-- libero, definito dall'artigiano nelle proprie preferenze.
alter table lavoro_satellite drop constraint lavoro_satellite_acquisto_categoria_check;
alter table lavoro_satellite add constraint lavoro_satellite_acquisto_categoria_check
  check (acquisto_categoria is null or tipo = 'acquisti');

-- =============================================================
-- 5) FUNZIONI/TRIGGER DA AGGIORNARE
-- =============================================================

-- lavoro_satellite_articolo: ora solo 'acquisti' (lavorazione_esterna
-- non esiste più come tipo satellite).
create or replace function public.check_satellite_articolo_tipo()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_tipo text;
begin
  select tipo into v_tipo from lavoro_satellite where id = new.satellite_id;

  if v_tipo <> 'acquisti' then
    raise exception
      'lavoro_satellite_articolo: il satellite % non è di tipo acquisti (tipo=%)',
      new.satellite_id, v_tipo;
  end if;

  return new;
end;
$$;

-- Traccia i cambi di stato per i tipi a flag booleano: non_necessario
-- rimosso dalle condizioni (colonna eliminata).
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
     or new.preventivo_rifiutato is distinct from old.preventivo_rifiutato then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- Creazione satelliti iniziali: preventivo non imposta più `stato`
-- (colonna legacy non usata), appuntamento non imposta più
-- non_necessario (colonna eliminata).
create or replace function public.crea_satelliti_iniziali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into lavoro_satellite (lavoro_id, tipo, tipo_appuntamento, concluso)
    values (new.id, 'appuntamento', 'briefing', false);

  insert into lavoro_satellite (lavoro_id, tipo, stato)
    values (new.id, 'progetto', 'in_preparazione');

  insert into lavoro_satellite (lavoro_id, tipo)
    values (new.id, 'preventivo');

  insert into lavoro_satellite (lavoro_id, tipo, stato, serie)
    values (new.id, 'campione', 'in_preparazione', 'Serie 1');

  return new;
end;
$$;

-- Creazione satelliti post-accettazione: rimossa lavorazione_esterna
-- dalla guardia di idempotenza e dagli insert.
create or replace function public.crea_satelliti_post_accettazione()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stato = 'accettato' and old.stato is distinct from 'accettato' then
    if not exists (
      select 1 from lavoro_satellite
      where lavoro_id = new.id
        and tipo in ('acquisti', 'costruzione', 'noleggio')
    ) then
      insert into lavoro_satellite (lavoro_id, tipo, tipo_appuntamento, concluso)
        values (new.id, 'appuntamento', 'verifica_misure', false);

      insert into lavoro_satellite (lavoro_id, tipo, stato)
        values (new.id, 'acquisti', 'da_acquistare');

      insert into lavoro_satellite (lavoro_id, tipo, stato)
        values (new.id, 'costruzione', 'da_iniziare');

      insert into lavoro_satellite (lavoro_id, tipo, prenotazione_effettuata)
        values (new.id, 'noleggio', false);

      insert into lavoro_satellite (lavoro_id, tipo, tipo_appuntamento, concluso)
        values (new.id, 'appuntamento', 'montaggio', false);
    end if;
  end if;

  return new;
end;
$$;

-- =============================================================
-- 6) GATE "PRONTO PER IL MONTAGGIO" — aggiornato
--
-- Preventivo: verde solo se preventivo_accettato=true (rifiutato o
-- "in attesa" restano bloccanti, coerente col semaforo rosso/giallo/
-- verde della UI). Progetto invariato (indipendente dal Preventivo).
-- Rimossi non_necessario (appuntamento/noleggio ora binari su
-- concluso/prenotazione_effettuata) e lavorazione_esterna.
-- =============================================================
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
        or (ls.tipo = 'progetto' and ls.stato not in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato not in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato <> 'ricevuto')
        or (ls.tipo = 'costruzione' and ls.stato <> 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
      )
  );
$$;

-- =============================================================
-- 7) DASHBOARD — aggiornata allo stesso set di regole
--
-- Semaforo Preventivo (nuovo, indipendente da coloreRevisionabile):
--   verde: preventivo_accettato=true
--   rosso: preventivo_rifiutato=true, oppure valore_complessivo assente
--   giallo: valore_complessivo presente, entrambi i flag false
-- Colonna "Valore" (join laterale pv): ora basata su
-- preventivo_accettato=true invece di stato in ('accettato','non_necessario')
-- (quest'ultimo stato non esiste più per il Preventivo).
-- =============================================================
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
      ( (ls.tipo = 'progetto' and ls.stato = 'in_preparazione')
        or (ls.tipo = 'campione' and ls.stato = 'in_preparazione')
        or (ls.tipo = 'acquisti' and ls.stato = 'da_acquistare')
        or (ls.tipo = 'costruzione' and ls.stato = 'da_iniziare')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
        or (ls.tipo = 'preventivo' and not ls.preventivo_accettato and (ls.preventivo_rifiutato or ls.valore_complessivo is null))
      ) as rosso,
      ( (ls.tipo = 'progetto' and ls.stato in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato = 'ricevuto')
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
      ) as verde
    from lavoro_satellite ls
    where ls.lavoro_id = l.id
  ) s on true
  left join lateral (
    select ls2.valore_complessivo
    from lavoro_satellite ls2
    where ls2.lavoro_id = l.id
      and ls2.tipo = 'preventivo'
      and ls2.preventivo_accettato = true
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
