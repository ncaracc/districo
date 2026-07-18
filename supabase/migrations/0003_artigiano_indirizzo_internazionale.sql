-- =============================================================
-- Indirizzo internazionalizzato per artigiano: provincia/stato/regione
-- (opzionale, label variabile per paese) + paese (tendina, default Italia)
-- =============================================================

alter table artigiano
  add column provincia text,
  add column paese     text not null default 'Italia';

-- Aggiorna il trigger di post-signup per includere i nuovi campi
-- (stessa funzione di 0002_artigiano_signup_trigger.sql, corpo esteso)
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
    id, nome, cognome, ragione_sociale, partita_iva,
    specializzazione, telefono, email, via, civico, cap, localita,
    provincia, paese
  ) values (
    new.id,
    new.raw_user_meta_data->>'nome',
    new.raw_user_meta_data->>'cognome',
    nullif(new.raw_user_meta_data->>'ragione_sociale', ''),
    nullif(new.raw_user_meta_data->>'partita_iva', ''),
    v_specializzazione,
    new.raw_user_meta_data->>'telefono',
    new.email,
    nullif(new.raw_user_meta_data->>'via', ''),
    nullif(new.raw_user_meta_data->>'civico', ''),
    nullif(new.raw_user_meta_data->>'cap', ''),
    new.raw_user_meta_data->>'localita',
    nullif(new.raw_user_meta_data->>'provincia', ''),
    coalesce(nullif(new.raw_user_meta_data->>'paese', ''), 'Italia')
  );

  return new;
end;
$$;
