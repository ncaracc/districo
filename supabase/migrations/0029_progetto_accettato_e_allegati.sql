-- =============================================================
-- Sprint C (documenti) 2026-08-02 — punto 1: Progetto passa a un flag
-- booleano "accettato" + semaforo derivato dagli allegati caricati, al
-- posto del vecchio modello a 5 stati testuali condiviso con Campione
-- (vedi CLAUDE.md, sezione dedicata).
--
-- Il vecchio campo `stato` NON viene rimosso (condiviso con Campione, che
-- lo usa ancora regolarmente) — smette solo di essere letto/scritto per
-- tipo='progetto', stesso principio già seguito per il Preventivo il 1/8.
-- =============================================================
alter table lavoro_satellite add column progetto_accettato boolean not null default false;

-- Migrazione dei 9 record esistenti (verificati in Fase 0, nessuna
-- riga con revisione_di non nullo per tipo='progetto' — nessuna catena da
-- gestire, ogni Lavoro ha al più un progetto): solo stato='accettato' (2
-- righe) diventa progetto_accettato=true. Le altre 7 (presentato/
-- in_preparazione/non_necessario) restano false per esplicita richiesta
-- dell'utente — comprese le 3 righe 'non_necessario', che nel vecchio
-- modello erano uno stato verde/gate-passing: dopo questa migrazione quei
-- 3 Lavori (se ancora aperti, non completato/rifiutato) richiederanno
-- un'accettazione esplicita per non bloccare più "Segna lavoro completato".
update lavoro_satellite set progetto_accettato = true
where tipo = 'progetto' and stato = 'accettato';

-- =============================================================
-- Trigger data_ultimo_cambio_stato: esteso a progetto_accettato, stesso
-- principio già seguito quando il Preventivo è passato al modello a due
-- flag (0022: preventivo_accettato/preventivo_rifiutato aggiunti allo
-- stesso trigger) — altrimenti il punteggio di urgenza per un Progetto
-- rimasto rosso/giallo si congelerebbe alla data di creazione della riga,
-- mai più aggiornato da nessun evento.
-- =============================================================
create or replace function public.set_satellite_data_ultimo_cambio_stato()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.stato is distinct from old.stato
     or new.concluso is distinct from old.concluso
     or new.prenotazione_effettuata is distinct from old.prenotazione_effettuata
     or new.preventivo_accettato is distinct from old.preventivo_accettato
     or new.preventivo_rifiutato is distinct from old.preventivo_rifiutato
     or new.progetto_accettato is distinct from old.progetto_accettato then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- =============================================================
-- Gate "pronto per il montaggio": condizione Progetto aggiornata a
-- progetto_accettato (era ls.stato not in ('accettato', 'non_necessario')).
-- Nessun equivalente "non necessario" nel nuovo modello — solo
-- progetto_accettato=true fa passare il gate, come richiesto esplicitamente.
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
        (ls.tipo = 'preventivo' and not ls.preventivo_accettato)
        or (ls.tipo = 'progetto' and not coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and ls.stato not in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato <> 'ricevuto')
        or (ls.tipo = 'costruzione' and ls.stato <> 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
      )
  );
$$;

-- =============================================================
-- Dashboard: stessa priorità del semaforo Preventivo (accettato prima di
-- tutto) — rosso solo se non accettato E nessun allegato caricato, verde
-- se accettato (indipendentemente dagli allegati), giallo implicito
-- (allegati presenti, non ancora accettato). Nessuna colonna nuova nel
-- return type: create or replace è sufficiente, non serve DROP.
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
      ( (ls.tipo = 'progetto' and coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and ls.stato in ('approvato', 'non_necessario'))
        or (ls.tipo = 'acquisti' and ls.stato = 'ricevuto')
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
