# Districo — Contesto di progetto

Questo file va aggiornato a ogni decisione importante presa nel progetto (nome, funzionalità, architettura, scelte di design, ecc.), così che chiunque riprenda il progetto — umano o assistente — abbia il contesto aggiornato. Aggiungere una riga alla tabella "Decisioni prese" per ogni scelta fatta, senza cancellare la cronologia precedente.


> **Cronologia più datata in archivio**: le decisioni e gli sprint dal 16/7 al 19/7 (incluso il primo modello dati Attività/Fasi e la prima versione del modello "a stella", entrambi superati dalla revisione strutturale del 25/7) e i round di implementazione/test già chiusi e deployati (Sprint B, Sprint C, gran parte dello Sprint D) sono stati spostati in [CLAUDE-ARCHIVIO.md](CLAUDE-ARCHIVIO.md) per contenere le dimensioni di questo file — nessun contenuto è stato perso o modificato, solo riorganizzato. Consultalo per la cronologia completa.

## Cos'è

Districo è un'app gestionale pensata per gli artigiani, per seguire un singolo lavoro dall'inizio alla fine attraverso tutte le sue fasi. Pensata per artigiani di mestieri diversi (non un solo settore), con un ruolo di amministratore della piattaforma che non entra nel merito del lavoro dei singoli ma dispone di statistiche aggregate.

## Funzionalità principali (dal brief iniziale)

- Anagrafica utenti: ogni artigiano vede i propri lavori; due artigiani possono condividere un lavoro svolto "a quattro mani".
- Anagrafica clienti: ogni lavoro è associato a un cliente specifico.
- Anagrafica fornitori: per acquisti di materiali e lavorazioni esterne.
- Percorso di svolgimento del lavoro: trattativa (attività libere) → esecuzione (fasi, personalizzabili, vedi sotto).

## Decisioni prese

