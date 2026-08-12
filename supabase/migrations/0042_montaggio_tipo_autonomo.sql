-- =============================================================
-- Promozione di Montaggio da sottotipo di Appuntamento
-- (tipo='appuntamento', tipo_appuntamento='montaggio') a tipo autonomo
-- (tipo='montaggio'), stessa struttura sessioni_lavoro già introdotta per
-- Costruzione (0041) — il nome generico della colonna era già pensato
-- esplicitamente per questo riuso (vedi CLAUDE.md). Montaggio perde il
-- concetto di "singolo appuntamento pianificato" (data_appuntamento) in
-- favore di un elenco di sessioni di lavoro discontinue, come Costruzione.
--
-- Verifica preliminare punto 1 (dati reali), fatta subito prima di scrivere
-- questa migration (query diretta via REST/service role contro Supabase
-- Cloud, non i valori discussi in una fase di analisi precedente nella
-- stessa sessione, poi risultati superati): **zero righe reali** con
-- tipo='appuntamento' AND tipo_appuntamento='montaggio' in produzione al
-- momento di questa migration (74 righe lavoro_satellite totali, 18
-- 'appuntamento', nessuna con tipo_appuntamento='montaggio' — nessun Lavoro
-- reale ha ancora raggiunto lo stadio Montaggio). **Nessuna migrazione dati
-- effettivamente necessaria.**
--
-- Politica generale comunque codificata sotto (UPDATE con WHERE su
-- tipo/tipo_appuntamento, non su id specifici — innocua, 0 righe affette
-- oggi, ma corretta se applicata su un ambiente con dati diversi, es. un
-- database locale di test): descrizione copiata in descrizione_libera solo
-- dove non vuota, nessuna sessione fittizia creata in nessun caso (l'unico
-- dato storico disponibile per un'eventuale riga è un singolo istante,
-- data_appuntamento — non una vera durata inizio/fine come per Costruzione,
-- un "istante" non si traduce in modo sensato in una sessione). Caso
-- particolare discusso esplicitamente con l'utente durante l'analisi di
-- questa sessione (una riga non conclusa con data_appuntamento futura,
-- scenario ipotizzato ma mai riscontrato realmente in produzione):
-- **confermato con l'utente** — sessioni_lavoro resta vuoto (diventa
-- rosso), l'eventuale data programmata viene comunque preservata come testo
-- in descrizione_libera ("Montaggio programmato per il [data].") invece di
-- essere scartata, gestito dalla seconda UPDATE più sotto.
-- data_appuntamento/descrizione/tipo_appuntamento legacy NON droppate
-- (restano in schema, non più lette/scritte per tipo='montaggio' da qui in
-- avanti) — stesso trattamento già riservato a data_inizio/data_fine/stato
-- di Costruzione.
--
-- Verifica preliminare punto 2 (impatto su punti che trattano "tutti gli
-- Appuntamento" genericamente): trovati e gestiti in questa stessa
-- migration — appuntamenti_scaduti_count() e il flag ha_appuntamento_scaduto
-- di lavori_dashboard() sono entrambi scoped a `tipo = 'appuntamento'`:
-- una volta promosso, Montaggio smette AUTOMATICAMENTE di contribuire al
-- badge "appuntamenti scaduti" e all'icona calendario rossa in Dashboard —
-- conseguenza intenzionale e accettata (Montaggio non ha più alcun
-- concetto di "data pianificata/scaduta", sostituito dal semaforo a
-- sessioni), nessuna modifica di codice necessaria per quel punto (i due
-- meccanismi restano scoped a tipo='appuntamento' invariati, semplicemente
-- non vedono più righe montaggio). lavoro_pronto_per_montaggio() aggiornata
-- sotto con un nuovo ramo dedicato a tipo='montaggio' — stessa identica
-- condizione bloccante di prima (un Montaggio non concluso blocca il gate,
-- comportamento preesistente tramite il ramo generico 'appuntamento' che
-- lo includeva, ora sostituito da un ramo equivalente specifico, nessun
-- cambiamento di comportamento).
-- =============================================================

-- 1. 'montaggio' diventa un tipo valido a sé.
alter table lavoro_satellite drop constraint lavoro_satellite_tipo_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_check
  check (tipo in (
    'appuntamento', 'preventivo', 'progetto', 'acquisti', 'campione',
    'costruzione', 'noleggio', 'chiusura', 'acconto', 'montaggio'
  ));

-- 2. montaggio non usa affatto la colonna legacy `stato` (stesso
--    trattamento già riservato a costruzione/preventivo/acquisti/chiusura/
--    acconto).
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
  );

