-- =============================================================
-- 2026-08-22 — Fix bug reale in admin_lista_artigiani() (0058), scoperto
-- testando end-to-end la pagina /admin/utenti prima del deploy: `returns
-- table (id uuid, nome text, ...)` dichiara implicitamente id/nome/
-- cognome/... come variabili plpgsql nello scope della funzione — il
-- controllo interno `where id = auth.uid()` diventava ambiguo (variabile
-- OUT vs colonna artigiano.id), Postgres rifiutava la chiamata con
-- "column reference \"id\" is ambiguous" (42702). CORREGGE 0058, non la
-- sostituisce (migration già applicata in produzione — mai editata
-- direttamente, per convenzione di questo progetto).
--
-- Fix: alias esplicito sulla tabella nel controllo `is_admin`, invece di
-- affidarsi al nome nudo della colonna.
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
  if not exists (select 1 from artigiano art where art.id = auth.uid() and art.is_admin = true) then
    raise exception 'Accesso negato';
  end if;

  return query
    select a.id, a.nome, a.cognome, a.email, a.created_at,
           a.stato_abbonamento, a.piano_abbonamento, a.beta_tester
    from artigiano a
    order by a.created_at desc;
end;
$$;
