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

-- SLA default di sistema (artigiano_id NULL = sistema)
-- Convenzione PK: uuid sentinel per artigiano_id NULL
insert into sla_attivita (artigiano_id, tipo_attivita, giorni_max) values
  (null, 'briefing',     3),
  (null, 'progetto',    14),
  (null, 'preventivo',   7),
  (null, 'sopralluogo',  5),
  (null, 'campioni',    10);
