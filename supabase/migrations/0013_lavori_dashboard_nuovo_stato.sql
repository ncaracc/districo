-- =============================================================
-- Gap trovato in fase di Sprint B: lavori_dashboard() (0011) filtrava
-- "where l.stato <> 'chiuso'" — valore che la 0012 (revisione 2026-07-25
-- del ciclo di vita Lavoro) ha sostituito con
-- opportunita/accettato/rifiutato/completato. Da quel momento il filtro
-- non escludeva più nessun lavoro (nessuna riga ha mai stato='chiuso'),
-- quindi anche i lavori 'completato' sarebbero rimasti in dashboard
-- per sempre. Corretto qui invece di riaprire la 0012 (già committata,
-- stesso principio già seguito per la 0009/0010): allow-list esplicita
-- sui due stati "attivi" (opportunita, accettato) — un lavoro
-- 'rifiutato' è altrettanto terminale di 'completato' e non ha più
-- bisogno di comparire nella dashboard operativa.
--
-- Trovato anche un secondo problema nella stessa funzione, già presente
-- (mai toccato) dopo la 0012: la classificazione rosso/verde per il
-- punteggio di urgenza referenziava ancora acquisto_materiale/
-- acquisto_ferramenta (accorpati in "acquisti" dalla 0012) e gli stati
-- vecchi di lavorazione_esterna, e non copriva affatto campione/
-- costruzione/noleggio — questi ultimi tre restavano sempre "non rossi
-- e non verdi", quindi sempre contati con peso 0.5 nel punteggio a
-- prescindere dal loro stato reale (anche se già verdi). Corretto nello
-- stesso giro: aggiunta la classificazione per tutti i tipi del nuovo
-- modello, incluso noleggio (che non usa `stato` ma prenotazione_
-- effettuata/non_necessario).
-- =============================================================
create or replace function public.lavori_dashboard()
returns table (
  id                 uuid,
  titolo             text,
  stato              text,
  cliente_id         uuid,
  created_at         timestamptz,
  punteggio_urgenza  numeric,
  satelliti_rossi    integer,
  satelliti_gialli   integer,
  satelliti_verdi    integer
)
language sql
stable
set search_path = public
as $$
  select
    l.id,
    l.titolo,
    l.stato,
    l.cliente_id,
    l.created_at,
    coalesce(sum(
      case when s.rilevante and not s.verde
        then extract(epoch from (now() - s.data_ultimo_cambio_stato)) / 86400.0
             * case when s.rosso then 1.0 else 0.5 end
        else 0
      end
    ), 0) as punteggio_urgenza,
    count(*) filter (where s.rilevante and s.rosso)::integer                    as satelliti_rossi,
    count(*) filter (where s.rilevante and not s.rosso and not s.verde)::integer as satelliti_gialli,
    count(*) filter (where s.rilevante and s.verde)::integer                     as satelliti_verdi
  from lavoro l
  join lavoro_artigiani la
    on la.lavoro_id    = l.id
   and la.artigiano_id = auth.uid()
   and la.stato        = 'accettato'
  left join lateral (
    select
      ls.data_ultimo_cambio_stato,
      (ls.tipo <> 'appuntamento'
        and not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id)
      ) as rilevante,
      ( (ls.tipo in ('preventivo', 'progetto') and ls.stato = 'in_preparazione')
        or (ls.tipo = 'campione' and ls.stato = 'in_preparazione')
        or (ls.tipo = 'acquisti' and ls.stato = 'da_acquistare')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato = 'da_ordinare')
        or (ls.tipo = 'costruzione' and ls.stato = 'da_iniziare')
        or (ls.tipo = 'noleggio' and coalesce(ls.non_necessario, false) is not true and coalesce(ls.prenotazione_effettuata, false) is not true)
      ) as rosso,
      ( (ls.tipo in ('preventivo', 'progetto') and ls.stato in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato = 'ricevuto')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato = 'completato')
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and (coalesce(ls.non_necessario, false) or coalesce(ls.prenotazione_effettuata, false)))
      ) as verde
    from lavoro_satellite ls
    where ls.lavoro_id = l.id
  ) s on true
  where l.stato in ('opportunita', 'accettato')
  group by l.id, l.titolo, l.stato, l.cliente_id, l.created_at
  order by punteggio_urgenza desc, l.created_at desc;
$$;

revoke execute on function public.lavori_dashboard() from public;
revoke execute on function public.lavori_dashboard() from anon;
grant execute on function public.lavori_dashboard() to authenticated;
