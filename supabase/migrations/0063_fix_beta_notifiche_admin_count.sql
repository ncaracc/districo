-- =============================================================
-- 2026-08-22 — Fix bug reale in beta_notifiche_admin_count() (0062),
-- scoperto testando end-to-end il badge prima del deploy: la funzione
-- era SECURITY INVOKER (deliberatamente, non serviva bypassare la RLS di
-- post_beta/messaggio_beta) ma fa anche `join artigiano a on a.id =
-- ultimo.autore_id` per leggere `is_admin` dell'AUTORE DELL'ULTIMO
-- MESSAGGIO — quando quell'autore non è il chiamante stesso, la RLS
-- "artigiano vede solo se stesso" (0001) nasconde la riga e il JOIN non
-- produce nulla, azzerando il conteggio indipendentemente dal contenuto
-- reale. CORREGGE 0062, non la sostituisce (già applicata in produzione
-- — mai editata direttamente, per convenzione di questo progetto).
-- =============================================================
create or replace function public.beta_notifiche_admin_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from post_beta p
  join lateral (
    select m.autore_id
    from messaggio_beta m
    where m.post_id = p.id and m.nascosto = false
    order by m.created_at desc
    limit 1
  ) ultimo on true
  join artigiano a on a.id = ultimo.autore_id
  where p.stato = 'aperto'
    and p.nascosto = false
    and a.is_admin = false;
$$;
