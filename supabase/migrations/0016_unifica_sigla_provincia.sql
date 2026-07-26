-- =============================================================
-- Unificazione provincia + sigla in un unico campo `sigla_provincia`
-- su lavoro e fornitore_sede (uniche due tabelle con entrambi i campi
-- separati — cliente non ha né provincia né sigla, artigiano ha solo
-- provincia senza sigla separata, quindi non è coinvolta).
--
-- Verificato prima di droppare `provincia` (query di sola lettura sul
-- progetto Supabase Cloud): lavoro aveva 0 righe con provincia non
-- nulla; fornitore_sede aveva 1 sola riga ("Bologna"/"BO"), già
-- perfettamente coerente con la sigla esistente — nessuna perdita di
-- dati, nessuna conversione nome->sigla necessaria.
-- =============================================================

alter table lavoro rename column sigla to sigla_provincia;
alter table lavoro drop column provincia;

alter table fornitore_sede rename column sigla to sigla_provincia;
alter table fornitore_sede drop column provincia;
