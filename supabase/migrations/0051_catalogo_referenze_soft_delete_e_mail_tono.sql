-- Sessione "Catalogo Referenze standalone + revisione modale Acquisto +
-- testo mail configurabile" (2026-08-17, vedi CLAUDE.md).
--
-- =============================================================
-- PARTE A — soft delete Referenze: una Referenza eliminata non deve più
-- essere selezionabile per nuovi Acquisti, ma deve restare in DB per non
-- rompere lo storico di Acquisti passati che la referenziano (referenza_id
-- su lavoro_satellite_articolo, migration 0048). Pattern booleano
-- `attiva`, stesso principio già in uso altrove nel progetto per flag di
-- visibilità (es. `rilevante` calcolato lato satelliti, non una colonna
-- ma stesso concetto "nascondi senza cancellare").
-- =============================================================

alter table referenza add column attiva boolean not null default true;

-- =============================================================
-- PARTE D — testo mail ordine fornitori: Apertura/Congedo personalizzabili
-- (il resto del corpo mail resta invariato, vedi lib/lavori/ordini-email.ts).
-- Persistiti su `artigiano` come le altre preferenze personali (SMTP,
-- obiettivi KPI) — stesso pattern, nessuna tabella nuova. Nullable: default
-- applicativo (non a DB) quando entrambi assenti, vedi
-- lib/lavori/ordini-email.ts — permette di distinguere "mai configurato"
-- da "impostato esplicitamente a stringa vuota" se mai servisse in futuro,
-- stesso principio prudenziale già in uso per le colonne smtp_*.
-- =============================================================

alter table artigiano add column mail_ordine_apertura text;
alter table artigiano add column mail_ordine_congedo text;
