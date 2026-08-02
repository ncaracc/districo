-- =============================================================
-- Sprint D (produzione) 2026-08-02 — punto 1: Campionatura diventa un
-- modello a istanze indipendenti, non più un gruppo di revisioni per
-- "serie" (vedi CLAUDE.md, sezione dedicata, per la decisione completa —
-- presa in una sessione precedente ma non ancora formalizzata qui).
--
-- Ogni riga tipo='campione' è ora autosufficiente: descrizione (colonna
-- già esistente), data_creazione (già esistente, automatica), un flag
-- campione_consegnato e la relativa campione_data_consegna. Se una
-- campionatura "non va bene" si crea una nuova istanza scollegata, non
-- una revisione — revisione_di NON viene più popolato per nuove righe
-- campione (resta nello schema, condiviso con lo storico Preventivo
-- pre-1/8, che lo legge ancora in lettura per mostrare eventuali catene
-- storiche).
--
-- Nessuna migrazione delle 8 righe storiche esistenti su serie/stato/
-- revisione_di — restano esattamente come sono, come richiesto
-- esplicitamente. L'UNICA eccezione è il backfill di campione_consegnato
-- più sotto, necessario perché il gate/dashboard SQL non può distinguere
-- "riga storica sul vecchio modello" da "nuova istanza indipendente":
-- senza backfill, le righe storiche già verdi (stato in
-- ('approvato','non_necessario')) diventerebbero bloccanti dall'oggi al
-- domani sotto la nuova logica — inclusa una riga 'non_necessario' su un
-- Lavoro reale con stato='accettato', oggi aperto. Decisione confermata
-- esplicitamente con l'utente prima di scrivere questa migration.
-- =============================================================

alter table lavoro_satellite add column campione_consegnato boolean not null default false;
alter table lavoro_satellite add column campione_data_consegna timestamptz;

-- Backfill di sola preservazione del comportamento attuale (vedi nota sopra):
-- non tocca stato/serie/revisione_di, solo la nuova colonna.
update lavoro_satellite
set campione_consegnato = true,
    campione_data_consegna = data_ultimo_cambio_stato
where tipo = 'campione' and stato in ('approvato', 'non_necessario');

-- Serie non è più richiesta per i nuovi record campione (non si scrive più
-- per questo tipo) — colonna lasciata in schema per compatibilità con i
-- dati storici, solo il vincolo NOT-NULL-equivalente viene rimosso.
alter table lavoro_satellite drop constraint lavoro_satellite_campione_serie_check;

-- Traccia i cambi anche sul nuovo flag, altrimenti il punteggio di urgenza
-- di una Campionatura rimasta gialla si congelerebbe alla creazione della
-- riga (stesso principio già seguito per preventivo_accettato/rifiutato e
-- progetto_accettato nelle migration 0022/0029).
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
     or new.progetto_accettato is distinct from old.progetto_accettato
     or new.campione_consegnato is distinct from old.campione_consegnato then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- Gate "pronto per il montaggio": condizione Campione aggiornata a
-- campione_consegnato (era ls.stato not in ('approvato', 'non_necessario')).
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
        or (ls.tipo = 'acquisti' and ls.stato <> 'ricevuto')
        or (ls.tipo = 'costruzione' and ls.stato <> 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
      )
  );
$$;

-- Dashboard: rosso finché manca la descrizione, verde quando consegnato=true
-- (indipendentemente dalla descrizione, stessa priorità già usata per
-- preventivo_accettato/progetto_accettato), giallo implicito (descrizione
-- presente, non ancora consegnato). Nessuna colonna nuova nel return type:
-- create or replace è sufficiente, non serve DROP.
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
        or (ls.tipo = 'campione' and coalesce(ls.campione_consegnato, false))
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
