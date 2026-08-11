-- =============================================================
-- Nuova attività "Acconto" (vedi CLAUDE.md): ripetibile come Campionatura
-- (più istanze sullo stesso Lavoro, "Acconto 1"/"Acconto 2"...), non
-- auto-creata. Intenzionalmente NON collegata al meccanismo
-- chiusura_acconti già esistente dentro Chiusura Lavoro (0037) — restano
-- due meccanismi indipendenti per ora: l'Acconto qui giustifica l'avvio
-- di acquisti/costruzione (un momento della trattativa/esecuzione),
-- chiusura_acconti riepiloga gli incassi alla chiusura finale del Lavoro.
-- L'eventuale disallineamento tra i due verrà affrontato quando si
-- arriverà a restylare Chiusura Lavoro, non qui.
--
-- Verifica preliminare fatta prima di scrivere questa migration (come
-- richiesto): (1) lavoro_satellite_tipo_check esiste (ultima definizione
-- nella 0037) ed elenca esplicitamente gli 8 tipi ammessi — 'acconto' va
-- aggiunto lì, altrimenti l'insert fallirebbe. (2) Campionatura (l'unico
-- altro tipo "puramente ripetibile", nessun singleton) non introduce nulla
-- di speciale a schema per la ripetibilità: nessuna colonna/gruppo/serie
-- coinvolti (quel campo è stato reso libero/non più richiesto dalla 0030) —
-- la ripetibilità vive interamente in application code (RIPETIBILE_ATTIVITA,
-- numerazione "Nome N" quando ce n'è più di una, righe indipendenti senza
-- raggruppamento). Nessuna ambiguità reale emersa su nessuno dei due punti,
-- proceduto senza fermarsi.
-- =============================================================

alter table lavoro_satellite
  add column acconto_data timestamptz,
  add column acconto_incassato boolean not null default false;

alter table lavoro_satellite drop constraint lavoro_satellite_tipo_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_check
  check (tipo in (
    'appuntamento', 'preventivo', 'progetto', 'acquisti', 'campione', 'costruzione', 'noleggio', 'chiusura', 'acconto'
  ));

-- acconto non usa affatto la colonna legacy `stato` (stesso trattamento
-- già riservato a preventivo/acquisti/chiusura).
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
    or (tipo = 'chiusura')
    or (tipo = 'acconto')
  );

-- Trigger urgenza: esteso ad acconto_incassato, stesso principio già
-- seguito per ogni altro flag booleano di stato introdotto finora
-- (preventivo_accettato/rifiutato, progetto_accettato, campione_consegnato,
-- ordinato, chiusura_conclusa) — altrimenti il punteggio di urgenza di un
-- Acconto rimasto rosso/giallo si congelerebbe alla creazione della riga.
-- Solo il flag booleano è tracciato qui, non acconto_data/
-- valore_complessivo (scalari) — stesso trattamento già riservato a
-- valore_complessivo del Preventivo, mai tracciato da questo trigger pur
-- influenzando anche lui rosso/giallo.
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
     or new.acconto_incassato is distinct from old.acconto_incassato then
    new.data_ultimo_cambio_stato := now();
  end if;
  return new;
end;
$$;

-- lavori_dashboard(): senza questa estensione ogni riga tipo='acconto' non
-- avrebbe fatto match né su "rosso" né su "verde" nell'enumerazione
-- esistente (entrambe liste chiuse per tipo), finendo sempre conteggiata
-- come "giallo" (satelliti_gialli = rilevante and not rosso and not verde)
-- indipendentemente dal suo stato reale — bug scoperto verificando
-- l'enumerazione esistente prima di scrivere la migration, corretto qui
-- insieme all'aggiunta del tipo, non esplicitamente richiesto ma
-- necessario per non falsare i conteggi rosso/giallo/verde della Dashboard.
-- Stessa identica logica rosso/verde di coloreAcconto()/labelStatoAcconto()
-- lato JS (lib/lavori/satelliti-meta.ts), rosso reso esplicitamente
-- mutuamente esclusivo con verde (`not coalesce(acconto_incassato,false)`)
-- per evitare che una riga incassata ma con data/valore ancora mancanti
-- (edge case possibile: nulla in UI impedisce di spuntare "incassato"
-- prima di compilare gli altri campi) risulti doppiamente contata.
--
-- lavoro_pronto_per_montaggio() NON viene toccata: enumera solo i tipi che
-- bloccano il montaggio (stesso trattamento già riservato a 'chiusura',
-- assente anche lì) — nessun requisito che l'Acconto debba bloccare il
-- montaggio, non richiesto.
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
        or (ls.tipo = 'chiusura' and not coalesce(ls.chiusura_conclusa, false))
        or (
          ls.tipo = 'acconto' and not coalesce(ls.acconto_incassato, false)
          and (ls.acconto_data is null or ls.valore_complessivo is null)
        )
      ) as rosso,
      ( (ls.tipo = 'progetto' and coalesce(ls.progetto_accettato, false))
        or (ls.tipo = 'campione' and coalesce(ls.campione_consegnato, false))
        or (ls.tipo = 'acquisti' and coalesce(ls.ordinato, false))
        or (ls.tipo = 'costruzione' and ls.stato = 'completata')
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false))
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false))
        or (ls.tipo = 'preventivo' and ls.preventivo_accettato)
        or (ls.tipo = 'chiusura' and coalesce(ls.chiusura_conclusa, false))
        or (ls.tipo = 'acconto' and coalesce(ls.acconto_incassato, false))
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
