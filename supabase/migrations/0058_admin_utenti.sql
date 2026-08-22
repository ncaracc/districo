-- =============================================================
-- 2026-08-22 — Pagina di amministrazione utenti (/admin/utenti, vedi
-- CLAUDE.md). Riusa il ruolo admin già esistente
-- (`artigiano.is_admin`, migration 0001) — NESSUN nuovo campo "ruolo":
-- la richiesta originale ne chiedeva uno enum ('artigiano'/'admin'), ma
-- verificato con l'utente prima di procedere che avrebbe duplicato
-- is_admin con lo stesso identico significato (rischio concreto di
-- disallineamento tra due colonne) — `app/(admin)/layout.tsx` aveva già
-- un guard funzionante su is_admin dal 19/7, mai citato nella richiesta.
--
-- beta_tester: flag semplice, marcatura manuale dell'admin per chi ha
-- aderito al programma beta (Sezione Beta della landing, "6 mesi di
-- accesso gratuito") — nessuna automazione, nessun collegamento con lo
-- stato abbonamento Stripe.
-- =============================================================
alter table artigiano add column beta_tester boolean not null default false;

-- =============================================================
-- admin_lista_artigiani() / admin_imposta_beta_tester(): primo uso reale
-- del principio già scritto in CLAUDE.md ("Admin RLS: nessun accesso
-- diretto alle tabelle operative. Solo funzioni/view SQL con SECURITY
-- DEFINER esporranno metriche aggregate") — qui applicato all'anagrafica
-- invece che a metriche aggregate, stesso principio: RLS su `artigiano`
-- resta "vede solo se stesso" (0001), INVARIATA. Queste due funzioni sono
-- l'unico punto in cui un admin può leggere/modificare righe di altri
-- artigiani, e verificano `is_admin` al loro interno prima di fare
-- qualunque cosa — un artigiano non-admin che le chiami via RPC
-- direttamente (bypassando la route Next.js) riceve un'eccezione, non
-- dati. Protezione a livello DB, non solo a livello di route.
-- =============================================================
create or replace function public.admin_lista_artigiani()
returns table (
  id uuid,
  nome text,
  cognome text,
  email text,
  created_at timestamptz,
  stato_abbonamento text,
  piano_abbonamento text,
  beta_tester boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from artigiano where id = auth.uid() and is_admin = true) then
    raise exception 'Accesso negato';
  end if;

  return query
    select a.id, a.nome, a.cognome, a.email, a.created_at,
           a.stato_abbonamento, a.piano_abbonamento, a.beta_tester
    from artigiano a
    order by a.created_at desc;
end;
$$;

revoke execute on function public.admin_lista_artigiani() from public;
revoke execute on function public.admin_lista_artigiani() from anon;
grant execute on function public.admin_lista_artigiani() to authenticated;

create or replace function public.admin_imposta_beta_tester(p_artigiano_id uuid, p_valore boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from artigiano where id = auth.uid() and is_admin = true) then
    raise exception 'Accesso negato';
  end if;

  update artigiano set beta_tester = p_valore where id = p_artigiano_id;
end;
$$;

revoke execute on function public.admin_imposta_beta_tester(uuid, boolean) from public;
revoke execute on function public.admin_imposta_beta_tester(uuid, boolean) from anon;
grant execute on function public.admin_imposta_beta_tester(uuid, boolean) to authenticated;
