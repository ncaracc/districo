-- =============================================================
-- Registrazione ridotta a 7 campi: indirizzo completo, ragione sociale
-- e partita IVA vengono rimandati al completamento profilo (non più
-- raccolti in fase di signup). Nuovo campo codice_fiscale, obbligatorio
-- solo se è stata inserita la partita IVA (serve per poter fatturare).
-- =============================================================

-- localita era l'unico campo indirizzo NOT NULL (via/civico/cap erano
-- già nullable dalla 0001): non più raccolto in registrazione, quindi
-- va reso opzionale come il resto dell'indirizzo.
alter table artigiano
  alter column localita drop not null;

alter table artigiano
  add column codice_fiscale text;

-- NOT VALID: non rivalida le righe esistenti (potrebbero avere partita_iva
-- senza codice_fiscale, raccolto solo da questa migration in poi). Vale
-- comunque per ogni nuovo insert/update. Una VALIDATE CONSTRAINT successiva,
-- una volta che la schermata Profilo permetterà di completare il codice
-- fiscale, potrà rendere il controllo retroattivo.
alter table artigiano
  add constraint artigiano_codice_fiscale_se_partita_iva
  check (partita_iva is null or codice_fiscale is not null)
  not valid;

-- Aggiorna il trigger di post-signup: ragione_sociale/partita_iva/
-- codice_fiscale/indirizzo restano popolabili (usati dal flusso di invito,
-- che per ora continua a raccoglierli) ma non sono più inviati dalla
-- registrazione standard, quindi devono comportarsi bene anche assenti.
create or replace function public.handle_new_artigiano()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_specializzazione text := new.raw_user_meta_data->>'specializzazione';
begin
  -- specializzazione custom ("Altro..."): la registra come non ufficiale,
  -- da promuovere manualmente a voce del menu se ricorrente
  insert into specializzazione (valore, ufficiale)
  values (v_specializzazione, false)
  on conflict (valore) do nothing;

  insert into artigiano (
    id, nome, cognome, ragione_sociale, partita_iva, codice_fiscale,
    specializzazione, telefono, email, via, civico, cap, localita,
    provincia, paese
  ) values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'cognome',
    nullif(new.raw_user_meta_data->>'ragione_sociale', ''),
    nullif(new.raw_user_meta_data->>'partita_iva', ''),
    nullif(new.raw_user_meta_data->>'codice_fiscale', ''),
    v_specializzazione,
    new.raw_user_meta_data->>'telefono',
    new.email,
    nullif(new.raw_user_meta_data->>'via', ''),
    nullif(new.raw_user_meta_data->>'civico', ''),
    nullif(new.raw_user_meta_data->>'cap', ''),
    nullif(new.raw_user_meta_data->>'localita', ''),
    nullif(new.raw_user_meta_data->>'provincia', ''),
    coalesce(nullif(new.raw_user_meta_data->>'paese', ''), 'Italia')
  );

  return new;
end;
$$;