-- 3. Migrazione dati (vedi commento in cima — 0 righe reali interessate al
--    momento, politica generale mantenuta per correttezza): tipo e
--    tipo_appuntamento cambiano insieme nella stessa UPDATE (obbligatorio:
--    il CHECK vincola tipo_appuntamento a NULL per ogni tipo diverso da
--    'appuntamento', valutato sullo stato finale della riga, non durante
--    l'update). descrizione copiata in descrizione_libera solo dove non
--    vuota — nessuna sessione fittizia creata.
update lavoro_satellite
set
  tipo = 'montaggio',
  tipo_appuntamento = null,
  descrizione_libera = nullif(btrim(coalesce(descrizione, '')), '')
where tipo = 'appuntamento'
  and tipo_appuntamento = 'montaggio';

-- Caso "programmato ma non concluso" (vedi commento in cima): eventuale
-- riga con data_appuntamento futura/passata ma non ancora conclusa, senza
-- alcuna descrizione originale da preservare — la data pianificata diventa
-- testo leggibile invece di andare persa insieme a data_appuntamento (non
-- più letta per questo tipo). Mirata via valori, non id hardcoded — innocua
-- se non trova alcuna riga corrispondente (il caso reale oggi).
update lavoro_satellite
set descrizione_libera = 'Montaggio programmato per il '
  || to_char(data_appuntamento at time zone 'Europe/Rome', 'DD/MM/YYYY') || '.'
where tipo = 'montaggio'
  and concluso = false
  and data_appuntamento is not null
  and coalesce(btrim(descrizione_libera), '') = '';

-- 4. tipo_appuntamento non ammette più 'montaggio' come sottotipo (restano
--    solo briefing/verifica_misure) — dopo l'update sopra, nessuna riga
--    dovrebbe più averlo, ma il CHECK lo rende strutturalmente impossibile
--    da qui in avanti.
alter table lavoro_satellite drop constraint lavoro_satellite_tipo_appuntamento_check;
alter table lavoro_satellite add constraint lavoro_satellite_tipo_appuntamento_check
  check (
    (tipo = 'appuntamento' and tipo_appuntamento in ('briefing', 'verifica_misure'))
    or (tipo <> 'appuntamento' and tipo_appuntamento is null)
  );

-- 5. Gate "pronto per il montaggio": nuovo ramo dedicato a tipo='montaggio'
--    (bloccante finché non concluso) — sostituisce, senza cambiarne
--    l'effetto, la copertura che il vecchio ramo generico 'appuntamento'
--    forniva quando Montaggio era ancora un suo sottotipo (vedi verifica
--    preliminare punto 2 in cima).
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
        or (ls.tipo = 'costruzione' and not coalesce(ls.concluso, false))
        or (ls.tipo = 'noleggio' and coalesce(ls.prenotazione_effettuata, false) is not true)
        or (ls.tipo = 'appuntamento' and coalesce(ls.concluso, false) is not true)
        or (ls.tipo = 'montaggio' and not coalesce(ls.concluso, false))
      )
  );
$$;

-- 6. Dashboard: stessa logica rosso/verde di Costruzione per tipo='montaggio'.
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
        or (ls.tipo = 'chiusura' and not coalesce(ls.chiusura_conclusa, false))
        or (
          ls.tipo = 'acconto' and not coalesce(ls.acconto_incassato, false)
          and (ls.acconto_data is null or ls.valore_complessivo is null)
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
        or (ls.tipo = 'chiusura' and coalesce(ls.chiusura_conclusa, false))
        or (ls.tipo = 'acconto' and coalesce(ls.acconto_incassato, false))
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
