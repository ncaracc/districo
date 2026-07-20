-- =============================================================
-- Sprint 3 revisione strutturale "a stella": dashboard
-- (vedi CLAUDE.md, sezione "Revisione strutturale 2026-07-19")
--
-- Funzione unica, chiamata dalla pagina /lavori, che restituisce i
-- lavori aperti dell'artigiano corrente già ordinati per punteggio di
-- urgenza, coi conteggi satellite pronti per il riepilogo a contatori
-- in UI. Calcolo lato SQL (non N+1 query lato JS) per restare
-- efficiente al crescere del numero di lavori.
--
-- "Chiuso" = lavoro.stato = 'chiuso' (campo già esistente dalla 0001,
-- oggi non ancora impostato da nessun codice: il vero gate "montaggio"
-- resta da definire in un prossimo sprint — quando esisterà, sarà lui
-- a far scattare la transizione a stato='chiuso', stesso pattern già
-- in uso per accettato_at → stato='esecuzione').
--
-- SECURITY INVOKER (default, nessun security definer): la funzione
-- legge lavoro/lavoro_artigiani/lavoro_satellite con i permessi del
-- chiamante, quindi resta soggetta alle RLS già esistenti su quelle
-- tabelle — nessun artigiano_id passato dall'esterno (stessa lezione
-- della vulnerabilità corretta in ultimo_prezzo_articolo, 18/7): si usa
-- sempre auth.uid() internamente.
-- =============================================================
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
      -- rilevante ai fini di punteggio/conteggi: non appuntamento (informativo,
      -- non conta per il gate montaggio) e non una revisione superata di
      -- preventivo/progetto (solo l'ultima versione della catena conta,
      -- stesso principio già applicato in lavoro_pronto_per_montaggio)
      (ls.tipo <> 'appuntamento'
        and not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id)
      ) as rilevante,
      -- rosso = ancora nel primo stato della propria sequenza semaforo
      ( (ls.tipo in ('preventivo', 'progetto')             and ls.stato = 'in_preparazione')
        or (ls.tipo in ('acquisto_materiale', 'acquisto_ferramenta') and ls.stato = 'da_acquistare')
        or (ls.tipo = 'lavorazione_esterna'                 and ls.stato = 'da_consegnare')
        or (ls.tipo = 'campione'                            and ls.stato = 'da_preparare')
      ) as rosso,
      -- verde = stato finale della propria sequenza semaforo (non contribuisce al punteggio)
      ( (ls.tipo in ('preventivo', 'progetto')             and ls.stato = 'accettato')
        or (ls.tipo in ('acquisto_materiale', 'acquisto_ferramenta') and ls.stato = 'ricevuto')
        or (ls.tipo = 'lavorazione_esterna'                 and ls.stato = 'completata')
        or (ls.tipo = 'campione'                            and ls.stato = 'ricevuto_dal_cliente')
      ) as verde
    from lavoro_satellite ls
    where ls.lavoro_id = l.id
  ) s on true
  where l.stato <> 'chiuso'
  group by l.id, l.titolo, l.stato, l.cliente_id, l.created_at
  order by punteggio_urgenza desc, l.created_at desc;
$$;

revoke execute on function public.lavori_dashboard() from public;
revoke execute on function public.lavori_dashboard() from anon;
grant execute on function public.lavori_dashboard() to authenticated;
