-- =============================================================
-- Revisione strutturale: modello "a stella" centrato sul Lavoro
-- (vedi CLAUDE.md, sezione "Revisione strutturale 2026-07-19")
--
-- Introduce l'entità satellite (`lavoro_satellite`), unica tabella
-- discriminata per `tipo`, che sostituisce concettualmente le vecchie
-- Fasi di esecuzione come lettura dello stato di avanzamento del
-- Lavoro (non più mosse a mano). `fase_template`/`lavoro_fasi` NON
-- vengono eliminate in questo sprint (nessuna UI le usa ancora
-- attivamente, nessuna FK esterna dipende da loro — verificato prima
-- di procedere), restano solo deprecate e documentate come tali.
--
-- Questo sprint è SOLO schema dati: nessuna modifica a pagine/
-- componenti esistenti.
-- =============================================================

-- =============================================================
-- FLAG "necessario preventivo/progetto" sul Lavoro
--
-- Non esistevano nello schema (verificato: assenti da 0001 e da tutte
-- le migration successive), pur essendo previsti dal brief del modello
-- satellite. Impostati alla creazione del Lavoro, pilotano solo quali
-- pulsanti "aggiungi preventivo/progetto" la UI dei prossimi sprint
-- deve proporre di default (satellite tipo='preventivo'/'progetto'
-- ancora assente su quel lavoro + flag vero) — non sono un vincolo a
-- livello DB su quali satelliti si possano aggiungere: un lavoro può
-- comunque ricevere un preventivo anche se non segnato come
-- "necessario" in partenza, coerente col principio che il gate dipende
-- dai satelliti effettivamente presenti, non da una lista fissa.
-- =============================================================
alter table lavoro
  add column necessario_preventivo boolean not null default false,
  add column necessario_progetto   boolean not null default false;

-- =============================================================
-- SATELLITI
-- =============================================================
create table lavoro_satellite (
  id                        uuid primary key default gen_random_uuid(),
  lavoro_id                 uuid not null references lavoro(id) on delete cascade,
  tipo                      text not null
                              check (tipo in (
                                'appuntamento', 'preventivo', 'progetto',
                                'acquisto_materiale', 'acquisto_ferramenta',
                                'lavorazione_esterna', 'campione'
                              )),
  stato                     text not null,

  -- campi specifici per tipo, nullable: si applicano solo ad alcuni tipi
  nota                      text,          -- appuntamento (obbligatoria quando stato='fatto', vedi check sotto)
  tipo_appuntamento         text,          -- appuntamento: briefing, rilievo, presentazione progetto...
  revisione_di              uuid references lavoro_satellite(id), -- preventivo, progetto: storico versioni
  valore_complessivo        numeric(12, 2), -- preventivo, progetto, acquisto_materiale, acquisto_ferramenta, lavorazione_esterna
  fornitore_sede_id         uuid references fornitore_sede(id),   -- acquisto_materiale, acquisto_ferramenta, lavorazione_esterna
  descrizione_libera        text,          -- lavorazione_esterna (nessun catalogo Articolo)

  data_creazione            timestamptz not null default now(),
  -- traccia quando `stato` è cambiato l'ultima volta (mantenuto dal trigger sotto),
  -- necessario per il futuro calcolo del punteggio di urgenza in dashboard
  data_ultimo_cambio_stato  timestamptz not null default now(),

  -- stato valido solo entro il set semaforo specifico del proprio tipo
  check (
    (tipo = 'appuntamento'
      and stato in ('fissato', 'fatto'))
    or (tipo in ('preventivo', 'progetto')
      and stato in ('in_preparazione', 'presentato', 'accettato'))
    or (tipo in ('acquisto_materiale', 'acquisto_ferramenta')
      and stato in ('da_acquistare', 'acquistato', 'ricevuto'))
    or (tipo = 'lavorazione_esterna'
      and stato in ('da_consegnare', 'in_lavorazione', 'completata'))
    or (tipo = 'campione'
      and stato in ('da_preparare', 'preparato', 'ricevuto_dal_cliente'))
  ),

  -- nota obbligatoria al passaggio di un appuntamento a "fatto"
  check (tipo <> 'appuntamento' or stato <> 'fatto' or nota is not null)
);

create index on lavoro_satellite (lavoro_id);
create index on lavoro_satellite (tipo);
create index on lavoro_satellite (revisione_di);
create index on lavoro_satellite (fornitore_sede_id);

-- Mantiene data_ultimo_cambio_stato allineata a ogni cambio di `stato`
create or replace function public.set_satellite_data_ultimo_cambio_stato()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stato is distinct from old.stato then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

create trigger trg_lavoro_satellite_cambio_stato
  before update on lavoro_satellite
  for each row
  execute function public.set_satellite_data_ultimo_cambio_stato();

