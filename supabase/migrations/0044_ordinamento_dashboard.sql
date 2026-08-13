-- Sessione "ordinamento liste Dashboard e Conclusi" (2026-08-13, vedi
-- CLAUDE.md). Verificato prima di modificare: l'ordinamento reale in uso
-- oggi su Dashboard è `punteggio_urgenza desc, l.created_at desc` (mai
-- documentato esplicitamente come scelta deliberata) — sostituito su
-- richiesta esplicita con `created_at asc` puro (i lavori meno recenti in
-- cima, quelli su cui l'artigiano deve lavorare per primi), nessun
-- ordinamento secondario per punteggio di urgenza. `punteggio_urgenza`
-- resta calcolato e restituito (letto altrove? verificato: non risulta
-- consumato lato client oltre all'ordinamento — lasciato comunque in
-- output, nessuna modifica al return type, per non introdurre un secondo
-- DROP FUNCTION non necessario).
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
  order by l.created_at asc;
$$;
