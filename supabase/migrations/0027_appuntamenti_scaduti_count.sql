-- =============================================================
-- 2026-08-02 — badge "appuntamenti scaduti" nell'header (vedi CLAUDE.md,
-- sezione dedicata).
--
-- Riusa esattamente la condizione "rosso per data scaduta" già presente in
-- lavori_dashboard() (migration 0026, confronto per istante esatto —
-- data_appuntamento < now() — non più per sola data di calendario come nella
-- 0024, superata dal fix del 2/8), applicata qui a tutti i lavori
-- dell'artigiano invece che raggruppata per lavoro. Non conta il caso "data
-- mai fissata" (data_appuntamento is null): quello è comunque rosso nel
-- semaforo, ma non è "scaduto", è "mai fissato" — la richiesta di questo
-- sprint è esplicita solo sul primo caso.
--
-- Stesso filtro owner-o-ospite di lavori_dashboard() (join lavoro_artigiani
-- con stato='accettato', nessun filtro su ruolo — copre sia 'owner' sia
-- 'ospite'), e stesso filtro sullo stato del Lavoro
-- (opportunita/accettato) per restare coerente con l'insieme di Lavori
-- effettivamente visibili in Dashboard: un appuntamento scaduto su un
-- Lavoro completato/rifiutato non compare comunque nella pagina a cui il
-- badge rimanda, contarlo lo renderebbe fuorviante (il numero non
-- troverebbe corrispondenza in nessuna riga visibile).
-- =============================================================
create function public.appuntamenti_scaduti_count()
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer
  from lavoro_satellite ls
  join lavoro l
    on l.id = ls.lavoro_id
   and l.stato in ('opportunita', 'accettato')
  join lavoro_artigiani la
    on la.lavoro_id    = l.id
   and la.artigiano_id = auth.uid()
   and la.stato        = 'accettato'
  where ls.tipo = 'appuntamento'
    and coalesce(ls.concluso, false) is not true
    and ls.data_appuntamento is not null
    and ls.data_appuntamento < now();
$$;

revoke execute on function public.appuntamenti_scaduti_count() from public;
revoke execute on function public.appuntamenti_scaduti_count() from anon;
grant execute on function public.appuntamenti_scaduti_count() to authenticated;
