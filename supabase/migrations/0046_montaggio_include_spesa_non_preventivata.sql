-- Sessione di correzione — due fix dal Livello 2 dell'audit (2026-08,
-- docs/audit-2026-08.md). Punto 1: lavoro_pronto_per_montaggio() non
-- includeva 'spesa_non_preventivata' tra i tipi bloccanti — segnalato in
-- audit come ambiguo (a differenza di acconto/chiusura, la cui esclusione
-- è invece esplicitamente motivata e documentata), risolto oggi su
-- richiesta esplicita dell'utente: un'Attività non preventivata non ancora
-- accettata blocca ora il passaggio a Montaggio, stesso trattamento già
-- riservato ad Acquisti/Costruzione (una spesa imprevista non confermata è
-- un impegno economico di cui l'artigiano deve essere consapevole prima di
-- procedere). Acconto e Chiusura restano esclusi, invariato.
--
-- Verificato prima di scrivere questa migration: 0 righe reali con
-- tipo='spesa_non_preventivata' su Supabase Cloud (via REST/service role) —
-- nessun Lavoro esistente può essere impattato da questo cambio, nessuna
-- migrazione dati necessaria.
create or replace function public.lavoro_pronto_per_montaggio(p_lavoro_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select not exists (
    select 1
    from lavoro_satellite ls
    where ls.lavoro_id = p_lavoro_id
      and not exists (
        select 1 from lavoro_satellite piu_recente
        where piu_recente.revisione_di = ls.id
      )
      and (
        (ls.tipo = 'preventivo' and not ls.preventivo_accettato)
        or (ls.tipo = 'progetto' and not coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and not coalesce(ls.campione_consegnato, false))
        or (ls.tipo = 'acquisti' and not coalesce(ls.ordinato, false))
        or (ls.tipo = 'costruzione' and not coalesce(ls.concluso, false))
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
        or (ls.tipo = 'montaggio' and not coalesce(ls.concluso, false))
        or (ls.tipo = 'spesa_non_preventivata' and not coalesce(ls.spesa_accettata, false))
      )
  );
$$;
