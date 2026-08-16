-- Sessione "correzione — sovrapposizione visiva, decimali mai
-- implementati, tono mail, nuovo campo Referenza" (2026-08-19, vedi
-- CLAUDE.md).
--
-- Nuovo campo Codice su Referenza: testo libero opzionale, non legato a un
-- fornitore specifico (coerente con la decisione già presa — Districo non
-- traccia codici per-fornitore, vedi CLAUDE.md 14/8 "modello corretto").
-- Nullable, nessun default: una Referenza esistente non ha alcun codice
-- finché l'artigiano non lo compila esplicitamente dal Catalogo.

alter table referenza add column codice text;
