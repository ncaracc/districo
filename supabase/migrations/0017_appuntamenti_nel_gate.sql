-- =============================================================
-- Cambio di regola: gli Appuntamenti (briefing, verifica_misure,
-- montaggio) NON sono più esclusi dal calcolo dei satelliti bloccanti.
-- Motivazione: se un appuntamento necessario non viene fatto, il
-- lavoro non può avanzare — devono contare come qualsiasi altro
-- satellite. Sostituisce la decisione precedente (Sprint 3/A) che li
-- escludeva sempre da gate e conteggi.
--
-- Un appuntamento è "verde" se concluso=true OPPURE non_necessario=true
-- (stesso trattamento binario già in uso per noleggio: rosso/verde,
-- nessuno stato intermedio "giallo" — il campo `stato` per gli
-- appuntamenti è sempre NULL, vincolato dal check della 0012).
--
-- NON tocca "Segna lavoro accettato/rifiutato": quella transizione
-- resta senza vincoli di gate, come deciso in precedenza. Il cambio
-- riguarda solo il conteggio dashboard e il gate che condiziona "Segna
-- lavoro completato".
-- =============================================================

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
        (ls.tipo in ('preventivo', 'progetto') and ls.stato not in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato not in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato <> 'ricevuto')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato <> 'completato')
        or (ls.tipo = 'costruzione' and ls.stato <> 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.non_necessario, false) is not true and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true and coalesce(ls.non_necessario, false) is not true)
      )
  );
$$;

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
      -- non più "ls.tipo <> 'appuntamento' and ...": gli appuntamenti ora
      -- contano come qualunque altro satellite ai fini del conteggio.
      not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id) as rilevante,
      ( (ls.tipo in ('preventivo', 'progetto') and ls.stato = 'in_preparazione')
        or (ls.tipo = 'campione' and ls.stato = 'in_preparazione')
        or (ls.tipo = 'acquisti' and ls.stato = 'da_acquistare')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato = 'da_ordinare')
        or (ls.tipo = 'costruzione' and ls.stato = 'da_iniziare')
        or (ls.tipo = 'noleggio' and coalesce(ls.non_necessario, false) is not true and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true and coalesce(ls.non_necessario, false) is not true)
      ) as rosso,
      ( (ls.tipo in ('preventivo', 'progetto') and ls.stato in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato = 'ricevuto')
        or (ls.tipo = 'lavorazione_esterna' and ls.stato = 'completato')
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and (coalesce(ls.non_necessario, false) or coalesce(ls.prenotazione_effettuata, false)))
        or (ls.tipo = 'appuntamento' and (coalesce(ls.concluso, false) or coalesce(ls.non_necessario, false)))
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