| Data | Decisione |
|---|---|
| 2026-07-20 | **Sprint 3 revisione strutturale — ambiguità trovata e risolta con l'utente prima di procedere**: la chiusura del Lavoro nella sezione "Dashboard" era descritta come "montaggio verde", ma il traguardo `montaggio` non esiste ancora come tipo di satellite nello schema (resta da definire, vedi "Prossimi passi aperti"). Confermato con l'utente: si usa il campo `lavoro.stato = 'chiuso'` già esistente dalla 0001 (oggi impostato da nessun codice) come criterio di esclusione dalla dashboard — quando il gate montaggio verrà implementato, sarà lui a far scattare quella transizione, stesso pattern di `accettato_at` → `stato='esecuzione'`. |
| 2026-07-20 | **Sprint 3 revisione strutturale — dashboard implementata** (migration `0011_lavori_dashboard.sql`, funzione `lavori_dashboard()`): pagina `/lavori` rinominata **"Dashboard"** in UI (titolo H1 e voce di menu `components/app-nav.tsx`; URL invariato). Formula del punteggio di urgenza fissata (vedi sezione "Dashboard (nuova home page)" più sotto per il dettaglio ed esempio numerico): somma su satelliti non-appuntamento, non-verdi, non superati da revisione più recente, di `giorni da data_ultimo_cambio_stato × peso` (1.0 rosso, 0.5 giallo). Calcolo lato SQL in un'unica query (no N+1), `SECURITY INVOKER` (non definer) per restare soggetta alle RLS esistenti senza bisogno di passare `artigiano_id` dall'esterno. Riepilogo a contatori colorati per riga (pallino + numero). Verificato end-to-end con stack Supabase locale + Playwright (ambiente poi smontato completamente). **Non ancora eseguita sul progetto Supabase Cloud di produzione** (vedi "Prossimi passi aperti"). |
| 2026-07-26 | **Fix post-test end-to-end (4 fix) sul dettaglio Lavoro** — vedi sezione "Sprint D" più sotto per il dettaglio: (1) aggiunta la modifica del Lavoro dopo la creazione (descrizione, data di apertura `data_lavoro` — nuova colonna, migration `0015` —, indirizzo completo); (2) **"Segna lavoro completato" ora bloccato (client E server) se `lavoro_pronto_per_montaggio()` è falso** — supera esplicitamente la decisione dello Sprint C che lo lasciava sempre libero; (3) verificato (nessun fix necessario) che il flag `non_necessario` per gli appuntamenti `verifica_misure`/`montaggio` fosse già correttamente implementato dallo Sprint C; (4) convenzione UI uniformata in **tutti** i form dell'app: asterisco rosso sui campi obbligatori, nessuna etichetta testuale "(opz.)" sui facoltativi (impliciti per assenza di asterisco). |
| 2026-07-26 | **Fix 5 e 6 (stesso giro dei 4 fix sopra)** — vedi sezione "Sprint D" per il dettaglio: (5) azione **"Riapri lavoro"** su un Lavoro `completato`/`rifiutato`, con conferma nativa (`window.confirm`), che riporta lo stato al valore precedente logico (completato→accettato, rifiutato→opportunità) senza toccare satelliti/dati collegati; (6) voce di menu **"Statistica" attivata** (era placeholder "in arrivo"), nuova pagina `/statistiche` con lista minima dei Lavori chiusi (completato/rifiutato: titolo, cliente, data, stato, link al dettaglio), ordinata per `data_lavoro` decrescente, nessun KPI/grafico in questo giro. **Pulizia dati di prova eseguita in produzione prima del commit**: eliminati i 2 Lavori di test presenti sul progetto Supabase Cloud reale (incluso uno con `stato='completato'` nonostante satelliti bloccanti ancora rossi — sintomo di un test manuale precedente all'introduzione del gate del fix 2), via DELETE diretto con la service role key già presente in `.env.local`, cascata su tutte le tabelle figlie (già tutte `on delete cascade` dalla 0001/0009/0012, nessuna migration necessaria), verificato con una query di conteggio che `lavoro` risultasse a 0 righe; Clienti e Fornitori non toccati (nessuna FK nella direzione opposta). |
| 2026-07-26 | **Fix 7 (stesso giro dei fix 1-6 sopra)** — vedi sezione "Sprint D" per il dettaglio: bottone **"Testa credenziali"** in Profilo/Impostazioni (visibile solo se credenziali SMTP personali già salvate), che invia una vera email di prova a se stessi (mittente = destinatario = email dell'artigiano) riusando `sendEmailPersonale()` già esistente (nessun meccanismo di invio separato). Nuova `testaCredenzialiSmtp()` in `lib/profilo/actions.ts` e `traduciErroreSmtp()` in `lib/email/send-email-personale.ts` per tradurre gli errori grezzi di nodemailer (auth/connessione) in messaggi comprensibili. Nessuna migration. |
| 2026-07-26 | **Scoperti e corretti due bug di produzione tramite il bottone "Testa credenziali" del fix 7** — vedi sezione "Key learnings" per il dettaglio completo: (a) **porta 465 bloccata in uscita da apphub** (Hetzner o rete a monte, non l'OS/ufw del VPS — riproducibile identico verso Aruba e Google Workspace, porta 587 sempre aperta), che rendeva **anche** lo SMTP di sistema Aruba (inviti "a quattro mani") permanentemente non funzionante, non solo le credenziali personali; (b) **`SMTP_PASSWORD` troncata di un carattere a runtime** da Docker Compose, che interpreta `$$` in `env_file` come escape di un singolo `$` letterale (stesso comportamento della sezione `environment:`) — la password Aruba conteneva un `$` finale scritto come `$$`, arrivava all'app con un `$` in meno. **Fix applicato su apphub** (solo file `.env`, non tracciato nei sorgenti, backup lasciato accanto): `SMTP_PORT` 465→587, `SMTP_PASSWORD` con i `$` finali raddoppiati (4 invece di 2, per compensare l'escaping). Verificato byte-per-byte che il valore letto a runtime nel container corrisponda esattamente all'atteso, e con un invio reale (non solo `verify()`) di un'email in stile invito a un indirizzo di controllo, accettata da Aruba (`250 2.0.0 mail accepted for delivery`). **Codice applicativo** (`lib/email/send-email.ts`, `send-email-personale.ts`): timeout espliciti (`connectionTimeout`/`greetingTimeout`/`socketTimeout`, 12s) su entrambi i transport, e `secure`/`requireTLS` derivati automaticamente dalla porta in `send-email.ts` (non più da `SMTP_SECURE`, per evitare disallineamenti); UI di Profilo/Impostazioni aggiornata per raccomandare 587/STARTTLS come default. **Non ancora committato/pushato/deployato** — le correzioni `.env` su apphub sono già live (non richiedono deploy), il codice resta in attesa di conferma. |
| 2026-07-26 | **Unificazione provincia + sigla in un unico campo `sigla_provincia`** su `lavoro` e `fornitore_sede` (migration `0016`, uniche due tabelle con entrambi i campi separati — `cliente` non ha né provincia né sigla, `artigiano` ha solo `provincia` senza sigla separata: nessuna delle due coinvolta). Verificato prima di droppare `provincia`: 0 righe non nulle su `lavoro`, 1 sola su `fornitore_sede` ("Bologna"/"BO", già coerente con la sigla esistente) — nessuna perdita di dati, nessuna mappatura nome→sigla necessaria. Form (`lavoro-form.tsx`, `fornitore-sede-form.tsx`) ridotti a un solo campo, etichetta dinamica dal paese (`labelProvincia` da `lib/paesi.ts`, fallback "Sigla provincia" se il paese non ha quel concetto), sempre visibile (non condizionato al paese, a differenza del vecchio campo "Provincia" esteso). |
| 2026-07-26 | **Segnalazione "Indirizzo non specificato"** quando l'indirizzo di Lavoro o Fornitore_Sede è vuoto (`lavoro-info.tsx`, `fornitore-sede-card.tsx`), al posto di omettere la riga — Cliente non necessita dello stesso fix: il suo form è sempre visibile in chiaro (nessuna vista di sola lettura collassata), l'assenza di indirizzo è già evidente. **Bug scoperto nello stesso giro durante il test**: `formattaIndirizzo()` considerava "specificato" un indirizzo con la sola nazione valorizzata — capitava sempre per una nuova Sede fornitore, il cui form salva `nazione='Italia'` di default già alla creazione anche senza altri campi — vanificando la segnalazione. Corretto richiedendo che almeno via o città/CAP siano popolati prima di considerare l'indirizzo "specificato" (stessa correzione applicata a entrambi i componenti, anche se il Lavoro non lo manifestava nei test perché `creaLavoro()` non imposta mai `nazione` di default). |
| 2026-07-26 | **Bug in produzione: upload allegati falliva silenziosamente per file oltre 1MB** (foto da smartphone) — vedi sezione "Key learnings" per il dettaglio completo. Causa a due livelli, entrambi interni a Next.js (Nginx già aveva `client_max_body_size 20M`, non c'entrava): (1) le Server Actions hanno un limite di default di 1MB (`experimental.serverActions.bodySizeLimit`, non configurato); (2) un secondo limite **indipendente** da 10MB (`experimental.proxyClientMaxBodySize`, ex `middlewareClientMaxBodySize`) tronca silenziosamente il body a causa di `middleware.ts` attivo su ogni richiesta — scoperto solo empiricamente dopo aver alzato il primo limite, un file da 12MB falliva ancora. Il client (`satellite-allegati.tsx`) non aveva alcun try/catch attorno alla chiamata alla Server Action: l'eccezione restava un unhandled rejection invisibile, bottone bloccato su "Caricamento…" per sempre. **Fix**: entrambi i limiti alzati a 20MB in `next.config.ts` (coerente con Nginx), try/catch/finally aggiunto lato client con messaggio d'errore comprensibile. **Aggiunta anche una funzionalità richiesta in corso di fix**: le immagini (non i PDF) vengono ridimensionate server-side con `sharp` (nuova dipendenza esplicita in `package.json`, prima solo transitiva) a un lato massimo di 1920px, qualità 82 — verificato che una foto sintetica 4000×3000/12.18MB diventi 1920×1440/1.17MB (-90%), mentre un PDF di controllo resta identico byte-per-byte. |
| 2026-07-26 | **Due rifiniture alla visualizzazione dell'indirizzo** su Lavoro e Fornitore_Sede (stessa sessione del fix upload sopra): (1) "Indirizzo non specificato" mostrato in rosso (`text-red-600`, stesso colore già usato per errori/stati mancanti in tutta l'app, non introduce una nuova semantica); (2) quando l'indirizzo è compilato, il testo diventa un link a Google Maps (`https://www.google.com/maps/search/?api=1&query=<indirizzo urlencoded>`, nuovo `lib/indirizzo.ts` condiviso tra i due componenti), apribile in una nuova scheda (`target="_blank"`) — nessuna geocodifica/mappa integrata, solo un link diretto con l'indirizzo già pronto. **Cliente escluso** (non "dove applicabile" in questo caso): non ha campi indirizzo strutturati (solo un `indirizzo` testo libero) né una vista di sola lettura collassata — il suo form è sempre mostrato in chiaro, quindi non esiste un punto dell'interfaccia dove applicare né il rosso né il link. Verificato anche il comportamento reale del link in un browser senza cookie Google già accettati: mostra l'interstitial di consenso `consent.google.com` (normale, esterno all'app) con l'indirizzo corretto incapsulato nel parametro `continue=` — non un difetto del link. |
| 2026-07-26 | **Indagine su una presunta discrepanza dashboard/dettaglio — conclusa "non è un bug" più un miglioramento difensivo** — vedi sezione "Key learnings" per il dettaglio completo. `lavori_dashboard()`/`lavoro_pronto_per_montaggio()` risultavano già corrette e aggiornate (verificato con un test reale in produzione, account diagnostico usa-e-getta collegato temporaneamente a un Lavoro reale poi rimosso): i numeri "diversi" erano dovuti alla regola — allora ancora valida — che escludeva sempre gli Appuntamenti dal conteggio. **Migliorìa applicata comunque**: `lib/lavori/satelliti.ts` non invalidava mai `/lavori` (solo `/lavori/[id]`) dopo un cambio di stato satellite — aggiunto `revalidatePath('/lavori')` a tutte le 11 azioni, coerente col pattern già in uso in `lib/lavori/actions.ts`. Un controfattuale ha poi mostrato che, su questa versione di Next.js, `/lavori` è già una rotta pienamente dinamica (usa `cookies()`) con `staleTime` di default 0 per la cache router lato client — quindi il fix è corretto/difensivo ma non era la causa di una discrepanza riproducibile con la sola navigazione in-app. |
| 2026-07-31 | **Redesign leggibilità dettaglio Lavoro — header gerarchico + tabella satelliti con modale** (nessuna modifica a schema/logica di dominio). Header (`lavoro-info.tsx`): titolo + bottone "Modifica" (icona matita) sulla stessa riga, badge di stato scuro che unifica stato e data della transizione (es. "Accettato · 27/07/2026", usando `accettato_at`/`completato_at` — `rifiutato`/`opportunita` non hanno una data di transizione tracciata, badge senza data in quei casi), descrizione come paragrafo con separatore, poi metadati con icone (calendario per "Aperto il", pin per l'indirizzo, quest'ultimo invariato come link Google Maps). Box discorsivo "Satelliti ancora da completare: ..." sostituito da una tabella (`lavoro-satelliti-tabella.tsx`): colonne Satellite/Stato (pallino semaforo invariato + testo)/Azioni; **solo il nome è cliccabile** per aprire una modale nuova (`components/modal.tsx` — non esisteva alcuna modale nel progetto prima di questo giro, a differenza di quanto si ipotizzava inizialmente: il flusso Acquisti è in realtà un form che si espande inline, non una finestra modale) che monta lo stesso componente satellite già esistente così com'è oggi (nessuna vista "sola lettura" dedicata: resta quella implicita già gestita da ciascun componente in base a `isOwner`); la matita apre la stessa modale; il cestino elimina definitivamente previa conferma nativa (`confirm()`, stesso pattern già in uso per allegati/riapertura Lavoro). Modale: full-screen su mobile (~92vh, per scrivere comodamente note lunghe), centrata e stretta su desktop, chiusura su backdrop/Esc/X, scroll interno. Le catene di revisione (Progetto/Preventivo/ogni serie di Campione) restano una sola riga in tabella (la revisione corrente); Costruzione/Noleggio/Briefing restano righe singole. Nuova `eliminaSatellite()` (`lib/lavori/satelliti.ts`): per i tipi revisionabili risale `revisione_di` dalla riga corrente fino alla radice ed elimina nell'ordine leaf→radice (quella colonna non ha `on delete cascade`: eliminare solo la corrente lascerebbe "riemergere" la revisione precedente come nuova corrente, comportamento esplicitamente evitato). Verificato end-to-end (Supabase locale + Playwright, ambiente smontato a fine test, 34/34 controlli): eliminazione di una riga singola e di un'intera catena a 2 revisioni (verificato via query diretta che entrambe le righe spariscano dal DB), nessun overflow orizzontale su mobile, modale full-screen su mobile confermata via bounding box, contenuto delle modali (es. valore Preventivo) corretto. **Avvertenza non richiesta esplicitamente ma emersa implementando l'eliminazione generica**: Briefing, Progetto, Preventivo, Costruzione e Noleggio non hanno alcun flusso di ricreazione in UI (sono creati solo una volta dal trigger SQL `crea_satelliti_iniziali`/`crea_satelliti_post_accettazione`) — se eliminati non possono essere riaggiunti da "+ Aggiungi satellite", a differenza di Verifica misure/Montaggio/Acquisti/Lavorazione esterna/nuove serie di Campione che restano sempre ri-aggiungibili. La disponibilità dei flussi "+ Aggiungi satellite" per i tipi di esecuzione è stata quindi ancorata a `lavoro.stato` (accettato/completato) e non più a "esistono già righe di quel tipo", proprio per evitare che l'eliminazione di tutte le istanze di un tipo lasci l'utente senza modo di riaggiungerle. **Non ancora committato** — modifiche solo in working tree, in attesa di conferma. |
| 2026-07-26 | **Cambio di regola: gli Appuntamenti contano nel gate/dashboard** — sostituisce la decisione dello Sprint 3/A ("appuntamenti sempre esclusi da gate e conteggi"). Motivazione dell'utente: se un appuntamento necessario non viene fatto, il lavoro non può avanzare. Migration `0017`: `lavoro_pronto_per_montaggio()` e `lavori_dashboard()` non escludono più `tipo = 'appuntamento'`; un appuntamento è "verde" se `concluso=true` OPPURE `non_necessario=true` (stesso trattamento binario di `noleggio`, nessuno stato "giallo" possibile essendo le due condizioni complementari — verificato che non generi conteggi anomali). Aggiornato in parallelo il mirror JS `satellitiBloccantiMontaggio()` in `lib/lavori/satelliti-meta.ts` (stessa logica, per il messaggio "cosa manca"), e `satelliteTipoLabelBreve()` ora usa l'etichetta del sottotipo specifico (Briefing/Verifica misure/Montaggio) invece del generico "Appuntamento", utile perché più istanze dello stesso sottotipo possono essere bloccanti insieme. **Nessuna modifica a "Segna come accettato/rifiutato"**: quella transizione resta senza vincoli di gate, come deciso in precedenza — il cambio riguarda solo il conteggio dashboard e il gate di "Segna lavoro completato". Verificato end-to-end (Supabase locale + Playwright): un Lavoro con tutti i satelliti verdi tranne un Montaggio non concluso → gate falso, messaggio "cosa manca" cita "Montaggio" esplicitamente, bottone "Segna completato" disabilitato; concluso il Montaggio → gate vero, completamento riuscito. Verificato anche via chiamata diretta alla RPC `lavori_dashboard()` con un Lavoro reale (10 satelliti, 9 verdi incl. Briefing concluso e Verifica misure non_necessario, 1 rosso = Montaggio): conteggio esatto `{rossi:1, gialli:0, verdi:9}`, nessuna anomalia. |

## UI / Stile — linee guida

- Mobile-first, totalmente responsive, navigazione via menu hamburger a scomparsa.
- Palette: bianco/nero/grigio come base; colori "a LED" (rosso/giallo/verde) riservati agli stati; palette bottoni limitata e uniforme in tutta l'app.
- Tipografia: serif (stile logo) solo nel logo/marchio; sans-serif ovunque nell'interfaccia.
- Schermata più critica da disegnare per prima: dettaglio Lavoro, deve rendere evidente "cosa manca per andare avanti" (Attività aperte/bloccate/SLA superati, Fasi non concluse).

### Note tecniche emerse in fase di implementazione

- `sla_attivita`: PostgreSQL non ammette colonne nullable in una PRIMARY KEY, neanche con COALESCE nella definizione. Soluzione adottata: `id UUID PRIMARY KEY` surrogato + `CREATE UNIQUE INDEX` con espressione `COALESCE(artigiano_id, '00000000-...')` — funziona perché gli expression index supportano COALESCE, le PK no.
- `NEXT_PUBLIC_SUPABASE_URL` deve essere la base dell'URL senza path (es. `https://xxx.supabase.co`), non includere `/rest/v1/`.
- Admin RLS: nessun accesso diretto alle tabelle operative. Solo funzioni/view SQL con `SECURITY DEFINER` esporranno metriche aggregate. Il guard in `app/(admin)/layout.tsx` legge `is_admin` dalla tabella `artigiano`.
- **Ambiente dev**: Node.js 18 non è compatibile con Next.js 15/16 (richiede ≥20). Installato Node.js 20 via nvm (`nvm use 20`). Dev server: `npm run dev -- --port 3456`.
- **Fix Tailwind/Turbopack**: `@tailwindcss/oxide` non trova il binding nativo in modalità Turbopack. Fix: copiare `node_modules/@tailwindcss/oxide-linux-x64-gnu/tailwindcss-oxide.linux-x64-gnu.node` dentro `node_modules/@tailwindcss/oxide/`. Va rifatto se si cancella `node_modules`.
- Nessuna credenziale di connessione diretta Postgres (connection string) salvata in locale: le migration vengono applicate a mano via SQL Editor Supabase, non con `supabase db push`.

### 4) Convenzione asterisco sui campi obbligatori
Rimosse tutte le etichette testuali "(opz.)" (21 occorrenze in 11 file)
in favore di un **asterisco rosso** (`<span className="text-red-500">*</span>`)
accanto all'etichetta dei soli campi **obbligatori**; i facoltativi
restano impliciti per assenza di marcatura. Applicata in modo coerente
a tutti i form dell'app: registrazione, invito "a quattro mani", login,
password dimenticata/reset, Cliente, Fornitore/Sede/Contatto, Lavoro
(nuovo/standalone/modifica), e tutti i satelliti (Appuntamento,
Progetto/Preventivo/Campione, Ordine, Costruzione, Noleggio).

**Colore scelto (rosso, non un grigio neutro)**: coerente con l'uso
già esistente del rosso per i messaggi di errore nei form
(`text-red-600`), non introduce quindi una terza semantica di colore —
resta comunque distinto dal rosso "a LED" riservato agli stati dei
satelliti (un asterisco è un simbolo tipografico accanto a un'etichetta,
non un pallino di stato, il rischio di confusione è marginale e diverso
da quello già accettato per il logo/brand nella decisione del 19/7).

**Criterio usato per stabilire obbligatorio/facoltativo**: campi con
validazione client esplicita che blocca il submit se vuoti (o vincoli
`NOT NULL` a DB senza fallback) → asterisco; campi liberi/nullable →
nessun marcatore. **Select con un valore di default sempre presente**
(es. Nazione, Prefisso telefono, Sicurezza SMTP) non hanno ricevuto
asterisco: non possono essere lasciati vuoti dall'utente, quindi non
c'è ambiguità da segnalare. **Eccezione**: il campo Specializzazione
(registrazione e invito) **ha** l'asterisco pur essendo una `<select>`,
perché la sua opzione di default è "Seleziona..." (valore vuoto), non
un valore valido — può essere lasciato vuoto e la validazione lo
richiede esplicitamente.

## Revisione strutturale 2026-07-25 — Ciclo di vita Lavoro, Fornitori, ristrutturazione satelliti (Sprint A: schema)

> Questa sezione **supera/estende** la "Revisione strutturale 2026-07-19"
> precedente (vedi CLAUDE-ARCHIVIO.md, sezione "Revisione strutturale
> 2026-07-19"): cambia la macchina a stati
> del Lavoro, aggiunge indirizzo e flag tracking al Lavoro, completa le
> anagrafiche Fornitore (già esistenti dalla 0001 ma mai allineate al
> nuovo modello indirizzo), e ristruttura profondamente l'entità
> satellite (nuovi tipi, nuovi stati, nuovi campi, creazione
> automatica). **Sprint A = solo schema dati** — migration
> `0012_ristrutturazione_ciclo_vita_e_satelliti.sql` + funzioni SQL di
> supporto, nessuna modifica alla UI satelliti esistente. Confermato
> esplicitamente con l'utente: il vecchio codice UI/lib che legge lo
> schema satellite precedente (`lib/lavori/satelliti.ts`,
> `lib/lavori/satelliti-meta.ts`, `components/satellite-card.tsx`,
> `components/nuovo-satellite-form.tsx`, le query in
> `app/(app)/lavori/[id]/page.tsx`) **resta rotto a compile-time e
> runtime** fino allo Sprint B dedicato alla UI — non è stato toccato in
> questo giro, tranne il punto minimo isolato descritto sotto
> (necessario_preventivo/progetto).

### 1) Lavoro — nuova macchina a stati
`lavoro.stato` passa da `trattativa/esecuzione/chiuso` a un ciclo **a
transizioni sempre manuali**: `opportunita` (default alla creazione) →
`accettato` / `rifiutato` → `completato`. Migrazione dati dei valori
esistenti: `trattativa→opportunita`, `esecuzione→accettato`,
`chiuso→completato` (nessuna riga reale nota in produzione, ma la
migration normalizza comunque prima di stringere il check, per
sicurezza). `accettato_at` (timestamp storico già esistente, reso
"informativo" nella revisione del 19/7) **non è stato toccato**: resta
nello schema, ora ridondante con `stato='accettato'` — non era tra i
campi elencati per questo sprint, segnalato qui per consapevolezza
futura, non risolto.

Aggiunti a `lavoro`: indirizzo completo indipendente da quello del
Cliente collegato — `indirizzo, civico, cap, citta, provincia, sigla,
nazione` (tutti nullable, compilabili in qualsiasi momento) — e
`tracking boolean not null default false` (solo il campo: nessuna
logica di invio email/portale cliente, rimandata a uno sprint
dedicato).

**Rimossi** `necessario_preventivo`/`necessario_progetto` (introdotti
nella revisione del 19/7, mai arrivati a coprire un vero bisogno prima
di questa ristrutturazione). **Verifica fatta prima di rimuoverli come
richiesto**: risultavano referenziati in produzione in
`app/(app)/lavori/[id]/page.tsx` (query + props) e
`components/satelliti-section.tsx` (badge promemoria "manca ancora
il preventivo/progetto"), oltre che in `lib/types/database.types.ts`.
Segnalato esplicitamente, **l'utente ha scelto**: rimuovere le colonne
e fare comunque un pass minimo mirato SOLO a questi due campi (fuori
dallo scope stretto di "solo schema" di questo sprint, ma richiesto
esplicitamente per non lasciare due prop orfane isolate) — tolti i due
prop/badge da `satelliti-section.tsx` e le due colonne dalla query e
dai props in `lavori/[id]/page.tsx`; il resto della sezione satelliti
in quei due file resta non toccato e non compila comunque, per la
ristrutturazione più ampia dei punti 3-9 (vedi sopra).

### 2) Fornitori
`fornitore`/`fornitore_sede`/`fornitore_sede_contatto` **esistevano
già** dalla `0001_initial.sql` (previsti dal brief del 16/7, contrariamente
al sospetto iniziale che non fossero mai stati creati) — nessuna nuova
tabella, solo adattamento allo stesso modello indirizzo del Lavoro:
- `fornitore_sede`: aggiunti `civico, cap, provincia, sigla, nazione`
  (nullable); `citta` (era `not null`) reso nullable per coerenza col
  resto del blocco indirizzo; `indirizzo` già esistente e già nullable,
  riusato as-is. Il campo `nome` (label libera della sede, es. "Ferexpert
  Bologna") **non era nella lista richiesta ma non in conflitto con
  essa** — lasciato invariato: è tuttora l'unico modo in cui la UI
  esistente etichetta una sede, rimuoverlo avrebbe rotto
  `app/(app)/lavori/[id]/page.tsx` senza alcun beneficio.
- `fornitore_sede_contatto`: aggiunta `cognome` (nullable, per non
  invalidare eventuali righe esistenti prive di cognome); `telefono`
  **rinominato** a `cellulare` (stesso dato, nessuna perdita); **rimossi**
  `ruolo` e `destinatario_ordini` — nessun riferimento applicativo a
  nessuno dei due fuori da `0001`/`database.types.ts` (verificato),
  coerente con la decisione esplicita che la scelta del destinatario
  avviene ad ogni invio (Sprint C), non come flag fisso in anagrafica.

### 3) Satelliti — Appuntamento (entità unica)
`tipo_appuntamento` (era testo libero, "Briefing, rilievo,
presentazione...") diventa un **sottotipo vincolato**: `briefing`,
`verifica_misure`, `montaggio` (stesso nome di colonna per minimizzare
churn, ora con `check` sui valori + `not null` quando `tipo='appuntamento'`).
Dati legacy: eventuali righe con un valore fuori da questi tre (essendo
prima testo libero) vengono normalizzate a `briefing` prima di
applicare il nuovo check — fallback arbitrario ma innocuo, nessuna riga
nota in produzione.

`nota` **rinominata** `descrizione` (stesso identico contenuto/colonna,
solo il nome cambia per riflettere il nuovo significato: testo esteso
multi-riga, sempre facoltativo, compilabile sia prima che dopo
l'appuntamento). **Rimosso** il vecchio check "nota obbligatoria al
passaggio a `fatto`" (0009) — non più coerente col nuovo modello.

Il semaforo non usa più `stato` (che per `tipo='appuntamento'` è ora
sempre `NULL` — vincolato dal check generale) ma il nuovo flag
`concluso boolean not null default false` (false=rosso, true=verde).
Aggiunto `non_necessario boolean not null default false`, bloccato a
`false` quando `sottotipo='briefing'` tramite check `(tipo_appuntamento
<> 'briefing' or non_necessario = false)` — un briefing non può mai
essere segnato "non necessario". `data_appuntamento` (già esistente
dalla `0010`) riusata come campo "data" dell'appuntamento, invariata.
Più istanze dello stesso sottotipo sullo stesso Lavoro (es. più
appuntamenti di montaggio) erano già possibili prima (nessun vincolo di
unicità) e restano tali, nessuna modifica necessaria.

### 4) Satelliti — Progetto e Preventivo
Nuovo set di stati: `in_preparazione` (rosso) → `presentato` (giallo) →
`necessaria_revisione` (giallo) → `accettato` (verde) /
`non_necessario` (verde). La creazione automatica di una nuova
revisione quando lo stato passa a `necessaria_revisione` **resta
applicativa** (come oggi), da implementare nello Sprint B — questo
sprint prepara solo lo schema (colonna `revisione_di` già esistente,
riusata invariata).

**Stato "effettivo" per lo storico onesto**: nuova funzione
`lavoro_satellite_stato_effettivo(p_lavoro_id uuid)` (SQL, `stable`,
`security invoker`, stessa filosofia di `lavori_dashboard()`: nessun
`security definer`, legge con i permessi del chiamante, soggetta alle
RLS già esistenti su `lavoro_satellite`). Per ogni satellite di tipo
`preventivo`/`progetto`/`campione`, risale la catena `revisione_di` con
una CTE ricorsiva fino all'ultima revisione (quella senza successori);
se quell'ultima è in uno stato verde (`accettato`/`non_necessario`/
`approvato`), **tutte** le revisioni precedenti della stessa catena
appaiono con quello stato nel risultato della funzione — **senza alcuna
scrittura sulle righe reali**, che restano quello che sono davvero nel
DB (nessun trigger che riscrive lo storico, come richiesto). Chi legge
lo stato "vero" di una singola riga continua a interrogare
`lavoro_satellite.stato` direttamente; chi vuole lo stato "da mostrare"
userà questa funzione (consumo previsto dalla UI dello Sprint B).

`valore_complessivo`: **solo Preventivo**, non Progetto. **Discrepanza
corretta rispetto al codice esistente**: la `0009` (e
`lib/lavori/satelliti-meta.ts`, costante `TIPI_CON_VALORE`) includevano
già anche `progetto` fra i tipi con valore, contraddicendo la premessa
"invariato" del prompt di questo sprint — la migration ora non applica
più alcuna aspettativa di valore per `progetto` (nessun check DB lo
impediva né lo impedisce ora: resta una colonna nullable generica,
`progetto` semplicemente non dovrebbe più popolarla da Sprint B in poi).

`lavoro_pronto_per_montaggio()` aggiornata: verde per
preventivo/progetto ora è `stato in ('accettato', 'non_necessario')`
(prima solo `accettato`).

### 5) Satelliti — Campione
Stesso pattern a 5 stati di Progetto/Preventivo, lessico adattato:
`in_preparazione` (rosso) → `consegnato` (giallo) →
`necessario_nuovo_campione` (giallo) → `approvato` (verde) /
`non_necessario` (verde). Stessa funzione `lavoro_satellite_stato_effettivo`
(punto 4) copre anche `campione`.

Aggiunta colonna `serie text` per raggruppare le revisioni di una
stessa serie di campione (es. "campione ante" vs "campione maniglie"
sullo stesso Lavoro, ciascuna con la propria catena `revisione_di`
indipendente). **Reso `not null` quando `tipo='campione'`** (check
dedicato): senza un'etichetta di serie non sarebbe possibile
raggrupparle in UI. La coerenza "stessa serie lungo tutta la catena di
revisione" (ogni nuova revisione deve copiare il valore `serie` della
precedente) **resta una responsabilità applicativa** (Sprint B), non
imposta da un vincolo DB — validarla via trigger richiederebbe
camminare la catena `revisione_di` ad ogni insert, complessità non
giustificata per ora.

### 6) Allegati sui satelliti
Nuova tabella `lavoro_satellite_allegato` (`satellite_id` FK,
`nome_file`, `storage_path`, `data_caricamento`, stesso pattern di
`allegato` a livello Lavoro). **Nessuna restrizione di tipo** (a
differenza di `lavoro_satellite_articolo`, che resta vincolata via
trigger ad `acquisti`/`lavorazione_esterna`): la richiesta elenca
appuntamento/progetto/preventivo/campione come applicazione minima
("almeno"), non come lista esaustiva — un allegato ha senso su
qualunque satellite, nessun motivo tecnico per impedirlo altrove. Il
repository generale `allegato` (per Lavoro, non legato a un satellite)
resta invariato e disponibile in parallelo, come da richiesta.

### 7) Satelliti — Acquisti e Lavorazione esterna
`acquisto_materiale`/`acquisto_ferramenta` **accorpati** in un unico
tipo `acquisti`. Dati legacy migrati (`update ... set tipo = 'acquisti'`
prima di stringere il check su `tipo`) con sotto-categorizzazione
preservata nella nuova colonna `acquisto_categoria text check (... in
('materiale', 'ferramenta'))`, nullable, popolata dal vecchio `tipo`
per le righe esistenti — **scelta di tenerla** (il prompt lasciava la
decisione a discrezione): utile in UI per continuare a distinguere
visivamente un ordine ferramenta da uno pannelli anche se il fornitore
non li separa sempre lui stesso.

`lavoro_satellite_articolo` (righe testuali, niente prezzo) **estesa
anche a `lavorazione_esterna`** (prima solo acquisti): il trigger
`check_satellite_articolo_tipo()` ora accetta `satellite_id` di
satelliti `acquisti` **o** `lavorazione_esterna` — coerente con "stessa
logica identica" richiesta per i due tipi. `descrizione_libera` (colonna
esistente, prima unico contenuto testuale di `lavorazione_esterna`)
resta disponibile come campo descrittivo generale, non sostituita dalle
righe ma complementare.

Nuovi stati: **Acquisti** `da_acquistare` (rosso) → `acquistato`
(giallo) → `ricevuto` (verde) — nomi invariati dalla `0009`. **Lavorazione
esterna** `da_ordinare` (rosso) → `ordinato` (giallo) → `completato`
(verde) — **scelta esplicita tra le due varianti proposte nel prompt**
("da_acquistare/da_ordinare" e "acquistato/ordinato" e
"ricevuto/completato"): per Acquisti si mantiene il lessico "acquisto"
già in uso; per Lavorazione esterna si preferisce "ordinato/completato"
perché descrive meglio l'affidare un lavoro a un terzo (fabbro,
vetraio...) rispetto ad "acquistare" qualcosa, e per non mischiare
"acquistato" con un flusso che non passa da un catalogo Articolo.

Aggiunti (su entrambi i tipi) `data_invio_ordine timestamptz` e
`contatto_invio_id uuid references fornitore_sede_contatto(id)`: solo
spazio schema per registrare a chi/quando è stato inviato l'ordine —
nessuna logica di invio email in questo sprint (arriverà nello Sprint
C, come da richiesta). Più istanze dello stesso tipo sullo stesso
Lavoro (più ordini successivi): già supportato dal modello esistente
(nessun vincolo di unicità), nessuna modifica necessaria.

### 8) Satelliti — Costruzione
**Nessuna traccia trovata** di un tipo `costruzione` in nessuna
migration (`0009`/`0010`/`0011`) né in questa sezione di CLAUDE.md prima
di oggi — contrariamente a quanto ipotizzato nel prompt ("dovrebbero
esistere da un giro precedente"), il tipo **non esisteva affatto**.
Segnalato per trasparenza, poi introdotto qui da zero seguendo la
descrizione data: testo libero facoltativo (riusa `descrizione_libera`,
già generica in tabella) + `data_inizio timestamptz` (transizione
rosso→giallo) + `data_fine timestamptz` (transizione giallo→verde).
Stati: `da_iniziare` (rosso, `data_inizio` non ancora impostata) →
`in_corso` (giallo, `data_inizio` impostata) → `completata` (verde,
`data_fine` impostata) — il campo `stato` resta comunque la fonte di
verità principale (stesso pattern del resto della tabella), le due date
sono un tracciamento parallelo, non popolate automaticamente da un
trigger legato al cambio di `stato` (nessuna richiesta esplicita in tal
senso, evitato per non introdurre comportamento implicito non
richiesto).

### 9) Nuovo satellite — Noleggio
Nuovo tipo `noleggio`: `non_necessario boolean not null default false`;
`prenotazione_effettuata boolean not null default false` — semaforo
**binario** (false=rosso, true=verde, nessun giallo: `stato` resta
sempre `NULL` per questo tipo, stesso trattamento di `appuntamento`);
`data_da timestamptz`, `data_a timestamptz` (durata, entrambe nullable);
`costo numeric(12,2)` (nullable, check `>= 0` per coerenza con le altre
colonne economiche della tabella).

### 10) Creazione automatica dei satelliti — trigger SQL (non applicativa)
**Scelta**: implementata come **trigger a livello DB**, non come
logica applicativa rimandata allo Sprint B. Motivazione: lo stesso
principio già seguito per le RLS in questo progetto ("garanzia
strutturale, non solo nascosta in UI/codice") — un trigger garantisce
la creazione dei segnaposto indipendentemente da quale codice
crei/aggiorni un Lavoro in futuro (app Next.js, script, altra
integrazione), mentre una funzione applicativa richiederebbe che *ogni*
punto di creazione/transizione la richiami esplicitamente. Inoltre
resta coerente con lo scope "Sprint A: solo schema + funzioni SQL" del
prompt, senza toccare `lib/lavori/actions.ts`.

Due funzioni/trigger, entrambe `security definer` (necessario: al
momento dell'`INSERT` su `lavoro`, la riga owner in `lavoro_artigiani`
**non esiste ancora** — viene creata dall'applicazione nello statement
successivo, stesso ordine già noto dal fix della `0006` — quindi
`is_owner_del_lavoro()` risulterebbe `false` e l'`INSERT` sui satelliti
verrebbe respinto dalla RLS `"lavoro_satellite: scrittura solo owner"`
se il trigger girasse con i permessi del chiamante; `security definer`
bypassa il problema, stesso pattern già usato per
`possiede_cliente_del_lavoro`/`handle_new_artigiano`). Entrambe con
`search_path = public` esplicito e **`EXECUTE` revocato da `PUBLIC`,
`anon` e `authenticated`** (non devono mai essere chiamabili
direttamente, solo innescate dal trigger — stesso trattamento già
riservato a `handle_new_artigiano` nella `0005`, verificato allora che
non serve alcun grant perché l'esecuzione via trigger non passa dal
controllo `EXECUTE` di una chiamata diretta):

- `crea_satelliti_iniziali()` (`after insert on lavoro`): crea
  Appuntamento(`briefing`), Progetto, Preventivo, Campione (prima serie,
  `serie = 'Serie 1'`), tutti nello stato iniziale rosso/`in_preparazione`.
- `crea_satelliti_post_accettazione()` (`after update on lavoro when
  new.stato = 'accettato' and old.stato is distinct from 'accettato'`):
  crea Appuntamento(`verifica_misure`), Acquisti, Lavorazione_esterna,
  Costruzione, Noleggio, Appuntamento(`montaggio`), tutti come
  segnaposto nello stato iniziale. **Guardia di idempotenza aggiunta**
  (non richiesta esplicitamente ma economica): se il Lavoro dovesse
  transitare `accettato → rifiutato → accettato` di nuovo, il trigger
  **non ricrea** un secondo set di segnaposto se esiste già almeno un
  satellite di uno dei quattro tipi non-appuntamento introdotti da
  questo evento (`acquisti`/`lavorazione_esterna`/`costruzione`/
  `noleggio`) — evita un doppione confuso in caso di andirivieni sullo
  stato, senza impedire comunque le aggiunte manuali successive.

**Segnalazione esplicita come richiesto**: creare 4+6 segnaposto vuoti
in un colpo solo può risultare tanto per un artigiano alle prime armi —
soprattutto il secondo evento (6 satelliti insieme all'accettazione).
Procedo comunque con questa logica come base indicata, ma è un punto
da **rivalutare con l'utente** una volta vista la UI reale dello
Sprint B (es. possibile mostrare i segnaposto collassati/raggruppati
finché non vengono toccati, invece di 6 card vuote subito in evidenza).

Il trigger `set_satellite_data_ultimo_cambio_stato()` (dalla `0009`,
aggiorna `data_ultimo_cambio_stato`) è stato **esteso** per scattare
anche su cambio di `concluso` (appuntamento) e `prenotazione_effettuata`
(noleggio), non solo su `stato` — altrimenti quei due tipi (che non
usano `stato`) non aggiornerebbero mai questo timestamp, rilevante per
un futuro calcolo di urgenza in dashboard che li includa.

### 11) Gate "pronto per il montaggio" — aggiornato
`lavoro_pronto_per_montaggio()` riscritta per il nuovo set di tipi
bloccanti: `acquisti`, `lavorazione_esterna`, `costruzione`, `noleggio`
(oltre a `preventivo`/`progetto`/`campione`, già trattati ai punti 4-5)
devono essere tutti in stato verde/accettato/non_necessario per non
bloccare il gate. Gli appuntamenti (incluso il sottotipo `montaggio`,
ora parte della stessa entità Appuntamento) restano sempre esclusi dal
calcolo, invariato.

### Verifica locale (Sprint A)
Testata con Postgres 17 in Docker + shim (stesso metodo delle migration
`0004`-`0007`: schema `auth` minimale, `auth.uid()`, ruoli
`anon`/`authenticated` con gli stessi default privileges di un progetto
Supabase reale, migration `0001`→`0012` applicate in sequenza),
ambiente poi smontato — nessuna modifica a Supabase Cloud, nessun
deploy, come richiesto esplicitamente.

### Bug trovato in fase di applicazione reale su Supabase Cloud (2026-07-25)
Primo tentativo di applicare `0012` su Supabase Cloud fallito:
`lavoro_satellite_tipo_stato_check` violato da una riga reale
(`tipo='campione'`, `stato='da_preparare'`, creata il 19/7 — con ogni
probabilità un satellite reale del vecchio modello, non dato di test).
Causa: la migration migrava il vecchio vocabolario stato solo per
`acquisto_materiale/ferramenta` (→ `acquisti`) e per `appuntamento`, ma
**non** per `campione` (vecchio: `da_preparare/preparato/
ricevuto_dal_cliente`) né per `lavorazione_esterna` (vecchio:
`da_consegnare/in_lavorazione/completata`) — entrambi vocabolari
diversi da quelli introdotti dalla `0012`. Diagnosticato con una query
di sola lettura (simulazione della stessa trasformazione tipo/stato
della migration, eseguita dall'utente nello SQL Editor) prima di
decidere come intervenire, invece di modificare a scatola chiusa.
Trovato anche un secondo problema collegato (non ancora emerso perché
il primo check blocca prima): `serie`, colonna nuova richiesta
obbligatoria per `campione` dal check `lavoro_satellite_campione_serie_check`,
resterebbe `NULL` per questa stessa riga esistente.
**Corretta direttamente la migration `0012`** (non creata una nuova
migration numerata): non era mai stata applicata con successo da
nessuna parte — il fallimento del check ha fatto rollback dell'intera
transazione, quindi Supabase Cloud restava comunque fermo allo schema
`0011` — trattarla come "primo tentativo fallito da correggere sul
posto" anziché come "migration già in produzione da non riaprire",
stesso principio già seguito per la prima versione (mai deployata) del
fix della `0006`. Aggiunte le due `UPDATE` mancanti (mappatura vecchio→
nuovo vocabolario per `campione` e, difensivamente, per
`lavorazione_esterna`, anche se nessuna riga nota lo richiedeva) più un
backfill `serie = 'Serie 1'` per righe `campione` preesistenti senza
serie — inserite prima del blocco "Nuovi check", stesso punto in cui
già vivevano le migrazioni dati analoghe per acquisti/appuntamento.
**Ancora da ri-applicare per intero su Supabase Cloud** (non fatto in
questa sessione).

### Prossimi passi aperti (aggiornato)
- **Eseguire `supabase/migrations/0015_lavoro_data_apertura.sql` sul
  progetto Supabase Cloud** (SQL Editor) — testata in locale, non
  ancora applicata in produzione, stesso limite di tutte le migration
  precedenti. **Unica migration introdotta in questo Sprint D
  complessivo** (fix 1-7): nessuno degli altri fix ha richiesto
  modifiche di schema.
- ~~Verificare che `SMTP_CREDENZIALI_KEY` sia configurata sul VPS~~ —
  **verificato**: già presente in `/srv/apps/districo/.env` su apphub
  (non tracciata nei sorgenti, come atteso). Il fix 7 può funzionare in
  produzione senza altre azioni manuali oltre al deploy.
- **Deployare il codice del fix descritto in "Key learnings"** sotto
  (timeout nodemailer, derivazione automatica secure/requireTLS dalla
  porta, default UI 587/STARTTLS) — le correzioni `.env` su apphub
  (porta + password) sono già live indipendentemente dal deploy del
  codice, ma il codice resta da committare/pushare/deployare.
- **L'artigiano deve aggiornare le proprie credenziali SMTP personali**
  (quelle usate dal bottone "Testa credenziali"/invio ordini) da porta
  465 a 587/STARTTLS in Profilo/Impostazioni — non è qualcosa che il
  codice/l'infrastruttura possano correggere da soli, sono dati salvati
  per singolo artigiano.
- ~~Eseguire `supabase/migrations/0016_unifica_sigla_provincia.sql`~~ —
  **fatto**: applicata su Supabase Cloud e deployata insieme al codice,
  verificato via REST che `sigla_provincia` esista e `provincia` non
  esista più su `lavoro`/`fornitore_sede`.
- **Eseguire `supabase/migrations/0017_appuntamenti_nel_gate.sql` sul
  progetto Supabase Cloud** (SQL Editor) — testata in locale, non
  ancora applicata in produzione. Aggiorna `lavoro_pronto_per_
  montaggio()` e `lavori_dashboard()` per includere gli appuntamenti nel
  calcolo (vedi riga in tabella e "Key learnings" più sotto): va
  applicata **insieme** al deploy del codice (mirror JS in
  `satelliti-meta.ts` aggiornato nello stesso commit), altrimenti gate
  SQL e messaggio "cosa manca" lato client andrebbero temporaneamente
  fuori sincrono.
- (voci precedenti non ancora affrontate restano valide sopra)

## Key learnings — blocco porta 465 e escaping `$` in Docker Compose (2026-07-26)

> Sezione dedicata a due bug di produzione scoperti lo stesso giorno
> tramite il bottone "Testa credenziali" del fix 7 (Sprint D), entrambi
> capaci di ripresentarsi in futuro con altre credenziali/provider —
> vale la pena conoscerli **prima** di perdere tempo a debuggare da capo.

### 1) apphub (Hetzner) blocca la porta 465 in uscita
Riscontrato prima con un timeout indefinito sul bottone "Testa
credenziali" (Google Workspace, porta 465), poi confermato in modo
sistematico:

- `nc -zv smtp.gmail.com 465` e `nc -zv smtps.aruba.it 465` → **timeout**
  (non "connection refused": i pacchetti vengono scartati in silenzio,
  sintomo tipico di un blocco di rete, non di un servizio assente).
  Riproducibile identico sia dall'host apphub sia da dentro il
  container `districo` — non è quindi un problema di rete Docker.
- `nc -zv <stesso host> 587` → aperta e istantanea, per **entrambi** i
  provider.
- `ufw status`/`iptables -L OUTPUT` su apphub: `default: allow
  (outgoing)`, nessuna regola che blocchi la 465 — **il blocco non è
  configurato da noi sull'OS del VPS**, è quasi certamente Hetzner (o
  la rete a monte) che filtra la 465 in uscita, pratica comune di molti
  provider cloud per contenere lo spam via SMTPS diretto, lasciando
  aperta la 587 ("submission", richiede sempre autenticazione).
- **Non risolvibile lato applicazione**: l'unico fix reale è smettere
  di usare la 465 e passare alla 587/STARTTLS (verificato funzionante
  con `requireTLS: true` sia verso Aruba sia — a livello di rete, non
  ancora testato con credenziali reali — verso Google). Se in futuro
  serve davvero la 465 (es. un provider che non supporta STARTTLS),
  va aperta una richiesta di supporto a Hetzner, non è un problema
  risolvibile da qui.
- **Impatto**: bloccava sia le credenziali SMTP personali configurate
  dagli artigiani (fix 7) sia — scoperta più seria — lo SMTP di sistema
  Aruba usato per gli inviti "a quattro mani" fin dal suo primo
  deploy (17/7), mai verificato con un invio reale in precedenza (i
  test end-to-end di quella funzionalità avevano sempre usato Mailpit
  in locale, mai il vero account Aruba in produzione).

### 2) Docker Compose tronca i caratteri `$` nelle password di `env_file`
Scoperto testando dal vivo l'autenticazione SMTP di sistema (Aruba) su
587: la connessione/TLS riuscivano, ma l'autenticazione falliva sempre
con `535 5.7.0 authentication failed` — nonostante password e host
fossero quelli giusti secondo `/srv/apps/districo/.env`.

- Confronto lunghezza: il valore di `SMTP_PASSWORD` nel file `.env`
  aveva **9 caratteri**, ma `docker exec districo printenv
  SMTP_PASSWORD` ne mostrava **8** — un carattere sparito tra il file e
  il runtime.
- Causa: la password finiva con `$$` nel file (probabilmente scritta
  così di proposito, per un'abitudine da riga di comando dove `$$`
  scappa un `$` letterale). **Docker Compose applica la stessa
  interpolazione `$$` → `$` sia alla sezione `environment:` sia — meno
  atteso — ai valori letti tramite `env_file:`**. Un singolo `$`
  letterale in una password, se scritto senza raddoppiarlo, sopravvive
  intatto; ma se qualcuno lo scrive raddoppiato (pensando fosse
  necessario, o perché quella era la password originale con due `$`
  veri), Compose lo dimezza silenziosamente — nessun errore, nessun
  avviso, l'app riceve semplicemente una password diversa da quella nel
  file, e il server SMTP la rifiuta con un banale "authentication
  failed" indistinguibile da una password sbagliata per errore umano.
- **Verificato empiricamente quale fosse la password "vera"**: testando
  dal vivo `transporter.verify()` con il valore grezzo del file (9
  caratteri, 2 `$`) l'autenticazione riusciva; con il valore troncato
  dal container (8 caratteri, 1 `$`) falliva. La password reale
  dell'account Aruba termina quindi con due `$` letterali.
- **Fix**: raddoppiare ulteriormente i `$` nel file (`$$` → `$$$$`), così
  che dopo l'escaping di Compose arrivino a runtime i due `$` letterali
  corretti — verificato byte-per-byte confrontando lunghezza attesa
  (file meno 2 caratteri) col valore letto da `printenv` dentro il
  container dopo il riavvio.
- **Verificato che nessun'altra variabile in `.env` fosse affetta**:
  `SMTP_PASSWORD` è l'unica con un `$` letterale tra tutte le chiavi
  del file (comprese le chiavi Supabase e `SMTP_CREDENZIALI_KEY`, che
  per costruzione — base64/JWT — non contengono quel carattere).
- **Da ricordare per il futuro**: qualunque credenziale con caratteri
  `$` scritta in un `.env` letto tramite `env_file:` in Docker Compose
  va **raddoppiata rispetto al valore reale** (ogni `$` singolo →
  `$$`), non scritta "a specchio" pensando che `env_file` sia trattato
  alla lettera come spesso si assume. Vale anche per altri simboli con
  significato speciale per Compose (`${...}` per riferimenti a
  variabili) — non solo `$`.

## Key learnings — upload allegati oltre 1MB falliva silenziosamente (2026-07-26)

Segnalato come bug in produzione: caricare una foto (da smartphone,
quindi tipicamente 2-10MB) su un satellite/Lavoro non dava alcun errore
visibile, il file semplicemente non veniva salvato.

### Diagnosi (tre livelli, solo gli ultimi due erano il problema)
1. **Nginx**: `client_max_body_size 20M` già impostato su
  `districo.conf` (fix dell'8/7, per un problema diverso legato ai
  cookie di sessione) — non era il collo di bottiglia, verificato per
  primo ed escluso.
2. **Next.js Server Actions**: `caricaAllegatiSatellite()` è una
  Server Action (`'use server'`), non una API route con un limite
  configurabile a parte. Next.js applica un limite di default di
  **esattamente 1MB** alle Server Actions
  (`experimental.serverActions.bodySizeLimit`, non impostato in
  `next.config.ts`) — oltre quella soglia lancia un `ApiError(413,
  "Body exceeded 1 MB limit...")`, confermato leggendo il sorgente
  Next.js (`node_modules/next/dist/server/app-render/action-handler.js`).
3. **Un secondo limite indipendente, scoperto solo testando dal vivo
  dopo aver alzato il primo**: alzato `serverActions.bodySizeLimit` a
  20MB, un file da 12MB falliva ancora, con un errore diverso
  (`Error: Unexpected end of form`) e questa riga nei log del server:
  `Request body exceeded 10MB ... Only the first 10MB will be
  available unless configured`. Causa: `middleware.ts` (attivo su
  **ogni** richiesta, per l'autenticazione) fa clonare a Next.js il
  body della richiesta, e quella clonazione ha un limite proprio,
  **separato** da quello delle Server Actions — default 10MB, tronca
  silenziosamente invece di rifiutare, corrompendo il multipart a metà
  e producendo l'errore di parsing a valle. Il nome della config è
  cambiato tra versioni Next.js: `middlewareClientMaxBodySize` (vecchio,
  deprecato) → `proxyClientMaxBodySize` (attuale, in questa versione
  16.2.10) — impostarli entrambi contemporaneamente è un errore di
  configurazione esplicito (Next.js lo rifiuta all'avvio).
4. **Il client inghiottiva comunque l'errore**: `satellite-allegati.tsx`
  chiamava `await caricaAllegatiSatellite(...)` senza try/catch. Quando
  l'azione lanciava (invece di restituire `{ok:false}`), la promise
  veniva rifiutata senza essere gestita: `setLoading(false)` non veniva
  mai raggiunto (bottone bloccato su "Caricamento…" per sempre) e
  nessun messaggio d'errore appariva in UI — l'unica traccia era un
  errore in console, invisibile a un utente reale.

**Riprodotto empiricamente prima di applicare qualunque fix**: build di
produzione locale (non dev mode, per fedeltà a ciò che gira su
apphub) + Playwright, file da 500KB (funziona) vs 8MB (fallisce con
500, bottone bloccato, nessun errore in UI) — così da confermare la
diagnosi con dati reali invece che per sola lettura del codice.

### Fix applicato
- `next.config.ts`: entrambi i limiti alzati a **20MB**
  (`serverActions.bodySizeLimit` e `proxyClientMaxBodySize`), coerenti
  con il `client_max_body_size` di Nginx.
- `satellite-allegati.tsx`: `try/catch/finally` attorno alla chiamata
  alla Server Action — `finally` garantisce che `setLoading(false)`
  scatti sempre, il `catch` mostra un messaggio comprensibile invece di
  fallire in silenzio.
- **Richiesta aggiuntiva emersa durante il fix**: ridimensionare le
  immagini (non gli altri tipi di file, es. PDF) in fase di upload, per
  ridurre lo spazio occupato sul volume `uploads` del VPS e il peso
  delle foto da smartphone (spesso 3000-4000px, diversi MB, ben oltre
  quanto utile per la visualizzazione in un'app web). Implementato
  **server-side** (non nel browser): più semplice, nessun aumento del
  bundle client, nessun problema di compatibilità browser/HEIC/EXIF da
  gestire lato client, e comunque necessario ricevere il file per
  intero prima di poterlo processare. Nuova dipendenza esplicita
  `sharp` in `package.json` (prima solo transitiva, usata da uno script
  una tantum per le favicon — ora è un requisito runtime dell'app,
  quindi dichiarata esplicitamente); verificato che i binari nativi
  `sharp-linuxmusl-x64` necessari per l'immagine Docker `node:20-alpine`
  siano risolti correttamente da `npm ci` nello stage di build.
  `ridimensionaSeImmagine()` in `lib/lavori/allegati.ts`: solo se
  `file.type` inizia con `image/`, resize al lato massimo **1920px**
  (`fit: 'inside'`, `withoutEnlargement` per non ingrandire immagini già
  più piccole), qualità **82** per JPEG/WEBP, `{ animated: true }` per
  preservare i frame di GIF/WEBP animati, `.rotate()` per applicare
  l'orientamento EXIF (comune nelle foto da smartphone) prima di
  rimuoverlo dai metadati. Fallback silenzioso al file originale se
  `sharp` non riesce a decodificare l'immagine, per non bloccare mai un
  upload a causa di un problema di ottimizzazione secondaria.

**Verificato end-to-end** (stesso ambiente Supabase locale + build di
produzione + Playwright): foto sintetica 4000×3000/12.18MB caricata con
successo (prima falliva), salvata su disco a 1920×1440/1.17MB (-90%);
PDF di controllo da 3MB caricato e rimasto **identico byte-per-byte**
(non tocca alcun file non-immagine); nessun errore residuo, bottone
mai bloccato. Ambiente smontato al termine; `npm run build`/
`tsc --noEmit`/`eslint` puliti sull'intero progetto.

## Key learnings — dashboard "sbagliata" che in realtà non lo era, e appuntamenti nel gate (2026-07-26)

Segnalato: il conteggio rosso/giallo/verde in dashboard non corrispondeva
al conteggio manuale fatto aprendo il dettaglio di un Lavoro reale.

### Prima ipotesi (sbagliata): `lavori_dashboard()` non aggiornata dopo Sprint A/B/C
Confrontando la migration `0011` (originale) con la `0013` (fix
successivo, "or replace" sulla stessa funzione), la `0013` copriva già
tutto correttamente: `acquisti` unificato, nuovi stati progetto/
preventivo/campione, `costruzione`, `noleggio`. **Verificato empiricamente
che la `0013` fosse davvero live in produzione** (non dava per scontato
bastasse leggere il codice): creato un account diagnostico usa-e-getta,
collegato temporaneamente come ospite/accettato a un Lavoro reale
("Sistemazione terrazzo coperto"), autenticato con quella sessione,
chiamata la RPC reale — risultato identico al conteggio manuale sui dati
grezzi (6 rossi, 0 gialli, 1 verde). Stesso esito sul secondo Lavoro
reale. Account e collegamento rimossi subito dopo, nessuna traccia
residua. **Ipotesi scartata**: la funzione era corretta.

### Seconda ipotesi (parzialmente utile, ma non la causa): cache di Next.js
`lib/lavori/satelliti.ts` invalidava solo `/lavori/[id]`, mai `/lavori`,
dopo un cambio di stato satellite — a differenza di `lib/lavori/
actions.ts`, che invalida correttamente entrambi. Aggiunto
`revalidatePath('/lavori')` a tutte le 11 azioni per coerenza. **Un
controfattuale rigoroso** (stessa azione con e senza la riga aggiunta,
confrontata) ha però mostrato che il conteggio era già corretto anche
SENZA il fix: `/lavori` usa `cookies()` quindi è una rotta interamente
dinamica, e il client Router Cache di Next.js ha `staleTime` di default
0 per le rotte dinamiche — nessuna cache da invalidare nella normale
navigazione in-app. Il fix resta applicato (corretto, difensivo, coerente
col resto del codice) ma **non spiegava** il sintomo originale.

### La vera spiegazione: non era un bug, era la regola di design esistente
L'utente ha fornito i numeri esatti che vedeva. Rifacendo i conti a
mano: sottraendo gli Appuntamenti (Briefing, Verifica misure, Montaggio
— esclusi dal conteggio per una decisione presa fin dallo Sprint 3) dal
totale dei pallini contati manualmente sulla pagina, i numeri tornavano
**esattamente** uguali a quelli mostrati in dashboard, in tutti e tre i
confronti forniti (rossi, verdi, rossi della fase di esecuzione).
Nessun bug: la dashboard faceva esattamente quello per cui era stata
progettata — semplicemente l'utente non teneva conto dell'esclusione
appuntamenti nel proprio conteggio manuale.

**Lezione**: quando un utente riporta "i numeri non tornano", la cosa
più efficace è chiedere i numeri esatti e rifare il conto a mano con le
regole *attuali*, prima di assumere che la logica applicativa sia
sbagliata — specialmente quando quella logica è già stata verificata
empiricamente contro un caso reale.

### Cambio di regola conseguente: gli appuntamenti ora contano
Discussa la spiegazione, l'utente ha deciso di **cambiare la regola**
invece di lasciarla com'era: un appuntamento necessario non fatto blocca
comunque l'avanzamento del lavoro, quindi non ha senso escluderlo dal
gate. Vedi migration `0017` e la riga in tabella sopra per il dettaglio
dell'implementazione. Punto tecnico degno di nota: `lavoro_pronto_per_
montaggio()` e `lavori_dashboard()` condividono lo stesso pattern
`rilevante`/`rosso`/`verde` per ogni tipo di satellite — aggiungere un
nuovo tipo (o, come qui, includerne uno prima escluso) richiede la
stessa modifica speculare in entrambe le funzioni SQL **più** il mirror
JS `satellitiBloccantiMontaggio()`, che deve restare sincronizzato a
mano (non è generato dalla stessa fonte) — tenerlo a mente per il
prossimo cambio di questo tipo.

## Cronologia Campione e semantica colore "necessaria revisione" (2026-07-26)

**Bug segnalato dall'utente**: il dettaglio Lavoro non mostrava la
cronologia completa di un Campione con più tentativi nella stessa
serie in modo utile — la revisione rifiutata veniva mostrata gialla
("Consegnato") invece di rossa, e una volta approvato il tentativo
finale la storia veniva **retro-proiettata** a verde/"Approvato" anche
sulla revisione originariamente rifiutata, cancellando di fatto la
prova che un tentativo era stato respinto dal cliente.

**Fix 1 — colore "necessaria revisione" spostato da giallo a rosso**,
per **tutti** i tipi revisionabili (preventivo/progetto/campione), non
solo Campione: `necessaria_revisione`/`necessario_nuovo_campione` sono
un rifiuto esplicito che richiede una nuova iterazione, non una
semplice attesa di risposta come `presentato`/`consegnato` — trattarli
come giallo li rendeva visivamente indistinguibili da uno stato di
attesa normale. Implementato in `coloreRevisionabile()`
(`lib/lavori/satelliti-meta.ts`).

**Fix 2 — niente più retro-proiezione dello stato per Campione**: la
regola Sprint B ("se l'ultima revisione della catena è verde, tutte le
revisioni superate mostrano quello stesso stato") resta valida per
Preventivo/Progetto (dove ha senso: una volta accettato il preventivo,
le versioni precedenti sono semplicemente superate, non "rifiutate" in
senso stretto), ma per Campione nascondeva il motivo di un rifiuto reale
del cliente. Aggiunto un nuovo prop `storicoConStatoReale?: boolean` a
`RevisionabileChain` (`components/satellite-revisionabile.tsx`): se
`true`, lo storico mostra lo stato **reale** della riga (colonna
`stato`, mai la funzione `lavoro_satellite_stato_effettivo()`) invece
di quello retro-proiettato. Attivato solo per Campione
(`components/satellite-campione.tsx`), Preventivo/Progetto invariati.
Nessuna migration necessaria: la funzione SQL
`lavoro_satellite_stato_effettivo()` resta invariata e continua a
essere usata da Preventivo/Progetto — per Campione la UI semplicemente
non la consulta più per lo storico.

Verificato end-to-end (Supabase locale + Playwright, ambiente smontato
a fine test) riproducendo esattamente la sequenza: campione rosso →
consegnato (giallo) → rifiutato (ora rosso, non più giallo) → nuovo
tentativo con nuova descrizione (rosso, descrizione precedente ancora
visibile in storico) → consegnato (giallo) → approvato (verde) — con
verifica esplicita che il tentativo rifiutato **resti** rosso/"Necessario
nuovo campione" anche dopo l'approvazione finale del tentativo
successivo, invece di essere ridipinto verde/"Approvato".

## Key learnings — Cloudflare WAF (CVE-2025-55183) blocca falsamente le Server Actions su /lavori/ (2026-07-26)

Segnalato: upload di alcuni allegati falliva con un errore generico
("Errore nel caricamento del file..."), in modo apparentemente casuale —
non correlato a dimensione o formato del file (file identici, in alcuni
tentativi passavano, in altri no). La diagnosi iniziale aveva escluso sia
HEIC/HEIF (i file erano `.jpg` normali da PC) sia i limiti di body size
(già corretti in precedenza) sia un bug nel codice applicativo: i log del
container e di Nginx non mostravano **nessuna traccia** dei tentativi
falliti — la richiesta non arrivava mai all'origine.

**Causa reale**: il dominio `districo.it`/`www.districo.it` risulta
proxato attivamente da **Cloudflare** (non solo DNS, come documentato il
17/7 — evidentemente il proxy è stato attivato in un secondo momento,
non tracciato in questo file). Il piano Cloudflare in uso applica di
default una regola WAF gestita per **CVE-2025-55183** ("React - Leaking
Server Functions", `ruleId 3114709a3c3b4e3685052c7b251e86aa`,
`rulesetId 77454fe2d30c4220b5701f6fdfb893ba`) — un "virtual patch" per
una vulnerabilità reale (CVSS 5.3, divulgata da React/Vercel a dicembre:
una richiesta creata ad hoc verso una Server Action può far trapelare il
codice sorgente compilato della funzione). **Districo non è vulnerabile**:
gira su Next.js 16.2.10, ben oltre la versione patchata 16.0.10 per il
ramo v16 — ma la regola Cloudflare, essendo euristica/basata su pattern
del traffico, genera **falsi positivi contro le nostre stesse richieste
legittime**: qualunque POST verso `/lavori/[id]` (Server Action, incluso
l'upload allegati) aveva una probabilità casuale di essere bloccata,
confermato dai Security Events di Cloudflare (blocchi ripetuti nell'arco
di ore, su path diversi, prima ancora che l'utente segnalasse il problema
di oggi).

**Perché è stato difficile da diagnosticare**: il blocco avviene
interamente al bordo di Cloudflare, **prima** che la richiesta raggiunga
Nginx/il container — quindi non lascia alcuna traccia nei log
applicativi né in quelli di Nginx. Lato client, l'unico sintomo era il
fallimento (generico) della chiamata alla Server Action, indistinguibile
a prima vista da un errore di rete o applicativo qualsiasi. Individuato
solo consultando **Cloudflare → Security → Events**, non consultabile
da qui (nessun accesso API/dashboard Cloudflare disponibile in questa
sessione) — l'utente ha dovuto controllarlo manualmente.

**Fix applicato (lato Cloudflare, non nel codice)**: creata una Custom
Rule su Cloudflare — azione "Skip - All managed rules" per le richieste
con path contenente `/lavori/` — che esenta questa sezione dell'app dalle
regole del ruleset gestito, invece di disattivare la regola
sull'intero account (che potrebbe coprire anche altre app sullo stesso
account Cloudflare — Falegname in Cloud, Scattimiei — non
necessariamente già patchate contro la stessa CVE). Verificato con un
upload reale in produzione dopo l'applicazione della Custom Rule:
riuscito.

**Da ricordare per il futuro**: se un'azione lato server (Server Action)
fallisce in produzione in modo intermittente/casuale, senza alcuna
traccia nei log del container o di Nginx, il primo sospetto — prima di
scavare nel codice applicativo — dovrebbe essere un blocco a livello di
Cloudflare (o di qualunque proxy/CDN davanti all'origine): verificare
anzitutto se il dominio è proxato (header `server: cloudflare`, IP
risolti sul range Cloudflare invece che sull'IP diretto del VPS) e
controllare i Security Events per blocchi corrispondenti a orario/path,
prima di assumere che la causa sia nell'app.

## Quattro fix rapidi UI/UX dettaglio Lavoro, da test reale (2026-07-26)

1) **Link "torna indietro"**: nel dettaglio Lavoro, il link in alto puntava
al dettaglio Cliente (`← [Nome Cliente]`) — non aveva senso tornare al
cliente da un lavoro aperto dalla dashboard. Cambiato in `← Dashboard`,
punta a `/lavori`. La query del Cliente in `app/(app)/lavori/[id]/page.tsx`
(usata solo per questo link) è stata rimossa insieme al link, non essendo
più referenziata da nient'altro nella pagina.

2) **Titolo del Lavoro modificabile**: `LavoroForm` (Fix 1 del 25/7)
permetteva di modificare descrizione/data/indirizzo ma non il titolo —
omissione non intenzionale, non c'era alcuna decisione che lo escludesse
deliberatamente. Aggiunto come primo campo del form, stesso pattern degli
altri (obbligatorio, validazione client). `aggiornaLavoro()` esteso di
conseguenza. L'`<h1>` in cima alla pagina resta un campo separato
(server-rendered, si aggiorna dopo `router.refresh()`), non spostato
dentro `LavoroInfo` — nessuna duplicazione visibile, dato che gli altri
campi già seguono lo stesso schema (mostrati una sola volta, non anche
altrove nella pagina).

3) **Eliminazione allegati sui satelliti**: gli allegati potevano essere
solo aggiunti, mai rimossi. Aggiunta `eliminaAllegatoSatellite()` in
`lib/lavori/allegati.ts` (elimina la riga DB, poi il file su disco — RLS
"allegato satellite: eliminazione solo owner" già esistente dalla 0012,
nessuna migration necessaria) e un bottone "Elimina" per allegato in
`components/satellite-allegati.tsx`, con `confirm()` nativo prima di
procedere — **non** esiste in realtà un "pattern di eliminazione
satellite" a cui allinearsi (nessun satellite è mai stato eliminabile in
questo progetto): usato invece lo stesso pattern già in uso per
eliminare una sede/contatto Fornitore (`confirm()` + azione server +
`router.refresh()`), l'unico precedente reale di eliminazione con
conferma nell'app. **Il "repository generale del Lavoro" per gli
allegati (tabella `allegato`, distinta da quella per satellite) non ha
mai avuto un'interfaccia** — esiste solo nello schema/tipi dalla
`0001_initial.sql`, mai costruita (rimandata esplicitamente fin dal
18/7, mai più ripresa). Questo fix copre quindi solo gli allegati sui
satelliti, gli unici che esistono davvero in UI.

4) **Visibilità "non necessario" per Progetto/Preventivo/Campione**:
l'opzione era disponibile in qualunque stato (anche dopo `presentato`/
`consegnato`), pur non avendo più senso una volta che il satellite è
avanzato oltre lo stato iniziale — la necessità è già dimostrata dai
fatti a quel punto. Rimossa da `azioniPossibiliRevisionabile()`
(`lib/lavori/satelliti-meta.ts`) per gli stati intermedi
(`presentato`/`consegnato`), resta disponibile solo su
`in_preparazione` (comportamento già corretto, non toccato) — e torna
naturalmente disponibile su una nuova revisione appena creata (che
riparte sempre da `in_preparazione`). **Appuntamento e Noleggio non
toccati** come esplicitamente richiesto: il loro flag `non_necessario`
resta liberamente impostabile in ogni momento, indipendente da qualsiasi
nozione di "stato iniziale" (sono semafori binari, non hanno una
sequenza di stati intermedi come i tipi revisionabili).

Verificato end-to-end (Supabase locale + Playwright, ambiente smontato a
fine test, stesso metodo delle sessioni precedenti): link "← Dashboard"
presente e funzionante; titolo modificato e persistito dopo reload;
allegato caricato su un satellite (Briefing), poi eliminato con successo
(sparisce dalla lista dopo conferma); "non necessario" presente su
Preventivo/Campione in `in_preparazione`, scompare dopo la transizione a
`presentato`/`consegnato` (restano le altre azioni corrette: "Richiedi
nuova revisione"/"Segna come accettato"); checkbox "Non necessario"
ancora presente e libero su un Appuntamento (verifica misure), confermando
che quel tipo non è stato alterato. `npm run build`/`tsc --noEmit`/
`eslint` puliti sull'intero progetto.

## Estensione reversibilità stati — Lavoro e Progetto/Preventivo (2026-07-26)

Obiettivo: correggere click accidentali sulle transizioni di stato senza
perdita di dati, estendendo la reversibilità già esistente
(`riapriLavoro`/`LavoroRiapri`, introdotta nel fix "Riapri lavoro" del
25/7 solo per completato→accettato e rifiutato→opportunita).

**1) Stato Lavoro — reversibilità accettato→opportunita**:
`riapriLavoro()`/`LavoroRiapri` estesi (stessa funzione/componente,
`statoAttuale` ora `'accettato' | 'completato' | 'rifiutato'`), non
duplicati: per `accettato` il bottone si etichetta "Riporta a
opportunità" (non "Riapri lavoro", che non calzava per uno stato non
ancora chiuso) con un messaggio di conferma dedicato che avvisa
esplicitamente che i satelliti di esecuzione restano salvati. **I
satelliti non vengono mai eliminati**: `app/(app)/lavori/[id]/page.tsx`
ora nasconde la sezione "Esecuzione" (`haEsecuzione`) a meno che
`lavoro.stato` sia `accettato` o `completato` — un lavoro tornato a
`opportunita` semplicemente non la mostra più, senza toccare i dati.
**Verificato che il trigger `crea_satelliti_post_accettazione`
(Sprint A) non duplichi nulla** in un ciclo ripetuto
`accettato→opportunita→accettato`: la sua guardia di idempotenza
esistente (`not exists (... tipo in (acquisti, lavorazione_esterna,
costruzione, noleggio))`) fa esattamente questo, dato che quei
satelliti non vengono mai cancellati — confermato con un test end-to-end
che ripete il ciclo **3 volte** e verifica via query diretta al DB che
restino sempre esattamente 1 satellite per tipo bloccante e 3
`appuntamento` (briefing/verifica_misure/montaggio), mai di più.

**2) Progetto/Preventivo — reversibilità da `accettato`**: nuova voce
in `azioniPossibiliRevisionabile()` (`lib/lavori/satelliti-meta.ts`) per
lo stato `accettato` — un solo bottone "Annulla accettazione" (torna a
`presentato`), variante `muted` (stessa styling di "Segna come non
necessario", coerente con `LavoroRiapri`). **Non estesa a Campione**
(non richiesto esplicitamente, resta invariato: da `approvato` non c'è
modo di tornare indietro). Aggiunto un nuovo campo opzionale
`conferma?: string` al tipo `AzionePossibile` — solo questa transizione
lo usa (le altre, in avanti, restano senza conferma): `RevisionabileChain`
(`components/satellite-revisionabile.tsx`) ora mostra un `window.confirm()`
prima di eseguire l'azione se `conferma` è presente, per prevenire che un
click accidentale annulli un'accettazione già registrata.
`impostaStatoRevisionabile()` non ha richiesto alcuna modifica: la
transizione verso `presentato` non è tra gli stati che generano una
nuova revisione (`generaNuovaRevisione()`), quindi è un semplice update
in-place della riga corrente, esattamente il comportamento voluto (non
crea una revisione fantasma).

**Verifica esplicita della cascata sullo storico, richiesta prima di
procedere**: `lavoro_satellite_stato_effettivo()` è `stable`/`language
sql`, ricalcola la catena `revisione_di` **a ogni chiamata** leggendo lo
`stato` corrente delle righe — nessuna cache, nessuna scrittura che
"congeli" un risultato precedente. Quindi non è servito **alcun
aggiustamento SQL**: appena il satellite corrente passa da `accettato` a
`presentato` (stato non incluso nel set `accettato/non_necessario/
approvato` che fa scattare la retro-proiezione), la funzione smette da
sola di restituire `accettato` per le revisioni superate della stessa
catena, che tornano a mostrare il proprio `stato` reale
(`necessaria_revisione`, quello che avevano prima di essere superate).
Confermato end-to-end: catena Progetto con una revisione superata
(`necessaria_revisione`) e la corrente accettata → storico mostrava
"Accettato" per retro-proiezione (comportamento Sprint B, invariato) →
dopo "Annulla accettazione" sulla corrente (tornata `presentato`) → lo
stesso storico mostra di nuovo "Necessaria revisione", **non** più
"Accettato".

Verificato l'intero ciclo end-to-end (Supabase locale + Playwright,
ambiente smontato a fine test): 3 cicli completi
opportunita→accettato→opportunita senza alcun satellite duplicato
(query diretta al DB dopo ogni ciclo); sezione Esecuzione che compare/
scompare correttamente seguendo lo stato; Progetto accettato→annullato→
tornato a presentato con cascata sullo storico ricalcolata
correttamente. `npm run build`/`tsc --noEmit`/`eslint` puliti
sull'intero progetto.

## Redesign Dashboard (/lavori) — vista tabellare a piena larghezza (2026-07-26)

Segnalato: la Dashboard risultava troppo compressa al centro su schermi
desktop ampi. Due interventi.

**1) Rinomina menu**: voce "Statistica" → **"Lavori conclusi"**
(`components/app-nav.tsx`), URL invariato (`/statistiche`). Aggiornato
anche l'`<h1>` della pagina stessa (`app/(app)/statistiche/page.tsx`),
non solo la voce di menu — lasciarlo su "Statistica" sarebbe stato
inconsistente con la nuova etichetta che vi punta. Una vera sezione
Statistica con KPI aggregati resta un lavoro futuro (non affrontato qui).

**2) Vista tabellare** (`app/(app)/lavori/page.tsx`): le card centrate
sostituite da una `<table>` con colonne Cliente/Descrizione (il
`titolo` del lavoro)/Stato (badge invariato)/Semafori (stessi contatori
rosso/giallo/verde di prima, ora in colonna dedicata). Righe cliccabili
implementate **senza client component**: ogni `<td>` avvolge il proprio
contenuto in un `<Link>` con `className="block px-4 py-3"`, e la `<tr>`
usa `group`/le celle `group-hover:bg-gray-50` per un evidenziamento
coerente su tutta la riga pur avendo un link per cella — la pagina resta
un Server Component puro, nessun `onClick` necessario. Ordinamento per
punteggio di urgenza invariato (già gestito da `lavori_dashboard()`,
non toccato).

**Larghezza piena solo su questa pagina, non nel layout condiviso**:
`app/(app)/layout.tsx` ha un `<main className="max-w-2xl mx-auto ...">`
che comprime **tutte** le pagine di `(app)` (Clienti, Fornitori,
dettaglio Lavoro, Profilo, Statistiche/Lavori conclusi) — cambiarlo
avrebbe allargato anche loro, mai richiesto. Per restare nello scope
("Redesign della Dashboard"), la Dashboard esce dal vincolo con un
**breakout** CSS (`lg:relative lg:left-1/2 lg:w-screen
lg:-translate-x-1/2`, attivo solo da `lg:` in su, non sotto — vedi
punto successivo), poi ricentra il contenuto con solo padding
(`lg:px-12`, **nessun** `max-w`/`mx-auto` residuo: la larghezza deve
riempire la viewport, non solo allargarsi a un cap più largo ma sempre
centrato — coerente con "non centrato/compresso" della richiesta
originale).

**Bug scoperto e corretto durante il test mobile, non nello scope
originale della richiesta (che riguardava solo desktop) ma necessario
per non introdurre una regressione**: con la tabella a piena larghezza,
a viewport stretti (375px) la pagina mostrava **32px di overflow
orizzontale reale** (`document.documentElement.scrollWidth >
clientWidth`), nonostante il wrapper `overflow-x-auto` attorno alla
`<table>` e nonostante il breakout fosse scoped solo a `lg:` (quindi
sotto `lg` il markup del breakout è del tutto inerte). **Causa reale,
isolata con `getComputedStyle`/`getBoundingClientRect` invece di
tirare a indovinare**: `<main>` (in `app/(app)/layout.tsx`) è un flex
item dentro il contenitore `flex flex-col` del root layout
(`app/layout.tsx`, introdotto il 19/7 per il fix footer/centratura
login) — sull'asse cross (larghezza, essendo il genitore `flex-col`)
l'allineamento di default (`align-items: normal` → equivalente a
`stretch`) dovrebbe riempire la larghezza disponibile, ma **senza una
`width` esplicita sul flex item, il valore usato resta comunque
soggetto al contenuto** quando quest'ultimo (qui: la tabella, il primo
contenuto della pagina abbastanza largo da farlo emergere — mai
successo prima con le liste/form esistenti) richiede più spazio di
quanto disponibile: main risultava largo quanto il min-content della
tabella (438px) invece che i 375px reali della viewport. **Un primo
tentativo con solo `min-w-0` su `<main>` non ha risolto nulla**
(verificato che la proprietà si applicasse correttamente via
`getComputedStyle`, main restava comunque più largo del previsto):
`min-width`/flex-shrink riguardano l'asse **main** del flex container
(qui verticale, essendo `flex-col`), non l'asse cross (orizzontale) —
non era la leva giusta. **Fix effettivo**: aggiunta anche una `width`
esplicita (`w-full`, prima di `max-w-2xl`) su `<main>` — un `width`
dichiarato rimuove qualunque ambiguità di stretch-vs-contenuto,
forzando il 100% del contenitore; `max-w-2xl` continua poi a limitarlo
quando c'è spazio in eccedenza, esattamente come prima. **Verificato
che il fix non abbia alcun effetto visivo sulle altre pagine**
(Clienti/Fornitori/dettaglio Lavoro/Statistiche misurati a 1920px:
tutti ancora esattamente 672px centrati, invariati) — nessuna di esse
aveva mai avuto contenuto abbastanza largo da attivare il bug, quindi
il comportamento pre-esistente resta identico ovunque tranne che sulla
Dashboard, dove ora la tabella scorre correttamente in orizzontale
*dentro* il proprio wrapper invece di sfondare la pagina.

Verificato end-to-end (Supabase locale + Playwright + screenshot,
ambiente smontato a fine test, clienti/lavori di prova creati via psql
diretto e ripuliti subito dopo): tabella con le 4 colonne corrette,
larghezza ~1822px su viewport 1920px (contro i ~672px di prima),
H1/bottone allineati allo stesso margine della tabella, riga cliccabile
verso il dettaglio Lavoro, nessun overflow orizzontale a 1920px/1440px/
375px, lavoro `rifiutato` correttamente escluso dalla dashboard (regola
preesistente di `lavori_dashboard()`, non toccata). `npm run build`/
`tsc --noEmit`/`eslint` puliti sull'intero progetto.

## Rifinitura visiva Header/Footer, layout condiviso (2026-07-26)

**Header** (`components/app-nav.tsx`): il layout logo-sinistra/menu-
centro/Esci-destra su desktop **esisteva già** (grid a 3 colonne
introdotta il 19/7) — verificato che restasse tale, nessuna modifica
strutturale necessaria lì. Aggiunte le parti mancanti:

- **Voce di menu attiva**: nuovo helper `voceAttiva(pathname, href)`
  (match esatto o su una sotto-pagina, es. `/lavori/[id]` evidenzia
  "Dashboard", `/clienti/nuovo` evidenzia "Clienti"). Indicatore
  minimale condiviso con l'hover: un sottile `border-b-2` sotto la
  voce — pieno/scuro (`border-gray-900`, testo `font-medium
  text-gray-900`) se attiva, assente (`border-transparent`) altrimenti,
  e visibile in versione chiara (`border-gray-300`) al passaggio del
  mouse. Stesso meccanismo (bordo, non sfondo) per attivo e hover,
  solo l'intensità cambia — coerente con "niente sfondo pieno o bordi
  vistosi" richiesto. Nel menu mobile (lista verticale), lo stesso
  principio ma con un **bordo a sinistra** (`border-l-2`) invece che
  sotto, più naturale in un elenco impilato — la voce attiva ha anche
  `font-medium text-gray-900`, le altre `text-gray-600` (schiarito
  rispetto a prima per dare risalto al contrasto con l'attiva).

- **Bottone "Esci" → icona "power"**: sostituito il testo con
  un'icona SVG inline disegnata a mano (nessuna libreria di icone nel
  progetto, stesso pattern già seguito per l'hamburger e per
  `password-input.tsx`) — un cerchio aperto (`path` con arco, aperto
  in alto) più una linea verticale corta al centro, la forma standard
  universale del simbolo di accensione/spegnimento. `stroke="currentColor"
  strokeWidth="1.8" fill="none"`, stessa spessore di tratto
  dell'hamburger per coerenza visiva. **Su desktop il bottone è
  icon-only** (solo `aria-label`/`title="Esci"` per accessibilità/
  tooltip, nessun testo visibile) — nel dropdown mobile invece
  **icona + testo** ("Esci"/"Uscita in corso…"), perché lì è affiancato
  ad altre voci testuali in un elenco verticale e il solo simbolo
  sarebbe stato meno chiaro in quel contesto. Stato di caricamento
  (`uscendo`) gestito con lo stesso pattern già in uso altrove
  nell'app (`disabled:opacity-50`), nessun nuovo stile introdotto.

**Bottone "Nuovo Lavoro"**: rimosso il prefisso "+" dal testo (ridondante).
**Non toccato** un secondo bottone con testo simile ma diverso, "+ Nuovo
lavoro" (minuscolo), nel form inline di creazione lavoro dal dettaglio
Cliente (`components/nuovo-lavoro-form.tsx`) — è un bottone diverso, che
funge da toggle per espandere un form (il "+" lì comunica un'azione di
espansione/aggiunta, non solo un'etichetta ridondante), e non era
esplicitamente nominato nella richiesta.

**Footer** (`components/site-footer.tsx`): la struttura a 3 colonne
(logo/link/email) **esisteva già** — tutte e tre le colonne erano però
centrate (`justify-center`) anche su desktop. Cambiato solo
l'allineamento orizzontale da `md:` in su (stesso breakpoint già in uso
nel resto del componente): logo `md:justify-start`, email
`md:justify-end`, i link Privacy/Cookie restano centrati (colonna
centrale, nessun cambiamento). Su mobile (`grid-cols-1`, colonne
impilate) tutto resta centrato come prima — cambiare l'allineamento lì
non avrebbe avuto senso con un'unica colonna.

**Verifica "condiviso con login/registrazione" richiesta esplicitamente**:
l'header (`AppNav`) già **non compare** su `/login` per una decisione
precedente (19/7) — invariato, nessuna modifica necessaria lì. Il footer
(`SiteFooter`) invece **è sempre condiviso** (renderizzato nel root
layout `app/layout.tsx` per ogni pagina, login incluso) — le modifiche
si applicano quindi automaticamente anche a login/registrazione/pagine
pubbliche, senza bisogno di toccare altri file.

Verificato end-to-end (Supabase locale + Playwright, ambiente smontato
a fine test): header assente su `/login` (invariato) con footer
comunque presente e già riorganizzato; bottone Esci icon-only su
desktop con icona SVG verificata nel DOM; voce "Dashboard" evidenziata
su `/lavori`, "Clienti" evidenziata su `/clienti` (nessuna delle due
quando non è la pagina corrente); bottone "Nuovo Lavoro" senza "+";
posizioni orizzontali di logo/nav/Esci e logo/link/email verificate
relative al contenitore `max-w-5xl` già esistente dell'header/footer
(non alla viewport grezza); su mobile, hamburger invariato, bordo
sinistro sulla voce attiva, icona+testo su "Esci" nel dropdown, nessun
overflow orizzontale col menu aperto. Screenshot controllati
visivamente su desktop (1440px) e mobile (375px). `npm run build`/
`tsc --noEmit`/`eslint` puliti sull'intero progetto.

## KPI di durata con target configurabili (2026-07-26)

Implementati i 4 KPI diagnosticati in precedenza (vedi sezione "Diagnosi
KPI" più sopra), con le 3 colonne timestamp immutabili lì individuate
come mancanti, target configurabili per artigiano, e visualizzazione
sia neutra (Lavori conclusi) sia colorata vs obiettivo (Dashboard).
Migration `0018_kpi_durate_e_target.sql`.

### Schema

- `lavoro_satellite.data_presentazione timestamptz` (nullable): valorizzata
  **una sola volta** alla prima transizione a `presentato` per Preventivo/
  Progetto, mai più sovrascritta. Gestito in `impostaStatoRevisionabile()`
  (`lib/lavori/satelliti.ts`): il payload di update include
  `data_presentazione` solo se `tipo in (preventivo, progetto)`,
  `nuovoStato === 'presentato'` **e** la riga letta prima dell'update ha
  ancora `data_presentazione` null (letta con una SELECT separata: il
  client Supabase non supporta `coalesce(colonna, now())` diretto nel
  payload di un `update()`). "Annulla accettazione" (`accettato ->
  presentato`, stessa riga) non la tocca più, essendo già valorizzata.
- `lavoro.prima_accettazione_at timestamptz` (nullable): valorizzata una
  sola volta alla prima transizione a `accettato`, **immutabile** dopo
  — a differenza di `accettato_at` (0001) che viene sovrascritta a ogni
  ri-accettazione. Gestito in `segnaLavoroStato()`
  (`lib/lavori/actions.ts`) con lo stesso pattern "leggi poi scrivi solo
  se null".
- `lavoro.completato_at timestamptz` (nullable): valorizzata quando il
  Lavoro passa a `completato` (`segnaLavoroStato()`), **azzerata
  esplicitamente** da `riapriLavoro()` quando il lavoro esce da
  `completato` — altrimenti resterebbe un timestamp fantasma di un
  completamento poi annullato, falsando il KPI durata montaggio se il
  lavoro viene poi ricompletato.
- `artigiano`: 5 nuove colonne target, tutte `integer not null`, default
  `target_preventivo_giorni=10`, `target_progetto_giorni=7`,
  `target_produzione_giorni=60`, `target_montaggio_giorni=7`,
  `kpi_finestra_mesi=12`. Nessuna nuova RLS (le policy "artigiano vede/
  aggiorna solo se stesso" già coprono queste colonne).

### Formule (funzione SQL `kpi_durate()`, `security invoker`)

Ogni KPI è una media in giorni (`extract(epoch from (a - b)) / 86400.0`),
filtrata sulla finestra temporale letta da `artigiano.kpi_finestra_mesi`
del chiamante (non passata dall'esterno), e ristretta ai lavori
dell'artigiano corrente (join `lavoro_artigiani` con
`artigiano_id = auth.uid()`, stesso pattern di `lavori_dashboard()`):

1. **Tempo di preventivazione**: media di
   `data_presentazione - data_creazione` su `lavoro_satellite` con
   `tipo='preventivo'` e `data_presentazione` valorizzata nella finestra
   (finestra calcolata su `data_presentazione`).
2. **Tempo di progetto**: stessa formula, `tipo='progetto'`.
3. **Accettazione → produzione**: media di
   `costruzione.data_inizio - lavoro.prima_accettazione_at` sui lavori
   dove entrambi i valori esistono (finestra su `data_inizio`).
4. **Durata montaggio**: media di
   `lavoro.completato_at - primo_montaggio.data_creazione` (il più
   vecchio satellite `tipo='appuntamento'`/`tipo_appuntamento='montaggio'`
   per quel lavoro, join laterale con `order by data_creazione asc limit 1`)
   sui lavori con `completato_at` valorizzato (finestra su `completato_at`).

Ogni CTE aggregata (`avg`/`count` senza `group by`) restituisce sempre
esattamente una riga anche a fronte di zero risultati (`avg=null`,
`count=0`) — la UI usa il conteggio (`*_campione`) per distinguere
"nessun dato ancora disponibile" da "media pari a un valore reale",
mai uno zero fuorviante (`lib/lavori/kpi.ts`, `formattaGiorni()`/
`semaforoKpi()`: `campione === 0` → stato `'neutro'`, mostrato come "—"
con etichetta "Dati insufficienti", indipendentemente dal target).

### Soglie del semaforo (solo Dashboard, non "Lavori conclusi")

`semaforoKpi(mediaGiorni, campione, targetGiorni)` in `lib/lavori/kpi.ts`:
- **verde**: `mediaGiorni <= targetGiorni`
- **giallo**: `mediaGiorni <= targetGiorni * 1.2`
- **rosso**: oltre
- **neutro** (grigio, nessun colore "a LED"): `campione === 0`

Solo il pallino indicatore è colorato (`components/kpi-durate-dashboard.tsx`),
mai lo sfondo della card intera — coerente con la palette B&W dell'app
(colori riservati agli stati, non decorativi). La pagina "Lavori
conclusi" (`components/kpi-durate-neutro.tsx`) mostra lo stesso dato
**senza alcuna colorazione**: è una lettura storica, non un confronto
con un obiettivo.

### Profilo/Impostazioni — sezione "Obiettivi"

Nuovo form `components/profilo-obiettivi-form.tsx` + azione
`aggiornaObiettiviKpi()` (`lib/profilo/actions.ts`), stesso pattern del
form SMTP già esistente: 5 campi numerici precompilati con i valori
correnti (o i default se non ancora impostati), salvabili
indipendentemente dalle credenziali SMTP. Il salvataggio invalida sia
`/profilo/impostazioni` sia `/lavori` e `/statistiche` (i target
condizionano il colore delle card KPI in Dashboard).

### Parte 0 — rifiniture tabella Dashboard
Colonna "Semafori" rinominata in **"Avanzamento"** (stesso contenuto,
solo l'etichetta cambia). Aggiunta colonna **"Valore"** (allineata a
destra): `valore_complessivo` dell'ultimo Preventivo con `stato='accettato'`
per quel Lavoro, o "—" se assente. Implementata estendendo
`lavori_dashboard()` con un secondo join laterale dedicato (separato da
quello esistente per i conteggi rosso/giallo/verde, che aggrega su
tutti i satelliti — qui serve solo la riga preventivo accettata).
**Nota tecnica**: `CREATE OR REPLACE FUNCTION` non permette di cambiare
l'elenco delle colonne di ritorno di una funzione esistente (errore
Postgres 42P13) — la migration include un `DROP FUNCTION` esplicito
prima di ricreare `lavori_dashboard()` con la colonna aggiuntiva.

### Verifica end-to-end
Supabase locale + Playwright, ambiente smontato a fine test. Flusso
completo: Lavoro creato → Preventivo backdatato e presentato (verificato
`data_presentazione` impostata, e **non** sovrascritta dal successivo
"Segna come accettato") → Progetto backdatato e presentato/accettato →
Campione "non necessario" → Lavoro accettato (verificato
`prima_accettazione_at` impostata) → backdatati `prima_accettazione_at`
(-3gg) e il primo appuntamento di montaggio (-8gg) → **ciclo "Riporta a
opportunità" + ri-accettazione, verificato che `prima_accettazione_at`
resti il valore backdatato e non torni a essere sovrascritto** →
Costruzione avanzata a "iniziata" poi "completata" → tutti gli altri
satelliti bloccanti portati a verde → gate verificato pronto → Lavoro
completato (verificato `completato_at` impostato) → **i 4 KPI letti
dalla Dashboard corrispondono esattamente ai valori attesi dai
backdating** (6.5/4.0/3.0/8.0 giorni) → stessi identici valori sulla
pagina "Lavori conclusi", **senza alcun indicatore colorato** → colonna
"Valore" verificata su un secondo Lavoro con preventivo accettato →
**semaforo verificato rispondere ai target**: cambiando
`target_preventivo_giorni` in Profilo/Impostazioni, la card passa
correttamente da verde (target ampio) a rosso (target molto più basso
del reale) a giallo (target scelto per una via di mezzo, ~8% sopra il
reale). `npm run build`/`tsc --noEmit`/`eslint` puliti sull'intero
progetto.

**Nota aggiornata il 28/7**: `0018_kpi_durate_e_target.sql` risultava
ancora segnata qui come "non applicata", ma è **già stata eseguita** su
Supabase Cloud (verificato via REST il 28/7, vedi sezione "Fix colonna
Valore Dashboard" più sotto) — la nota era diventata stale. Vedi quella
sezione per il fix successivo (`0019`) reso necessario proprio da questo
disallineamento.

## Sette rifiniture visive — leggerezza, pulizia, respiro (2026-07-26)

Richieste con `scattimiei.it` come metro di paragone di livello di
rifinitura (non da copiare). Nessuna migration coinvolta.

1) **Icona ingranaggio per Profilo/Impostazioni**: stesso trattamento
   già riservato a "Esci" (icon-only su desktop, icona+testo nel menu
   mobile). Nuova `IconaImpostazioni` in `components/app-nav.tsx` —
   stessa forma standard/universale dell'icona "settings" (cerchio +
   dodici piccoli archi che formano i denti, nota anche come icona
   "settings" di Feather Icons), stesso trattamento stroke-based
   (`stroke="currentColor" strokeWidth="1.8" fill="none"`) di
   `IconaPower` — nessuna libreria di icone aggiunta. `VOCI_ATTIVE` non
   include più questa voce (era un caso a parte già prima per "Esci",
   ora anche Profilo/Impostazioni ha lo stesso trattamento): estratta in
   una costante `VOCE_PROFILO` dedicata, renderizzata manualmente accanto
   a "Esci" su desktop e come voce a parte (con bordo a sinistra come le
   altre) nel menu mobile.

2) **"Lavori conclusi" → "Conclusi"** nel menu (`VOCI_ATTIVE`), URL
   invariato (`/statistiche`). **H1 della pagina lasciato invariato**
   ("Lavori conclusi"): nel menu l'etichetta breve ha senso perché
   affiancata a "Dashboard/Clienti/Fornitori" (stesso contesto d'uso),
   ma l'H1 è il primo testo che vede chi arriva direttamente sulla
   pagina (es. da un link salvato) — lì "Conclusi" da solo risulterebbe
   ambiguo, mentre "Lavori conclusi" resta inequivocabile senza costare
   spazio prezioso in una riga di menu orizzontale.

3) **Layout a piena larghezza anche su /statistiche**: stesso identico
   "breakout" `lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2`
   già introdotto per la Dashboard (`app/(app)/lavori/page.tsx`,
   26/7) — commento in quel file aggiornato per non elencare più
   "Statistiche/Lavori conclusi" tra le pagine che restano centrate.
   Verificato esplicitamente (non solo per assunzione) che il fix già
   applicato al `<main>` del layout condiviso (`w-full`, stesso giorno)
   copra anche questa pagina: nessun overflow orizzontale su mobile
   (375px), stesso meccanismo, stessa causa/fix già diagnosticati per
   la Dashboard.

4) **Restyle card KPI** (`components/kpi-durate-dashboard.tsx` e
   `kpi-durate-neutro.tsx`): rimosso il bordo (`border border-gray-200`
   → solo `bg-gray-50`, nessun bordo), rimosso il pallino decorativo
   davanti all'etichetta. Il colore del semaforo (Dashboard) è ora
   applicato **al numero stesso** (`text-green-600`/`text-yellow-700`/
   `text-red-600`/`text-gray-900` per lo stato neutro), non più a un
   elemento decorativo separato — l'unico elemento colorato della card,
   applicato nel modo più minimale possibile. Il numero passa da
   `font-semibold` a `font-medium` ("peso medio" richiesto esplicitamente).
   Il giallo usa `text-yellow-700` (non `-500`/`-600`, insufficiente
   come contrasto per un testo su sfondo chiaro, a differenza di un
   pallino/badge dove `-500` è la scelta consueta in questo progetto).

5) **Font Inter**: sostituisce Geist Sans (mai in realtà applicato
   visivamente — vedi nota tecnica sotto). Caricato via `next/font/google`
   in `app/layout.tsx` (stesso meccanismo già in uso per Geist, quindi
   stessa "allowlist"/modalità già approvata nel progetto: self-hosted
   da Next.js in fase di build, nessuna richiesta a runtime verso i
   server Google — diverso e indipendente dal meccanismo di embedding
   dei font nel logo SVG, che resta invariato). Variabile CSS rinominata
   da `--font-geist-sans` a `--font-inter` (nome coerente col nuovo
   font, non più fuorviante). **Rimosso anche Geist Mono**, mai
   effettivamente usato da nessun componente (nessuna classe
   `font-mono` in tutto il codebase) — pulizia di codice morto colta
   durante l'intervento.
   **Bug preesistente scoperto e corretto nello stesso intervento**: Geist
   Sans, pur caricato e con la sua variabile CSS definita, **non veniva
   mai realmente applicato** — `body` in `globals.css` aveva un
   `font-family: Arial, Helvetica, sans-serif;` hardcoded (residuo del
   boilerplate `create-next-app` mai ripulito) che vinceva su qualunque
   `--font-sans`, e nessun elemento nell'albero applicava la classe
   utility `font-sans` di Tailwind. L'app ha quindi sempre mostrato
   Arial/Helvetica di sistema, mai Geist, dal 16/7 a oggi. Fix: rimossa
   la riga hardcoded da `globals.css`, aggiunta la classe `font-sans`
   al `<body>` in `app/layout.tsx` — ora Inter è realmente il font
   renderizzato (verificato via `getComputedStyle` in un browser reale,
   non solo lettura del codice).

6) **Logo header**: `h-12` → `h-14` (dimensione), aggiunto `py-1` al
   link che lo contiene per un margine verticale proprio oltre al
   padding dell'header (di per sé già aumentato, punto 7) — il logo
   "respira" invece di toccare i bordi della barra.

7) **Padding verticale header/footer**: header `py-3` → `py-5`
   (`components/app-nav.tsx`), footer `py-8` → `py-10`
   (`components/site-footer.tsx`). Verificato su entrambi i breakpoint
   (la struttura flex/grid esistente non richiede altre modifiche per
   restare centrata correttamente a spaziatura maggiore).

### Verifica end-to-end
Supabase locale + Playwright, ambiente smontato a fine test. Screenshot
ispezionati visivamente su desktop (1440px: Dashboard, Conclusi, Profilo/
Impostazioni) e mobile (375px: Dashboard, menu aperto, Conclusi) —
confermato: menu "Conclusi" (non più "Lavori conclusi"/"Statistica"),
icona ingranaggio icon-only su desktop e icona+testo su mobile, card
KPI senza bordo/pallino con numero colorato per stato (verificati tutti
e 3 gli stati verde/giallo/rosso, oltre al neutro "Dati insufficienti"),
font Inter effettivamente renderizzato (`getComputedStyle` sul body),
logo più grande con margine proprio, header/footer più ariosi, nessun
overflow orizzontale su mobile né su Dashboard né su Conclusi. `npm run
build`/`tsc --noEmit`/`eslint` puliti sull'intero progetto.

## Fix allineamento Header/Footer al breakout Dashboard/Conclusi (2026-07-26)

Segnalato: su schermi desktop ampi, logo/menu/icone dell'header e
logo/link/email del footer apparivano spostati verso il centro rispetto
ai bordi reali della tabella di Dashboard/Conclusi — quei due punti
avevano già ricevuto il trattamento "a piena larghezza" (breakout
`lg:w-screen` + `lg:px-12`, introdotto il 26/7 nel redesign Dashboard),
mentre header (`components/app-nav.tsx`) e footer
(`components/site-footer.tsx`) restavano sul vecchio contenitore
`max-w-5xl mx-auto px-4` (capato a 1024px, centrato) — su viewport più
larghe i due schemi divergono, ed è lì che nasce lo scostamento visivo.

**Fix**: header e footer resi strutturalmente **indipendenti dalla
larghezza del contenuto della pagina ospitante** — niente più
`max-w-5xl mx-auto`, sostituito con lo stesso schema di padding del
breakout (`px-4` sotto `lg`, `lg:px-12` da `lg` in su), senza alcun
`max-w`/`mx-auto` residuo. Header e footer sono già elementi di primo
livello nel root layout (`app/layout.tsx`, fuori dal `<main>` vincolato
di `app/(app)/layout.tsx`), quindi bastava correggere il loro
contenitore interno — non serviva il trucco `relative/left-1/2/w-screen`
usato invece dentro `<main>` per "sfondare" un antenato già vincolato.
Anche il contenitore del dropdown mobile (`<ul>` del menu hamburger)
perde lo stesso `max-w-2xl mx-auto` superfluo, per coerenza (nessun
effetto visivo pratico sotto `md`, dove il dropdown è comunque l'unico
contenuto).

**Conseguenza attesa e voluta**: su pagine dal contenuto centrato più
stretto (Clienti, Fornitori, dettaglio Lavoro, Profilo/Impostazioni —
tutte vincolate da `max-w-2xl` in `app/(app)/layout.tsx`, non toccato),
header e footer ora **non si allineano più** al contenuto di quella
pagina specifica: restano fissi al margine di 48px (da `lg` in su) che
coincide sempre con quello della tabella Dashboard/Conclusi,
indipendentemente da quanto è stretta la pagina corrente. Era
esplicitamente questo il comportamento richiesto — header/footer come
"cornice" strutturalmente separata dal contenuto, non più vincolata a
farlo.

**Verifica end-to-end**: stesso metodo delle sessioni precedenti
(Supabase locale via CLI 2.109.1 su porte spostate +1000 per non
collidere con lo stack Docker di Falegname in Cloud già attivo sulla
stessa macchina, poi fermato e ripulito a fine test — inclusi i volumi
Docker residui — con `.env.local`/`supabase/config.toml` ripristinati ai
valori originali) + Playwright, screenshot a 1920px/1440px/375px su
Dashboard, Conclusi, Clienti, Fornitori, dettaglio Lavoro,
Profilo/Impostazioni, login (header nascosto, invariato) e menu mobile
aperto. **Grant mancanti scoperti sull'istanza locale fresca** (stesso
artefatto della CLI 2.109.1 già noto per `service_role`, qui esteso ad
`anon`/`authenticated`: nessun privilegio di default su tabelle
`public` in un progetto locale appena creato) — corretti con `GRANT`
manuali via `docker exec ... psql`, solo per la sessione di test, mai
propagati al progetto Supabase Cloud reale. Confermato: bordo sinistro
di logo/H1/card KPI/tabella sempre a 48px su Dashboard e Conclusi;
header/footer allineati fra loro su ogni pagina (stesso margine fisso),
anche quando il contenuto della pagina (es. Clienti) resta centrato più
stretto; **nessun overflow orizzontale** (`scrollWidth === clientWidth`)
su nessuna combinazione pagina/larghezza testata, incluso il menu
mobile aperto; nessuna regressione sulle pagine non toccate. `npm run
build`/`tsc --noEmit`/`eslint` puliti sull'intero progetto. **Non
ancora committato** — modifiche solo in working tree, in attesa di
conferma.

## Fix colonna "Valore" Dashboard + reversibilità "non necessario" (2026-07-28)

**Bug confermato**: la colonna "Valore" della Dashboard
(`valore_preventivo_accettato`, aggiunta dalla `0018`) mostrava "—" per
un Preventivo con `stato='non_necessario'` anche se aveva un
`valore_complessivo` impostato (es. una stima informale inserita pur
segnando il preventivo formale come non necessario) — il join laterale
dedicato in `lavori_dashboard()` filtrava solo `ls2.stato = 'accettato'`,
escludendo l'altro stato "verde" della stessa famiglia. **Verificato con
una riproduzione minima** (Postgres in Docker, schema ridotto alle sole
tabelle/colonne toccate dalla funzione + `auth.uid()` shim, corpo esatto
di `lavori_dashboard()` copiato dalla migration): un Preventivo
`stato='non_necessario'`/`valore_complessivo=1234.56` restituiva
`valore_preventivo_accettato = null` prima del fix, `1234.56` dopo.

**Correzione di rotta durante lo sprint**: il primo tentativo ha
modificato la `0018` sul posto, assumendo (sulla base della nota "Non
ancora applicata a Supabase Cloud" scritta il 26/7 in questo stesso
file) che non fosse mai stata eseguita in produzione — **l'utente ha
segnalato che la migration risultava invece già fatta**. Verificato
direttamente contro il progetto Supabase Cloud reale (query REST con la
service role key già in `.env.local`, non fidandosi della nota scritta):
`artigiano.target_preventivo_giorni`/`kpi_finestra_mesi`,
`lavoro.prima_accettazione_at`/`completato_at` e
`lavoro_satellite.data_presentazione` esistono e hanno dati reali (es.
`prima_accettazione_at` valorizzato su un Lavoro vero) — la `0018` è
quindi live, la nota nel file era diventata stale nel giro di due giorni.
**Modifica alla `0018` annullata** (`git checkout`) e sostituita da una
**nuova migration** `0019_valore_preventivo_non_necessario.sql`
(`create or replace function`, stesso principio già seguito per la
0013/0011 e per la 0017: non si riapre una migration già applicata,
se ne aggiunge una che corregge la funzione). **Ri-verificato
end-to-end con lo scenario reale**: funzione `lavori_dashboard()`
originale della 0018 (quella già live) applicata per prima, poi il file
`0019` reale eseguito sopra di essa — risultato prima del fix `null`,
dopo il fix `1234.56`, esattamente come atteso.

Il filtro nel join laterale diventa
`ls2.stato in ('accettato', 'non_necessario')`. Nessuna esclusione
esplicita delle revisioni superate necessaria: una riga superata ha
sempre `stato='necessaria_revisione'` (l'unica transizione che genera
una nuova revisione via `revisione_di`), quindi non può mai comparire
con stato `accettato`/`non_necessario` — non c'è ambiguità reale su
"quale riga della catena" nel caso normale, resta comunque
`order by data_creazione desc limit 1` come tie-break.

**Reversibilità estesa a "non necessario"** (`lib/lavori/satelliti-meta.ts`,
`azioniPossibiliRevisionabile()`): stesso principio già esistente per
"Annulla accettazione" (`accettato → presentato`, con conferma nativa
per prevenire un click accidentale) — aggiunta l'azione simmetrica
"Annulla non necessario" (`non_necessario → in_preparazione`, l'unico
stato di provenienza possibile per quella transizione), applicata sia al
ramo Preventivo/Progetto sia al ramo Campione (entrambi già gestivano
`non_necessario` come stato terminale verde). Nessuna modifica a
`impostaStatoRevisionabile()`/`RevisionabileChain` necessaria: la
transizione è un update in-place (non genera una nuova revisione, stessa
logica di `generaNuovaRevisione()` che scatta solo per
`necessaria_revisione`/`necessario_nuovo_campione`) e il componente è già
completamente data-driven dalle azioni restituite, incluso il rendering
del `confirm()` nativo.

Verificato `tsc --noEmit`/`eslint` puliti. **Non testata end-to-end in
browser** (solo verifica diretta della query SQL riprodotta in locale e
typecheck) — nessun giro con Supabase locale + Playwright fatto per
questo fix specifico, a differenza della prassi abituale di questo
progetto. **`0019_valore_preventivo_non_necessario.sql` eseguita
dall'utente sul progetto Supabase Cloud reale (28/7)** — funzione già
live in produzione con il fix. Codice committato (`46ce009`), pushato e
deployato su apphub lo stesso giorno (`git pull` + `docker compose build`
+ `up -d`, procedura standard già documentata sopra) — build e riavvio
container riusciti senza errori.

**Lezione**: le note "non ancora applicata"/"da fare" in questo file
sono scritte in un momento preciso e possono diventare stale se
l'utente esegue una migration manualmente sullo SQL Editor senza che
questo venga registrato in una sessione successiva — prima di trattare
una migration come "non ancora live" in un modo che condiziona *come*
si scrive un fix (editare il file vs. aggiungerne uno nuovo), verificare
lo stato reale del database di produzione (via REST con la service role
key, come fatto qui) invece di fidarsi ciecamente della nota scritta.

## Key learnings — "Nessuna cifratura" SMTP non funzionava davvero, preset provider (2026-07-29)

**Segnalazione dal beta tester Alessandro**: casella email su un
vhosting con SMTP autenticato solo su porta 25, nessuna delle opzioni
di sicurezza esistenti (SSL/TLS, STARTTLS) funzionava. Il form aveva
**già** una terza opzione "Nessuna" nel menu Sicurezza (introdotta
insieme allo schema fin dalla `0014`) — il problema non era l'opzione
mancante in UI, ma il **transport nodemailer** in
`lib/email/send-email-personale.ts`.

**Causa reale**: `secure: false` + `requireTLS: false` (la combinazione
usata per "nessuna cifratura") **non disabilitano affatto STARTTLS** —
nodemailer tenta comunque un upgrade TLS "opportunistico" se il server
lo annuncia nella risposta EHLO, indipendentemente da queste due
opzioni. Se quel tentativo fallisce (es. un server con STARTTLS
annunciato ma con un certificato non valido/self-signed, scenario
plausibile su un piccolo vhosting), l'intero invio fallisce — anche se
l'utente ha esplicitamente scelto "Nessuna cifratura" per evitare
proprio questo. **Riprodotto empiricamente** (non solo per lettura del
codice): server SMTP di test locale (Python `aiosmtpd`, porta 2526) che
annuncia STARTTLS con un certificato self-signed generato al volo;
stesso identico transport nodemailer usato dall'app, senza `ignoreTLS`
→ fallisce con `ESOCKET` (handshake TLS respinto); con
`ignoreTLS: sicurezza === 'nessuna'` aggiunto → invio riuscito
(`250 Message accepted for delivery`), STARTTLS bypassato del tutto.
**Fix**: aggiunta l'opzione `ignoreTLS` al transport in
`sendEmailPersonale()` — nessuna modifica a schema/RLS, nessuna nuova
opzione UI (esisteva già), solo la config nodemailer mancante perché
l'opzione fosse realmente "nessuna cifratura" e non "nessuna cifratura,
a meno che il server ne proponga una". Migliorata anche l'etichetta
dell'opzione nel menu (`"Nessuna cifratura (porta tipica 25 — solo se
le altre due non funzionano)"`, prima solo `"Nessuna (non consigliato)"`).

**Preset SMTP per i provider più comuni** aggiunti in
`components/profilo-smtp-form.tsx` (menu a tendina "Provider" sopra i
campi Host/Porta/Sicurezza, precompila i tre campi lasciando
email/password da inserire manualmente; opzione "Altro / personalizza"
che azzera la precompilazione, comportamento manuale identico a prima):

| Provider | Host | Porta | Sicurezza | Note |
|---|---|---|---|---|
| Aruba | `smtps.aruba.it` | 465 | SSL/TLS | — |
| Google Workspace/Gmail | `smtp.gmail.com` | 587 | STARTTLS | Serve una password per le app, non quella normale dell'account Google |
| Register.it | `authsmtp.tuodominio.it` | 587 | STARTTLS | Host **da personalizzare** col proprio dominio (server per-dominio, non fisso) — vedi discrepanza sotto |
| Microsoft 365/Outlook | `smtp.office365.com` | 587 | STARTTLS | — |
| Libero Mail | `smtp.libero.it` | 465 | SSL/TLS | Confermato da documentazione ufficiale Libero, nessuna impostazione account aggiuntiva richiesta |
| vhosting | `mail.tuodominio.it` | 587 | STARTTLS | Host da personalizzare; nota nel form suggerisce porta 25/nessuna cifratura come fallback se la 587 non funziona |
| Hosting generico (cPanel/Plesk) | `mail.tuodominio.it` | 587 | STARTTLS | Convenzione comune a molti hosting italiani (OVH, SiteGround, TopHost, Keliweb, Serverplan...), da verificare comunque nel pannello |
| Altro / personalizza | — | — | — | Azzera i campi, configurazione manuale come oggi |

**Discrepanza trovata tra la richiesta iniziale e la documentazione
ufficiale di Register.it** (verificata via ricerca web + fetch diretto
delle pagine di supporto ufficiali, non assunta): Register.it **non**
ha un host fisso `smtp.register.it` né una combinazione
465/SSL-587/STARTTLS a seconda del piano come ipotizzato — il loro
supporto ufficiale (`register.it/assistenza/soluzione-invii-email/`,
`register.it/support/smtp_outlook_express.html`,
`register.it/support/vista_smtp.html`) descrive un host **per-dominio**
(`authsmtp.<tuodominio>`, non un server condiviso) sulla **porta 25
come primaria** (587 solo "in alternativa se la 25 risulta bloccata"),
**senza specificare affatto** il tipo di cifratura in nessuna delle tre
pagine consultate. Scelta per il preset: porta 587/STARTTLS (non 25),
motivata dal fatto che la porta 25 in uscita è tipicamente bloccata
dagli stessi provider cloud che già bloccano la 465 (vedi il blocco
Hetzner/apphub sulla 465 documentato altrove in questo file — 25 è
bloccata ancora più comunemente di 465 per policy anti-spam), quindi
meno affidabile da un server come apphub; segnalato esplicitamente nel
testo di aiuto del preset stesso, per non presentare come certezza un
dato che il fornitore non conferma. **Confermato invece senza ambiguità
da fonte ufficiale**: Libero Mail (`smtp.libero.it:465`, SSL/TLS,
nessun'impostazione account speciale per app esterne).

**Testo di aiuto aggiunto sotto il form** (`ProfiloSmtpForm`) che
spiega in linguaggio non tecnico la differenza tra le tre opzioni di
sicurezza e raccomanda esplicitamente STARTTLS/587 quando disponibile,
riservando "Nessuna cifratura" al solo caso in cui le altre due non
funzionino.

**Verifica**: `tsc --noEmit`, `eslint`, `npm run build` puliti.
Riproduzione end-to-end del fix `ignoreTLS` con server SMTP locale
reale (Python `aiosmtpd`, certificato self-signed generato al volo,
ambiente poi smontato) — non solo lettura del codice, vedi sopra. Preset
verificati a livello di dati/logica (tutti e 7 producono esattamente i
valori host/porta/sicurezza attesi, opzione "Altro/personalizza"
presente e funzionante) — **non eseguito un test end-to-end completo in
browser con login reale** per la sola UI del selettore preset (nessuna
logica asincrona/di rete coinvolta nella precompilazione, solo
assegnazione di stato React da una tabella statica: rischio ritenuto
proporzionato a una verifica di livello logico invece di un giro
Supabase locale + Playwright completo). Nessuna migration necessaria
(`smtp_sicurezza` accettava già `'nessuna'` dalla `0014`).

**Committato (`68cd06e`), pushato e deployato su apphub il 29/7**
(`git pull` + `docker compose build` + `up -d`) — build e riavvio
container riusciti senza errori. Alessandro può ora riprovare con
"Nessuna cifratura" sulla sua casella vhosting (porta 25).

## Larghezza piena su Clienti + unificazione flusso "Nuovo lavoro" (2026-07-29)

Stesso principio di breakout già usato per Dashboard/Conclusi
(`lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2` +
`lg:px-12`, copiato identico, nessun componente di layout condiviso
introdotto — coerente con come il pattern era già duplicato tra
`lavori/page.tsx` e `statistiche/page.tsx`) esteso a `/clienti` e
`/clienti/[id]`.

**`/clienti`**: la lista a `<ul>` di card diventa una `<table>`
(Nome/Indirizzo/Email/Telefono), stesso pattern riga-cliccabile a
piena larghezza già usato in Dashboard (`<Link>` per cella, `group`/
`group-hover:bg-gray-50`, Server Component puro). Barra di ricerca
invariata. Su mobile (`md:`) Indirizzo ed Email nascosti
(`hidden md:table-cell`), restano solo Nome e Telefono.

**`/clienti/[id]`**: header con nome cliente + bottone "Nuovo lavoro";
corpo in due card affiancate (`lg:grid-cols-2`, impilate sotto `lg`):
form di modifica a sinistra (`ClienteForm`, invariato), lista lavori
associati (sola lettura) a destra.

**Unificazione del flusso "Nuovo lavoro"**: prima esistevano due
componenti quasi identici — `NuovoLavoroStandaloneForm` (usato da
`/lavori/nuovo`, con lo step di ricerca/creazione cliente) e
`NuovoLavoroForm` (usato nella pagina Cliente, form inline sempre con
cliente già noto). Eliminato `NuovoLavoroForm` (`components/
nuovo-lavoro-form.tsx`, ora dead code). Il bottone "Nuovo lavoro" della
pagina Cliente ora è un `<Link href="/lavori/nuovo?clienteId=...">`:
`app/(app)/lavori/nuovo/page.tsx` legge il query param `clienteId`, lo
risolve lato server, e lo passa come prop `clienteIniziale` a
`NuovoLavoroStandaloneForm`, che salta lo step di ricerca e parte già
sullo step titolo/descrizione. **Cliente bloccato in questo caso**
(nessun bottone "Cambia", `clienteBloccato = !!clienteIniziale`): il
flusso da Dashboard resta invece invariato, "Cambia" ancora presente,
perché lì il cliente non è mai "il contesto della pagina da cui si
parte". Un solo componente finale in entrambi i casi, nessuna
duplicazione del form titolo/descrizione.

Verificato end-to-end (Supabase locale + Playwright, ambiente smontato
a fine test — stack Docker isolato su porte +1000, artigiano/clienti/
lavori di test creati via SQL diretto): tabella Clienti corretta a
1920px e 375px (colonne visibili corrette su entrambi), nessun overflow
orizzontale su nessuna pagina/viewport testata; pagina Cliente a due
colonne su desktop, impilata su mobile; flusso da Dashboard (ricerca
cliente, "Cambia" presente) e flusso da pagina Cliente (cliente
precompilato/bloccato, nessun "Cambia") entrambi arrivano allo stesso
componente finale e creano correttamente il lavoro. `tsc --noEmit`/
`eslint` puliti.

## Redesign dettaglio Fornitore — sede preferita, caso singola/multi-sede (2026-07-29)

Motivazione dell'utente: la stragrande maggioranza dei fornitori ha una
sola sede, solo pochi (es. Ferexpert) ne hanno diverse (6-7) — il
dettaglio Fornitore deve trattare i due casi in modo diverso, non
forzare sempre lo stesso layout a selettore.

**Migration `0020_fornitore_sede_preferita.sql`**: nuova colonna
`fornitore_sede.sede_preferita boolean not null default false` +
`unique index ... on fornitore_sede (fornitore_id) where sede_preferita
= true` (vincolo "al massimo una preferita per fornitore" garantito a
livello DB, non solo in application logic, stesso principio già seguito
per le RLS in questo progetto). Nuova RPC `imposta_sede_preferita(p_fornitore_id,
p_sede_id)` (`plpgsql`, `security invoker` — `fornitore_sede` ha già una
RLS "for all" per qualunque artigiano autenticato, dato condiviso):
smarca l'eventuale sede preferita precedente e marca la nuova con due
`UPDATE` sequenziali nella stessa funzione, non due chiamate separate
dal client — necessario perché un singolo `UPDATE` multi-riga non
garantirebbe l'ordine di valutazione del vincolo riga per riga (rischio
di violare il partial unique index a metà se le righe venissero
processate nell'ordine sbagliato), mentre due `UPDATE` sequenziali
(prima smarca, poi marca) non lo violano mai. `EXECUTE` revocato da
`public`/`anon`, concesso solo ad `authenticated`, stesso trattamento
delle altre RPC di scrittura in questo progetto.

**UI** (`components/fornitore-sedi.tsx`, nuovo componente che sostituisce
il rendering diretto di `FornitoreSedeCard`/`FornitoreNuovaSede` in
`app/(app)/fornitori/[id]/page.tsx`): **Caso A (una sola sede)** — nessun
selettore, dettaglio diretto (indirizzo + contatti), invariato rispetto
a prima. **Caso B (più sedi)** — desktop: due colonne (`lg:grid-cols-[280px_1fr]`,
stesso breakpoint `lg:` già in uso nel resto dell'app per i pattern
lista+dettaglio, es. `clienti/[id]`) con elenco sedi a sinistra (nome,
città, badge n. contatti, stellina) e dettaglio della selezionata a
destra; mobile — riga di chip orizzontalmente scorrevole (stessa
informazione, layout compatto), dettaglio sotto. Selezione di **vista**
(quale dettaglio mostrare, stato locale via click/tap) tenuta
volutamente separata dalla **preferita** (flag persistito in DB via
stellina): cliccare una sede la mostra, cliccare la stella la marca
preferita, le due azioni non si accoppiano automaticamente. Selezione di
default = sede preferita, o la prima in mancanza (stesso fallback su
desktop e mobile). Stellina con optimistic update (subito colorata al
click, richiesta RPC in background, rollback automatico col messaggio
d'errore se fallisce).

**Bug del genere "Rules of Hooks" evitato in fase di sviluppo**: la
prima stesura calcolava `preferitaId`/`attivaId` e il relativo
`useEffect` di scroll **dopo** i due `return` anticipati dei casi 0/1
sede — avrebbe rotto React ("Rendered more hooks...") nel momento in
cui un fornitore passa da una a più sedi (aggiungendone una nuova) nella
stessa sessione, senza reload. Spostati tutti gli hook prima di
qualunque `return` condizionale, con fallback null-safe per i casi in
cui restano semplicemente inutilizzati.

**Rifinitura UX aggiunta durante il test end-to-end, non nella richiesta
iniziale ma necessaria per non lasciare un difetto visibile**: la chip
attiva su mobile può non essere la prima in ordine alfabetico (dipende
da quale sede è preferita) — senza uno scroll esplicito restava fuori
dalla porzione visibile della riga scorrevole al caricamento della
pagina, lasciando l'utente senza modo di capire a colpo d'occhio quale
sede fosse quella di default. Aggiunto un `ref` sulla chip attiva +
`useEffect(() => ref.current?.scrollIntoView(...), [attivaId])`.

**Verificato end-to-end** (Postgres in Docker via `supabase start`,
porte offset +1000 per non collidere con lo stack Docker già attivo di
falegnameincloud sulla stessa macchina, poi smontato completamente con
`supabase stop --no-backup` — nessun volume residuo; artigiano/fornitori/
sedi/contatti di test creati via SQL diretto e admin API, poi eliminati;
`.env.local`/`supabase/config.toml` ripristinati ai valori originali):
17/17 controlli Playwright passati, tra cui — vincolo DB verificato
direttamente in SQL (due `UPDATE` a `sede_preferita=true` nella stessa
transazione falliscono con violazione del partial unique index); RPC
verificata idempotente su chiamate ripetute; cambio preferita persistito
e riflesso nella selezione di default dopo reload; caso singola sede
senza stellina né selettore; caso multi-sede con badge contatti
corretto, click/tap che cambia il dettaglio mostrato, sede senza
indirizzo che mostra "Indirizzo non specificato"; nessun overflow
orizzontale su 1440px/375px. **Grant mancanti scoperti di nuovo
sull'istanza locale fresca** (stesso artefatto già noto, qui esteso
anche a `service_role` oltre ad `anon`/`authenticated` — il primo
tentativo di reset dei dati di test via REST con la service role key
falliva con "permission denied", non notato nelle sessioni precedenti
perché non avevano usato `service_role` per scritture dirette via REST):
corretti con `GRANT`/`ALTER DEFAULT PRIVILEGES` manuali via
`docker exec ... psql`, solo per la sessione di test, mai propagati al
progetto Supabase Cloud reale. `tsc --noEmit`/`eslint`/`npm run build`
puliti sull'intero progetto.

**Migration `0020` eseguita dall'utente sul progetto Supabase Cloud
reale (29/7). Codice committato, pushato e deployato su apphub lo
stesso giorno** (`git pull` + `docker compose build` + `up -d`,
procedura standard già documentata sopra).
