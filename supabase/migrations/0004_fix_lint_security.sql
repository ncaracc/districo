-- =============================================================
-- Fix per gli avvisi del Database Linter di Supabase:
-- 1. search_path mutabile su 3 funzioni
-- 2. estensione pg_trgm installata in public
-- 3. policy RLS "lavoro: inserimento se si possiede il cliente"
--    con WITH CHECK (true) sul progetto live (il file 0001 in
--    questo repo riporta già la versione corretta: la divergenza
--    indica che sul DB live è stata applicata a mano una versione
--    diversa/precedente, mai riportata nei sorgenti — questa
--    migration la riafferma in modo idempotente, indipendentemente
--    da cosa sia effettivamente presente ora)
-- 4. funzioni SECURITY DEFINER chiamabili via RPC pubblica senza
--    restrizioni
-- =============================================================

-- -------------------------------------------------------------
-- 1) search_path esplicito sulle 3 funzioni SECURITY DEFINER
--    (stesso pattern già usato in handle_new_artigiano: `= public`,
--    non `= ''`, perché i corpi di queste funzioni referenziano
--    tabelle non qualificate che vivono tutte in public e non
--    chiamano altre funzioni — fully-qualificare ogni riferimento
--    con `= ''` avrebbe lo stesso effetto di sicurezza qui ma
--    richiederebbe riscrivere i corpi con rischio di refusi, a
--    fronte dello stesso beneficio)
-- -------------------------------------------------------------

alter function public.is_artigiano_del_lavoro(uuid) set search_path = public;
alter function public.is_owner_del_lavoro(uuid) set search_path = public;

-- ultimo_prezzo_articolo va oltre il solo search_path: la versione
-- attuale accetta p_artigiano_id come parametro passato dal
-- chiamante invece di derivarlo da auth.uid(), pur essendo
-- SECURITY DEFINER (quindi bypassa la RLS sulle tabelle che
-- interroga). Un utente autenticato qualsiasi potrebbe chiamarla
-- via RPC passando l'artigiano_id di un altro artigiano e leggere
-- i suoi prezzi storici d'acquisto — in contraddizione con la
-- decisione già presa in CLAUDE.md ("...con artigiano_id =
-- auth.uid()"). La firma cambia (rimosso p_artigiano_id), quindi
-- va prima droppata la versione a 2 argomenti: CREATE OR REPLACE
-- non sostituisce una funzione con firma diversa, ne crea un'altra
-- in overload, lasciando quella vulnerabile ancora chiamabile.
drop function if exists public.ultimo_prezzo_articolo(uuid, uuid);

create or replace function public.ultimo_prezzo_articolo(p_articolo_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select oar.prezzo_unitario
  from ordine_acquisto_riga oar
  join ordine_acquisto oa  on oa.id        = oar.ordine_id
  join lavoro l            on l.id         = oa.lavoro_id
  join lavoro_artigiani la on la.lavoro_id = l.id
  where oar.articolo_id  = p_articolo_id
    and la.artigiano_id  = auth.uid()
    and la.stato         = 'accettato'
  order by coalesce(oa.data_invio, oa.created_at) desc
  limit 1;
$$;

-- -------------------------------------------------------------
-- 2) pg_trgm fuori da public, in uno schema dedicato.
--    Relocation sicura: gli indici GIN già creati su
--    fornitore.ragione_sociale e articolo.descrizione referenziano
--    l'operator class per OID interno, non per nome — continuano a
--    funzionare senza rebuild. Su Supabase lo schema `extensions`
--    è già incluso di default nel search_path del database, quindi
--    query future con similarity()/% restano risolvibili senza
--    doverle fully-qualificare (ma è comunque buona norma preferire
--    extensions.similarity(...) esplicito in codice nuovo).
-- -------------------------------------------------------------

create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- -------------------------------------------------------------
-- 3) Corregge la policy INSERT su lavoro: deve verificare che il
--    cliente_id del nuovo Lavoro appartenga (tramite artigiano_id)
--    all'utente che sta facendo l'insert. Drop + create invece di
--    ALTER POLICY per riaffermarla in modo idempotente qualunque
--    sia la definizione attualmente live.
-- -------------------------------------------------------------

drop policy if exists "lavoro: inserimento se si possiede il cliente" on lavoro;

create policy "lavoro: inserimento se si possiede il cliente"
  on lavoro for insert
  with check (
    exists (
      select 1 from cliente
      where cliente.id           = lavoro.cliente_id
        and cliente.artigiano_id = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- 4) Restringe l'esecuzione via RPC pubblica delle funzioni
--    SECURITY DEFINER a chi ne ha effettivamente bisogno.
-- -------------------------------------------------------------

-- handle_new_artigiano: deve scattare solo dal trigger
-- on_auth_user_created. I trigger invocano la funzione a livello di
-- executor, non tramite una chiamata soggetta a controllo privilegi
-- del ruolo — revocare EXECUTE da public non rompe il trigger.
revoke execute on function public.handle_new_artigiano() from public;

-- is_artigiano_del_lavoro / is_owner_del_lavoro: usate come helper
-- dentro le policy RLS di più tabelle (lavoro, lavoro_artigiani,
-- attivita, lavoro_fasi, pagamento, allegato, ordine_acquisto,
-- ordine_acquisto_riga). Il ruolo che esegue la query (authenticated)
-- deve poter eseguire la funzione perché la valutazione della policy
-- avviene nel suo contesto di sessione: revocare EXECUTE da
-- authenticated romperebbe tutte quelle policy. Sono comunque scritte
-- in modo sicuro (derivano il confronto da auth.uid() internamente,
-- non da un parametro passato dal chiamante), quindi essere
-- chiamabili via RPC diretta da un utente autenticato non espone
-- nulla che quell'utente non sappia già (il risultato dipende solo
-- dalla sua identità). Restringiamo comunque anon, che non ha alcun
-- bisogno legittimo di chiamarle (nessuna policy le referenzia per
-- il ruolo anon, e tutte le pagine dell'app richiedono login).
revoke execute on function public.is_artigiano_del_lavoro(uuid) from public;
grant  execute on function public.is_artigiano_del_lavoro(uuid) to authenticated;

revoke execute on function public.is_owner_del_lavoro(uuid) from public;
grant  execute on function public.is_owner_del_lavoro(uuid) to authenticated;

-- ultimo_prezzo_articolo: dopo il fix sopra (usa auth.uid() invece
-- di un parametro passato dal chiamante), chiamarla via RPC diretta
-- da un utente autenticato è sicuro per lo stesso motivo delle due
-- funzioni precedenti. Stessa restrizione per anon.
revoke execute on function public.ultimo_prezzo_articolo(uuid) from public;
grant  execute on function public.ultimo_prezzo_articolo(uuid) to authenticated;

-- rls_auto_enable: non è presente in nessuna migration di questo
-- repo (probabilmente creata a mano nello SQL Editor durante il
-- setup iniziale delle tabelle, come utility per abilitare la RLS in
-- serie, e mai riportata nei sorgenti) — non conosciamo la sua firma
-- esatta. Il blocco sotto la trova dinamicamente via pg_proc e le
-- revoca EXECUTE da public/anon/authenticated qualunque sia la sua
-- firma; se la funzione non esiste (live), non fa nulla e non genera
-- errori.
do $$
declare
  r record;
begin
  for r in
    select p.oid, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  loop
    execute format(
      'revoke execute on function public.rls_auto_enable(%s) from public, anon, authenticated',
      r.args
    );
  end loop;
end $$;
