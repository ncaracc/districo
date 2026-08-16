-- Sessione "tono mail scelto al momento dell'invio, non più un default
-- globale" (2026-08-19, vedi CLAUDE.md). Segnalato dall'utente: il tono
-- (Formale/Informale) dipende dal fornitore a cui si scrive volta per
-- volta, non ha senso come preferenza fissa dell'artigiano — corregge il
-- design della sessione del 17/8 (Apertura/Congedo come singola coppia
-- personalizzabile, con Formale/Informale solo come prefill una tantum in
-- Impostazioni).
--
-- `mail_ordine_apertura`/`mail_ordine_congedo` (0051, 17/8) droppate senza
-- backfill: verificato su Supabase Cloud prima di scrivere questa
-- migration — ZERO artigiani reali le avevano mai valorizzate (funzionalità
-- viva da 2 giorni, mai personalizzata da nessuno) — a differenza di altri
-- casi in questo progetto con dati reali da preservare (es.
-- chiusura_acconti, mai droppata), qui non c'è nulla da perdere.
--
-- Sostituite da due coppie indipendenti, una per tono — ciascuna
-- personalizzabile in Impostazioni, scelta al momento dell'invio (vedi
-- lib/lavori/ordini-email.ts). Nullable, nessun default: null = usa il
-- preset applicativo per quel tono (stesso principio di prima).
alter table artigiano drop column mail_ordine_apertura;
alter table artigiano drop column mail_ordine_congedo;

alter table artigiano add column mail_ordine_apertura_formale text;
alter table artigiano add column mail_ordine_congedo_formale text;
alter table artigiano add column mail_ordine_apertura_informale text;
alter table artigiano add column mail_ordine_congedo_informale text;
