-- =============================================================
-- Fix mirato allo Sprint 2 (dettaglio Lavoro / vista satelliti):
-- il form "aggiungi appuntamento" richiede un campo data, assente
-- dallo schema Sprint 1 (0009_lavoro_satellite.sql) — lì il satellite
-- aveva solo data_creazione/data_ultimo_cambio_stato, entrambe
-- automatiche, nessun campo libero per la data dell'appuntamento
-- scelta dall'artigiano.
-- =============================================================
alter table lavoro_satellite
  add column data_appuntamento timestamptz;
