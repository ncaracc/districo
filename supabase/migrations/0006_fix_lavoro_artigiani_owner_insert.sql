-- =============================================================
-- Fix RLS: bootstrap della riga owner in lavoro_artigiani alla
-- creazione di un nuovo Lavoro.
--
-- La policy "lavoro_artigiani: inserimento solo owner" (0001) usa
-- `is_owner_del_lavoro(lavoro_id)`, che verifica l'esistenza di una
-- riga lavoro_artigiani con ruolo='owner' e stato='accettato' per
-- quel lavoro_id. Per il primissimo insert (quello che crea proprio
-- quella riga) questa condizione non può mai essere vera: nessuno
-- potrebbe mai creare la riga owner iniziale di un lavoro nuovo
-- tramite un insert autenticato normale.
--
-- Fix: la policy resta valida per il caso già coperto (un owner già
-- stabilito che invita un secondo artigiano) e in aggiunta permette
-- l'insert quando si sta creando la PROPRIA riga owner per un lavoro
-- il cui cliente si possiede.
--
-- Prima versione di questo fix (mai deployata) verificava il
-- possesso del cliente con un EXISTS diretto su lavoro/cliente
-- dentro il WITH CHECK — ma essendo una policy normale (non
-- SECURITY DEFINER), quella sotto-query resta soggetta alla RLS
-- delle tabelle referenziate: la SELECT su `lavoro` è a sua volta
-- filtrata da is_artigiano_del_lavoro(id), che dipende da
-- lavoro_artigiani — la stessa riga che si sta cercando di creare.
-- Stessa circolarità che il fix doveva risolvere, un livello più in
-- basso. Da qui la necessità di una funzione helper SECURITY
-- DEFINER dedicata (bypassa la RLS internamente, come già fanno
-- is_owner_del_lavoro/is_artigiano_del_lavoro).
-- =============================================================

create or replace function public.possiede_cliente_del_lavoro(p_lavoro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from lavoro l
    join cliente c on c.id = l.cliente_id
    where l.id = p_lavoro_id
      and c.artigiano_id = auth.uid()
  );
$$;

revoke execute on function public.possiede_cliente_del_lavoro(uuid) from public;
grant  execute on function public.possiede_cliente_del_lavoro(uuid) to authenticated;

drop policy if exists "lavoro_artigiani: inserimento solo owner" on lavoro_artigiani;

create policy "lavoro_artigiani: inserimento solo owner"
  on lavoro_artigiani for insert
  with check (
    is_owner_del_lavoro(lavoro_id)
    or (
      ruolo = 'owner'
      and stato = 'accettato'
      and artigiano_id = auth.uid()
      and possiede_cliente_del_lavoro(lavoro_id)
    )
  );
