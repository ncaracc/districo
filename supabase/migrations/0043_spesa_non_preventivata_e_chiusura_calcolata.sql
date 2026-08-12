-- =============================================================
-- PARTE 1 — Nuova attività "Attività non preventivate"
-- (tipo interno 'spesa_non_preventivata', etichetta UI "Attività non
-- preventivate" — stessa convenzione già in uso per campione/"Campionatura",
-- acquisti/"Acquisto": il tipo DB resta un identificatore tecnico singolare,
-- l'etichetta utente è quella richiesta). Stesso schema di Acconto: Importo
-- riusa `valore_complessivo` (già generico, condiviso da preventivo/
-- acquisti/noleggio/acconto), Descrizione riusa `descrizione_libera` (già
-- generico, condiviso da molti tipi) — NESSUNO dei due è nuovo. Data e il
-- flag "accettata" sono invece dedicati (`spesa_data`/`spesa_accettata`),
-- seguendo lo stesso pattern già usato per Acconto (`acconto_data`/
-- `acconto_incassato`, colonne prefissate per tipo, mai condivise tra
-- tipi diversi in questo progetto — Costruzione/Montaggio hanno seguito lo
-- stesso principio con `sessioni_lavoro` dedicata invece di riusare colonne
-- di altri tipi con nomi simili). Nessuna colonna scoping-check dedicata
-- (stesso trattamento di acconto_data/acconto_incassato, che non ne hanno
-- una — a differenza delle 3 colonne di Chiusura, raggruppate insieme in un
-- unico CHECK per ragioni storiche di quella migration specifica).
-- =============================================================

alter table lavoro_satellite
  add column spesa_data timestamptz,
  add column spesa_accettata boolean not null default false;

-- =============================================================
-- PARTE 2 — Chiusura Lavoro: nuovo flag `chiusura_incassata`
-- (checkbox "Contrassegna tutti gli importi come incassati.", concetto
-- distinto da chiusura_conclusa/"Contrassegna il lavoro come chiuso." —
-- due booleani indipendenti, entrambi richiesti per completare il Lavoro,
-- non riusabile l'uno per l'altro). `lavoro.stato` diventa 'completato'
-- solo quando ENTRAMBI sono true (era: solo chiusura_conclusa).
-- =============================================================

alter table lavoro_satellite
  add column chiusura_incassata boolean not null default false;

-- Estende lo scoping-check esistente di Chiusura (dalla 0037) al nuovo
-- flag: nessuna riga di tipo diverso da 'chiusura' può avere
-- chiusura_incassata=true, stesso trattamento delle altre 3 colonne già
-- vincolate lì.
alter table lavoro_satellite drop constraint lavoro_satellite_chiusura_tipo_check;
alter table lavoro_satellite add constraint lavoro_satellite_chiusura_tipo_check
  check (
    tipo = 'chiusura'
    or (chiusura_conclusa = false and chiusura_incassata = false and chiusura_data is null and chiusura_acconti = '[]'::jsonb)
  );

-- Backfill: le 5 righe reali con chiusura_conclusa=true già in produzione
-- (verificato via REST/service role prima di scrivere questa migration)
-- rappresentano Lavori GIÀ 'completato' nel vecchio modello a singolo
-- flag — preserva il loro stato verde/gate-passing invece di declassarle a
-- giallo per la sola introduzione del nuovo flag (stesso principio di
-- backfill già seguito per Campione 2/8, Acquisto 3/8, Campionatura 12/8).
update lavoro_satellite
set chiusura_incassata = true
where tipo = 'chiusura' and chiusura_conclusa = true;

-- Aggiunge 'spesa_non_preventivata' ai tipi ammessi.
alter table lavoro_satellite drop constraint lavoro_satellite_tipo_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_check
  check (tipo in (
    'appuntamento', 'preventivo', 'progetto', 'acquisti', 'campione',
    'costruzione', 'noleggio', 'chiusura', 'acconto', 'montaggio',
    'spesa_non_preventivata'
  ));

-- spesa_non_preventivata non usa affatto la colonna legacy `stato` (stesso
-- trattamento già riservato ad acconto/costruzione/montaggio/ecc.).
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
    or (tipo = 'costruzione')
    or (tipo = 'noleggio' and stato is null)
    or (tipo = 'chiusura')
    or (tipo = 'acconto')
    or (tipo = 'montaggio')
    or (tipo = 'spesa_non_preventivata')
  );

