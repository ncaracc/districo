-- Sessione di audit completo (2026-08, vedi CLAUDE.md) — pulizia dello
-- schema morto del brief originale del 16/7, esteso oltre le tabelle già
-- note (attivita/pagamento/ordine_acquisto/ordine_acquisto_riga/allegato,
-- documentate come morte in sessioni precedenti). Introspezione diretta
-- dello schema via REST/service role su Supabase Cloud incrociata con le
-- migration e con grep reale nel codice applicativo (non fidata a
-- database.types.ts da solo, già stato stale in passato) prima di scrivere
-- questa migration — vedi audit report (docs/audit-2026-08.md) per il
-- dettaglio della verifica.
--
-- Tabelle droppate, tutte create nella 0001_initial.sql, zero righe reali
-- (verificato via REST, count esatto = 0 su Supabase Cloud per ciascuna,
-- eccetto sla_attivita che aveva solo le 5 righe di default seed —
-- artigiano_id null, mai personalizzate da nessun artigiano reale) e zero
-- riferimenti in app/components/lib al di fuori di
-- lib/types/database.types.ts (generato, non sorgente di verità) e di
-- commenti che le citano solo come riferimento storico:
--   - articolo, ordine_acquisto, ordine_acquisto_riga: modello di acquisto
--     del brief 16/7, mai collegato al codice dopo la revisione strutturale
--     del 25/7 — il modello realmente in uso è lavoro_satellite
--     (tipo='acquisti') + lavoro_satellite_articolo.
--   - attivita, lavoro_fasi, fase_template: primo modello Attività/Fasi del
--     16/7, superato dal modello satellite dalla revisione del 25/7 in poi.
--   - pagamento: sostituito dai flag booleani su lavoro_satellite (Acconto,
--     Chiusura Lavoro — vedi CLAUDE.md 2026-08-11/13).
--   - allegato: repository allegati generico per Lavoro del 16/7, sostituito
--     da lavoro_satellite_allegato (scoped per Attività) dal 2/8.
--   - sla_attivita: SLA per tipo di Attività del modello 16/7, mai avuto un
--     equivalente nel modello satellite (nessuna sostituzione — l'app non
--     ha mai implementato SLA/scadenze configurabili per satellite).
--   - artigiano_fornitore_categoria, artigiano_fornitore_nota: tag/note
--     private per fornitore del brief 16/7, mai implementati nel codice
--     applicativo (già segnalato come "solo teorico" in CLAUDE.md
--     2026-08-03, ma lì si era verificato solo il codice, non lo schema
--     reale — le tabelle esistevano comunque, create dalla 0001).
--
-- Funzione RPC del brief 16/7, mai chiamata da nessun punto del codice
-- applicativo (verificato con una ricerca mirata) — calcolava l'ultimo
-- prezzo pagato per un Articolo, concetto del vecchio modello di acquisto
-- ormai sostituito. Rimossa prima delle tabelle sotto (il suo corpo le
-- referenzia, per quanto non sia una dipendenza catalogata in pg_depend
-- che blocchi i DROP TABLE — più pulito comunque toglierla per prima).
drop function if exists public.ultimo_prezzo_articolo(uuid, uuid);

-- Seconda funzione RPC morta, di un'epoca diversa (0012,
-- "ristrutturazione ciclo vita e satelliti", 25/7): calcolava lo "stato
-- effettivo" di preventivo/progetto/campione seguendo le catene
-- revisione_di e leggendo la vecchia colonna `stato` testuale — modello
-- completamente superato dalle revisioni successive (Preventivo a due
-- flag dall'1/8, Progetto a flag singolo dal 2/8, Campione a istanze
-- indipendenti senza più catene dal 2/8) — zero riferimenti nel codice
-- applicativo, mai droppata quando il modello è cambiato sotto di lei.
drop function if exists public.lavoro_satellite_stato_effettivo(uuid);

-- Colonna morta su una tabella VIVA (lavoro_satellite_articolo, in uso
-- attivo per le referenze di Acquisto): FK verso la tabella articolo sotto,
-- mai valorizzata da nessun punto del codice (verificato: creaOrdine()/
-- aggiornaOrdine() in lib/lavori/satelliti.ts non la impostano mai, sempre
-- NULL su ogni riga reale). Va rimossa PRIMA di droppare articolo — un
-- `drop table articolo` con questa FK ancora agganciata fallirebbe
-- (dipendenza reale, a differenza della funzione sopra).
alter table lavoro_satellite_articolo drop column if exists articolo_id;

-- Ordine di drop per rispettare le FK residue (referencing prima di
-- referenced): ordine_acquisto_riga -> ordine_acquisto/articolo; poi le
-- altre, nessuna dipendenza reciproca residua.
drop table if exists ordine_acquisto_riga;
drop table if exists ordine_acquisto;
drop table if exists articolo;
drop table if exists allegato;
drop table if exists pagamento;
drop table if exists lavoro_fasi;
drop table if exists fase_template;
drop table if exists attivita;
drop table if exists sla_attivita;
drop table if exists artigiano_fornitore_categoria;
drop table if exists artigiano_fornitore_nota;
