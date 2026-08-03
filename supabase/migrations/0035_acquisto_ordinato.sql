-- =============================================================
-- Semplificazione del modello di stato dell'attività Acquisto (vedi
-- CLAUDE.md): il vecchio stato a 3 valori testuali (da_acquistare/
-- acquistato/ricevuto, introdotto dalla 0012, colore derivato da esso
-- dalla 0031) è sostituito da un solo flag booleano `ordinato`,
-- impostato manualmente e MAI reversibile via UI (commit definitivo,
-- non un interruttore) — nessun concetto di "merce ricevuta" residuo.
--
-- Semaforo: rosso se manca fornitore o non c'è ancora nessuna referenza
-- (lavoro_satellite_articolo); giallo se entrambi presenti e
-- ordinato=false (tutto ancora modificabile); verde se ordinato=true
-- (fornitore/referenze/valore diventano di sola lettura, enforcement
-- lato server in aggiornaOrdine()/lib/lavori/satelliti.ts, stesso
-- principio già seguito per Lavoro completato — non irrigidito qui a
-- livello RLS, proporzionato: un solo flag su un solo tipo satellite,
-- non un gate trasversale a più tabelle).
-- =============================================================

alter table lavoro_satellite add column ordinato boolean not null default false;

alter table lavoro_satellite add constraint lavoro_satellite_ordinato_tipo_check
  check (tipo = 'acquisti' or ordinato = false);

-- Backfill di sola preservazione del comportamento verde/gate-passing già
-- in produzione (3 righe reali verificate prima di scrivere questa
-- migration): 'acquistato'/'ricevuto' erano entrambi "ordinato" secondo il
-- vecchio modello — non tocca stato/righe, solo la nuova colonna.
update lavoro_satellite
set ordinato = true
where tipo = 'acquisti' and stato in ('acquistato', 'ricevuto');

-- `stato` non è più letto/scritto dall'app per tipo='acquisti' (stesso
-- trattamento già riservato a 'preventivo' dalla 0022): il vincolo sui 3
-- valori testuali viene rimosso, la colonna resta in schema per le righe
-- storiche.
alter table lavoro_satellite drop constraint lavoro_satellite_tipo_stato_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_stato_check
  check (
    (tipo = 'appuntamento' and stato is null)
    or (tipo = 'preventivo')
    or (tipo = 'progetto'
      and stato in ('in_preparazione', 'presentato', 'necessaria_revisione', 'accettato', 'non_necessario'))
    or (tipo = 'campione'
      and stato in ('in_preparazione', 'consegnato', 'necessario_nuovo_campione', 'approvato', 'non_necessario'))
    or (tipo = 'acquisti')
    or (tipo = 'costruzione'
      and stato in ('da_iniziare', 'in_corso', 'completata'))
    or (tipo = 'noleggio' and stato is null)
  );

-- Traccia il cambio anche sul nuovo flag, altrimenti il punteggio di
-- urgenza di un Acquisto rimasto rosso/giallo si congelerebbe alla
-- creazione della riga (stesso principio già seguito per gli altri flag
-- booleani nelle migration 0022/0029/0030).
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
     or new.campione_consegnato is distinct from old.campione_consegnato
     or new.ordinato is distinct from old.ordinato then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- Gate "pronto per il montaggio": Acquisto bloccante finché non ordinato
-- (era: nessuna riga, oppure stato non in acquistato/ricevuto).
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
        or (ls.tipo = 'costruzione' and ls.stato <> 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
      )
  );
$$;

-- Dashboard: rosso se manca fornitore o non esiste ancora nessuna riga,
-- verde se ordinato=true (nessun'altra condizione: una volta ordinato è
-- verde a prescindere, coerente col fatto che a quel punto il record è
-- comunque di sola lettura/completo), giallo implicito.
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
          and (
            ls.fornitore_sede_id is null
            or not exists (select 1 from lavoro_satellite_articolo a where a.satellite_id = ls.id)
          )
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
        or (ls.tipo = 'acquisti' and coalesce(ls.ordinato, false))
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
