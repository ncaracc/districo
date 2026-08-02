-- =============================================================
-- Fix 2026-08-02: la colonna "Valore" della Dashboard (lavori_dashboard(),
-- colonna valore_preventivo_accettato) mostrava l'importo del Preventivo
-- SOLO quando preventivo_accettato=true — segnalato dall'utente come un
-- comportamento sbagliato: l'importo inserito va sempre mantenuto/mostrato,
-- indipendentemente da accettato/rifiutato/in attesa (incluso il caso di
-- "annullamento" introdotto dal fix precedente, che riporta lavoro.stato a
-- 'opportunita' senza mai toccare valore_complessivo — il dato non era mai
-- stato perso a DB, spariva solo dalla colonna Dashboard).
--
-- Il filtro passa da "preventivo_accettato = true" allo stesso criterio
-- "rilevante" già usato nel join laterale principale della funzione (riga
-- corrente di un'eventuale catena storica pre-1/8, non superata da una
-- revisione più recente) — necessario perché il Preventivo, prima della
-- revisione satelliti dell'1/8, poteva avere più righe collegate da
-- revisione_di: senza questo filtro un Lavoro con una vecchia catena
-- mostrerebbe potenzialmente il valore di una riga superata invece di
-- quella corrente.
--
-- Nome colonna "valore_preventivo_accettato" mantenuto invariato (nessuna
-- rinomina): cambiare nome avrebbe richiesto un DROP FUNCTION più il touch
-- di lib/types/database.types.ts e app/(app)/lavori/page.tsx per un solo
-- cambio di etichetta interna, senza alcun beneficio per l'utente — stesso
-- principio già seguito altrove in questo progetto per colonne il cui
-- significato è scivolato leggermente (es. acquisto_categoria,
-- colore_finitura) senza rinominarle.
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
      ( (
          ls.tipo = 'progetto' and not coalesce(ls.progetto_accettato, false)
          and not exists (select 1 from lavoro_satellite_allegato a where a.satellite_id = ls.id)
        )
        or (ls.tipo = 'campione' and (ls.descrizione is null or btrim(ls.descrizione) = ''))
        or (
          ls.tipo = 'acquisti'
          and not exists (select 1 from lavoro_satellite_articolo a where a.satellite_id = ls.id)
        )
        or (ls.tipo = 'costruzione' and ls.stato = 'da_iniziare')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (
          ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
          and (ls.data_appuntamento is null or ls.data_appuntamento < now())
        )
        or (ls.tipo = 'preventivo' and not ls.preventivo_accettato and (ls.preventivo_rifiutato or ls.valore_complessivo is null))
      ) as rosso,
      ( (ls.tipo = 'progetto' and coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and coalesce(ls.campione_consegnato, false))
        or (
          ls.tipo = 'acquisti'
          and ls.stato in ('acquistato', 'ricevuto')
          and exists (select 1 from lavoro_satellite_articolo a where a.satellite_id = ls.id)
        )
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
      ) as verde,
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
      and not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls2.id)
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