-- =============================================================
-- PARTE 3 — Ciclo di vita di Chiusura Lavoro: da "auto-creata alla
-- creazione del Lavoro" a "auto-creata come conseguenza dell'accettazione".
-- La creazione/rimozione automatica vive ora in application code
-- (impostaPreventivoDecisione(), lib/lavori/satelliti.ts — unico punto in
-- cui lavoro.stato entra/esce da 'accettato' tramite un'azione utente
-- diretta), non più nel trigger di creazione iniziale.
-- =============================================================

-- crea_satelliti_iniziali() torna a creare solo Briefing + Preventivo (era
-- Briefing + Preventivo + Chiusura dalla 0037).
create or replace function public.crea_satelliti_iniziali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into lavoro_satellite (lavoro_id, tipo, tipo_appuntamento, concluso)
    values (new.id, 'appuntamento', 'briefing', false);

  insert into lavoro_satellite (lavoro_id, tipo)
    values (new.id, 'preventivo');

  return new;
end;
$$;

-- Coerenza dati one-off (verificato via REST/service role prima di
-- scrivere questa migration — vedi CLAUDE.md per il dettaglio completo):
-- (a) 2 Lavori reali stato='opportunita' avevano comunque una riga Chiusura
--     (residuo del vecchio modello "auto-creata alla nascita del Lavoro"),
--     entrambe con chiusura_conclusa=false/chiusura_data=null/
--     chiusura_acconti='[]' — nessun dato reale perso, rimosse per
--     allineare lo stato attuale al nuovo invariante "Chiusura esiste solo
--     se il Lavoro è (o è stato) accettato".
-- (b) 3 Lavori reali (2 'accettato', 1 'completato') NON avevano alcuna
--     riga Chiusura (gap storico, precedente all'introduzione di questa
--     attività il 3/8, mai colmato da allora) — backfillate: il caso
--     'completato' riceve chiusura_conclusa/chiusura_incassata=true e
--     chiusura_data=completato_at (coerente con uno stato già raggiunto
--     nella realtà, nessuna invenzione di dati); i 2 casi 'accettato'
--     ricevono una riga vuota (comportamento equivalente alla creazione
--     automatica che sarebbe scattata se questa migration fosse stata
--     applicata al momento della loro accettazione).
delete from lavoro_satellite
where tipo = 'chiusura'
  and lavoro_id in (select id from lavoro where stato not in ('accettato', 'completato'));

insert into lavoro_satellite (lavoro_id, tipo, chiusura_conclusa, chiusura_incassata, chiusura_data)
select
  l.id,
  'chiusura',
  (l.stato = 'completato'),
  (l.stato = 'completato'),
  case when l.stato = 'completato' then l.completato_at else null end
from lavoro l
where l.stato in ('accettato', 'completato')
  and not exists (select 1 from lavoro_satellite ls where ls.lavoro_id = l.id and ls.tipo = 'chiusura');

-- Trigger urgenza: esteso a spesa_accettata e chiusura_incassata, stesso
-- principio già seguito per ogni altro flag booleano di stato introdotto
-- finora — altrimenti il punteggio di urgenza di una riga rimasta
-- rossa/gialla si congelerebbe alla creazione.
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
     or new.ordinato is distinct from old.ordinato
     or new.chiusura_conclusa is distinct from old.chiusura_conclusa
     or new.acconto_incassato is distinct from old.acconto_incassato
     or new.chiusura_incassata is distinct from old.chiusura_incassata
     or new.spesa_accettata is distinct from old.spesa_accettata then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- =============================================================
