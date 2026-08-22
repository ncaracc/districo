-- =============================================================
-- 2026-08-22 — Statistiche aggregate admin (/admin/dashboard, vedi
-- CLAUDE.md). Un'unica funzione SQL SECURITY DEFINER che ritorna tutti i
-- numeri in una sola chiamata (una riga, molte colonne) invece di 6 query
-- separate dal client — stesso pattern di `admin_lista_artigiani()`
-- (0058/0059/0060), verifica `is_admin` internamente, RLS su `artigiano`/
-- `lavoro` resta invariata (nessun accesso diretto più ampio).
--
-- SOLO conteggi aggregati, come richiesto esplicitamente: nessuna riga
-- restituita contiene un id, un nome, un titolo o qualunque altro dato
-- riconducibile a un singolo Cliente/Fornitore/Lavoro/artigiano.
--
-- Lavori in 3 bucket, non 2 ("in corso" vs "completati" come richiesto):
-- `lavoro.stato` ha 4 valori reali (opportunita/accettato/rifiutato/
-- completato, vedi migration successive alla 0001 che l'hanno esteso) —
-- un lavoro rifiutato non è né "in corso" né "completato". Mostrare solo
-- 2 numeri li avrebbe fatti sommare a un totale sbagliato (fuorviante
-- accanto al conteggio "Lavori totali"); un terzo bucket "rifiutati"
-- risolve senza ambiguità, i tre numeri sommano esattamente al totale.
-- =============================================================
create function public.admin_statistiche_aggregate()
returns table (
  artigiani_totali integer,
  nuove_iscrizioni_7gg integer,
  lavori_totali integer,
  lavori_in_corso integer,
  lavori_completati integer,
  lavori_rifiutati integer,
  abbonamento_nessuno integer,
  abbonamento_trialing integer,
  abbonamento_active integer,
  abbonamento_past_due integer,
  abbonamento_canceled integer,
  beta_tester_attivi integer
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
    select
      (select count(*) from artigiano)::integer,
      (select count(*) from artigiano where created_at >= now() - interval '7 days')::integer,
      (select count(*) from lavoro)::integer,
      (select count(*) from lavoro where stato in ('opportunita', 'accettato'))::integer,
      (select count(*) from lavoro where stato = 'completato')::integer,
      (select count(*) from lavoro where stato = 'rifiutato')::integer,
      (select count(*) from artigiano where stato_abbonamento = 'nessuno')::integer,
      (select count(*) from artigiano where stato_abbonamento = 'trialing')::integer,
      (select count(*) from artigiano where stato_abbonamento = 'active')::integer,
      (select count(*) from artigiano where stato_abbonamento = 'past_due')::integer,
      (select count(*) from artigiano where stato_abbonamento = 'canceled')::integer,
      (select count(*) from artigiano where beta_tester = true)::integer;
end;
$$;

revoke execute on function public.admin_statistiche_aggregate() from public;
revoke execute on function public.admin_statistiche_aggregate() from anon;
grant execute on function public.admin_statistiche_aggregate() to authenticated;
