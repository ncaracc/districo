-- =============================================================
-- Revisione strutturale 2026-07-25: ciclo di vita Lavoro, Fornitori,
-- ristrutturazione satelliti (vedi CLAUDE.md, sezione dedicata).
--
-- Sprint A: SOLO schema dati e funzioni SQL di supporto. Nessuna
-- modifica alla UI esistente (che resta non allineata al nuovo schema
-- satellite fino allo Sprint B, come concordato esplicitamente).
-- =============================================================

-- =============================================================
-- 1) LAVORO — nuova macchina a stati + indirizzo + tracking
-- =============================================================

-- Normalizza i valori esistenti PRIMA di stringere il check, per non
-- rompere eventuali righe reali già presenti.
alter table lavoro drop constraint lavoro_stato_check;

update lavoro set stato = case stato
  when 'trattativa' then 'opportunita'
  when 'esecuzione' then 'accettato'
  when 'chiuso'      then 'completato'
  else stato
end;

alter table lavoro alter column stato set default 'opportunita';

alter table lavoro add constraint lavoro_stato_check
  check (stato in ('opportunita', 'accettato', 'rifiutato', 'completato'));

-- Indirizzo completo del Lavoro, indipendente da quello del Cliente
-- collegato — tutti nullable, compilabili in qualsiasi momento.
alter table lavoro
  add column indirizzo text,
  add column civico    text,
  add column cap       text,
  add column citta     text,
  add column provincia text,
  add column sigla     text,
  add column nazione   text;

-- Solo il campo: nessuna logica di invio email/portale cliente in
-- questo sprint (rimandata a uno sprint dedicato).
alter table lavoro
  add column tracking boolean not null default false;

-- Rimossi: non più usati in nessun punto del nuovo modello satellite.
-- Erano referenziati in produzione (query + props in
-- app/(app)/lavori/[id]/page.tsx e components/satelliti-section.tsx) —
-- segnalato esplicitamente, l'utente ha confermato la rimozione più un
-- pass minimo isolato su quei due file (vedi CLAUDE.md).
alter table lavoro
  drop column necessario_preventivo,
  drop column necessario_progetto;

-- =============================================================
-- 2) FORNITORI — adattamento all'indirizzo unificato
--
-- fornitore/fornitore_sede/fornitore_sede_contatto esistevano già
-- dalla 0001 (verificato prima di procedere): nessuna nuova tabella,
-- solo adattamento dei campi indirizzo/contatto.
-- =============================================================
alter table fornitore_sede
  alter column citta drop not null,
  add column civico    text,
  add column cap       text,
  add column provincia text,
  add column sigla     text,
  add column nazione   text;

alter table fornitore_sede_contatto
  add column cognome text,
  drop column ruolo,
  drop column destinatario_ordini;

alter table fornitore_sede_contatto
  rename column telefono to cellulare;

-- =============================================================
-- 3-9) RISTRUTTURAZIONE SATELLITI
-- =============================================================

-- Rimuove i vecchi check (nomi verificati con test locale, stessi
-- della 0009): validità stato/tipo e "nota obbligatoria a verde".
alter table lavoro_satellite drop constraint lavoro_satellite_check;
alter table lavoro_satellite drop constraint lavoro_satellite_check1;
alter table lavoro_satellite drop constraint lavoro_satellite_tipo_check;

-- --- Rinomina e nuove colonne (PRIMA della migrazione dati sotto, che le popola) ---
alter table lavoro_satellite rename column nota to descrizione;

alter table lavoro_satellite alter column stato drop not null;

alter table lavoro_satellite
  add column concluso                boolean not null default false,
  add column non_necessario          boolean not null default false,
  add column serie                   text,
  add column acquisto_categoria      text,
  add column data_invio_ordine       timestamptz,
  add column contatto_invio_id       uuid references fornitore_sede_contatto(id),
  add column data_inizio             timestamptz,
  add column data_fine               timestamptz,
  add column prenotazione_effettuata boolean not null default false,
  add column data_da                 timestamptz,
  add column data_a                  timestamptz,
  add column costo                   numeric(12, 2);

-- --- Migrazione dati: acquisto_materiale/acquisto_ferramenta -> acquisti ---
update lavoro_satellite
  set acquisto_categoria = case tipo
    when 'acquisto_materiale'  then 'materiale'
    when 'acquisto_ferramenta' then 'ferramenta'
    else acquisto_categoria
  end
  where tipo in ('acquisto_materiale', 'acquisto_ferramenta');

