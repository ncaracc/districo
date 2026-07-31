-- =============================================================
-- Lavoro completato = sola lettura sui satelliti (RLS)
--
-- La UI (components/lavoro-satelliti-tabella.tsx, app/(app)/lavori/[id]/
-- page.tsx) e le Server Action (lib/lavori/satelliti.ts,
-- lib/lavori/allegati.ts) già bloccano aggiunta/modifica/eliminazione dei
-- satelliti quando lavoro.stato = 'completato' — sbloccabile solo con
-- "Riapri lavoro". Questa migration aggiunge lo stesso vincolo a livello
-- RLS, come garanzia strutturale indipendente dal codice applicativo
-- (stesso principio già seguito per is_owner_del_lavoro/RLS in questo
-- progetto, vedi CLAUDE.md).
--
-- Nuova funzione dedicata `lavoro_satellite_modificabile`, NON una
-- modifica a `is_owner_del_lavoro`: quest'ultima è condivisa da molte
-- altre tabelle (lavoro, lavoro_artigiani, attivita, lavoro_fasi,
-- pagamento, allegato, ordine_acquisto...) — la lettura di "Lavoro
-- completato" lì bloccherebbe anche l'UPDATE su `lavoro.stato` fatto da
-- "Riapri lavoro" (completato -> accettato), impedendo esattamente
-- l'unica via di sblocco prevista. Restano quindi INVARIATE le policy su
-- `lavoro` e su tutte le altre tabelle non-satellite.
--
-- Applicata solo alle tabelle satellite (lettura invariata, sempre
-- consentita a chi è nel lavoro — la modale in sola lettura deve poter
-- comunque mostrare i dati):
--   - lavoro_satellite (insert/update/delete)
--   - lavoro_satellite_articolo (insert/update/delete)
--   - lavoro_satellite_allegato (insert/update/delete)
-- =============================================================

create or replace function lavoro_satellite_modificabile(p_lavoro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_owner_del_lavoro(p_lavoro_id)
    and exists (
      select 1 from lavoro
      where id = p_lavoro_id
        and stato <> 'completato'
    );
$$;

revoke execute on function lavoro_satellite_modificabile(uuid) from public;
revoke execute on function lavoro_satellite_modificabile(uuid) from anon;
grant execute on function lavoro_satellite_modificabile(uuid) to authenticated;

-- ---- lavoro_satellite ----
drop policy "lavoro_satellite: scrittura solo owner" on lavoro_satellite;
create policy "lavoro_satellite: scrittura solo owner"
  on lavoro_satellite for insert
  with check (lavoro_satellite_modificabile(lavoro_id));

drop policy "lavoro_satellite: modifica solo owner" on lavoro_satellite;
create policy "lavoro_satellite: modifica solo owner"
  on lavoro_satellite for update
  using (lavoro_satellite_modificabile(lavoro_id));

drop policy "lavoro_satellite: eliminazione solo owner" on lavoro_satellite;
create policy "lavoro_satellite: eliminazione solo owner"
  on lavoro_satellite for delete
  using (lavoro_satellite_modificabile(lavoro_id));

-- ---- lavoro_satellite_articolo ----
drop policy "riga satellite: scrittura solo owner" on lavoro_satellite_articolo;
create policy "riga satellite: scrittura solo owner"
  on lavoro_satellite_articolo for insert
  with check (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_articolo.satellite_id
        and lavoro_satellite_modificabile(ls.lavoro_id)
    )
  );

drop policy "riga satellite: modifica solo owner" on lavoro_satellite_articolo;
create policy "riga satellite: modifica solo owner"
  on lavoro_satellite_articolo for update
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_articolo.satellite_id
        and lavoro_satellite_modificabile(ls.lavoro_id)
    )
  );

drop policy "riga satellite: eliminazione solo owner" on lavoro_satellite_articolo;
create policy "riga satellite: eliminazione solo owner"
  on lavoro_satellite_articolo for delete
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_articolo.satellite_id
        and lavoro_satellite_modificabile(ls.lavoro_id)
    )
  );

-- ---- lavoro_satellite_allegato ----
drop policy "allegato satellite: scrittura solo owner" on lavoro_satellite_allegato;
create policy "allegato satellite: scrittura solo owner"
  on lavoro_satellite_allegato for insert
  with check (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_allegato.satellite_id
        and lavoro_satellite_modificabile(ls.lavoro_id)
    )
  );

drop policy "allegato satellite: modifica solo owner" on lavoro_satellite_allegato;
create policy "allegato satellite: modifica solo owner"
  on lavoro_satellite_allegato for update
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_allegato.satellite_id
        and lavoro_satellite_modificabile(ls.lavoro_id)
    )
  );

drop policy "allegato satellite: eliminazione solo owner" on lavoro_satellite_allegato;
create policy "allegato satellite: eliminazione solo owner"
  on lavoro_satellite_allegato for delete
  using (
    exists (
      select 1 from lavoro_satellite ls
      where ls.id = lavoro_satellite_allegato.satellite_id
        and lavoro_satellite_modificabile(ls.lavoro_id)
    )
  );
