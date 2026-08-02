-- =============================================================
-- Sprint "fondamenta" 2026-08-02 (vedi CLAUDE.md): la creazione automatica
-- di un Lavoro si riduce al solo satellite Briefing. Progetto/Preventivo/
-- Campionatura (prima serie) non vengono più creati automaticamente:
-- l'artigiano li aggiunge manualmente da "Aggiungi attività" quando servono.
--
-- Nessuna migrazione dati: i Lavori esistenti mantengono i satelliti già
-- creati (anche se mai toccati) — questa modifica riguarda solo il trigger,
-- che si applica esclusivamente ai Lavori creati da ora in avanti.
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

  return new;
end;
$$;
