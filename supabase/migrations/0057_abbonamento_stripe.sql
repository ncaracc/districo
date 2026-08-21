-- Sessione "Integrazione Stripe — abbonamenti trial + ricorrenti" (2026-08-21,
-- modalità test/sandbox, vedi CLAUDE.md). Stato abbonamento tracciato
-- direttamente su artigiano (un artigiano = un cliente Stripe) — stesso
-- approccio già usato per codice_sdi/pec (0056): nessuna tabella satellite
-- dedicata, un solo abbonamento corrente per artigiano, nessuno storico da
-- tracciare oltre a quello che Stripe stesso mantiene lato suo.

alter table artigiano
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column stato_abbonamento text not null default 'nessuno'
    check (stato_abbonamento in ('nessuno', 'trialing', 'active', 'past_due', 'canceled')),
  add column piano_abbonamento text
    check (piano_abbonamento is null or piano_abbonamento in ('mensile', 'annuale')),
  add column trial_fine timestamptz;

-- Un customer_id Stripe non può appartenere a due artigiani diversi — il
-- webhook lo usa come chiave di fallback per ritrovare la riga quando i
-- metadata della subscription non bastano (vedi app/api/stripe/webhook).
-- Indice univoco parziale, non una PK: nullable per ogni artigiano che non
-- ha ancora avviato un checkout — stesso pattern già in uso in questo
-- progetto per un vincolo di unicità su una colonna nullable (sla_attivita,
-- vedi CLAUDE.md, "Note tecniche emerse in fase di implementazione").
create unique index artigiano_stripe_customer_id_idx
  on artigiano (stripe_customer_id) where stripe_customer_id is not null;