update lavoro_satellite
  set tipo = 'acquisti'
  where tipo in ('acquisto_materiale', 'acquisto_ferramenta');

-- --- Migrazione dati: appuntamento (tipo_appuntamento era testo libero) ---
-- Normalizza a 'briefing' qualunque valore fuori dal nuovo sottotipo
-- vincolato (nessuna riga nota in produzione, fallback innocuo).
update lavoro_satellite
  set tipo_appuntamento = 'briefing'
  where tipo = 'appuntamento'
    and (tipo_appuntamento is null or tipo_appuntamento not in ('briefing', 'verifica_misure', 'montaggio'));

-- concluso deriva dal vecchio stato PRIMA di azzerarlo
update lavoro_satellite
  set concluso = (stato = 'fatto')
  where tipo = 'appuntamento';

update lavoro_satellite
  set stato = null
  where tipo in ('appuntamento', 'noleggio');

-- --- Migrazione dati: vecchio vocabolario stato per campione/lavorazione_esterna ---
-- (mancava in questo giro: trovato in fase di applicazione su Supabase
-- Cloud, dove esisteva già almeno una riga campione reale con lo stato
-- vecchio "da_preparare" — vedi CLAUDE.md.)
update lavoro_satellite
  set stato = case stato
    when 'da_preparare'         then 'in_preparazione'
    when 'preparato'            then 'consegnato'
    when 'ricevuto_dal_cliente' then 'approvato'
    else stato
  end
  where tipo = 'campione';

update lavoro_satellite
  set stato = case stato
    when 'da_consegnare'  then 'da_ordinare'
    when 'in_lavorazione' then 'ordinato'
    when 'completata'     then 'completato'
    else stato
  end
  where tipo = 'lavorazione_esterna';

-- serie è una colonna nuova (aggiunta sopra): le righe campione già
-- esistenti non ne hanno una, ma il nuovo check sotto la richiede
-- obbligatoria per questo tipo.
update lavoro_satellite
  set serie = 'Serie 1'
  where tipo = 'campione' and serie is null;

-- --- Nuovi check ---
alter table lavoro_satellite add constraint lavoro_satellite_tipo_check
  check (tipo in (
    'appuntamento', 'preventivo', 'progetto', 'acquisti',
    'lavorazione_esterna', 'campione', 'costruzione', 'noleggio'
  ));

-- Stato valido solo entro il set semaforo specifico del proprio tipo.
-- appuntamento e noleggio non usano `stato` (semaforo booleano dedicato).
alter table lavoro_satellite add constraint lavoro_satellite_tipo_stato_check
  check (
    (tipo = 'appuntamento' and stato is null)
    or (tipo in ('preventivo', 'progetto')
      and stato in ('in_preparazione', 'presentato', 'necessaria_revisione', 'accettato', 'non_necessario'))
    or (tipo = 'campione'
      and stato in ('in_preparazione', 'consegnato', 'necessario_nuovo_campione', 'approvato', 'non_necessario'))
    or (tipo = 'acquisti'
      and stato in ('da_acquistare', 'acquistato', 'ricevuto'))
    or (tipo = 'lavorazione_esterna'
      and stato in ('da_ordinare', 'ordinato', 'completato'))
    or (tipo = 'costruzione'
      and stato in ('da_iniziare', 'in_corso', 'completata'))
    or (tipo = 'noleggio' and stato is null)
  );

-- Sottotipo appuntamento vincolato (era testo libero).
alter table lavoro_satellite add constraint lavoro_satellite_tipo_appuntamento_check
  check (
    (tipo = 'appuntamento' and tipo_appuntamento in ('briefing', 'verifica_misure', 'montaggio'))
    or (tipo <> 'appuntamento' and tipo_appuntamento is null)
  );

-- Un briefing non può mai essere segnato "non necessario".
alter table lavoro_satellite add constraint lavoro_satellite_briefing_necessario_check
  check (tipo_appuntamento <> 'briefing' or non_necessario = false);

-- Serie obbligatoria per raggruppare le revisioni di un campione
-- (più serie indipendenti sullo stesso Lavoro, es. ante/maniglie).
alter table lavoro_satellite add constraint lavoro_satellite_campione_serie_check
  check (tipo <> 'campione' or serie is not null);

