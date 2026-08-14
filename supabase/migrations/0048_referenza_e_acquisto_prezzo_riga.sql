-- =============================================================
-- Restyling Acquisto + catalogo Referenze (2026-08-14, vedi CLAUDE.md).
--
-- Modello: Referenza è un catalogo personale per artigiano (stesso pattern
-- già in uso da categoria_acquisto, RLS "solo proprietario"), legata a una
-- Categoria (categoria_acquisto) — NON a un Fornitore. Nessuna tabella di
-- associazione referenza-fornitore (modello "Referenza_Fornitore" con prezzi
-- per-fornitore scartato prima di scrivere questa migration, vedi CLAUDE.md).
-- `ultimo_prezzo` è un unico valore indicativo, aggiornato ad ogni Acquisto
-- che lo modifica — non uno storico per fornitore.
--
-- Verificato prima di scrivere questa migration (come richiesto): le
-- tabelle del brief 16/7 `articolo`/`ordine_acquisto_riga` erano già state
-- droppate nell'audit del 13/8 (migration 0045, zero righe reali, zero
-- riferimenti applicativi) — questo è quindi schema nuovo da creare da
-- zero, non una migrazione di dati esistenti.
-- =============================================================

create table referenza (
  id              uuid primary key default gen_random_uuid(),
  artigiano_id    uuid not null references artigiano(id) on delete cascade,
  categoria_id    uuid not null references categoria_acquisto(id) on delete cascade,
  descrizione     text not null,
  colore_finitura text,
  ultimo_prezzo   numeric(12, 2),
  created_at      timestamptz not null default now()
);

create index on referenza (artigiano_id);
create index on referenza (categoria_id);

alter table referenza enable row level security;

-- Stesso pattern di categoria_acquisto: un'unica policy "for all" scoped
-- sul proprietario, nessuna distinzione fra select/insert/update/delete.
create policy "referenza: solo proprietario"
  on referenza for all
  using (artigiano_id = auth.uid());

-- =============================================================
-- lavoro_satellite_articolo: prezzo e collegamento al catalogo Referenze.
--
-- `referenza_id` nullable: una riga può restare "ad hoc" (creata al volo
-- senza il flag "salva come referenza riutilizzabile") senza mai comparire
-- nel catalogo personale — coerente con l'assenza di qualunque vincolo di
-- integrità che imponga il collegamento. `on delete set null` (non cascade):
-- eliminare una Referenza dal catalogo in futuro (nessuna UI di gestione
-- oggi, ma la colonna non deve presupporlo) non deve cancellare righe di
-- Acquisto storiche già fatturate/ordinate.
--
-- `prezzo_unitario` nullable a schema (nessun CHECK not null): la
-- validazione "obbligatorio" resta lato applicativo, come già per
-- `quantita` in UI nonostante il CHECK quantita > 0 a schema — coerente con
-- il resto dell'app, dove i vincoli "obbligatorio" sono quasi sempre solo
-- client-side (vedi convenzione asterisco in CLAUDE.md), qui aggiunto anche
-- un CHECK >= 0 per lo stesso motivo già valido per ordine_acquisto_riga
-- nel brief originale (prezzo mai negativo).
-- =============================================================
alter table lavoro_satellite_articolo
  add column referenza_id    uuid references referenza(id) on delete set null,
  add column prezzo_unitario numeric(12, 2) check (prezzo_unitario is null or prezzo_unitario >= 0);

create index on lavoro_satellite_articolo (referenza_id);