-- PARTE 4 — Dashboard: rosso/verde per spesa_non_preventivata (stesso
-- pattern di Acconto) + Chiusura ricalibrata sui due flag (verde solo se
-- ENTRAMBI true, rosso solo se NESSUNO dei due è true — il caso
-- "esattamente uno true" è implicitamente giallo, come ovunque nel
-- progetto: satelliti_gialli = rilevante and not rosso and not verde).
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
  ha_appuntamento_scaduto     boolean,
  ha_acconto_incassato        boolean
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
    coalesce(bool_or(s.scaduto), false) as ha_appuntamento_scaduto,
    coalesce(bool_or(s.acconto_incassato), false) as ha_acconto_incassato
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
        or (ls.tipo = 'campione' and ls.campione_data_consegna is null)
        or (
          ls.tipo = 'acquisti'
          and (
            ls.fornitore_sede_id is null
            or not exists (select 1 from lavoro_satellite_articolo a where a.satellite_id = ls.id)
          )
        )
        or (ls.tipo = 'costruzione' and jsonb_array_length(ls.sessioni_lavoro) = 0)
        or (ls.tipo = 'montaggio' and jsonb_array_length(ls.sessioni_lavoro) = 0)
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (
          ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
          and (ls.data_appuntamento is null or ls.data_appuntamento < now())
        )
        or (ls.tipo = 'preventivo' and not ls.preventivo_accettato and (ls.preventivo_rifiutato or ls.valore_complessivo is null))
        or (
          ls.tipo = 'chiusura'
          and not coalesce(ls.chiusura_incassata, false)
          and not coalesce(ls.chiusura_conclusa, false)
        )
        or (
          ls.tipo = 'acconto' and not coalesce(ls.acconto_incassato, false)
          and (ls.acconto_data is null or ls.valore_complessivo is null)
        )
        or (
          ls.tipo = 'spesa_non_preventivata' and not coalesce(ls.spesa_accettata, false)
          and (ls.spesa_data is null or ls.valore_complessivo is null)
        )
      ) as rosso,
      ( (ls.tipo = 'progetto' and coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and coalesce(ls.campione_consegnato, false))
        or (ls.tipo = 'acquisti' and coalesce(ls.ordinato, false))
        or (ls.tipo = 'costruzione' and coalesce(ls.concluso, false))
        or (ls.tipo = 'montaggio' and coalesce(ls.concluso, false))
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
        or (
          ls.tipo = 'chiusura'
          and coalesce(ls.chiusura_incassata, false)
          and coalesce(ls.chiusura_conclusa, false)
        )
        or (ls.tipo = 'acconto' and coalesce(ls.acconto_incassato, false))
        or (ls.tipo = 'spesa_non_preventivata' and coalesce(ls.spesa_accettata, false))
      ) as verde,
      (
        ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true
        and ls.data_appuntamento is not null and ls.data_appuntamento < now()
      ) as scaduto,
      (ls.tipo = 'acconto' and coalesce(ls.acconto_incassato, false)) as acconto_incassato
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

