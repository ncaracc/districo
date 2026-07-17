-- =============================================================
-- Districo — migration iniziale
-- =============================================================

-- Abilita le estensioni necessarie
create extension if not exists "pg_trgm";   -- ricerca fuzzy fornitori

-- =============================================================
-- SPECIALIZZAZIONE
-- =============================================================
create table specializzazione (
  id        uuid primary key default gen_random_uuid(),
  valore    text not null unique,
  ufficiale boolean not null default true
);

-- =============================================================
-- ARTIGIANO (1:1 con auth.users)
-- =============================================================
create table artigiano (
  id               uuid primary key references auth.users(id) on delete cascade,
  nome             text not null,
  cognome          text not null,
  ragione_sociale  text,
  partita_iva      text,
  specializzazione text not null,
  telefono         text not null,
  email            text not null,
  via              text,
  civico           text,
  cap              text,
  localita         text not null,
  immagine_profilo text,
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- =============================================================
-- CLIENTE (privato per artigiano)
-- =============================================================
create table cliente (
  id           uuid primary key default gen_random_uuid(),
  artigiano_id uuid not null references artigiano(id) on delete cascade,
  nome         text not null,
  telefono     text,
  email        text,
  indirizzo    text,
  note         text,
  created_at   timestamptz not null default now()
);

create index on cliente (artigiano_id);

-- =============================================================
-- FORNITORE (condiviso tra tutti gli artigiani)
-- =============================================================
create table fornitore (
  id              uuid primary key default gen_random_uuid(),
  ragione_sociale text not null,
  partita_iva     text unique,
  created_at      timestamptz not null default now()
);

create index on fornitore using gin (ragione_sociale gin_trgm_ops);

create table fornitore_sede (
  id           uuid primary key default gen_random_uuid(),
  fornitore_id uuid not null references fornitore(id) on delete cascade,
  nome         text not null,
  citta        text not null,
  indirizzo    text,
  created_at   timestamptz not null default now()
);

create index on fornitore_sede (fornitore_id);

create table fornitore_sede_contatto (
  id                  uuid primary key default gen_random_uuid(),
  fornitore_sede_id   uuid not null references fornitore_sede(id) on delete cascade,
  nome                text not null,
  email               text,
  telefono            text,
  ruolo               text,
  destinatario_ordini boolean not null default false,
  created_at          timestamptz not null default now()
);

create index on fornitore_sede_contatto (fornitore_sede_id);

-- =============================================================
-- NOTE PRIVATE ARTIGIANO SU SEDE FORNITORE
-- =============================================================
create table artigiano_fornitore_nota (
  artigiano_id      uuid not null references artigiano(id) on delete cascade,
  fornitore_sede_id uuid not null references fornitore_sede(id) on delete cascade,
  nota              text not null,
  updated_at        timestamptz not null default now(),
  primary key (artigiano_id, fornitore_sede_id)
);

-- =============================================================
-- CATEGORIE ACQUISTO (per artigiano, libere)
-- =============================================================
create table categoria_acquisto (
  id           uuid primary key default gen_random_uuid(),
  artigiano_id uuid not null references artigiano(id) on delete cascade,
  nome         text not null,
  created_at   timestamptz not null default now()
);

create index on categoria_acquisto (artigiano_id);

-- Tag personale: quale sede copre quale categoria, per artigiano
create table artigiano_fornitore_categoria (
  artigiano_id      uuid not null references artigiano(id) on delete cascade,
  fornitore_sede_id uuid not null references fornitore_sede(id) on delete cascade,
  categoria_id      uuid not null references categoria_acquisto(id) on delete cascade,
  primary key (artigiano_id, fornitore_sede_id, categoria_id)
);

-- =============================================================
-- LAVORO
-- =============================================================
create table lavoro (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references cliente(id),
  titolo       text not null,
  descrizione  text,
  stato        text not null default 'trattativa'
                 check (stato in ('trattativa', 'esecuzione', 'chiuso')),
  accettato_at timestamptz,
  created_at   timestamptz not null default now()
);

create index on lavoro (cliente_id);

-- Tabella ponte Lavoro ↔ Artigiano
create table lavoro_artigiani (
  id              uuid primary key default gen_random_uuid(),
  lavoro_id       uuid not null references lavoro(id) on delete cascade,
  artigiano_id    uuid references artigiano(id) on delete set null,
  email_invitata  text not null,
  ruolo           text not null check (ruolo in ('owner', 'ospite')),
  stato           text not null default 'invitato'
                    check (stato in ('invitato', 'accettato', 'rifiutato')),
  token_invito    text unique,
  scadenza_invito timestamptz,
  created_at      timestamptz not null default now(),
  unique (lavoro_id, email_invitata)
);

create index on lavoro_artigiani (lavoro_id);
create index on lavoro_artigiani (artigiano_id);
create index on lavoro_artigiani (token_invito);

-- =============================================================
-- ATTIVITÀ (trattativa)
-- =============================================================
create table attivita (
  id                uuid primary key default gen_random_uuid(),
  lavoro_id         uuid not null references lavoro(id) on delete cascade,
  tipo              text not null
                      check (tipo in ('briefing', 'progetto', 'preventivo', 'sopralluogo', 'campioni')),
  stato             text not null default 'da_fare'
                      check (stato in ('da_fare', 'in_corso', 'bloccata', 'fatta')),
  data_appuntamento timestamptz,
  data_apertura     timestamptz not null default now(),
  data_chiusura     timestamptz,
  commenti          text,
  revisione_di      uuid references attivita(id),
  importo           numeric(12, 2),
  created_at        timestamptz not null default now()
);

create index on attivita (lavoro_id);

-- =============================================================
-- SLA ATTIVITÀ (artigiano_id NULL = default di sistema)
-- =============================================================
create table sla_attivita (
  id            uuid primary key default gen_random_uuid(),
  artigiano_id  uuid references artigiano(id) on delete cascade,
  tipo_attivita text not null
                  check (tipo_attivita in ('briefing', 'progetto', 'preventivo', 'sopralluogo', 'campioni')),
  giorni_max    integer not null check (giorni_max > 0)
);

-- COALESCE nell'indice: artigiano_id NULL (sistema) trattato come sentinel uuid
create unique index sla_attivita_unique
  on sla_attivita (coalesce(artigiano_id, '00000000-0000-0000-0000-000000000000'), tipo_attivita);

-- =============================================================
-- FASI DI ESECUZIONE
-- =============================================================
create table fase_template (
  id           uuid primary key default gen_random_uuid(),
  artigiano_id uuid not null references artigiano(id) on delete cascade,
  nome_fase    text not null,
  ordine       integer not null,
  created_at   timestamptz not null default now()
);

create index on fase_template (artigiano_id);

create table lavoro_fasi (
  id         uuid primary key default gen_random_uuid(),
  lavoro_id  uuid not null references lavoro(id) on delete cascade,
  nome_fase  text not null,
  ordine     integer not null,
  stato      text not null default 'da_fare'
               check (stato in ('da_fare', 'in_corso', 'bloccata', 'fatta')),
  data_inizio timestamptz,
  data_fine   timestamptz,
  created_at  timestamptz not null default now()
);

create index on lavoro_fasi (lavoro_id);

-- =============================================================
-- PAGAMENTI
-- =============================================================
create table pagamento (
  id        uuid primary key default gen_random_uuid(),
  lavoro_id uuid not null references lavoro(id) on delete cascade,
  tipo      text not null check (tipo in ('acconto', 'saldo')),
  importo   numeric(12, 2) not null check (importo > 0),
  data      date not null,
  note      text,
  created_at timestamptz not null default now()
);

create index on pagamento (lavoro_id);

-- =============================================================
-- ALLEGATI
-- =============================================================
create table allegato (
  id               uuid primary key default gen_random_uuid(),
  lavoro_id        uuid not null references lavoro(id) on delete cascade,
  tipo             text not null check (tipo in ('pdf', 'foto')),
  nome_file        text not null,
  storage_path     text not null,
  data_caricamento timestamptz not null default now(),
  note             text
);

create index on allegato (lavoro_id);

-- =============================================================
-- CATALOGO ARTICOLI (condiviso per fornitore_sede)
-- =============================================================
create table articolo (
  id                uuid primary key default gen_random_uuid(),
  fornitore_sede_id uuid not null references fornitore_sede(id) on delete cascade,
  codice            text,
  descrizione       text not null,
  colore_finitura   text,
  created_at        timestamptz not null default now()
);

create index on articolo (fornitore_sede_id);
create index on articolo using gin (descrizione gin_trgm_ops);

-- =============================================================
-- ORDINI DI ACQUISTO
-- =============================================================
create table ordine_acquisto (
  id                    uuid primary key default gen_random_uuid(),
  lavoro_id             uuid not null references lavoro(id) on delete cascade,
  fornitore_sede_id     uuid not null references fornitore_sede(id),
  categoria_id          uuid references categoria_acquisto(id) on delete set null,
  stato                 text not null default 'bozza'
                          check (stato in ('bozza', 'concluso')),
  data_invio            timestamptz,
  data_chiusura_manuale timestamptz,
  totale                numeric(12, 2),
  created_at            timestamptz not null default now()
);

create index on ordine_acquisto (lavoro_id);

create table ordine_acquisto_riga (
  id              uuid primary key default gen_random_uuid(),
  ordine_id       uuid not null references ordine_acquisto(id) on delete cascade,
  articolo_id     uuid references articolo(id) on delete set null,
  descrizione     text not null,
  colore_finitura text,
  quantita        numeric(10, 3) not null check (quantita > 0),
  prezzo_unitario numeric(12, 2) not null check (prezzo_unitario >= 0),
  created_at      timestamptz not null default now()
);

create index on ordine_acquisto_riga (ordine_id);
create index on ordine_acquisto_riga (articolo_id);

-- =============================================================
-- FUNZIONE helper: ultimo prezzo pagato per articolo per artigiano
-- =============================================================
create or replace function ultimo_prezzo_articolo(p_articolo_id uuid, p_artigiano_id uuid)
returns numeric
language sql
stable
security definer
as $$
  select oar.prezzo_unitario
  from ordine_acquisto_riga oar
  join ordine_acquisto oa  on oa.id        = oar.ordine_id
  join lavoro l            on l.id         = oa.lavoro_id
  join lavoro_artigiani la on la.lavoro_id = l.id
  where oar.articolo_id  = p_articolo_id
    and la.artigiano_id  = p_artigiano_id
    and la.stato         = 'accettato'
  order by coalesce(oa.data_invio, oa.created_at) desc
  limit 1;
$$;

-- =============================================================
-- ABILITAZIONE RLS
-- =============================================================
alter table specializzazione              enable row level security;
alter table artigiano                     enable row level security;
alter table cliente                       enable row level security;
alter table fornitore                     enable row level security;
alter table fornitore_sede                enable row level security;
alter table fornitore_sede_contatto       enable row level security;
alter table artigiano_fornitore_nota      enable row level security;
alter table categoria_acquisto            enable row level security;
alter table artigiano_fornitore_categoria enable row level security;
alter table lavoro                        enable row level security;
alter table lavoro_artigiani              enable row level security;
alter table attivita                      enable row level security;
alter table sla_attivita                  enable row level security;
alter table fase_template                 enable row level security;
alter table lavoro_fasi                   enable row level security;
alter table pagamento                     enable row level security;
alter table allegato                      enable row level security;
alter table articolo                      enable row level security;
alter table ordine_acquisto               enable row level security;
alter table ordine_acquisto_riga          enable row level security;

-- =============================================================
-- POLICY RLS
-- =============================================================

-- Helper: verifica se l'utente corrente è artigiano con stato=accettato su un lavoro
create or replace function is_artigiano_del_lavoro(p_lavoro_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from lavoro_artigiani
    where lavoro_id    = p_lavoro_id
      and artigiano_id = auth.uid()
      and stato        = 'accettato'
  );
$$;

-- Helper: verifica se l'utente corrente è owner di un lavoro
create or replace function is_owner_del_lavoro(p_lavoro_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from lavoro_artigiani
    where lavoro_id    = p_lavoro_id
      and artigiano_id = auth.uid()
      and ruolo        = 'owner'
      and stato        = 'accettato'
  );
$$;

-- ---- specializzazione ----
create policy "lettura pubblica specializzazioni"
  on specializzazione for select
  using (auth.uid() is not null);

-- ---- artigiano ----
create policy "artigiano vede solo se stesso"
  on artigiano for select
  using (id = auth.uid());

create policy "artigiano aggiorna solo se stesso"
  on artigiano for update
  using (id = auth.uid());

-- INSERT gestita dal trigger post-signup (non esposta a RLS diretta)

-- ---- cliente ----
create policy "cliente: solo proprietario"
  on cliente for all
  using (artigiano_id = auth.uid());

-- Ospite su lavoro condiviso può leggere il cliente del lavoro (read-only)
create policy "cliente: ospite legge se nel lavoro"
  on cliente for select
  using (
    exists (
      select 1
      from lavoro l
      join lavoro_artigiani la on la.lavoro_id = l.id
      where l.cliente_id   = cliente.id
        and la.artigiano_id = auth.uid()
        and la.stato        = 'accettato'
    )
  );

-- ---- fornitore / sede / contatto (condivisi, lettura e scrittura per tutti) ----
create policy "fornitori: tutti gli artigiani leggono e scrivono"
  on fornitore for all
  using (auth.uid() is not null);

create policy "fornitore_sede: tutti gli artigiani leggono e scrivono"
  on fornitore_sede for all
  using (auth.uid() is not null);

create policy "fornitore_sede_contatto: tutti gli artigiani leggono e scrivono"
  on fornitore_sede_contatto for all
  using (auth.uid() is not null);

-- ---- note private artigiano su fornitore ----
create policy "note fornitore: solo proprietario"
  on artigiano_fornitore_nota for all
  using (artigiano_id = auth.uid());

-- ---- categorie acquisto ----
create policy "categoria_acquisto: solo proprietario"
  on categoria_acquisto for all
  using (artigiano_id = auth.uid());

create policy "artigiano_fornitore_categoria: solo proprietario"
  on artigiano_fornitore_categoria for all
  using (artigiano_id = auth.uid());

-- ---- lavoro ----
create policy "lavoro: visibile ai propri artigiani"
  on lavoro for select
  using (is_artigiano_del_lavoro(id));

create policy "lavoro: inserimento se si possiede il cliente"
  on lavoro for insert
  with check (
    exists (
      select 1 from cliente
      where cliente.id           = lavoro.cliente_id
        and cliente.artigiano_id = auth.uid()
    )
  );

create policy "lavoro: modifica solo owner"
  on lavoro for update
  using (is_owner_del_lavoro(id));

create policy "lavoro: eliminazione solo owner"
  on lavoro for delete
  using (is_owner_del_lavoro(id));

-- ---- lavoro_artigiani ----
create policy "lavoro_artigiani: visibile a chi è nel lavoro"
  on lavoro_artigiani for select
  using (
    artigiano_id = auth.uid()
    or is_artigiano_del_lavoro(lavoro_id)
  );

create policy "lavoro_artigiani: inserimento solo owner"
  on lavoro_artigiani for insert
  with check (is_owner_del_lavoro(lavoro_id));

create policy "lavoro_artigiani: accetta/rifiuta solo l'invitato"
  on lavoro_artigiani for update
  using (artigiano_id = auth.uid() or is_owner_del_lavoro(lavoro_id));

create policy "lavoro_artigiani: eliminazione solo owner"
  on lavoro_artigiani for delete
  using (is_owner_del_lavoro(lavoro_id));

-- ---- attivita ----
create policy "attivita: lettura chi è nel lavoro"
  on attivita for select
  using (is_artigiano_del_lavoro(lavoro_id));

create policy "attivita: scrittura solo owner"
  on attivita for insert
  with check (is_owner_del_lavoro(lavoro_id));

create policy "attivita: modifica solo owner"
  on attivita for update
  using (is_owner_del_lavoro(lavoro_id));

create policy "attivita: eliminazione solo owner"
  on attivita for delete
  using (is_owner_del_lavoro(lavoro_id));

-- ---- sla_attivita ----
create policy "sla: artigiano vede i propri + default sistema"
  on sla_attivita for select
  using (artigiano_id = auth.uid() or artigiano_id is null);

create policy "sla: artigiano gestisce i propri"
  on sla_attivita for insert
  with check (artigiano_id = auth.uid());

create policy "sla: artigiano modifica i propri"
  on sla_attivita for update
  using (artigiano_id = auth.uid());

create policy "sla: artigiano elimina i propri"
  on sla_attivita for delete
  using (artigiano_id = auth.uid());

-- ---- fase_template ----
create policy "fase_template: solo proprietario"
  on fase_template for all
  using (artigiano_id = auth.uid());

-- ---- lavoro_fasi ----
create policy "lavoro_fasi: lettura chi è nel lavoro"
  on lavoro_fasi for select
  using (is_artigiano_del_lavoro(lavoro_id));

create policy "lavoro_fasi: scrittura solo owner"
  on lavoro_fasi for insert
  with check (is_owner_del_lavoro(lavoro_id));

create policy "lavoro_fasi: modifica solo owner"
  on lavoro_fasi for update
  using (is_owner_del_lavoro(lavoro_id));

create policy "lavoro_fasi: eliminazione solo owner"
  on lavoro_fasi for delete
  using (is_owner_del_lavoro(lavoro_id));

-- ---- pagamento ----
create policy "pagamento: lettura chi è nel lavoro"
  on pagamento for select
  using (is_artigiano_del_lavoro(lavoro_id));

create policy "pagamento: scrittura solo owner"
  on pagamento for insert
  with check (is_owner_del_lavoro(lavoro_id));

create policy "pagamento: modifica solo owner"
  on pagamento for update
  using (is_owner_del_lavoro(lavoro_id));

create policy "pagamento: eliminazione solo owner"
  on pagamento for delete
  using (is_owner_del_lavoro(lavoro_id));

-- ---- allegato ----
create policy "allegato: lettura chi è nel lavoro"
  on allegato for select
  using (is_artigiano_del_lavoro(lavoro_id));

create policy "allegato: scrittura solo owner"
  on allegato for insert
  with check (is_owner_del_lavoro(lavoro_id));

create policy "allegato: modifica solo owner"
  on allegato for update
  using (is_owner_del_lavoro(lavoro_id));

create policy "allegato: eliminazione solo owner"
  on allegato for delete
  using (is_owner_del_lavoro(lavoro_id));

-- ---- articolo (catalogo condiviso) ----
create policy "articolo: lettura tutti gli artigiani"
  on articolo for select
  using (auth.uid() is not null);

create policy "articolo: inserimento tutti gli artigiani"
  on articolo for insert
  with check (auth.uid() is not null);

create policy "articolo: modifica tutti gli artigiani"
  on articolo for update
  using (auth.uid() is not null);

-- DELETE bloccato a tutti: solo service_role può eliminare articoli
-- (evita rotture di FK su ordine_acquisto_riga storico)

-- ---- ordine_acquisto ----
create policy "ordine_acquisto: lettura chi è nel lavoro"
  on ordine_acquisto for select
  using (is_artigiano_del_lavoro(lavoro_id));

create policy "ordine_acquisto: scrittura solo owner"
  on ordine_acquisto for insert
  with check (is_owner_del_lavoro(lavoro_id));

create policy "ordine_acquisto: modifica solo owner"
  on ordine_acquisto for update
  using (is_owner_del_lavoro(lavoro_id));

create policy "ordine_acquisto: eliminazione solo owner"
  on ordine_acquisto for delete
  using (is_owner_del_lavoro(lavoro_id));

-- ---- ordine_acquisto_riga ----
create policy "riga ordine: lettura chi è nel lavoro"
  on ordine_acquisto_riga for select
  using (
    exists (
      select 1 from ordine_acquisto oa
      where oa.id = ordine_acquisto_riga.ordine_id
        and is_artigiano_del_lavoro(oa.lavoro_id)
    )
  );

create policy "riga ordine: scrittura solo owner"
  on ordine_acquisto_riga for insert
  with check (
    exists (
      select 1 from ordine_acquisto oa
      where oa.id = ordine_acquisto_riga.ordine_id
        and is_owner_del_lavoro(oa.lavoro_id)
    )
  );

create policy "riga ordine: modifica solo owner"
  on ordine_acquisto_riga for update
  using (
    exists (
      select 1 from ordine_acquisto oa
      where oa.id = ordine_acquisto_riga.ordine_id
        and is_owner_del_lavoro(oa.lavoro_id)
    )
  );

create policy "riga ordine: eliminazione solo owner"
  on ordine_acquisto_riga for delete
  using (
    exists (
      select 1 from ordine_acquisto oa
      where oa.id = ordine_acquisto_riga.ordine_id
        and is_owner_del_lavoro(oa.lavoro_id)
    )
  );
