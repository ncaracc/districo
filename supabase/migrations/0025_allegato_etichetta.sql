-- =============================================================
-- Sprint B (appuntamenti) 2026-08-02 — etichetta obbligatoria sugli
-- allegati satellite (vedi CLAUDE.md, sezione dedicata).
--
-- Colonna condivisa da tutti i tipi di satellite con allegati
-- (lavoro_satellite_allegato non distingue per tipo): applicata in questo
-- sprint solo al flusso di upload di Appuntamento (Briefing/Verifica
-- misure/Montaggio), le altre 14 righe esistenti (Preventivo/Progetto/
-- Campione, nessuna su Acquisto: quel tipo non ha ancora allegati in UI)
-- vengono comunque valorizzate col default per rispettare il NOT NULL.
--
-- 14 righe esistenti in produzione al momento di questa migration
-- (verificato via REST con la service role key, non solo le 3 collegate
-- ad appuntamenti note dalla verifica preliminare di questo sprint — quel
-- numero contava solo il sottoinsieme appuntamento, non l'intera tabella).
-- =============================================================
alter table lavoro_satellite_allegato add column etichetta text;

update lavoro_satellite_allegato set etichetta = 'Allegato' where etichetta is null;

alter table lavoro_satellite_allegato alter column etichetta set not null;
