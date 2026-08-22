-- =============================================================
-- 2026-08-22 — Forum beta tester (vedi CLAUDE.md): canale di messaggi a
-- thread tra artigiani beta tester e admin, community condivisa (non
-- privata a coppie). Due tabelle nuove, RLS come unica fonte di verità
-- sulle regole di accesso/scrittura — a differenza di `artigiano`
-- (dov'è deliberatamente vietato un accesso diretto più ampio per
-- l'admin, solo funzioni SECURITY DEFINER), qui l'admin è un
-- partecipante di prima classe della community, non un semplice
-- supervisore di dati altrui: le sue regole (vede/modera tutto, risponde
-- a qualunque post) sono espresse come normali policy RLS.
-- =============================================================

create table post_beta (
  id           uuid primary key default gen_random_uuid(),
  artigiano_id uuid not null references artigiano(id) on delete cascade,
  titolo       text not null,
  stato        text not null default 'aperto' check (stato in ('aperto', 'chiuso')),
  created_at   timestamptz not null default now(),
  chiuso_at    timestamptz,
  nascosto     boolean not null default false
);

create table messaggio_beta (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references post_beta(id) on delete cascade,
  autore_id  uuid not null references artigiano(id) on delete cascade,
  testo      text not null,
  created_at timestamptz not null default now(),
  nascosto   boolean not null default false
);

create index on post_beta (artigiano_id);
create index on post_beta (stato);
create index on messaggio_beta (post_id);
create index on messaggio_beta (autore_id);

alter table post_beta      enable row level security;
alter table messaggio_beta enable row level security;

-- ---- post_beta ----

-- SELECT: un beta tester vede tutti i post non nascosti (community
-- condivisa, non filtrata per autore) — l'admin vede TUTTO, inclusi i
-- post nascosti (moderazione: "resta visibile e gestibile dall'admin").
create policy "post_beta: beta tester vede i non nascosti, admin vede tutto"
  on post_beta for select
  using (
    exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true)
    or (
      nascosto = false
      and exists (select 1 from artigiano a where a.id = auth.uid() and a.beta_tester = true)
    )
  );

-- INSERT: solo un beta tester può aprire un nuovo post, come autore di se
-- stesso (nessun modo di postare a nome di un altro artigiano).
create policy "post_beta: solo beta tester apre un post proprio"
  on post_beta for insert
  with check (
    artigiano_id = auth.uid()
    and exists (select 1 from artigiano a where a.id = auth.uid() and a.beta_tester = true)
  );

-- UPDATE: solo l'admin (chiudi/riapri/nascondi) — nessun altro può mai
-- modificare un post_beta dopo la creazione (titolo incluso, non è mai
-- stato richiesto di poterlo editare).
create policy "post_beta: solo admin modifica (chiudi/riapri/nascondi)"
  on post_beta for update
  using (exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true))
  with check (exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true));

-- Nessuna policy DELETE: la moderazione è sempre soft-hide (`nascosto`),
-- mai una cancellazione fisica — coerente col principio richiesto
-- esplicitamente ("senza eliminarlo fisicamente dal DB, per mantenere
-- tracciabilità").

-- ---- messaggio_beta ----

-- SELECT: stessa logica di post_beta, con un livello in più — un
-- messaggio nascosto sparisce anche se il post che lo contiene è
-- visibile, e viceversa un post nascosto nasconde con sé tutti i suoi
-- messaggi anche se singolarmente non marcati. L'admin vede sempre tutto.
create policy "messaggio_beta: beta tester vede i non nascosti su post visibili, admin vede tutto"
  on messaggio_beta for select
  using (
    exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true)
    or (
      nascosto = false
      and exists (select 1 from artigiano a where a.id = auth.uid() and a.beta_tester = true)
      and exists (select 1 from post_beta p where p.id = post_id and p.nascosto = false)
    )
  );

-- INSERT: solo l'autore originale del post (follow-up sul proprio post)
-- oppure l'admin (risponde a QUALSIASI post) — e solo se il post è
-- ancora 'aperto'. Un post chiuso blocca la scrittura per chiunque,
-- admin incluso: va prima riaperto esplicitamente (azione separata),
-- niente scrittura diretta "attraverso" la chiusura.
create policy "messaggio_beta: autore del post o admin, solo su post aperti"
  on messaggio_beta for insert
  with check (
    autore_id = auth.uid()
    and exists (select 1 from post_beta p where p.id = post_id and p.stato = 'aperto')
    and (
      exists (select 1 from post_beta p where p.id = post_id and p.artigiano_id = auth.uid())
      or exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true)
    )
  );

-- UPDATE: solo l'admin (nascondi/mostra un singolo messaggio) — nessuna
-- modifica del testo, né da parte dell'autore né dell'admin (nessuna
-- funzionalità di editing richiesta, solo nascondi/mostra).
create policy "messaggio_beta: solo admin nasconde/mostra"
  on messaggio_beta for update
  using (exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true))
  with check (exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true));

