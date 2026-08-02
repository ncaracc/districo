-- =============================================================
-- 2026-08-02 — sprint "ux rifiniture", punto 1 (vedi CLAUDE.md, sezione
-- dedicata): icona di allerta sulla riga Lavoro in Dashboard quando quel
-- Lavoro ha almeno un appuntamento scaduto (data passata, mai concluso).
--
-- Riusa esattamente la stessa condizione già presente nel join laterale di
-- lavori_dashboard() (rosso per tipo='appuntamento') e nella RPC
-- appuntamenti_scaduti_count() (0027) — non una query separata: aggiunge
-- solo un flag booleano `scaduto` al join laterale esistente `s` (stessa
-- fonte dati, stesso predicato) e lo aggrega con bool_or() per Lavoro.
--
-- DROP necessario (non solo CREATE OR REPLACE): si aggiunge una colonna al
-- return type della funzione, che CREATE OR REPLACE non permette di
-- cambiare (Postgres 42P13), stesso limite già incontrato per la colonna
-- "Valore" nella 0018.
-- =============================================================
drop function if exists public.lavori_dashboard();

create function public.lavori_dashboard()
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
  valore_preventivo_accettato numeric,
  ha_appuntamento_scaduto     boolean
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
    pv.valore_complessivo as valore_preventivo_accettato,
    coalesce(bool_or(s.scaduto), false) as ha_appuntamento_scaduto
  from lavoro l
  join lavoro_artigiani la
    on la.lavoro_id    = l.id
   and la.artigiano_id = auth.uid()
   and la.stato        = 'accettato'
  left join lateral (
    select
      ls.data_ultimo_cambio_stato,
      not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id) as rilevante,
      ( (ls.tipo = 'progetto' and ls.stato = 'in_preparazione')
        or (ls.tipo = 'campione' and ls.stato = 'in_preparazione')
        or (ls.tipo = 'acquisti' and ls.stato = 'da_acquistare')
        or (ls.tipo = 'costruzione' and ls.stato = 'da_iniziare')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (
          ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
          and (ls.data_appuntamento is null or ls.data_appuntamento < now())
        )
        or (ls.tipo = 'preventivo' and not ls.preventivo_accettato and (ls.preventivo_rifiutato or ls.valore_complessivo is null))
      ) as rosso,
      ( (ls.tipo = 'progetto' and ls.stato in ('accettato', 'non_necessario'))
        or (ls.tipo = 'campione' and ls.stato in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato = 'ricevuto')
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
      ) as verde,
      -- Stesso predicato di appuntamenti_scaduti_count() (0027): scaduto =
      -- data impostata, nel passato, mai concluso. "Mai fissato"
      -- (data_appuntamento is null, comunque rosso) non è "scaduto".
      (
        ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
        and ls.data_appuntamento is not null and ls.data_appuntamento < now()
      ) as scaduto
    from lavoro_satellite ls
    where ls.lavoro_id = l.id
  ) s on true
  left join lateral (
    select ls2.valore_complessivo
    from lavoro_satellite ls2
    where ls2.lavoro_id = l.id
      and ls2.tipo = 'preventivo'
      and ls2.preventivo_accettato = true
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
