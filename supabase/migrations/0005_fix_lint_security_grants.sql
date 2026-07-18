-- =============================================================
-- Fix ai lint di sicurezza rimasti dopo la 0004:
-- security_definer_function_executable (4 avvisi per anon,
-- 4 per authenticated) su handle_new_artigiano,
-- is_artigiano_del_lavoro, is_owner_del_lavoro,
-- ultimo_prezzo_articolo.
--
-- Causa: `REVOKE EXECUTE ... FROM PUBLIC` (fatto nella 0004) toglie
-- solo il grant implicito allo pseudo-ruolo PUBLIC. Non tocca i
-- grant ESPLICITI che ogni progetto Supabase assegna di default ad
-- anon/authenticated/service_role tramite
-- `ALTER DEFAULT PRIVILEGES ... GRANT EXECUTE ON FUNCTIONS TO ...`
-- eseguito una tantum sul database — ogni nuova funzione creata in
-- public eredita quei grant indipendentemente da PUBLIC. Vanno
-- revocati esplicitamente dai ruoli.
-- =============================================================

-- handle_new_artigiano: deve scattare SOLO dal trigger
-- on_auth_user_created, mai chiamabile da un utente. I trigger
-- invocano la funzione a livello di executor, non tramite una
-- chiamata soggetta a controllo privilegi del ruolo che ha generato
-- l'evento: revocare EXECUTE da anon/authenticated non rompe il
-- trigger (verificato di seguito).
revoke execute on function public.handle_new_artigiano() from anon, authenticated;

-- Helper delle policy RLS: restano eseguibili da authenticated
-- (il grant già concesso nella 0004 resta invariato: la valutazione
-- delle policy avviene nel contesto di sessione del chiamante, quindi
-- authenticated deve poter eseguire queste funzioni), ma non da anon.
revoke execute on function public.is_artigiano_del_lavoro(uuid) from anon;
revoke execute on function public.is_owner_del_lavoro(uuid) from anon;
revoke execute on function public.ultimo_prezzo_articolo(uuid) from anon;
