-- =============================================================
-- Fix emerso dal test end-to-end in produzione: il Lavoro non era
-- modificabile dopo la creazione (descrizione, indirizzo, e nessuna
-- data di apertura da poter correggere). Questa migration aggiunge la
-- sola colonna mancante; descrizione e indirizzo esistevano già
-- (0001/0012) e non richiedono modifiche di schema, solo una nuova UI
-- di modifica (lib/lavori/actions.ts, components/lavoro-form.tsx).
--
-- `data_lavoro`: data di apertura del lavoro/inizio trattativa,
-- distinta dal timestamp tecnico `created_at` (che resta invariato come
-- riferimento di sistema, non esposto in UI). Serve per il caso in cui
-- il lavoro venga registrato in app qualche giorno dopo l'apertura
-- reale — default alla creazione = data odierna, sempre modificabile in
-- seguito. Colonna nullable (non un vincolo NOT NULL) per sicurezza sul
-- backfill di righe esistenti e coerenza con lo stile "tutti nullable"
-- già usato per i campi indirizzo del Lavoro (0012): l'obbligatorietà
-- percepita in UI (client-side, non svuotabile nel form di modifica)
-- non richiede necessariamente un vincolo NOT NULL a DB.
alter table lavoro
  add column data_lavoro date;

-- Backfill: per i lavori già esistenti si usa la data di creazione reale
-- (created_at::date), non la data odierna del momento in cui gira questa
-- migration — altrimenti tutti i lavori pre-esistenti avrebbero la
-- stessa data_lavoro fittizia.
update lavoro set data_lavoro = created_at::date where data_lavoro is null;

alter table lavoro
  alter column data_lavoro set default current_date;
