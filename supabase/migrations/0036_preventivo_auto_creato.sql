-- =============================================================
-- Preventivo torna a essere creato automaticamente, insieme al Briefing
-- (vedi CLAUDE.md): risolve alla radice il caso limite "Lavoro senza
-- Preventivo" (lavoro.stato dipende esclusivamente dai flag
-- preventivo_accettato/preventivo_rifiutato dal 2/8 — se il Preventivo non
-- esiste, quella logica semplicemente non ha nulla su cui applicarsi).
-- Preventivo qui è inteso come "stima del valore del lavoro", non
-- necessariamente il documento formale — resta comunque un'attività
-- normale, modificabile/eliminabile come tutte le altre.
--
-- Nessuna migrazione dati: solo forward-looking, riguarda esclusivamente i
-- Lavori creati da ora in poi (stesso principio già seguito dalla 0023, che
-- ridusse la creazione automatica al solo Briefing) — verificato con
-- l'utente che i 9 Lavori reali esistenti hanno già tutti un Preventivo
-- (l'unico che ne era privo è stato aggiunto manualmente prima di questa
-- migration), nessun backfill necessario.
-- =============================================================

create or replace function public.crea_satelliti_iniziali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into lavoro_satellite (lavoro_id, tipo, tipo_appuntamento, concluso)
    values (new.id, 'appuntamento', 'briefing', false);

  insert into lavoro_satellite (lavoro_id, tipo)
    values (new.id, 'preventivo');

  return new;
end;
$$;
