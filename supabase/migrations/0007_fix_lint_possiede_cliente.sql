-- =============================================================
-- Fix lint: anon_security_definer_function_executable su
-- public.possiede_cliente_del_lavoro (introdotta nella 0006).
--
-- La 0006 ha fatto REVOKE EXECUTE ... FROM PUBLIC + GRANT ... TO
-- authenticated, ma non l'esplicito REVOKE ... FROM anon — lo stesso
-- pattern già risolto nella 0005 per is_artigiano_del_lavoro,
-- is_owner_del_lavoro, ultimo_prezzo_articolo (REVOKE FROM PUBLIC da
-- solo non basta: ogni progetto Supabase assegna grant espliciti ad
-- anon/authenticated/service_role via ALTER DEFAULT PRIVILEGES,
-- indipendenti da PUBLIC). Sfuggito qui perché la 0006 nasceva come
-- fix RLS, non come fix lint.
-- =============================================================

revoke execute on function public.possiede_cliente_del_lavoro(uuid) from anon;
