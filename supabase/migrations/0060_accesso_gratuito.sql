-- =============================================================
-- 2026-08-22 — Accesso gratuito permanente (deroga manuale admin, vedi
-- CLAUDE.md — "Principi architetturali", voce "Ruolo admin"). Override
-- COMPLETO e indipendente da `stato_abbonamento`: quando true, il gate di
-- `app/(app)/layout.tsx` non guarda nemmeno lo stato Stripe — copre anche
-- 'nessuno' (mai sottoscritto), non solo 'canceled'/trial scaduto.
-- =============================================================
alter table artigiano add column accesso_gratuito boolean not null default false;

-- admin_lista_artigiani() estesa con la nuova colonna, stesso pattern di
-- 0058/0059 (SECURITY DEFINER, verifica is_admin interna, invariata).
-- `create or replace` non basta quando cambia il tipo di ritorno (qui:
-- una colonna in più in `returns table`) — Postgres lo rifiuta con
-- "cannot change return type of existing function" finché la vecchia
-- definizione non viene rimossa esplicitamente.
drop function if exists public.admin_lista_artigiani();

create function public.admin_lista_artigiani()
returns table (
  id uuid,
  nome text,
  cognome text,
  email text,
  created_at timestamptz,
  stato_abbonamento text,
  piano_abbonamento text,
  beta_tester boolean,
  accesso_gratuito boolean
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
           a.stato_abbonamento, a.piano_abbonamento, a.beta_tester, a.accesso_gratuito
    from artigiano a
    order by a.created_at desc;
end;
$$;

-- Il `drop function` sopra elimina anche i GRANT/REVOKE espliciti già
-- impostati dalla 0058 (i permessi appartengono all'oggetto funzione, non
-- sopravvivono al drop) — vanno riapplicati qui, non solo sulla nuova
-- admin_imposta_accesso_gratuito sotto.
revoke execute on function public.admin_lista_artigiani() from public;
revoke execute on function public.admin_lista_artigiani() from anon;
grant execute on function public.admin_lista_artigiani() to authenticated;

-- admin_imposta_accesso_gratuito(): stessa forma esatta di
-- admin_imposta_beta_tester() (0058) — funzione dedicata invece di una
-- versione parametrica generica (es. nome colonna come argomento testo,
-- SQL dinamico): con solo due flag admin da gestire, una funzione esplicita
-- per campo resta più semplice/sicura di un `update ... set %I = $1`
-- costruito a runtime, coerente con lo stile già in uso in questo progetto
-- (nessuna funzione SQL generica/parametrica su nomi di colonna in nessuna
-- delle 59 migration precedenti).
create or replace function public.admin_imposta_accesso_gratuito(p_artigiano_id uuid, p_valore boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from artigiano art where art.id = auth.uid() and art.is_admin = true) then
    raise exception 'Accesso negato';
  end if;

  update artigiano set accesso_gratuito = p_valore where id = p_artigiano_id;
end;
$$;

revoke execute on function public.admin_imposta_accesso_gratuito(uuid, boolean) from public;
revoke execute on function public.admin_imposta_accesso_gratuito(uuid, boolean) from anon;
grant execute on function public.admin_imposta_accesso_gratuito(uuid, boolean) to authenticated;