-- =============================================================
-- RIGHE ARTICOLO DEL SATELLITE (solo acquisto_materiale/acquisto_ferramenta)
--
-- Stesso pattern di ordine_acquisto_riga (catalogo Articolo condiviso,
-- voce libera se articolo_id è null), ma SENZA prezzo per riga: la
-- responsabilità del dettaglio economico resta fuori da Districo.
-- =============================================================
create table lavoro_satellite_articolo (
  id              uuid primary key default gen_random_uuid(),
  satellite_id    uuid not null references lavoro_satellite(id) on delete cascade,
  articolo_id     uuid references articolo(id) on delete set null,
  descrizione     text not null,
  colore_finitura text,
  quantita        numeric(10, 3) not null check (quantita > 0),
  created_at      timestamptz not null default now()
);

create index on lavoro_satellite_articolo (satellite_id);
create index on lavoro_satellite_articolo (articolo_id);

-- Vincolo d'integrità: una riga Articolo può essere collegata solo a un
-- satellite di acquisto (materiale/ferramenta) — non esprimibile con un
-- semplice check (richiede leggere il tipo della riga lavoro_satellite
-- collegata), quindi trigger. SECURITY INVOKER (default): la SELECT su
-- lavoro_satellite resta comunque soggetta alla sua RLS, ma chi arriva
-- fin qui ha già superato la policy di insert su questa stessa tabella
-- (owner del lavoro), quindi la vede regolarmente.
create or replace function public.check_satellite_articolo_tipo()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_tipo text;
begin
  select tipo into v_tipo from lavoro_satellite where id = new.satellite_id;

  if v_tipo not in ('acquisto_materiale', 'acquisto_ferramenta') then
    raise exception
      'lavoro_satellite_articolo: il satellite % non è di tipo acquisto (tipo=%)',
      new.satellite_id, v_tipo;
  end if;

  return new;
end;
$$;

create trigger trg_lavoro_satellite_articolo_tipo
  before insert or update on lavoro_satellite_articolo
  for each row
  execute function public.check_satellite_articolo_tipo();

-- =============================================================
-- FUNZIONE di supporto: il Lavoro è pronto per il montaggio?
--
-- Vero quando non esiste nessun satellite non-appuntamento che non sia
-- ancora nel proprio stato "verde" finale. Gli appuntamenti sono
-- esplicitamente esclusi (informativi/paralleli, non bloccano il gate).
-- Le revisioni superate di preventivo/progetto (righe referenziate come
-- `revisione_di` da una riga più recente) sono escluse dal conteggio:
-- solo l'ultima versione della catena deve essere verde, altrimenti una
-- vecchia bozza mai chiusa bloccherebbe per sempre il gate.
-- Il traguardo "montaggio" vero e proprio resta da definire in un
-- prossimo sprint: questa funzione prepara il terreno per quando
-- servirà (dettaglio Lavoro, dashboard), non introduce ancora logica
-- di chiusura automatica del Lavoro.
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
        (ls.tipo in ('preventivo', 'progetto') and ls.stato <> 'accettato')
        or (ls.tipo in ('acquisto_materiale', 'acquisto_ferramenta') and ls.stato <> 'ricevuto')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato <> 'completata')
        or (ls.tipo = 'campione' and ls.stato <> 'ricevuto_dal_cliente')
      )
  );
$$;

-- =============================================================
-- RLS — stesso pattern già in uso per attivita/ordine_acquisto(_riga):
-- lettura a chiunque sia nel lavoro (owner + ospite), scrittura solo owner.
-- =============================================================
alter table lavoro_satellite          enable row level security;
alter table lavoro_satellite_articolo enable row level security;

create policy "lavoro_satellite: lettura chi è nel lavoro"
  on lavoro_satellite for select
  using (is_artigiano_del_lavoro(lavoro_id));

create policy "lavoro_satellite: scrittura solo owner"
  on lavoro_satellite for insert
  with check (is_owner_del_lavoro(lavoro_id));

create policy "lavoro_satellite: modifica solo owner"
  on lavoro_satellite for update
  using (is_owner_del_lavoro(lavoro_id));

create policy "lavoro_satellite: eliminazione solo owner"
  on lavoro_satellite for delete
  using (is_owner_del_lavoro(lavoro_id));

create policy "riga satellite: lettura chi è nel lavoro"
  on lavoro_satellite_articolo for select
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_articolo.satellite_id
        and is_artigiano_del_lavoro(ls.lavoro_id)
    )
  );

create policy "riga satellite: scrittura solo owner"
  on lavoro_satellite_articolo for insert
  with check (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_articolo.satellite_id
        and is_owner_del_lavoro(ls.lavoro_id)
    )
  );

create policy "riga satellite: modifica solo owner"
  on lavoro_satellite_articolo for update
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_articolo.satellite_id
        and is_owner_del_lavoro(ls.lavoro_id)
    )
  );

create policy "riga satellite: eliminazione solo owner"
  on lavoro_satellite_articolo for delete
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_articolo.satellite_id
        and is_owner_del_lavoro(ls.lavoro_id)
    )
  );
