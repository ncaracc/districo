-- =============================================================
-- Districo — seed
-- =============================================================

-- Specializzazioni ufficiali
insert into specializzazione (valore, ufficiale) values
  ('Falegname',          true),
  ('Idraulico',          true),
  ('Elettricista',       true),
  ('Muratore',           true),
  ('Imbianchino',        true),
  ('Serramentista',      true),
  ('Fabbro',             true),
  ('Parquettista',       true),
  ('Piastrellista',      true),
  ('Tappezziere',        true),
  ('Vetraio',            true),
  ('Carpentiere',        true),
  ('Termoidraulico',     true),
  ('Giardiniere',        true),
  ('Restauratore',       true);

-- Il seed "SLA default di sistema" (sla_attivita) è stato rimosso insieme
-- alla tabella nella migration 0045_pulizia_schema_morto.sql (audit
-- 2026-08, vedi docs/audit-2026-08.md) — modello Attività/SLA del brief
-- 16/7, mai avuto un equivalente nel modello satellite reale, zero
-- riferimenti applicativi. Scoperto qui (bloccava `supabase start` da zero
-- con "relation sla_attivita does not exist") mentre si allestiva
-- l'ambiente locale per un'altra sessione — coerenza ripristinata.
