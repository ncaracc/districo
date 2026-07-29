-- =============================================================
-- Sede preferita per Fornitore_Sede
--
-- La stragrande maggioranza dei fornitori ha una sola sede; solo
-- pochi (es. Ferexpert) ne hanno diverse. Il flag `sede_preferita`
-- permette di marcare quale sede mostrare di default nel dettaglio
-- Fornitore quando ce n'è più di una (vedi UI in
-- components/fornitore-sedi.tsx) — nessun effetto sul caso "una sola
-- sede", dove il flag resta semplicemente inutilizzato in UI.
--
-- Vincolo "al massimo una preferita per fornitore" garantito a
-- livello DB con un unique partial index (non solo in application
-- logic), stesso principio già seguito per le RLS in questo progetto.
-- =============================================================

alter table fornitore_sede
  add column sede_preferita boolean not null default false;

create unique index fornitore_sede_una_preferita_idx
  on fornitore_sede (fornitore_id)
  where sede_preferita = true;

-- =============================================================
-- imposta_sede_preferita — RPC che smarca l'eventuale sede preferita
-- precedente e marca la nuova, nella stessa chiamata (non due update
-- separati dal client, per evitare uno stato intermedio con due sedi
-- preferite o nessuna). Due UPDATE sequenziali dentro la stessa
-- funzione: il primo smarca sempre prima di marcare la nuova, quindi
-- il partial unique index sopra non viene mai violato a metà, a
-- differenza di un singolo UPDATE multi-riga (dove l'ordine di
-- valutazione dei vincoli per riga non è garantito).
--
-- SECURITY INVOKER (default): fornitore_sede ha già una RLS "for all"
-- per qualunque artigiano autenticato (dato condiviso, coerente col
-- resto delle tabelle Fornitore) — nessun bisogno di bypassarla.
-- =============================================================
create or replace function public.imposta_sede_preferita(p_fornitore_id uuid, p_sede_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  update fornitore_sede
  set sede_preferita = false
  where fornitore_id = p_fornitore_id
    and sede_preferita = true
    and id <> p_sede_id;

  update fornitore_sede
  set sede_preferita = true
  where id = p_sede_id
    and fornitore_id = p_fornitore_id;
end;
$$;

revoke execute on function public.imposta_sede_preferita(uuid, uuid) from public;
revoke execute on function public.imposta_sede_preferita(uuid, uuid) from anon;
grant execute on function public.imposta_sede_preferita(uuid, uuid) to authenticated;
