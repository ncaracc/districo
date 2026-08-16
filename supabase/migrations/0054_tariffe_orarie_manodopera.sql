-- Sessione "tariffe orarie e costo manodopera" (2026-08-19, vedi CLAUDE.md).
--
-- Tariffe orarie personali dell'artigiano — stesso pattern delle altre
-- preferenze personali (SMTP, obiettivi KPI, testo mail): colonne su
-- `artigiano`, non una tabella a parte. NOT NULL con default (a differenza
-- di mail_ordine_*, dove null="non personalizzato" ha senso per un testo):
-- qui il valore entra direttamente in un calcolo aritmetico ovunque venga
-- letto (costo sessione, Margine di Chiusura) — un default applicativo
-- indiretto avrebbe richiesto lo stesso fallback ripetuto in ogni punto di
-- lettura, un default a schema è più semplice e altrettanto corretto (i
-- valori richiesti, 50 e 30 €/h, diventano il valore reale per ogni
-- artigiano esistente al momento della migration, non solo per i nuovi).
alter table artigiano add column tariffa_oraria_costruzione numeric(10,2) not null default 50;
alter table artigiano add column tariffa_oraria_montaggio numeric(10,2) not null default 30;

-- Congelamento alla chiusura (vedi CLAUDE.md per il ragionamento completo):
-- il costo manodopera calcolato al momento in cui chiusura_conclusa passa a
-- true viene scritto qui e da quel momento è la fonte di verità (non più
-- ricalcolato dal vivo con la tariffa corrente, che potrebbe cambiare in
-- futuro) — stesso principio già in uso per chiusura_data (audit trail
-- immutabile), ma qui il valore stesso, non solo una data. Nullable: null
-- finché il Lavoro non è mai stato chiuso — ma vedi CLAUDE.md per il
-- backfill applicativo (non in questa migration, uno script one-off a
-- parte) eseguito subito dopo per i 5 Lavori reali già chiusi
-- (chiusura_conclusa=true) prima di questa sessione: nessuna tariffa
-- storica vera è ricostruibile per loro (mai tracciata prima d'ora), quindi
-- il backfill usa la tariffa ATTUALE al momento del deploy come miglior
-- approssimazione disponibile — da quel momento in poi restano comunque
-- protetti da futuri cambi di tariffa, coerente con l'obiettivo della
-- sessione, anche se il valore congelato non riflette esattamente quanto
-- sarebbe stato calcolato al momento della loro chiusura reale (passata).
-- Su `lavoro_satellite` (tabella satellite condivisa), non su `lavoro`:
-- stesso posto di chiusura_conclusa/chiusura_incassata/chiusura_data, un
-- solo satellite Chiusura per Lavoro.
alter table lavoro_satellite add column chiusura_costo_manodopera_costruzione numeric(12,2);
alter table lavoro_satellite add column chiusura_costo_manodopera_montaggio numeric(12,2);
