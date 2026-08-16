-- Sessione "riorganizzazione Profilo/Impostazioni + immagine profilo +
-- pulizia Obiettivi" (2026-08-19, vedi CLAUDE.md).

-- =============================================================
-- PARTE 1 — rimozione dei 4 campi "giorni" di Obiettivi, confermati
-- inerti nell'audit precedente (2026-08-19, "Inventario Impostazioni"):
-- nessuna query in tutto il codice li legge più da quando i 4 KPI storici
-- a target sono stati sostituiti (Sprint E, 2026-08-03) — solo la propria
-- form li leggeva/scriveva in un puro round-trip. Verificato su Supabase
-- Cloud prima di droppare, come da prassi: tutti e 3 gli artigiani reali
-- avevano ancora esattamente i valori di default (10/7/60/7) — nessuno li
-- ha mai personalizzati, nessun dato reale perso.
-- `kpi_finestra_mesi` NON tocca: unico campo del gruppo "Obiettivi"
-- ancora effettivamente letto da kpi_dashboard() (Tempo medio
-- preventivo/completamento) — resta a schema, guadagna una sotto-sezione
-- "Statistiche" a sé in Impostazioni (non più bundlato con i 4 campi
-- morti), vedi ImpostazioniTabs/ProfiloStatisticheForm.
-- =============================================================

alter table artigiano
  drop column target_preventivo_giorni,
  drop column target_progetto_giorni,
  drop column target_produzione_giorni,
  drop column target_montaggio_giorni;

-- =============================================================
-- PARTE 2 — chiusura del loop lasciato aperto dalla 0008: il commento di
-- quella migration diceva esplicitamente "una VALIDATE CONSTRAINT
-- successiva, una volta che la schermata Profilo permetterà di
-- completare il codice fiscale, potrà rendere il controllo retroattivo"
-- — questa è quella sessione. Verificato prima di validare: tutti i
-- 3 artigiani reali hanno partita_iva E codice_fiscale entrambi NULL
-- (nessuna violazione possibile, il vincolo è già soddisfatto banalmente
-- da "partita_iva is null"), quindi la validazione retroattiva è priva
-- di rischio.
-- =============================================================

alter table artigiano
  validate constraint artigiano_codice_fiscale_se_partita_iva;

-- =============================================================
-- PARTE 3 — sincronizzazione email: la nuova UI di Profilo permette di
-- cambiare l'email di login (tramite supabase.auth.updateUser(), che
-- innesca il flusso di conferma nativo di Supabase — invariato, non
-- reimplementato qui). Nessun trigger esisteva finora per UPDATE su
-- auth.users: il trigger post-signup (handle_new_artigiano, 0008) copre
-- solo l'INSERT iniziale. Senza questo secondo trigger, una volta
-- confermato il cambio email, auth.users.email (usata per il login)
-- e artigiano.email (usata come mittente/destinatario, es.
-- testaCredenzialiSmtp) andrebbero fuori sincrono silenziosamente.
-- `security definer` + search_path fisso, stesso pattern di
-- handle_new_artigiano — necessario perché la UPDATE su artigiano deve
-- riuscire indipendentemente da chi/cosa ha innescato il cambio email
-- (il completamento del flusso di conferma di Supabase Auth non passa
-- dalla sessione dell'utente).
create or replace function public.handle_email_artigiano_aggiornata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update artigiano set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_email_artigiano_aggiornata() from public;
revoke execute on function public.handle_email_artigiano_aggiornata() from authenticated;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update on auth.users
  for each row
  execute function public.handle_email_artigiano_aggiornata();

-- =============================================================
-- PARTE 4 — la nuova pagina Profilo permette di cambiare specializzazione,
-- non solo di impostarla in registrazione. Stesso comportamento del
-- trigger post-signup (registra un valore custom come suggerimento non
-- ufficiale, "on conflict do nothing") ma richiamato direttamente
-- dall'azione server (client autenticato normale, non security definer):
-- serve quindi una policy INSERT che finora non esisteva (solo la SELECT
-- "lettura pubblica specializzazioni" della 0001) — stesso identico
-- criterio di quella, dato che sono la stessa tabella di suggerimenti
-- condivisa e non sensibile.
-- =============================================================

create policy "inserimento specializzazioni da autenticati"
  on specializzazione for insert
  with check (auth.uid() is not null);
