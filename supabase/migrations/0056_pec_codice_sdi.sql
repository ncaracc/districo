-- Sessione "Codice SDI/PEC + cambio password" (2026-08-19, vedi CLAUDE.md).

-- =============================================================
-- Codice Destinatario SDI e PEC — campi di preparazione per la futura
-- fatturazione elettronica (segnalati come mancanti nella sessione
-- precedente, "riorganizzazione Profilo/Impostazioni", non implementati
-- allora su richiesta esplicita di limitarsi a segnalarli). Entrambi
-- opzionali, NESSUN vincolo di obbligatorietà incrociata (a differenza di
-- partita_iva/codice_fiscale) — richiesto esplicitamente: la vera regola
-- ("almeno uno dei due è obbligatorio per emettere fattura elettronica")
-- verrà decisa insieme all'integrazione Stripe/fatturazione vera e
-- propria, non anticipata qui. `pec` è testo libero, non un tipo email
-- a schema: la validazione di formato resta applicativa (stesso criterio
-- già in uso per `artigiano.email`/`cliente.email`, mai vincolate a
-- livello di colonna in questo progetto).
-- =============================================================

alter table artigiano
  add column codice_sdi text,
  add column pec text;