-- Sotto-categorizzazione solo per acquisti, valori chiusi.
alter table lavoro_satellite add constraint lavoro_satellite_acquisto_categoria_check
  check (acquisto_categoria is null or (tipo = 'acquisti' and acquisto_categoria in ('materiale', 'ferramenta')));

alter table lavoro_satellite add constraint lavoro_satellite_valore_non_negativo_check
  check (valore_complessivo is null or valore_complessivo >= 0);

alter table lavoro_satellite add constraint lavoro_satellite_costo_non_negativo_check
  check (costo is null or costo >= 0);

-- --- lavoro_satellite_articolo: ora anche lavorazione_esterna (oltre ad acquisti) ---
create or replace function public.check_satellite_articolo_tipo()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_tipo text;
begin
  select tipo into v_tipo from lavoro_satellite where id = new.satellite_id;

  if v_tipo not in ('acquisti', 'lavorazione_esterna') then
    raise exception
      'lavoro_satellite_articolo: il satellite % non è di tipo acquisti/lavorazione_esterna (tipo=%)',
      new.satellite_id, v_tipo;
  end if;

  return new;
end;
$$;

-- --- Traccia i cambi di stato anche per i tipi a flag booleano (appuntamento/noleggio) ---
create or replace function public.set_satellite_data_ultimo_cambio_stato()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stato is distinct from old.stato
     or new.concluso is distinct from old.concluso
     or new.prenotazione_effettuata is distinct from old.prenotazione_effettuata then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- =============================================================
-- 6) ALLEGATI SUI SATELLITI
-- =============================================================
create table lavoro_satellite_allegato (
  id               uuid primary key default gen_random_uuid(),
  satellite_id     uuid not null references lavoro_satellite(id) on delete cascade,
  nome_file        text not null,
  storage_path     text not null,
  data_caricamento timestamptz not null default now()
);

create index on lavoro_satellite_allegato (satellite_id);

alter table lavoro_satellite_allegato enable row level security;

create policy "allegato satellite: lettura chi è nel lavoro"
  on lavoro_satellite_allegato for select
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_allegato.satellite_id
        and is_artigiano_del_lavoro(ls.lavoro_id)
    )
  );

create policy "allegato satellite: scrittura solo owner"
  on lavoro_satellite_allegato for insert
  with check (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_allegato.satellite_id
        and is_owner_del_lavoro(ls.lavoro_id)
    )
  );

create policy "allegato satellite: modifica solo owner"
  on lavoro_satellite_allegato for update
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_allegato.satellite_id
        and is_owner_del_lavoro(ls.lavoro_id)
    )
  );

create policy "allegato satellite: eliminazione solo owner"
  on lavoro_satellite_allegato for delete
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_allegato.satellite_id
        and is_owner_del_lavoro(ls.lavoro_id)
    )
  );

-- =============================================================
-- FUNZIONE: stato "effettivo" di visualizzazione per preventivo/
-- progetto/campione, che preserva lo storico onesto delle revisioni
-- superate (nessuna riscrittura delle righe reali — vedi CLAUDE.md).
-- SECURITY INVOKER (default): soggetta alle RLS già esistenti su
-- lavoro_satellite, nessun artigiano_id passato dall'esterno.
-- =============================================================
create or replace function public.lavoro_satellite_stato_effettivo(p_lavoro_id uuid)
returns table (
  satellite_id    uuid,
  stato_effettivo text
)
language sql
stable
set search_path = public
as $$
  with recursive catena as (
    select ls.id as satellite_id, ls.id as nodo, ls.stato as stato_nodo
    from lavoro_satellite ls
    where ls.lavoro_id = p_lavoro_id
      and ls.tipo in ('preventivo', 'progetto', 'campione')

    union all

    select c.satellite_id, succ.id, succ.stato
    from catena c
    join lavoro_satellite succ on succ.revisione_di = c.nodo
  ),
  ultima as (
    select c.satellite_id, c.stato_nodo
    from catena c
    where not exists (
      select 1 from lavoro_satellite succ where succ.revisione_di = c.nodo
    )
  )
  select
    ls.id as satellite_id,
    case
      when u.stato_nodo in ('accettato', 'non_necessario', 'approvato') then u.stato_nodo
      else ls.stato
    end as stato_effettivo
  from lavoro_satellite ls
  join ultima u on u.satellite_id = ls.id
  where ls.lavoro_id = p_lavoro_id
    and ls.tipo in ('preventivo', 'progetto', 'campione');
$$;

