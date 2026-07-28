-- =============================================================
-- Fix colonna "Valore" della Dashboard: lavori_dashboard() (0018) mostrava
-- "-" per un Preventivo con valore_complessivo impostato ma stato =
-- 'non_necessario' (es. l'artigiano inserisce comunque una stima pur
-- segnando che non serve un preventivo formale) — il join laterale
-- dedicato filtrava solo stato = 'accettato', l'altro stato "verde"
-- possibile per un Preventivo. Migration separata (non riaperta la 0018,
-- già applicata su Supabase Cloud) — stesso principio già seguito per la
-- 0013/0011 e la 0017. Verificato con una riproduzione minima (Postgres
-- locale, schema ridotto, corpo esatto della funzione) che il valore
-- tornasse null prima del fix e corretto dopo. CREATE OR REPLACE
-- sufficiente qui (nessun cambio all'elenco delle colonne di ritorno).
-- =============================================================

create or replace function public.lavori_dashboard()
returns table (
  id                          uuid,
  titolo                      text,
  stato                       text,
  cliente_id                  uuid,
  created_at                  timestamptz,
  punteggio_urgenza           numeric,
  satelliti_rossi             integer,
  satelliti_gialli            integer,
  satelliti_verdi             integer,
  valore_preventivo_accettato numeric
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
    count(*) filter (where s.rilevante and s.verde)::integer                     as satelliti_verdi,
    pv.valore_complessivo as valore_preventivo_accettato
  from lavoro l
  join lavoro_artigiani la
    on la.lavoro_id    = l.id
   and la.artigiano_id = auth.uid()
   and la.stato        = 'accettato'
  left join lateral (
    select
      ls.data_ultimo_cambio_stato,
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
  left join lateral (
    select ls2.valore_complessivo
    from lavoro_satellite ls2
    where ls2.lavoro_id = l.id
      and ls2.tipo = 'preventivo'
      -- FIX: includere anche 'non_necessario', l'altro stato "verde" per un
      -- Preventivo (vedi commento in cima al file). Nessuna esclusione
      -- esplicita delle revisioni superate necessaria: una riga superata ha
      -- sempre stato='necessaria_revisione' (l'unica transizione che genera
      -- una nuova revisione via revisione_di), quindi non può mai comparire
      -- qui — order by data_creazione desc resta comunque il tie-break.
      and ls2.stato in ('accettato', 'non_necessario')
    order by ls2.data_creazione desc
    limit 1
  ) pv on true
  where l.stato in ('opportunita', 'accettato')
  group by l.id, l.titolo, l.stato, l.cliente_id, l.created_at, pv.valore_complessivo
  order by punteggio_urgenza desc, l.created_at desc;
$$;

revoke execute on function public.lavori_dashboard() from public;
revoke execute on function public.lavori_dashboard() from anon;
grant execute on function public.lavori_dashboard() to authenticated;