-- =============================================================
-- PARTE 5 — KPI Dashboard: "Importo lavori accettati" -> "Importi da
-- incassare". Nome della colonna SQL restituita (`importo_lavori_accettati`)
-- NON rinominato (stesso principio già seguito per valore_preventivo_
-- accettato il 2/8: solo un'etichetta interna, rinominarla richiederebbe
-- toccare database.types.ts/kpi.ts senza alcun beneficio visibile —
-- l'etichetta utente cambia comunque in "Importi da incassare" lato React,
-- unico punto realmente visibile). Nuova formula: per ciascun Lavoro
-- stato='accettato' (stesso perimetro esatto di prima, invariato),
-- Importo da incassare = (Valore preventivo rilevante + Attività non
-- preventivate accettate) - Acconti incassati, sommato su tutti i Lavori
-- del perimetro. Ogni componente COALESCE-ata a 0 individualmente prima
-- della sottrazione (non un'unica COALESCE sul risultato finale): un
-- Lavoro con Preventivo non ancora valorizzato ma con un Acconto già
-- incassato deve comunque contribuire con il proprio importo negativo
-- reale, non essere escluso per intero dalla somma.
-- =============================================================

create or replace function public.kpi_dashboard()
returns table (
  lavori_in_corso               integer,
  importo_lavori_accettati      numeric,
  tempo_preventivo_giorni       numeric,
  tempo_preventivo_campione     integer,
  tempo_completamento_giorni    numeric,
  tempo_completamento_campione  integer
)
language sql
stable
set search_path = public
as $$
  with finestra as (
    select coalesce(a.kpi_finestra_mesi, 12) as mesi
    from artigiano a
    where a.id = auth.uid()
  ),
  lavori_propri as (
    select l.*
    from lavoro l
    join lavoro_artigiani la
      on la.lavoro_id    = l.id
     and la.artigiano_id = auth.uid()
     and la.stato        = 'accettato'
  ),
  in_corso as (
    select count(*)::integer as n
    from lavori_propri
    where stato in ('opportunita', 'accettato')
  ),
  preventivo_corrente as (
    select
      ls.lavoro_id,
      ls.valore_complessivo,
      ls.preventivo_accettato,
      ls.preventivo_rifiutato,
      ls.data_ultimo_cambio_stato
    from lavoro_satellite ls
    where ls.tipo = 'preventivo'
      and not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id)
  ),
  -- Attività non preventivate accettate, sommate per Lavoro.
  spesa_non_preventivata_somma as (
    select ls.lavoro_id, coalesce(sum(ls.valore_complessivo), 0) as totale
    from lavoro_satellite ls
    where ls.tipo = 'spesa_non_preventivata' and ls.spesa_accettata = true
    group by ls.lavoro_id
  ),
  -- Acconti incassati, sommati per Lavoro.
  acconto_incassato_somma as (
    select ls.lavoro_id, coalesce(sum(ls.valore_complessivo), 0) as totale
    from lavoro_satellite ls
    where ls.tipo = 'acconto' and ls.acconto_incassato = true
    group by ls.lavoro_id
  ),
  -- KPI 2 (rinominato "Importi da incassare" in UI): stesso perimetro
  -- esatto di prima (stato='accettato' esatto, nessuna finestra
  -- temporale), nuova formula per-Lavoro: (Preventivo + Attività non
  -- preventivate accettate) - Acconti incassati.
  importo as (
    select coalesce(sum(
      coalesce(pc.valore_complessivo, 0) + coalesce(snp.totale, 0) - coalesce(ai.totale, 0)
    ), 0) as totale
    from lavori_propri l
    left join preventivo_corrente pc on pc.lavoro_id = l.id
    left join spesa_non_preventivata_somma snp on snp.lavoro_id = l.id
    left join acconto_incassato_somma ai on ai.lavoro_id = l.id
    where l.stato = 'accettato'
  ),
  primo_briefing as (
    select ls.lavoro_id, min(ls.data_ultimo_cambio_stato) as data_briefing
    from lavoro_satellite ls
    where ls.tipo = 'appuntamento'
      and ls.tipo_appuntamento = 'briefing'
      and ls.concluso = true
    group by ls.lavoro_id
  ),
  tempo_preventivo as (
    select
      avg(extract(epoch from (pc.data_ultimo_cambio_stato - pb.data_briefing)) / 86400.0) as media,
      count(*) as n
    from lavori_propri l
    join preventivo_corrente pc on pc.lavoro_id = l.id
    join primo_briefing pb on pb.lavoro_id = l.id
    cross join finestra f
    where (pc.preventivo_accettato or pc.preventivo_rifiutato)
      and pc.data_ultimo_cambio_stato >= now() - (f.mesi || ' months')::interval
  ),
  tempo_completamento as (
    select
      avg(extract(epoch from (l.completato_at - l.data_lavoro::timestamptz)) / 86400.0) as media,
      count(*) as n
    from lavori_propri l
    cross join finestra f
    where l.stato = 'completato'
      and l.completato_at is not null
      and l.completato_at >= now() - (f.mesi || ' months')::interval
  )
  select
    in_corso.n,
    importo.totale,
    tempo_preventivo.media,      tempo_preventivo.n::integer,
    tempo_completamento.media,   tempo_completamento.n::integer
  from in_corso, importo, tempo_preventivo, tempo_completamento;
$$;
revoke execute on function public.kpi_dashboard() from public;
revoke execute on function public.kpi_dashboard() from anon;
grant execute on function public.kpi_dashboard() to authenticated;