revoke execute on function public.lavoro_satellite_stato_effettivo(uuid) from public;
revoke execute on function public.lavoro_satellite_stato_effettivo(uuid) from anon;
grant execute on function public.lavoro_satellite_stato_effettivo(uuid) to authenticated;

-- =============================================================
-- 11) GATE "PRONTO PER IL MONTAGGIO" — aggiornato al nuovo set di tipi
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
      and ls.tipo <> 'appuntamento'
      and not exists (
        select 1 from lavoro_satellite piu_recente
        where piu_recente.revisione_di = ls.id
      )
      and (
        (ls.tipo in ('preventivo', 'progetto') and ls.stato not in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato not in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato <> 'ricevuto')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato <> 'completato')
        or (ls.tipo = 'costruzione' and ls.stato <> 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.non_necessario, false) is not true and coalesce(ls.prenotazione_effettuata, false) is not true)
      )
  );
$$;

-- =============================================================
-- 10) CREAZIONE AUTOMATICA DEI SATELLITI (trigger SQL, non applicativa)
--
-- SECURITY DEFINER necessario: al momento dell'INSERT su `lavoro` la
-- riga owner in `lavoro_artigiani` non esiste ancora (creata
-- dall'applicazione nello statement successivo, stesso ordine della
-- 0006) — is_owner_del_lavoro() risulterebbe false e la RLS
-- "lavoro_satellite: scrittura solo owner" respingerebbe l'insert se il
-- trigger girasse con i permessi del chiamante. Stesso pattern già
-- usato per possiede_cliente_del_lavoro/handle_new_artigiano.
-- EXECUTE revocato anche da `authenticated`: deve scattare solo dal
-- trigger, mai da una chiamata diretta (stesso trattamento di
-- handle_new_artigiano nella 0005).
-- =============================================================
create or replace function public.crea_satelliti_iniziali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into lavoro_satellite (lavoro_id, tipo, stato, tipo_appuntamento, concluso, non_necessario)
    values (new.id, 'appuntamento', null, 'briefing', false, false);

  insert into lavoro_satellite (lavoro_id, tipo, stato)
    values (new.id, 'progetto', 'in_preparazione');

  insert into lavoro_satellite (lavoro_id, tipo, stato)
    values (new.id, 'preventivo', 'in_preparazione');

  insert into lavoro_satellite (lavoro_id, tipo, stato, serie)
    values (new.id, 'campione', 'in_preparazione', 'Serie 1');

  return new;
end;
$$;

create trigger trg_lavoro_crea_satelliti_iniziali
  after insert on lavoro
  for each row
  execute function public.crea_satelliti_iniziali();

revoke execute on function public.crea_satelliti_iniziali() from public;
revoke execute on function public.crea_satelliti_iniziali() from anon;
revoke execute on function public.crea_satelliti_iniziali() from authenticated;

-- Guardia di idempotenza: se il Lavoro passa accettato -> rifiutato ->
-- accettato di nuovo, non ricrea un secondo set di segnaposto.
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
        and tipo in ('acquisti', 'lavorazione_esterna', 'costruzione', 'noleggio')
    ) then
      insert into lavoro_satellite (lavoro_id, tipo, stato, tipo_appuntamento, concluso, non_necessario)
        values (new.id, 'appuntamento', null, 'verifica_misure', false, false);

      insert into lavoro_satellite (lavoro_id, tipo, stato)
        values (new.id, 'acquisti', 'da_acquistare');

      insert into lavoro_satellite (lavoro_id, tipo, stato)
        values (new.id, 'lavorazione_esterna', 'da_ordinare');

      insert into lavoro_satellite (lavoro_id, tipo, stato)
        values (new.id, 'costruzione', 'da_iniziare');

      insert into lavoro_satellite (lavoro_id, tipo, stato, non_necessario, prenotazione_effettuata)
        values (new.id, 'noleggio', null, false, false);

      insert into lavoro_satellite (lavoro_id, tipo, stato, tipo_appuntamento, concluso, non_necessario)
        values (new.id, 'appuntamento', null, 'montaggio', false, false);
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_lavoro_crea_satelliti_post_accettazione
  after update on lavoro
  for each row
  execute function public.crea_satelliti_post_accettazione();

revoke execute on function public.crea_satelliti_post_accettazione() from public;
revoke execute on function public.crea_satelliti_post_accettazione() from anon;
revoke execute on function public.crea_satelliti_post_accettazione() from authenticated;