-- =============================================================
-- Funzioni di scrittura composta — SECURITY INVOKER (default, nessun
-- `security definer`): non serve bypassare la RLS sopra, che già
-- concede a ciascun chiamante esattamente i diritti giusti — queste
-- funzioni esistono solo per l'atomicità (più INSERT/UPDATE in una sola
-- chiamata, un'unica transazione implicita: se una riga viola una
-- policy l'intera funzione fallisce e non lascia stato parziale, es. un
-- post creato senza il suo primo messaggio). Un chiamante senza i
-- diritti giusti fallisce comunque, per via della RLS sottostante — non
-- serve duplicare qui i controlli già espressi sopra come policy.
-- =============================================================

-- Crea un post con il suo primo messaggio (il "titolo" è solo l'oggetto,
-- il contenuto vero e proprio vive come messaggio #1 — stesso principio
-- di un thread forum classico).
create function public.beta_crea_post(p_titolo text, p_testo text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_post_id uuid;
begin
  insert into post_beta (artigiano_id, titolo) values (auth.uid(), p_titolo) returning id into v_post_id;
  insert into messaggio_beta (post_id, autore_id, testo) values (v_post_id, auth.uid(), p_testo);
  return v_post_id;
end;
$$;

revoke execute on function public.beta_crea_post(text, text) from public;
revoke execute on function public.beta_crea_post(text, text) from anon;
grant execute on function public.beta_crea_post(text, text) to authenticated;

-- "Chiudi con questa risposta": un'unica azione admin, non ogni risposta
-- chiude automaticamente. Il messaggio va inserito PRIMA di chiudere (il
-- post deve essere ancora 'aperto' perché l'INSERT rispetti la sua
-- stessa policy) — poi il post passa a 'chiuso'.
create function public.beta_chiudi_post_con_risposta(p_post_id uuid, p_testo text)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into messaggio_beta (post_id, autore_id, testo) values (p_post_id, auth.uid(), p_testo);
  update post_beta set stato = 'chiuso', chiuso_at = now() where id = p_post_id;
end;
$$;

revoke execute on function public.beta_chiudi_post_con_risposta(uuid, text) from public;
revoke execute on function public.beta_chiudi_post_con_risposta(uuid, text) from anon;
grant execute on function public.beta_chiudi_post_con_risposta(uuid, text) to authenticated;

-- =============================================================
-- Badge notifiche admin: conta i post APERTI e non nascosti il cui
-- ULTIMO messaggio visibile è stato scritto da un beta tester (non
-- dall'admin) — cioè l'admin non ha ancora risposto all'ultimo
-- intervento. `language sql stable`, non plpgsql: pura lettura, stesso
-- stile di `appuntamenti_scaduti_count()` (0027). SECURITY INVOKER: la
-- RLS sopra già filtra correttamente cosa un admin vede (tutto) — nessun
-- bypass necessario.
-- =============================================================
create function public.beta_notifiche_admin_count()
returns integer
language sql
stable
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

revoke execute on function public.beta_notifiche_admin_count() from public;
revoke execute on function public.beta_notifiche_admin_count() from anon;
grant execute on function public.beta_notifiche_admin_count() to authenticated;

-- =============================================================
-- Nomi autori per la UI (lista + dettaglio thread) — SECURITY DEFINER
-- necessario qui a differenza delle funzioni sopra: la RLS di
-- `artigiano` è "vede solo se stesso" (0001), quindi un beta tester non
-- potrebbe altrimenti leggere nome/cognome di un ALTRO beta tester per
-- mostrarli accanto ai suoi post/messaggi — un caso nuovo rispetto al
-- resto dell'app (dove ogni pagina è per costruzione sui propri dati).
-- Espone SOLO id/nome/cognome, mai l'intera riga artigiano (niente
-- email/telefono/dati Stripe) — stesso principio di minima esposizione
-- già seguito per i conteggi aggregati admin, qui applicato a un lookup
-- di nomi invece che a un numero. Limitata a chi ha già accesso al forum
-- (beta tester o admin), non un lookup generico "nome di un id
-- qualsiasi" disponibile a ogni utente autenticato.
-- =============================================================
create function public.beta_nomi_autori(p_ids uuid[])
returns table (id uuid, nome text, cognome text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from artigiano a
    where a.id = auth.uid() and (a.beta_tester = true or a.is_admin = true)
  ) then
    raise exception 'Accesso negato';
  end if;

  return query
    select a.id, a.nome, a.cognome
    from artigiano a
    where a.id = any(p_ids);
end;
$$;

revoke execute on function public.beta_nomi_autori(uuid[]) from public;
revoke execute on function public.beta_nomi_autori(uuid[]) from anon;
grant execute on function public.beta_nomi_autori(uuid[]) to authenticated;
