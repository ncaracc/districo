-- =============================================================
-- 2026-08-22 — Mini-sito beta: nuova colonna self-writable
-- (`richiesta_beta_at`), aggiunta PRIMA del fix sicurezza sotto perché
-- quel fix la include già nella lista dei campi concessi in GRANT — un
-- primo tentativo di questa migration con l'ordine invertito è fallito
-- con `42703 column "richiesta_beta_at" of relation "artigiano" does not
-- exist` (nessuna applicazione parziale, il batch si annulla per intero
-- in caso di errore — verificato empiricamente dopo il fallimento,
-- nessun self-update era rimasto bloccato).
-- =============================================================
alter table artigiano add column richiesta_beta_at timestamptz;

-- =============================================================
-- FIX SICUREZZA (vedi CLAUDE.md): la policy "artigiano aggiorna solo se
-- stesso" (0001) restringe la RIGA (`id = auth.uid()`) ma non ha mai
-- ristretto le COLONNE — nessun GRANT/REVOKE a livello di colonna è mai
-- stato scritto in nessuna migration precedente. Verificato
-- empiricamente (non ipotizzato) prima di questa migration: un artigiano
-- autenticato qualsiasi poteva auto-impostare `is_admin=true` con una
-- singola PATCH REST diretta sulla propria riga — stesso varco per
-- `beta_tester`, `accesso_gratuito`, `stato_abbonamento`, ecc. Scoperto
-- perché questa sessione doveva aggiungere un altro campo self-writable
-- (`richiesta_beta_at`) sullo stesso meccanismo generico.
--
-- Fix: privilegi UPDATE a livello di colonna (supportati nativamente da
-- Postgres, si combinano con la RLS esistente — la RLS resta invariata,
-- resta lei a decidere QUALE riga, i privilegi di colonna decidono QUALI
-- CAMPI). Lista dei campi scrivibili in self-service verificata contro
-- OGNI chiamata `.from('artigiano').update(...)` realmente presente nel
-- codice applicativo (grep mirato su tutto `app`/`components`/`lib`,
-- nessuna congettura) — tutto il resto (is_admin/beta_tester/
-- accesso_gratuito/stato_abbonamento/piano_abbonamento/trial_fine/email/
-- stripe_subscription_id/id/created_at) resta scrivibile SOLO da funzioni
-- SECURITY DEFINER già esistenti, dal trigger email, o dal client admin
-- (service role) del webhook Stripe — nessuno di questi tre percorsi
-- passa dal privilegio UPDATE della riga come `authenticated`, quindi
-- nessuno viene toccato da questa REVOKE.
-- =============================================================
revoke update on artigiano from authenticated;
revoke update on artigiano from anon;

grant update (
  nome, cognome, ragione_sociale, partita_iva, codice_fiscale, codice_sdi, pec,
  specializzazione, telefono,
  via, civico, cap, localita, provincia, paese,
  immagine_profilo,
  smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza,
  kpi_finestra_mesi,
  mail_ordine_apertura_formale, mail_ordine_congedo_formale,
  mail_ordine_apertura_informale, mail_ordine_congedo_informale,
  tariffa_oraria_costruzione, tariffa_oraria_montaggio,
  richiesta_beta_at
) on artigiano to authenticated;

-- `stripe_customer_id` era scritto direttamente dal client autenticato in
-- `avviaCheckout()` (lib/stripe/actions.ts) — con la REVOKE sopra
-- smetterebbe di funzionare. Spostato in una funzione dedicata invece di
-- reinserirlo nella lista sopra: è un identificativo verso un servizio di
-- pagamento esterno, più sensibile di una preferenza personale — una
-- funzione può imporre "solo se non già impostato" (`is null`),
-- impedendo anche a un client legittimo di sovrascriverlo una seconda
-- volta per errore o abuso.
create function public.imposta_stripe_customer_id(p_customer_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update artigiano
  set stripe_customer_id = p_customer_id
  where id = auth.uid() and stripe_customer_id is null;
end;
$$;

revoke execute on function public.imposta_stripe_customer_id(text) from public;
revoke execute on function public.imposta_stripe_customer_id(text) from anon;
grant execute on function public.imposta_stripe_customer_id(text) to authenticated;

-- =============================================================
-- Mini-sito beta tester (vedi CLAUDE.md — estende /beta a punto di
-- ingresso unico per TUTTI gli artigiani, non solo chi è già
-- beta_tester=true). `richiesta_beta_at` già aggiunta in testa al file.
-- =============================================================

-- Configurazione posti disponibili — tabella "singleton" (un solo valore
-- globale, non per-artigiano): PK su una colonna boolean forzata a
-- `true` via CHECK, pattern standard per garantire esattamente una riga.
create table configurazione_beta (
  id boolean primary key default true,
  posti_beta_totali integer not null default 10,
  constraint configurazione_beta_singola_riga check (id = true)
);
insert into configurazione_beta (posti_beta_totali) values (10);

alter table configurazione_beta enable row level security;

-- Solo admin legge/modifica il valore grezzo (per l'editor in
-- /admin/dashboard) — chiunque altro ottiene il numero già calcolato
-- tramite beta_posti_disponibili() sotto, mai la riga di configurazione
-- diretta.
create policy "configurazione_beta: solo admin legge"
  on configurazione_beta for select
  using (exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true));

create policy "configurazione_beta: solo admin modifica"
  on configurazione_beta for update
  using (exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true))
  with check (exists (select 1 from artigiano a where a.id = auth.uid() and a.is_admin = true));

-- Posti disponibili — SECURITY DEFINER: deve leggere sia
-- configurazione_beta (admin-only in RLS) sia contare TUTTI gli
-- artigiani con beta_tester=true (la RLS di artigiano è self-only, un
-- conteggio INVOKER vedrebbe solo la riga del chiamante — stesso bug
-- già corretto in 0063 per beta_notifiche_admin_count, qui evitato fin
-- da subito). Nessun controllo interno di ruolo: il numero è pensato
-- per essere visibile a QUALSIASI artigiano autenticato (è il testo
-- del mini-sito).
create function public.beta_posti_disponibili()
returns table (disponibili integer, totali integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    greatest(c.posti_beta_totali - (select count(*)::integer from artigiano where beta_tester = true), 0),
    c.posti_beta_totali
  from configurazione_beta c;
$$;

revoke execute on function public.beta_posti_disponibili() from public;
revoke execute on function public.beta_posti_disponibili() from anon;
grant execute on function public.beta_posti_disponibili() to authenticated;

-- admin_lista_artigiani() estesa con richiesta_beta_at (per mostrare in
-- /admin/utenti chi ha fatto richiesta) — stesso drop+create già
-- necessario in 0059/0060 quando cambia la shape di `returns table`,
-- con gli stessi GRANT/REVOKE riapplicati dopo (il drop li cancella).
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
  accesso_gratuito boolean,
  richiesta_beta_at timestamptz
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
           a.stato_abbonamento, a.piano_abbonamento, a.beta_tester, a.accesso_gratuito,
           a.richiesta_beta_at
    from artigiano a
    order by a.created_at desc;
end;
$$;

revoke execute on function public.admin_lista_artigiani() from public;
revoke execute on function public.admin_lista_artigiani() from anon;
grant execute on function public.admin_lista_artigiani() to authenticated;
