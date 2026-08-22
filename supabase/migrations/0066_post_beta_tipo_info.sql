-- =============================================================
-- 2026-08-22 sera — Post "Info" per gli annunci admin (vedi CLAUDE.md).
-- Un post creato dall'admin (es. "Benvenuti!") è per natura un annuncio a
-- messaggio singolo, non l'apertura di una discussione — seguire lo
-- stesso ciclo aperto/chiuso dei post dei beta tester (chiusura esplicita
-- con un ulteriore messaggio) non ha senso per questo caso. Deduzione
-- automatica da `is_admin` al momento della creazione (non un selettore
-- esplicito in UI), confermata con l'utente.
-- =============================================================

alter table post_beta
  add column tipo text not null default 'discussione' check (tipo in ('discussione', 'info'));

-- beta_crea_post() ridefinita: quando il chiamante è admin, il post nasce
-- già con tipo='info' e stato='chiuso' (chiuso_at = created_at, stesso
-- istante per entrambi — un unico timestamp `v_ora` usato ovunque). Il
-- primo messaggio va inserito PRIMA della chiusura (mentre il post è
-- ancora 'aperto', stesso ordine già seguito da
-- beta_chiudi_post_con_risposta): la policy INSERT di messaggio_beta
-- richiede `stato = 'aperto'` al momento dell'inserimento, altrimenti
-- fallirebbe anche per l'admin. Per i beta tester (non admin) il
-- comportamento resta ESATTAMENTE quello preesistente: tipo='discussione'
-- (default), stato resta 'aperto' (default), nessun update aggiuntivo.
create or replace function public.beta_crea_post(p_titolo text, p_testo text)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_post_id uuid;
  v_is_admin boolean;
  v_ora timestamptz := now();
begin
  select is_admin into v_is_admin from artigiano where id = auth.uid();

  insert into post_beta (artigiano_id, titolo, tipo, created_at)
  values (auth.uid(), p_titolo, case when v_is_admin then 'info' else 'discussione' end, v_ora)
  returning id into v_post_id;

  insert into messaggio_beta (post_id, autore_id, testo, created_at)
  values (v_post_id, auth.uid(), p_testo, v_ora);

  if v_is_admin then
    update post_beta set stato = 'chiuso', chiuso_at = v_ora where id = v_post_id;
  end if;

  return v_post_id;
end;
$$;
