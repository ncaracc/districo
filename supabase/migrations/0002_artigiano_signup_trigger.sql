-- =============================================================
-- Trigger post-signup: crea automaticamente la riga artigiano
-- a partire dai metadati passati a supabase.auth.signUp({ options: { data } })
-- =============================================================

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
    specializzazione, telefono, email, via, civico, cap, localita
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
    new.raw_user_meta_data->>'localita'
  );

  return new;
end;
$$;

-- scatta solo per signup dal nostro form (metadata con anagrafica),
-- non per altri eventuali inserimenti in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  when (new.raw_user_meta_data ? 'nome')
  execute function public.handle_new_artigiano();
