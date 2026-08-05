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
| 2026-07-20 | **Sprint 3 revisione strutturale — dashboard implementata** (migration `0011_lavori_dashboard.sql`, funzione `lavori_dashboard()`): pagina `/lavori` rinominata **"Dashboard"** in UI (titolo H1 e voce di menu `components/app-nav.tsx`; URL invariato). Formula del punteggio di urgenza fissata (vedi sezione "Dashboard (nuova home page)" più sotto per il dettaglio ed esempio numerico): somma su satelliti non-appuntamento, non-verdi, non superati da revisione più recente, di `giorni da data_ultimo_cambio_stato × peso` (1.0 rosso, 0.5 giallo). Calcolo lato SQL in un'unica query (no N+1), `SECURITY INVOKER` (non definer) per restare soggetta alle RLS esistenti senza bisogno di passare `artigiano_id` dall'esterno. Riepilogo a contatori colorati per riga (pallino + numero). Verificato end-to-end con stack Supabase locale + Playwright (ambiente poi smontato completamente). **Non ancora eseguita sul progetto Supabase Cloud di produzione** (vedi "Prossimi passi aperti"). |
| 2026-07-26 | **Fix post-test end-to-end (4 fix) sul dettaglio Lavoro** — vedi sezione "Sprint D" più sotto per il dettaglio: (1) aggiunta la modifica del Lavoro dopo la creazione (descrizione, data di apertura `data_lavoro` — nuova colonna, migration `0015` —, indirizzo completo); (2) **"Segna lavoro completato" ora bloccato (client E server) se `lavoro_pronto_per_montaggio()` è falso** — supera esplicitamente la decisione dello Sprint C che lo lasciava sempre libero; (3) verificato (nessun fix necessario) che il flag `non_necessario` per gli appuntamenti `verifica_misure`/`montaggio` fosse già correttamente implementato dallo Sprint C; (4) convenzione UI uniformata in **tutti** i form dell'app: asterisco rosso sui campi obbligatori, nessuna etichetta testuale "(opz.)" sui facoltativi (impliciti per assenza di asterisco). |
| 2026-07-26 | **Fix 5 e 6 (stesso giro dei 4 fix sopra)** — vedi sezione "Sprint D" per il dettaglio: (5) azione **"Riapri lavoro"** su un Lavoro `completato`/`rifiutato`, con conferma nativa (`window.confirm`), che riporta lo stato al valore precedente logico (completato→accettato, rifiutato→opportunità) senza toccare satelliti/dati collegati; (6) voce di menu **"Statistica" attivata** (era placeholder "in arrivo"), nuova pagina `/statistiche` con lista minima dei Lavori chiusi (completato/rifiutato: titolo, cliente, data, stato, link al dettaglio), ordinata per `data_lavoro` decrescente, nessun KPI/grafico in questo giro. **Pulizia dati di prova eseguita in produzione prima del commit**: eliminati i 2 Lavori di test presenti sul progetto Supabase Cloud reale (incluso uno con `stato='completato'` nonostante satelliti bloccanti ancora rossi — sintomo di un test manuale precedente all'introduzione del gate del fix 2), via DELETE diretto con la service role key già presente in `.env.local`, cascata su tutte le tabelle figlie (già tutte `on delete cascade` dalla 0001/0009/0012, nessuna migration necessaria), verificato con una query di conteggio che `lavoro` risultasse a 0 righe; Clienti e Fornitori non toccati (nessuna FK nella direzione opposta). |
| 2026-07-26 | **Fix 7 (stesso giro dei fix 1-6 sopra)** — vedi sezione "Sprint D" per il dettaglio: bottone **"Testa credenziali"** in Profilo/Impostazioni (visibile solo se credenziali SMTP personali già salvate), che invia una vera email di prova a se stessi (mittente = destinatario = email dell'artigiano) riusando `sendEmailPersonale()` già esistente (nessun meccanismo di invio separato). Nuova `testaCredenzialiSmtp()` in `lib/profilo/actions.ts` e `traduciErroreSmtp()` in `lib/email/send-email-personale.ts` per tradurre gli errori grezzi di nodemailer (auth/connessione) in messaggi comprensibili. Nessuna migration. |
| 2026-07-26 | **Scoperti e corretti due bug di produzione tramite il bottone "Testa credenziali" del fix 7** — vedi sezione "Key learnings" per il dettaglio completo: (a) **porta 465 bloccata in uscita da apphub** (Hetzner o rete a monte, non l'OS/ufw del VPS — riproducibile identico verso Aruba e Google Workspace, porta 587 sempre aperta), che rendeva **anche** lo SMTP di sistema Aruba (inviti "a quattro mani") permanentemente non funzionante, non solo le credenziali personali; (b) **`SMTP_PASSWORD` troncata di un carattere a runtime** da Docker Compose, che interpreta `$$` in `env_file` come escape di un singolo `$` letterale (stesso comportamento della sezione `environment:`) — la password Aruba conteneva un `$` finale scritto come `$$`, arrivava all'app con un `$` in meno. **Fix applicato su apphub** (solo file `.env`, non tracciato nei sorgenti, backup lasciato accanto): `SMTP_PORT` 465→587, `SMTP_PASSWORD` con i `$` finali raddoppiati (4 invece di 2, per compensare l'escaping). Verificato byte-per-byte che il valore letto a runtime nel container corrisponda esattamente all'atteso, e con un invio reale (non solo `verify()`) di un'email in stile invito a un indirizzo di controllo, accettata da Aruba (`250 2.0.0 mail accepted for delivery`). **Codice applicativo** (`lib/email/send-email.ts`, `send-email-personale.ts`): timeout espliciti (`connectionTimeout`/`greetingTimeout`/`socketTimeout`, 12s) su entrambi i transport, e `secure`/`requireTLS` derivati automaticamente dalla porta in `send-email.ts` (non più da `SMTP_SECURE`, per evitare disallineamenti); UI di Profilo/Impostazioni aggiornata per raccomandare 587/STARTTLS come default. **Non ancora committato/pushato/deployato** — le correzioni `.env` su apphub sono già live (non richiedono deploy), il codice resta in attesa di conferma. |
| 2026-07-26 | **Unificazione provincia + sigla in un unico campo `sigla_provincia`** su `lavoro` e `fornitore_sede` (migration `0016`, uniche due tabelle con entrambi i campi separati — `cliente` non ha né provincia né sigla, `artigiano` ha solo `provincia` senza sigla separata: nessuna delle due coinvolta). Verificato prima di droppare `provincia`: 0 righe non nulle su `lavoro`, 1 sola su `fornitore_sede` ("Bologna"/"BO", già coerente con la sigla esistente) — nessuna perdita di dati, nessuna mappatura nome→sigla necessaria. Form (`lavoro-form.tsx`, `fornitore-sede-form.tsx`) ridotti a un solo campo, etichetta dinamica dal paese (`labelProvincia` da `lib/paesi.ts`, fallback "Sigla provincia" se il paese non ha quel concetto), sempre visibile (non condizionato al paese, a differenza del vecchio campo "Provincia" esteso). |
| 2026-07-26 | **Segnalazione "Indirizzo non specificato"** quando l'indirizzo di Lavoro o Fornitore_Sede è vuoto (`lavoro-info.tsx`, `fornitore-sede-card.tsx`), al posto di omettere la riga — Cliente non necessita dello stesso fix: il suo form è sempre visibile in chiaro (nessuna vista di sola lettura collassata), l'assenza di indirizzo è già evidente. **Bug scoperto nello stesso giro durante il test**: `formattaIndirizzo()` considerava "specificato" un indirizzo con la sola nazione valorizzata — capitava sempre per una nuova Sede fornitore, il cui form salva `nazione='Italia'` di default già alla creazione anche senza altri campi — vanificando la segnalazione. Corretto richiedendo che almeno via o città/CAP siano popolati prima di considerare l'indirizzo "specificato" (stessa correzione applicata a entrambi i componenti, anche se il Lavoro non lo manifestava nei test perché `creaLavoro()` non imposta mai `nazione` di default). |
| 2026-07-26 | **Bug in produzione: upload allegati falliva silenziosamente per file oltre 1MB** (foto da smartphone) — vedi sezione "Key learnings" per il dettaglio completo. Causa a due livelli, entrambi interni a Next.js (Nginx già aveva `client_max_body_size 20M`, non c'entrava): (1) le Server Actions hanno un limite di default di 1MB (`experimental.serverActions.bodySizeLimit`, non configurato); (2) un secondo limite **indipendente** da 10MB (`experimental.proxyClientMaxBodySize`, ex `middlewareClientMaxBodySize`) tronca silenziosamente il body a causa di `middleware.ts` attivo su ogni richiesta — scoperto solo empiricamente dopo aver alzato il primo limite, un file da 12MB falliva ancora. Il client (`satellite-allegati.tsx`) non aveva alcun try/catch attorno alla chiamata alla Server Action: l'eccezione restava un unhandled rejection invisibile, bottone bloccato su "Caricamento…" per sempre. **Fix**: entrambi i limiti alzati a 20MB in `next.config.ts` (coerente con Nginx), try/catch/finally aggiunto lato client con messaggio d'errore comprensibile. **Aggiunta anche una funzionalità richiesta in corso di fix**: le immagini (non i PDF) vengono ridimensionate server-side con `sharp` (nuova dipendenza esplicita in `package.json`, prima solo transitiva) a un lato massimo di 1920px, qualità 82 — verificato che una foto sintetica 4000×3000/12.18MB diventi 1920×1440/1.17MB (-90%), mentre un PDF di controllo resta identico byte-per-byte. |
| 2026-07-26 | **Due rifiniture alla visualizzazione dell'indirizzo** su Lavoro e Fornitore_Sede (stessa sessione del fix upload sopra): (1) "Indirizzo non specificato" mostrato in rosso (`text-red-600`, stesso colore già usato per errori/stati mancanti in tutta l'app, non introduce una nuova semantica); (2) quando l'indirizzo è compilato, il testo diventa un link a Google Maps (`https://www.google.com/maps/search/?api=1&query=<indirizzo urlencoded>`, nuovo `lib/indirizzo.ts` condiviso tra i due componenti), apribile in una nuova scheda (`target="_blank"`) — nessuna geocodifica/mappa integrata, solo un link diretto con l'indirizzo già pronto. **Cliente escluso** (non "dove applicabile" in questo caso): non ha campi indirizzo strutturati (solo un `indirizzo` testo libero) né una vista di sola lettura collassata — il suo form è sempre mostrato in chiaro, quindi non esiste un punto dell'interfaccia dove applicare né il rosso né il link. Verificato anche il comportamento reale del link in un browser senza cookie Google già accettati: mostra l'interstitial di consenso `consent.google.com` (normale, esterno all'app) con l'indirizzo corretto incapsulato nel parametro `continue=` — non un difetto del link. |
| 2026-07-31 | **Redesign leggibilità dettaglio Lavoro — header gerarchico + tabella satelliti con modale** (nessuna modifica a schema/logica di dominio). Header (`lavoro-info.tsx`): titolo + bottone "Modifica" (icona matita) sulla stessa riga, badge di stato scuro che unifica stato e data della transizione (es. "Accettato · 27/07/2026", usando `accettato_at`/`completato_at` — `rifiutato`/`opportunita` non hanno una data di transizione tracciata, badge senza data in quei casi), descrizione come paragrafo con separatore, poi metadati con icone (calendario per "Aperto il", pin per l'indirizzo, quest'ultimo invariato come link Google Maps). Box discorsivo "Satelliti ancora da completare: ..." sostituito da una tabella (`lavoro-satelliti-tabella.tsx`): colonne Satellite/Stato (pallino semaforo invariato + testo)/Azioni; **solo il nome è cliccabile** per aprire una modale nuova (`components/modal.tsx` — non esisteva alcuna modale nel progetto prima di questo giro, a differenza di quanto si ipotizzava inizialmente: il flusso Acquisti è in realtà un form che si espande inline, non una finestra modale) che monta lo stesso componente satellite già esistente così com'è oggi (nessuna vista "sola lettura" dedicata: resta quella implicita già gestita da ciascun componente in base a `isOwner`); la matita apre la stessa modale; il cestino elimina definitivamente previa conferma nativa (`confirm()`, stesso pattern già in uso per allegati/riapertura Lavoro). Modale: full-screen su mobile (~92vh, per scrivere comodamente note lunghe), centrata e stretta su desktop, chiusura su backdrop/Esc/X, scroll interno. Le catene di revisione (Progetto/Preventivo/ogni serie di Campione) restano una sola riga in tabella (la revisione corrente); Costruzione/Noleggio/Briefing restano righe singole. Nuova `eliminaSatellite()` (`lib/lavori/satelliti.ts`): per i tipi revisionabili risale `revisione_di` dalla riga corrente fino alla radice ed elimina nell'ordine leaf→radice (quella colonna non ha `on delete cascade`: eliminare solo la corrente lascerebbe "riemergere" la revisione precedente come nuova corrente, comportamento esplicitamente evitato). Verificato end-to-end (Supabase locale + Playwright, ambiente smontato a fine test, 34/34 controlli): eliminazione di una riga singola e di un'intera catena a 2 revisioni (verificato via query diretta che entrambe le righe spariscano dal DB), nessun overflow orizzontale su mobile, modale full-screen su mobile confermata via bounding box, contenuto delle modali (es. valore Preventivo) corretto. **Avvertenza non richiesta esplicitamente ma emersa implementando l'eliminazione generica**: Briefing, Progetto, Preventivo, Costruzione e Noleggio non hanno alcun flusso di ricreazione in UI (sono creati solo una volta dal trigger SQL `crea_satelliti_iniziali`/`crea_satelliti_post_accettazione`) — se eliminati non possono essere riaggiunti da "+ Aggiungi satellite", a differenza di Verifica misure/Montaggio/Acquisti/Lavorazione esterna/nuove serie di Campione che restano sempre ri-aggiungibili. La disponibilità dei flussi "+ Aggiungi satellite" per i tipi di esecuzione è stata quindi ancorata a `lavoro.stato` (accettato/completato) e non più a "esistono già righe di quel tipo", proprio per evitare che l'eliminazione di tutte le istanze di un tipo lasci l'utente senza modo di riaggiungerle. **Non ancora committato** — modifiche solo in working tree, in attesa di conferma. |
| 2026-07-26 | **Cambio di regola: gli Appuntamenti contano nel gate/dashboard** — sostituisce la decisione dello Sprint 3/A ("appuntamenti sempre esclusi da gate e conteggi"). Motivazione dell'utente: se un appuntamento necessario non viene fatto, il lavoro non può avanzare. Migration `0017`: `lavoro_pronto_per_montaggio()` e `lavori_dashboard()` non escludono più `tipo = 'appuntamento'`; un appuntamento è "verde" se `concluso=true` OPPURE `non_necessario=true` (stesso trattamento binario di `noleggio`, nessuno stato "giallo" possibile essendo le due condizioni complementari — verificato che non generi conteggi anomali). Aggiornato in parallelo il mirror JS `satellitiBloccantiMontaggio()` in `lib/lavori/satelliti-meta.ts` (stessa logica, per il messaggio "cosa manca"), e `satelliteTipoLabelBreve()` ora usa l'etichetta del sottotipo specifico (Briefing/Verifica misure/Montaggio) invece del generico "Appuntamento", utile perché più istanze dello stesso sottotipo possono essere bloccanti insieme. **Nessuna modifica a "Segna come accettato/rifiutato"**: quella transizione resta senza vincoli di gate, come deciso in precedenza — il cambio riguarda solo il conteggio dashboard e il gate di "Segna lavoro completato". Verificato end-to-end (Supabase locale + Playwright): un Lavoro con tutti i satelliti verdi tranne un Montaggio non concluso → gate falso, messaggio "cosa manca" cita "Montaggio" esplicitamente, bottone "Segna completato" disabilitato; concluso il Montaggio → gate vero, completamento riuscito. Verificato anche via chiamata diretta alla RPC `lavori_dashboard()` con un Lavoro reale (10 satelliti, 9 verdi incl. Briefing concluso e Verifica misure non_necessario, 1 rosso = Montaggio): conteggio esatto `{rossi:1, gialli:0, verdi:9}`, nessuna anomalia. |
| 2026-07-31 | **Lavoro completato = sola lettura su tutti i satelliti** (aggiunta, modifica, eliminazione). Sblocco solo via "Riapri lavoro". Bug corretto: la tabella satelliti (redesign dello stesso giorno) restava pienamente operativa anche a `stato='completato'`, aggirando il gate del bottone "Riapri lavoro". **Enforcement su tre livelli**: (1) UI — `lavoro-satelliti-tabella.tsx` riceve una nuova prop `completato`: matita/cestino restano visibili ma `disabled` (opacità ridotta, `cursor-not-allowed`, `title="Riapri il lavoro per modificare"`), "+ Aggiungi satellite" nascosto del tutto; il nome resta cliccabile e apre comunque la modale. (2) Modale in sola lettura — **nessun meccanismo nuovo**: `app/(app)/lavori/[id]/page.tsx` calcola `isOwnerEffettivo = isOwner && stato !== 'completato'` e lo passa come `isOwner` a tutti i componenti satellite (`SatelliteAppuntamento`, `RevisionabileChain`, `SatelliteOrdine`, `SatelliteCostruzione`, `SatelliteNoleggio`) — riusa esattamente il ramo di sola lettura già esistente per il ruolo "ospite", `modal.tsx` resta invariato (monta i figli così come sono, nessuna nozione propria di read-only). (3) Server — **IMPORTANTE, non solo UI**: nuovo `lib/lavori/lavoro-modificabile.ts` (`assertLavoroModificabile`/`assertSatelliteModificabile`) richiamato a inizio di tutte e 12 le funzioni mutanti in `lib/lavori/satelliti.ts` più `caricaAllegatiSatellite`/`eliminaAllegatoSatellite` in `lib/lavori/allegati.ts` (aggiunta oltre allo scope letterale della richiesta, per coerenza: gli allegati sono comunque una modifica al satellite). **Deriva sempre il vero `lavoro_id` dalla riga satellite via `satelliteId`, mai dal parametro `lavoroId` passato dal client** (usato solo per `revalidatePath`, non per autorizzazione) — altrimenti un utente proprietario di più Lavori potrebbe aggirare il controllo passando il `lavoroId` di un Lavoro proprio ancora aperto insieme al `satelliteId` di uno chiuso. Per le funzioni di sola creazione senza satellite preesistente (`creaAppuntamento`, `creaNuovaSerieCampione`, `creaOrdine`) il controllo usa invece `lavoroId` direttamente: è lo stesso valore scritto nella riga inserita, già la fonte di verità per la RLS d'inserimento esistente, nessun rischio di spoofing lì. Messaggio d'errore uniforme: `"Lavoro completato: riaprirlo per modificare"`. **Migration `0021_satelliti_sola_lettura_completato.sql` preparata ma non applicata a nessun database** (né locale né Cloud, come richiesto esplicitamente prima di procedere): nuova funzione dedicata `lavoro_satellite_modificabile(p_lavoro_id)` (= `is_owner_del_lavoro` **and** lavoro non completato) usata solo nelle policy insert/update/delete di `lavoro_satellite`, `lavoro_satellite_articolo`, `lavoro_satellite_allegato` — **deliberatamente non** una modifica a `is_owner_del_lavoro` stessa, che è condivisa da molte altre tabelle (`lavoro`, `lavoro_artigiani`, `attivita`, `lavoro_fasi`, `pagamento`, `allegato`, `ordine_acquisto`): stringerla lì avrebbe bloccato anche l'UPDATE di `lavoro.stato` fatto da "Riapri lavoro" (completato→accettato), impedendo l'unica via di sblocco prevista. Le policy di lettura restano invariate (la modale in sola lettura deve poter comunque mostrare i dati). Verifica eseguita: `tsc --noEmit`/`eslint`/`npm run build` puliti sull'intero progetto. **Non eseguito un giro Supabase locale + Playwright per questo fix** (a differenza della prassi abituale di questo progetto) — solo verifica statica/di tipo, la migration RLS resta da rivedere e applicare esplicitamente dall'utente prima che l'enforcement sia garantito anche a quel livello. |
| 2026-08-01 | **Revisione satelliti — Fase 1 (schema + codice), verificata end-to-end e pronta al commit**. Migration `0022_revisione_satelliti_2026_08_01.sql` (non ancora applicata a nessun database, né locale né Cloud): (1) **rimosso** `non_necessario` da `lavoro_satellite` (colonna e check dedicato) — un'attività non necessaria semplicemente non si crea più, invece di esistere come satellite "verde per esenzione"; Appuntamento e Noleggio tornano quindi semafori binari solo su `concluso`/`prenotazione_effettuata`. (2) **Unificati** `acquisti`+`lavorazione_esterna` in un solo tipo `acquisti` (le 10 righe esistenti eliminate, confermato sacrificabile in Fase 0); `acquisto_categoria` passa da enum chiuso (`materiale`/`ferramenta`) a testo libero, popolato dalla tabella `categoria_acquisto` (dalla `0001`, mai usata finora) attivata in Profilo/Impostazioni (nuovo form `ProfiloCategorieAcquistoForm` + `lib/acquisti/categorie.ts`). (3) **Preventivo**: nuove colonne `preventivo_accettato`/`preventivo_rifiutato` (check di esclusività reciproca a DB, non solo in UI), sostituiscono il vecchio `stato` per questo tipo (colonna legacy non droppata, condivisa con altri tipi satellite, semplicemente non più letta/scritta per `preventivo`); i 5 record storici `stato='accettato'` migrati a `preventivo_accettato=true`. **Cambio architetturale conseguente, non solo di schema**: le transizioni manuali "Segna come accettato/rifiutato" (`LavoroStatoAzioni`, eliminato) **non esistono più** — `lavoro.stato` passa da `opportunita` ad `accettato`/`rifiutato` **solo** come effetto delle due checkbox sul satellite Preventivo (nuovo `impostaPreventivoDecisione()` in `lib/lavori/satelliti.ts`, nuovo componente `SatellitePreventivo`), stesso trattamento di `accettato_at`/`prima_accettazione_at` di prima (valorizzati una sola volta). Annullare una decisione (torna a nessun flag) non forza mai `lavoro.stato` indietro a `opportunita` — l'unica via indietro resta "Riporta a opportunità"/"Riapri lavoro", invariati. Gate `lavoro_pronto_per_montaggio()` e `lavori_dashboard()` aggiornati allo stesso set di regole (Preventivo verde solo se `preventivo_accettato`). **Nuova `eliminaLavoro()`** (`lib/lavori/actions.ts` + bottone `LavoroEliminaBottone` in Dashboard): cancellazione definitiva via cascata DB già esistente (`on delete cascade` da `0001`/`0009`/`0012`) più rimozione ricorsiva della cartella `uploads/lavori/<lavoroId>` sul filesystem, eseguita solo dopo il successo del delete DB. **Verificato end-to-end** (Supabase locale, porte offset +1000, + Playwright, ambiente smontato a fine test): (a) Preventivo — valore inserito → semaforo giallo "In attesa"; flag Accettato su un Lavoro → `lavoro.stato='accettato'` e `accettato_at`/`prima_accettazione_at` valorizzati, flag Rifiutato mutuamente esclusivo (verificato sia in UI sia a query diretta sul DB); su un secondo Lavoro, flag Rifiutato → `lavoro.stato='rifiutato'`, Accettato resta mutuamente escluso. (b) Eliminazione Lavoro — Lavoro con tutti e 7 i tipi satellite (auto-generati accettando il Preventivo) più un allegato reale caricato sul Briefing, eliminato dalla Dashboard: verificato **0 righe residue** in `lavoro`/`lavoro_artigiani`/`lavoro_satellite`/`lavoro_satellite_allegato`/`lavoro_satellite_articolo` e **nessuna cartella orfana** in `uploads/lavori/<id>`. (c) Acquisti unificato — categoria personalizzata "Lavorazioni esterne" creata in Profilo, selezionabile nel form Acquisti, ordine creato con quella categoria (verificato anche a query diretta: `acquisto_categoria` = testo libero, non più vincolato all'enum); confermato **0 righe** `tipo='lavorazione_esterna'` nel DB e nessun bottone/riferimento residuo a "lavorazione esterna" in UI. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Committato, migration `0022` applicata su Supabase Cloud (verificato via REST: `preventivo_accettato`/`preventivo_rifiutato` presenti, `lavorazione_esterna` a 0 righe, `non_necessario` rimossa), branch mergiato in `main` e deployato su apphub (2026-08-01/02)** — verificato con `curl` sia su apphub sia su `https://districo.it` dopo il riavvio del container. |
| 2026-08-02 | **Sprint "fondamenta" — creazione automatica ridotta al solo Briefing**. Migration `0023_creazione_solo_briefing.sql`: `crea_satelliti_iniziali()` ora inserisce solo l'Appuntamento Briefing; Progetto/Preventivo/Campionatura non sono più creati automaticamente, si aggiungono manualmente da "Aggiungi attività" (vedi sotto) quando servono. **Nessuna migrazione dati**: riguarda solo il trigger, i Lavori esistenti (coi 4 satelliti auto-creati) restano invariati — verificato end-to-end inserendo via SQL diretto le 3 righe mancanti su un Lavoro creato con la nuova logica (per simulare un Lavoro "vecchio stile") e confermando che la pagina le mostri correttamente, senza alcun errore. |
| 2026-08-02 | **Sprint "fondamenta" — terminologia UI "satellite" → "attività"**: invariato in codice/DB/nomi di funzioni (restano `lavoro_satellite`, `satelliteId`, `creaAppuntamento`, ecc.), cambiate solo le stringhe visibili: intestazione colonna tabella ("Attività", non più "Satellite"), messaggio "Attività ancora da completare" (era "Satelliti ancora da completare"), conferma eliminazione Lavoro/satellite, messaggio di conferma accettazione Preventivo, "Nessuna attività" in Dashboard. `tipo='campione'` mostrato come **"Campionatura"** ovunque in UI (tabella, messaggio "cosa manca" del gate, form di creazione serie) — trovata durante la verifica end-to-end anche un'occorrenza mancata in `TIPO_SATELLITE_LABEL_BREVE` (`lib/lavori/satelliti-meta.ts`, condivisa dalla riga tabella Acquisti **e** dal messaggio "cosa manca"): corretta nello stesso giro, insieme a "Acquisti" → **"Acquisto"** (singolare, coerente col nome usato nell'elenco ordinato delle 9 attività — confermato dall'utente: "Usa sempre Acquisto"). |
| 2026-08-02 | **Sprint "fondamenta" — ordine logico delle 9 attività**: nuovo `lib/lavori/attivita-ordine.ts` (`ChiaveAttivita`, `ORDINE_ATTIVITA`, `POSIZIONE_ATTIVITA`, `LABEL_ATTIVITA`, `RIPETIBILE_ATTIVITA`) come unica fonte di verità per Briefing→Progetto→Preventivo→Campionatura→Verifica misure→Acquisto→Costruzione→Noleggio→Montaggio. Usato per: (a) ordinare le righe della tabella attività (`app/(app)/lavori/[id]/page.tsx` costruisce le righe senza un ordine particolare, poi le ordina con un sort stabile su `POSIZIONE_ATTIVITA` — stabile per mantenere l'ordine di inserimento tra istanze dello stesso tipo, es. due Acquisti, coerente con "la nuova istanza va subito dopo l'ultima esistente dello stesso tipo"); (b) filtrare/ordinare le opzioni nel modale "Aggiungi attività" (`RIPETIBILE_ATTIVITA` decide se un tipo compare sempre o solo se assente). **Costruzione e Noleggio ora ripetibili** (prima singleton, creati solo dal trigger di accettazione): nuove `creaCostruzione()`/`creaNoleggio()` in `lib/lavori/satelliti.ts` (mancavano del tutto), righe numerate in tabella ("Costruzione 1"/"Costruzione 2"...) come già avveniva per Verifica misure/Montaggio/Acquisti. **Briefing ora ripetibile** in UI (era già possibile a schema, mai esposto): `app/(app)/lavori/[id]/page.tsx` passa da un singolo `find` a `filter`+`forEach` come gli altri appuntamenti, numerato se >1. |
| 2026-08-02 | **Sprint "fondamenta" — pulsante "Aggiungi attività" unificato** (`components/lavoro-satelliti-tabella.tsx`), sostituisce il vecchio "+ Aggiungi satellite" (tre mini-form separati: `SatelliteNuovaSerieCampione`, `SatelliteNuovoAppuntamento`, `SatelliteNuovoOrdine` inline — i primi due componenti eliminati, dead code). Elenco nell'ordine di `attivita-ordine.ts`: ripetibili sempre presenti, Progetto/Preventivo solo se non esistono già per il Lavoro. **Pattern generale**: selezione → crea con stato iniziale di default → apre subito la stessa modale di dettaglio della riga appena creata, non appena questa compare tra le righe dopo il refresh (il `apertoSatelliteId` dello state locale del client component sopravvive al re-render del Server Component, quindi il Modal si apre da solo quando `righe` include il nuovo `satelliteId` — nessuna modale "di compilazione" dedicata). Nuove `creaProgetto()`/`creaPreventivo()` (mancavano, essendo prima solo auto-creati). **Due eccezioni deliberate, chiarite esplicitamente con l'utente prima di procedere** (il pattern generico non si applicava a questi due casi): (1) **Acquisto** — il dettaglio esistente (`SatelliteOrdine`) non permette di impostare fornitore/categoria/righe/valore dopo la creazione (solo il form di creazione lo fa) — costruire quella capacità di modifica post-creazione sarebbe stato lavoro aggiuntivo non richiesto; **scelto invece** di aprire direttamente il form di creazione esistente (`SatelliteNuovoOrdine`, ora senza il proprio toggle collassato, con `onSuccesso`/`onAnnulla` per essere ospitato nel modale) — il satellite si crea solo al submit. (2) **Campionatura** — la colonna `serie` è obbligatoria a schema e non rinominabile dopo la creazione; **scelto di non modificare questo comportamento in questo sprint** (si chiede ancora il nome prima di creare, stesso UX di oggi) perché il campo `serie` è destinato a sparire del tutto in un prossimo sprint dedicato — costruire ora una capacità di rinomina sarebbe stato lavoro sprecato. **Conseguenza tecnica non esplicitamente richiesta ma necessaria** (identificata e concordata con l'utente): `haEsecuzione`, che nascondeva le righe di esecuzione (Verifica misure/Acquisto/Costruzione/Noleggio/Montaggio) finché `lavoro.stato` non era `accettato`/`completato` (reversibilità del 26/7), **ora dipende solo dall'esistenza dei satelliti**, non più dallo stato — necessario perché "Aggiungi attività" le rende creabili anche su un Lavoro ancora `opportunita` (la verifica lo richiede esplicitamente: su un Lavoro appena creato devono comparire tutte le 8 attività mancanti), quindi nasconderle di nuovo dopo la creazione le avrebbe rese "create ma invisibili/non apribili". **Conseguenza esplicitamente accettata dall'utente**: dopo questo cambio, le attività di esecuzione **restano visibili** anche dopo un'eventuale reversione verso `opportunita` (comportamento diverso dal 26/7, superato consapevolmente). **Rimossa la reversibilità manuale "Riporta a opportunità"** (`riapriLavoro`/`LavoroRiapri`, transizione accettato→opportunita): `lavoro.stato` ora cambia **solo** tramite i flag `preventivo_accettato`/`preventivo_rifiutato` sul satellite Preventivo — nessun'altra azione diretta sulla pagina Lavoro lo tocca. `riapriLavoro()` ristretto a `'completato'|'rifiutato'` (invariate). **Segnalazione non richiesta ma emersa**: un Lavoro `accettato` il cui Preventivo viene "annullato" (entrambi i flag tornano `false`) non ha più alcuna via automatica per tornare a `opportunita` in UI (prima c'era "Riporta a opportunità") — non risolto in questo sprint, segnalato per consapevolezza futura. **Risolto il 2026-08-02, vedi ultima riga di questa tabella**: `lavoro.stato` ora torna automaticamente a `opportunita` in questo esatto scenario. **Verificato invariato, e poi anche dal vivo su richiesta esplicita dell'utente** (la prima verifica era stata solo statica/lettura codice, non e2e — segnalato onestamente quando richiesto): il gate Preventivo→`lavoro.stato` in `impostaPreventivoDecisione()` non tocca mai un Lavoro `completato` — già garantito da `assertSatelliteModificabile`/`assertLavoroModificabile` (esistenti, non toccati) più il bottone "Aggiungi attività" stesso gated su `isOwner && !completato`; la logica di come/quando un Lavoro diventa `completato` resta invariata e fuori scope. Verifica dal vivo su tre livelli (Supabase locale + Playwright, Lavoro portato a `completato` attraverso il flusso reale — Preventivo accettato, tutte le attività di esecuzione portate a verde via SQL diretto, gate `lavoro_pronto_per_montaggio()` vero, "Segna lavoro completato" cliccato in UI): (1) **UI** — le checkbox Accettato/Rifiutato del Preventivo non vengono renderizzate affatto (`isOwnerEffettivo=false`); (2) **applicativo** — confermato via lettura codice che `impostaPreventivoDecisione()` chiama `assertSatelliteModificabile` come prima istruzione, invariato in questo sprint; (3) **RLS/DB** — tentativo diretto di `PATCH` via REST (bypassando completamente la UI, autenticato come il proprietario reale del Lavoro) sui flag `preventivo_accettato`/`preventivo_rifiutato` della riga Preventivo: risposta `[]` (0 righe modificate), confermato via query diretta che `lavoro.stato` e i due flag restano esattamente quelli di prima del tentativo. **Verificato end-to-end** (Supabase locale + Playwright, ambiente smontato a fine test): Lavoro nuovo con solo Briefing; "Aggiungi attività" mostra le 8 mancanti + Briefing (ripetibile) nell'ordine corretto; Progetto creato → dettaglio si apre da solo → sparisce dalla lista, Campionatura resta; Campionatura con nome serie → dettaglio si apre; Costruzione creabile/apribile mentre il Lavoro è ancora `opportunita`, e ripetibile (due istanze numerate); Briefing ripetibile (due istanze numerate); Acquisto apre il form ricco (non un dettaglio vuoto), riga corretta dopo submit; ordine finale delle righe coerente con le 9 posizioni; intestazione colonna "Attività" confermata; Lavoro "vecchio stile" (4 satelliti simulati via SQL) renderizzato correttamente, nessun errore; entrambi i Lavori di test eliminati dalla Dashboard. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/sprint-a-fondamenta`, non mergiato in `main`, non deployato, migration `0023` non applicata a Supabase Cloud** — come richiesto esplicitamente ("non fare merge su main, non fare deploy"). |
| 2026-08-02 | **Sprint B — semaforo appuntamento a 4 stati, calcolo dinamico a lettura**. Nuove `coloreAppuntamento()`/`labelStatoAppuntamento()` in `lib/lavori/satelliti-meta.ts` (quest'ultima ora richiede anche `data_appuntamento`, non solo `concluso`): concluso=true → sempre verde (priorità massima, indipendente dalla data, anche se nel passato o mai impostata); concluso=false + data assente → rosso ("Da fissare"); concluso=false + data odierna/futura → giallo ("In programma"); concluso=false + data passata → rosso ("Data scaduta", label distinta dalla precedente pur condividendo il colore). Confronto per **sola data di calendario** (troncata a mezzanotte), non timestamp esatto: un appuntamento fissato per "oggi" resta giallo per l'intera giornata invece di diventare rosso al passare dell'orario esatto — lettura scelta della formulazione "data_appuntamento >= oggi" del prompt (data, non datetime), nessuna colonna nuova, nessuna scrittura. Applicato alle tre righe tabella attività (Briefing/Verifica misure/Montaggio in `app/(app)/lavori/[id]/page.tsx`) e al dot live nel dettaglio satellite (`satellite-appuntamento.tsx`, ora riflette anche le modifiche non ancora salvate nel form). Migration `0024_semaforo_appuntamento_data.sql`: `lavori_dashboard()` aggiornata con la stessa condizione rosso/giallo per il conteggio a tre colonne e per il peso dell'urgenza (1.0 rosso vs 0.5 giallo). **`lavoro_pronto_per_montaggio()` deliberatamente NON toccata**: la sua unica condizione per `appuntamento` è "non è verde" (`concluso=false`), e "verde" per un appuntamento resta definito unicamente da `concluso=true`, invariato dalla data — sia il vecchio rosso binario sia i due nuovi casi rosso/giallo bloccavano già il gate allo stesso modo, quindi non c'era alcun comportamento da correggere lì (solo il conteggio a tre colonne di `lavori_dashboard()` necessitava della nuova logica). Verificato end-to-end (Supabase locale, porte offset +1000, + Playwright, ambiente smontato a fine test): i 4 scenari richiesti (nessuna data→rosso, data futura→giallo, data ieri→rosso con label "Data scaduta" distinta da "Da fissare", concluso=true con data futura→verde) confermati sia in UI sia via chiamata diretta alle RPC `lavoro_pronto_per_montaggio()`/`lavori_dashboard()` autenticate come il proprietario del Lavoro di test (rossi/gialli/verdi e il booleano gate corrispondono esattamente alle attese in tutti e 4 gli stati). `tsc --noEmit`/`eslint`/`npm run build` puliti. |
| 2026-08-02 | **Sprint B — etichetta obbligatoria sugli allegati di Briefing/Verifica misure/Montaggio**. Migration `0025_allegato_etichetta.sql`: nuova colonna `lavoro_satellite_allegato.etichetta` (text), backfill `'Allegato'` sulle 14 righe esistenti (tutti i tipi satellite, non solo appuntamento), poi `NOT NULL`. La colonna è **condivisa** da tutti i tipi con allegati (Preventivo/Progetto/Campione oltre ad Appuntamento — Acquisto non ha ancora allegati in UI) e non toccabile "a metà": per rispettare il vincolo senza estendere il form di raccolta a quei tipi in questo sprint (fuori scope, rimandato allo Sprint C), `caricaAllegatiSatellite()` (`lib/lavori/allegati.ts`) accetta un campo `etichetta` opzionale via FormData — se assente ricade sul nome del file per quella singola voce, così Preventivo/Progetto/Campione continuano a funzionare esattamente come prima, senza alcuna modifica ai loro form. `components/satellite-allegati.tsx` (componente condiviso) riceve un nuovo prop `richiedeEtichetta?: boolean`: mostra un campo testo obbligatorio prima del caricamento solo quando `true`, bloccato lato client se vuoto — passato **solo** da `satellite-appuntamento.tsx`. La lista allegati (stesso componente condiviso, quindi stesso rendering per tutti i tipi) mostra ora `etichetta` al posto del nome file tecnico (che resta usato internamente per il download via `Content-Disposition` in `app/api/allegati/satellite/[id]/route.ts`, invariato) e la data di caricamento in formato esteso italiano senza ora (`"2 agosto 2026"`, `toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })`) — scelta deliberata di aggiornare il rendering ovunque (dato che è un unico componente condiviso e la colonna è ormai sempre valorizzata per ogni riga) pur non toccando i form di raccolta degli altri tipi, come da richiesta "non toccare quei form, solo la lista". Verificato end-to-end (stesso ambiente Supabase locale + Playwright): upload senza etichetta su un Briefing di test bloccato con messaggio esplicito; upload con etichetta "Foto ingresso cucina" compare in lista con l'etichetta (non il nome file) e la data nel formato richiesto; Lavoro/cliente/satellite/allegato di test eliminati (cascata DB) e file caricato rimosso a mano dal filesystem (essendo stato eliminato via `DELETE` diretto invece che tramite `eliminaAllegatoSatellite()`, che avrebbe già ripulito anche il file). `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/sprint-b-appuntamenti`, non mergiato in `main`, non deployato, migration `0024`/`0025` non applicate a Supabase Cloud** — come richiesto esplicitamente. |
| 2026-08-02 | **Sprint B (appuntamenti) — merge e deploy**: migration `0024`/`0025` applicate dall'utente su Supabase Cloud (verificato via REST: `lavoro_satellite_allegato.etichetta` presente e valorizzata, `lavori_dashboard()` risponde con la nuova firma), branch `feature/sprint-b-appuntamenti` mergiato in `main` (fast-forward) e deployato su apphub su richiesta esplicita dell'utente. |
| 2026-08-02 | **Sprint "allegati modale" — upload allegati via finestra modale**, sul componente condiviso `SatelliteAllegati` (oggi usato solo da Appuntamento — Briefing/Verifica misure/Montaggio, in futuro da Progetto/Acquisto). Sostituisce il flusso inline introdotto nello Sprint B (etichetta digitata in un campo a fianco, upload immediato non appena si sceglie il file), giudicato poco intuitivo. Nuovo trigger: icona graffetta (`IconaGraffetta`, aggiunta a `components/icons.tsx` nello stesso stile stroke-based già in uso per matita/cestino/impostazioni/power — nessuna libreria di icone), icon-only con `aria-label`/`title="Allega file"`, posizionata subito sotto la lista allegati esistente. Al click apre `AllegatoModale` (nuovo componente, `components/allegato-modale.tsx`, riusa la `Modal` generica già esistente — stessa modale che ospita il dettaglio satellite, quindi in questo caso una modale annidata dentro un'altra: verificato visivamente che lo stacking funzioni correttamente, nessun conflitto di rendering). Contenuto: un `input type="file"` (**un solo file per conferma, niente `multiple`** — scelta deliberata: un'etichetta descrive un contenuto specifico, es. "Foto ingresso cucina", un batch eterogeneo con un'unica etichetta condivisa non avrebbe lo stesso significato; il prompt stesso parla sempre al singolare "il file selezionato"), che mostra il nome del file scelto sotto il selettore; campo etichetta obbligatorio; bottone "Conferma" disabilitato finché non sono presenti **sia** un file **sia** un'etichetta non vuota dopo `trim()` (whitespace-only non valida); bottone "Annulla" che chiude senza caricare nulla. **Stato locale (file + etichetta) interno ad `AllegatoModale`, azzerato ad ogni chiusura qualunque sia la via** (Annulla, backdrop, Esc, X — tutte instradate sullo stesso `handleChiudi()`): garantisce che non ci sia mai alcun residuo alla riapertura, anche dopo un tentativo annullato con file già scelto. Il caricamento vero e proprio resta gestito dal genitore (`SatelliteAllegati`, nuova `handleCaricaConEtichetta()`): la modale riceve un callback `onConferma` che ritorna `true`/`false` — si chiude da sola solo in caso di successo, altrimenti resta aperta con l'errore mostrato e file/etichetta ancora compilati, per poter ritentare senza rifare la selezione. **Scope**: applicato solo al ramo `richiedeEtichetta=true` di `SatelliteAllegati` (oggi solo Appuntamento) — il vecchio flusso inline per Preventivo/Progetto/Campione (`richiedeEtichetta=false`) resta **invariato**, come richiesto esplicitamente; `AllegatoModale` è già pronto per essere riusato lì nello Sprint C senza modifiche. Verificato end-to-end (Supabase locale, porte offset +1000, + Playwright, ambiente smontato a fine test, screenshot ispezionati visivamente): Conferma disabilitato all'apertura; resta disabilitato con solo file o sola etichetta (anche whitespace-only); Annulla dopo aver scelto un file non carica nulla e la modale torna vuota alla riapertura (verificato anche via query diretta: un solo allegato risultava presente dopo l'intera sequenza di test, nessun upload parziale dai tentativi annullati); upload completo riuscito, l'allegato compare in lista con la propria etichetta. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/allegati-modale`, non mergiato in `main`, non deployato** — nessuna migration in questo sprint (solo UI). |
| 2026-08-02 | **Sprint "allegati modale" — merge e deploy**: branch mergiato in `main` (fast-forward) e deployato su apphub su richiesta esplicita dell'utente. |
| 2026-08-02 | **Bug segnalato in produzione — semaforo appuntamento "non si aggiorna" — indagine sulle tre cause richieste**: (1) **caching — esclusa**, nessuna direttiva di cache nel codice, route `/lavori/[id]` classificata dinamica (`ƒ`) nel build per l'uso di `cookies()`; verificato empiricamente con build di produzione reale + richieste HTTP dirette autenticate (bypassando il browser): header sempre `no-store`/`no-cache`, colore aggiornato immediatamente ad ogni cambio DB. (2) **"oggi" frozen a livello di modulo — esclusa**, `new Date()` era dentro il corpo della funzione, rivalutata ad ogni chiamata (confermato anche dal test empirico). (3) **fuso orario — confermata come bug reale ma distinto**: il confronto troncava a mezzanotte nel fuso del *processo* Node, non esplicitamente `Europe/Rome`; il `Dockerfile` (`node:20-alpine`) non imposta mai `TZ`, quindi il container su apphub gira quasi certamente in UTC — riprodotto forzando `TZ=UTC` in locale: un appuntamento fissato per "oggi 01:00" (Rome) risultava rosso invece di giallo, perché in UTC cadeva ancora nel giorno precedente. Portata stretta però (solo la finestra 00:00–02:00 ora di Roma) — non spiegava da sola il sintomo riportato. |
| 2026-08-02 | **Causa reale: non un bug, comportamento come progettato ma non come atteso dall'utente** — l'utente ha poi chiarito lo scenario esatto: appuntamento fissato per oggi alle 11:58, controllato alle 12:32 (stesso giorno), ancora giallo. Il comportamento era esattamente quello deciso nello Sprint B ("un appuntamento fissato per oggi resta giallo per l'intera giornata, non diventa rosso al passare dell'orario esatto") — non corrispondeva però all'uso reale atteso una volta provato dal vivo. **Cambiata la decisione su richiesta esplicita dell'utente**: confronto ora per **orario esatto**, non più per sola data di calendario. `dataOggiOFutura()` → rinominata `dataNonAncoraPassata()` (`lib/lavori/satelliti-meta.ts`): confronta due istanti assoluti (`Date.now()` vs `data_appuntamento`) invece di troncare entrambi a mezzanotte — un appuntamento diventa rosso non appena passa l'orario fissato, anche lo stesso giorno. **Effetto collaterale utile**: elimina anche il bug di fuso orario del punto precedente, dato che confrontare due istanti assoluti non richiede alcun fuso condiviso tra le due parti (a differenza del troncamento a mezzanotte, sensibile al TZ del processo). Migration `0026_semaforo_appuntamento_orario_esatto.sql`: `lavori_dashboard()` aggiornata con `data_appuntamento < now()` al posto di `data_appuntamento::date < current_date`; `lavoro_pronto_per_montaggio()` non toccata, stesso ragionamento della `0024` (condizione per appuntamento resta "non concluso", invariata dalla granularità del confronto sulla data). Verificato end-to-end (Supabase locale, porte offset +1000, server di produzione reale forzato a `TZ=UTC` per riprodurre fedelmente l'ambiente apphub, + Playwright, ambiente smontato a fine test): scenario esatto dell'utente riprodotto e corretto (appuntamento di 34 minuti fa → rosso, prima sarebbe rimasto giallo fino a mezzanotte); appuntamento tra 34 minuti → giallo; transizione stretta a 1 minuto → rosso; l'istante "oggi 01:00 Rome" (edge case del punto precedente) → rosso in modo coerente anche con server in UTC; nessuna data e concluso=true invariati; `lavori_dashboard()` via RPC diretta conferma `satelliti_rossi=1` per lo stesso scenario. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lezione tecnica incidentale**: durante la verifica, un primo tentativo di login Playwright falliva con "Email o password non corretti" pur con credenziali corrette — causa: le variabili `NEXT_PUBLIC_*` vengono inglobate nel bundle client **in fase di build**, non lette a runtime; avevo eseguito `npm run build` con `.env.local` ancora puntato al progetto Supabase Cloud di produzione (ripristinato a fine sessione precedente) invece che all'istanza locale — il bundle client tentava quindi il login contro il progetto Cloud reale, dove l'utente di test non esiste. Rifatto il build con `.env.local` corretto, risolto. **Lavoro su branch `fix/semaforo-orario-esatto`, non mergiato in `main`, non deployato, migration `0026` non applicata a Supabase Cloud**. |
| 2026-08-02 | **Fix semaforo orario esatto — merge e deploy**: migration `0026` applicata dall'utente su Supabase Cloud (verificato via REST: `lavori_dashboard()` risponde 200 dopo l'applicazione), branch mergiato in `main` (fast-forward) e deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) su richiesta esplicita dell'utente — verificato con `docker compose ps` (container `districo` up) e `curl` su `https://districo.it`. |
| 2026-08-02 | **Badge "appuntamenti scaduti" nell'header**. Verificato prima di iniziare: né `feature/allegati-modale` né lo "Sprint C" (etichetta allegati su Progetto/Acquisto, menzionato più volte come lavoro futuro non ancora avviato — nessun branch/commit esistente) risultavano un blocco — `feature/allegati-modale` era già in `main`, lo Sprint C semplicemente non esiste ancora: partito da `main` così com'è, come previsto dal prompt in quel caso. **Discrepanza notata e risolta autonomamente prima di implementare**: il prompt chiedeva di riusare "la stessa logica già esistente" per il caso rosso-per-data-scaduta, ma allo stesso tempo specificava "stesso confronto a sola data, non timestamp, già usato nello Sprint B" — la seconda parte descriveva però il comportamento *precedente* al fix appena fatto (fix/semaforo-orario-esatto, che ha sostituito il confronto a sola data con il confronto a orario esatto). Riusata la logica **attuale** (orario esatto, `data_appuntamento < now()`), non quella descritta nel prompt: reintrodurre il confronto a sola data solo per il badge avrebbe creato un disallineamento diretto con il semaforo per-riga (un appuntamento scaduto da 10 minuti sarebbe apparso rosso nel dettaglio Lavoro ma non contato nel badge fino a mezzanotte) — esattamente il tipo di duplicazione/divergenza che il prompt stesso chiedeva di evitare ("non duplicare la logica"). Migration `0027_appuntamenti_scaduti_count.sql`: nuova RPC `appuntamenti_scaduti_count()` (`security invoker`, `EXECUTE` revocato da `anon`), stesso filtro owner-o-ospite di `lavori_dashboard()` (`lavoro_artigiani.stato='accettato'`, nessun filtro su `ruolo`) e stesso filtro sullo stato del Lavoro (`opportunita`/`accettato`) — **scelta non esplicitamente richiesta ma necessaria per coerenza**: un appuntamento scaduto su un Lavoro `completato`/`rifiutato` non comparirebbe comunque nella pagina Dashboard a cui il badge rimanda, contarlo avrebbe reso il numero fuorviante (nessuna riga visibile a cui corrisponderebbe). Non conta `data_appuntamento is null` (rosso ma "mai fissato", non "scaduto" — esplicitamente escluso dal prompt). `app/layout.tsx` (già Server Component, già legge l'utente per `isLoggedIn`) chiama la RPC solo se autenticato e passa il conteggio ad `AppNav` come nuovo prop `appuntamentiScaduti`. Badge: pallino rosso pieno con il numero (stessa semantica "a LED" già riservata al rosso per stati urgenti/bloccanti), agganciato alla voce "Dashboard" sia nella nav desktop sia nel menu mobile, **nascosto del tutto se il conteggio è 0** (mai un badge con "0" visibile) — nessun elenco/dropdown dedicato in questo sprint, il click sul badge naviga già a `/lavori` tramite lo stesso `Link` esistente della voce di menu, nessuna nuova UI necessaria. Verificato end-to-end (Supabase locale, porte offset +1000, + Playwright, ambiente smontato a fine test, screenshot ispezionati visivamente su desktop e mobile): badge assente con 0 appuntamenti scaduti; sale a "1" con un appuntamento scaduto; a "2" con un secondo su un altro Lavoro; torna a "1" segnando uno dei due concluso; un appuntamento a data futura (giallo) e uno senza data (rosso ma non scaduto) verificati esplicitamente **non conteggiati**; badge torna assente dopo l'eliminazione dei Lavori di test. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/badge-scaduti`, non mergiato in `main`, non deployato, migration `0027` non applicata a Supabase Cloud**. |
| 2026-08-02 | **Badge appuntamenti scaduti — merge e deploy**: migration `0027` applicata dall'utente su Supabase Cloud (verificato via REST: la RPC risponde 200), branch mergiato in `main` (fast-forward) e deployato su apphub (`ssh root@178.105.199.29`) su richiesta esplicita dell'utente — verificato con `docker compose ps` e `curl` su `https://districo.it`. Il codice gestisce in modo sicuro anche la finestra tra deploy e migration (il deploy del codice è avvenuto per primo): `supabase.rpc()` non lancia in caso di errore, `data ?? 0` fa da fallback silenzioso — nessun badge visibile finché la migration non è stata applicata, nessun crash. |
| 2026-08-02 | **Sprint "ux rifiniture" — icona di allerta appuntamento scaduto sulla riga Lavoro in Dashboard** (punto 1/3 di questo sprint, tenuto distinto dagli altri due come richiesto). Migration `0028_lavori_dashboard_appuntamento_scaduto.sql`: nuova colonna `ha_appuntamento_scaduto` (booleano, `bool_or` aggregato per Lavoro) su `lavori_dashboard()` — riusa lo stesso predicato già presente nel join laterale esistente della funzione e in `appuntamenti_scaduti_count()` (0027), aggiunto come flag `scaduto` al join laterale invece di una query separata; `DROP FUNCTION` necessario per cambiare il return type (stesso limite già incontrato per la colonna "Valore" nella 0018). UI: icona calendario rossa (`IconaCalendario`, già esistente) accanto alla descrizione (colonna "Descrizione", che in realtà mostra `titolo` — nome preesistente non toccato) — **esplicitamente non nella colonna Avanzamento esistente**, che resta invariata, come richiesto: sono due indicatori distinti (Avanzamento riassume tutti i satelliti rosso/giallo/verde, l'icona segnala specificamente la presenza di un appuntamento scaduto). Nessuna icona se il flag è falso. |
| 2026-08-02 | **Sprint "ux rifiniture" — visualizzazione vs modifica: il nome apre sola lettura, la matita apre la modifica** (punto 2/3). Un solo punto del codice apriva satelliti al click su una riga (`components/lavoro-satelliti-tabella.tsx`, unico consumer di `setApertoSatelliteId`, verificato con una ricerca mirata prima di procedere) — quindi un solo fix copre uniformemente tutti i tipi di satellite (Appuntamento, Progetto/Campionatura, Preventivo, Acquisto, Costruzione, Noleggio), non solo Appuntamento. Nessun componente satellite nuovo o modificato per questo punto: tutti già distinguevano editabile/sola-lettura tramite il prop `isOwner` esistente (finora usato solo per il ruolo ospite e per un Lavoro `completato`) — nuovo stato locale `apertaInSolaLettura` in `LavoroSatelliteTabella`, `true` quando la modale si apre dal nome, `false` dalla matita (o da una creazione appena avvenuta tramite "Aggiungi attività", dove ha senso trovare subito il form compilabile). Il contenuto della riga (`RigaSatellite.contenuto`, già una `ReactElement` con `isOwner` fissato da `page.tsx`) viene clonato con `cloneElement` forzando `isOwner` a `false` quando `apertaInSolaLettura` è vero, preservando però il valore originale (già `false` per ospiti/Lavoro completato) quando è falso — un owner su un Lavoro aperto vede quindi sola lettura solo se ha cliccato il nome, non se ha cliccato la matita. |
| 2026-08-02 | **Sprint "ux rifiniture" — restyling form Appuntamento** (punto 3/3, dettaglio a-e nel prompt). Verificato prima di procedere, come richiesto: `satellite-appuntamento.tsx` non ha alcun markup separato per desktop (nessuna classe Tailwind `md:`/`lg:` nel file) — le modifiche si propagano automaticamente a entrambi essendo lo stesso identico JSX, confermato anche visivamente con screenshot a 1280px e 375px. (a) Checkbox "Concluso" spostato sulla riga di pallino+nome, allineato a destra (`justify-between`, era un `<label>` a sé più in basso nel form) — visibile solo per `isOwner` (nella vista sola lettura del punto 2 resta assente, come prima). (b) Textarea Descrizione: `rows` 4→8. (c) Icona graffetta spostata dove prima stava il checkbox "Concluso" (subito sotto Descrizione), ingrandita (`h-6 w-6`, era `h-4 w-4`) con più padding verticale (`py-3`, era `p-1.5` uniforme) — resta lo stesso `AllegatoModale` di `feature/allegati-modale`, invariato. (d) Lista allegati: righe a griglia 3 colonne fisse (`grid-cols-[1fr_auto_auto]`: nome/etichetta a sinistra, data — sempre centrata nella sua colonna indipendentemente dalla lunghezza del nome, verificato con due etichette di lunghezza diversa — icona cestino a destra al posto del testo "Elimina"), più spaziatura (`space-y-2` tra righe, `py-2.5` per riga) per il problema di tap accidentale su mobile segnalato. (e) Bottone "Salva" `w-full` (era largo quanto il testo); l'indicatore "Salvato" si è spostato sotto il bottone (prima era affiancato, non c'è più spazio a fianco di un bottone full-width). **Refactoring necessario non esplicitamente richiesto**: `components/satellite-allegati.tsx` (`SatelliteAllegati`, usato anche da Preventivo/Progetto/Campione) impacchettava lista e trigger di upload in un blocco unico, sempre adiacenti — per spostare *solo* il trigger senza spostare la lista (punto c vs d) è stato diviso in due componenti esportati separatamente posizionabili, `AllegatoLista` e `AllegatoTrigger` (dimensione icona/padding bottone configurabili via prop, default invariato); `SatelliteAllegati` resta come wrapper che li compone nello stesso ordine/aspetto di sempre, **non toccato nell'uso per Preventivo/Progetto/Campione** (fuori scope, stesso principio già seguito negli sprint precedenti). Verificato end-to-end (Supabase locale, porte offset +1000, + Playwright, ambiente smontato a fine test): tutti gli scenari del punto 4 del prompt (icona che compare/sparisce con scaduto/concluso/eliminazione; click nome → nessun campo editabile/Salva; click matita → form come oggi; screenshot desktop e mobile di tutte le modifiche di stile; fermaglio apre ancora la modale upload, allegato caricato e visibile con la nuova posizione; cestino elimina con la stessa conferma nativa di sempre). `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/ux-rifiniture`, non mergiato in `main`, non deployato, migration `0028` non applicata a Supabase Cloud**. |
| 2026-08-02 | **Sprint "ux rifiniture" — merge e deploy**: branch mergiato in `main` (fast-forward) e deployato su apphub su richiesta esplicita dell'utente — verificato con `docker compose ps` e `curl` su `https://districo.it`. Migration `0028` non ancora applicata a Supabase Cloud al momento del deploy: nessun rischio, `l.ha_appuntamento_scaduto` risulterebbe semplicemente `undefined` (falsy) finché non applicata, nessuna icona mostrata, nessun crash. |
| 2026-08-02 | **Menu mobile: pannello overlay a schermo intero, sostituisce il vecchio pannello push-down**. Il vecchio `<nav>` mobile era un blocco inline dentro `<header>`, renderizzato solo con `{aperto && (...)}`: comparendo/scomparendo nel normale flusso del documento, spingeva il contenuto della pagina sottostante verso il basso. Nuovo pannello `fixed inset-y-0 right-0` (88% larghezza, `max-w-sm` — non il 100%, per lasciare intuire che si può toccare fuori per chiudere, come suggerito nel prompt) che scorre da destra via `transition-transform` su `translate-x-full`/`translate-x-0` (300ms), con backdrop `fixed inset-0 bg-black/50` semitrasparente dietro (stessa palette bianco/nero/grigio, nessun nuovo colore). **Scelta tecnica non ovvia**: backdrop e pannello restano sempre montati nel DOM (non più un `{aperto && ...}` che li smonta/rimonta) — l'apertura/chiusura è solo una transizione CSS tra classi, altrimenti un unmount immediato alla chiusura non lascerebbe alla transizione il tempo di essere vista; entrambi ricevono `pointer-events-none`/`aria-hidden` quando chiusi, per non restare interattivi/annunciati da uno screen reader mentre invisibili. Testo voci ingrandito (`text-sm`→`text-xl` per Dashboard/Clienti/Fornitori/Conclusi, `text-lg` per Profilo/Impostazioni ed Esci, prima entrambi `text-sm`), più padding verticale per riga. Chiusura su tre vie invariate nell'esito ma nuove nell'implementazione: X dedicata dentro il pannello (nuova, riusa `IconaChiudi` già esistente in `components/icons.tsx`), tap sul backdrop, selezione di una voce (stesso `onClick={() => setAperto(false)}` di prima) — aggiunta anche la chiusura con **Esc** e il blocco dello scroll di sfondo mentre il pannello è aperto, stesso pattern già in uso in `components/modal.tsx`, non richiesti esplicitamente ma economici e coerenti. Hamburger nell'header: non alterna più icona hamburger/X al click (prima lo faceva) — il pannello, ora a piena altezza, coprirebbe comunque quell'area, quindi l'unica X visibile/rilevante è quella dentro il pannello; resta comunque un toggle (apre/chiude), `aria-expanded` comunica lo stato. **Bug di accessibilità scoperto durante la verifica end-to-end** (non ipotizzato in anticipo, emerso da un test Playwright diventato "flaky" con un selettore che matchava due elementi): l'hamburger manteneva `aria-label` alternato "Apri menu"/"Chiudi menu" come prima della modifica — a pannello aperto, sia l'hamburger sia la nuova X dentro al pannello risultavano entrambi etichettati "Chiudi menu" in contemporanea, nome accessibile ambiguo per chi usa uno screen reader. Corretto: l'hamburger resta sempre "Apri menu" (`aria-expanded` comunica comunque l'apertura), solo la X del pannello si chiama "Chiudi menu". Verificato end-to-end (Supabase locale, porte offset +1000, + Playwright, contesti separati mobile 390×844 e desktop 1280×900, ambiente smontato a fine test, screenshot ispezionato visivamente): posizione/dimensioni del contenuto della pagina (un elemento di riferimento, l'H1 "Dashboard") identiche prima/dopo l'apertura del menu (nessuno spostamento); pannello alto quanto la viewport, largo 88%, allineato al bordo destro; backdrop con opacità >0; font-size delle voci nel pannello 20px (contro i 14px di `text-sm` precedenti); chiusura verificata singolarmente per tutte e tre le vie (backdrop, X, selezione voce con navigazione effettiva verso `/clienti`); su desktop, hamburger assente (`md:hidden`) e nav orizzontale esistente invariata. `tsc --noEmit`/`eslint`/`npm run build` puliti. |
| 2026-08-02 | **Menu mobile — merge e deploy**: branch mergiato in `main` (fast-forward) e deployato su apphub su richiesta esplicita dell'utente — verificato con `docker compose ps` e `curl` su `https://districo.it`. Nessuna migration in questo sprint. |
| 2026-08-02 | **Sprint C — punto 1: Progetto passa a un flag booleano `progetto_accettato` + semaforo derivato dagli allegati caricati**. Migration `0029_progetto_accettato_e_allegati.sql`: nuova colonna (default `false`), migrazione dei 9 record esistenti solo su `stato='accettato'` → `true` (le 3 righe `non_necessario`, prima gate-passing, diventano `false` per richiesta esplicita). Vecchio campo `stato` non rimosso (condiviso con Campione), solo non più letto/scritto per `tipo='progetto'`. Nuovo componente dedicato `SatelliteProgetto` (non più `RevisionabileChain`): verificato che Progetto non avesse mai avuto catene di revisione reali (0 righe con `revisione_di` non nullo), un solo satellite per Lavoro — nessuna nozione di "storico" nel nuovo modello. `coloreProgetto()`/`labelStatoProgetto()`: verde se accettato (sempre, indipendentemente dagli allegati, stessa priorità di `colorePreventivo`), rosso se nessun allegato, giallo altrimenti. Checkbox "Accettato" sostituisce i vecchi bottoni di transizione, nessuna conferma nativa (nessun effetto collaterale su `lavoro.stato`, a differenza del Preventivo — stesso trattamento "senza attrito" della checkbox "Concluso" di Appuntamento). Trigger allegati passato alla modale condivisa (`richiedeEtichetta`) di `feature/allegati-modale`, lista invariata. Gate `lavoro_pronto_per_montaggio()` aggiornato a `not progetto_accettato` (era sullo stato testuale) — **verificato esplicitamente** che `impostaProgettoAccettato()` non tocchi mai la tabella `lavoro`, restando indipendente dal gate come richiesto. Due conseguenze tecniche non esplicitamente richieste ma necessarie, seguendo lo stesso principio già applicato al Preventivo il 1/8: trigger `set_satellite_data_ultimo_cambio_stato` esteso a `progetto_accettato` (altrimenti il punteggio di urgenza di un Progetto rimasto rosso/giallo si congelerebbe alla creazione della riga); `data_presentazione` (KPI "tempo di progetto") ora valorizzata al primo allegato caricato invece che alla vecchia transizione manuale a "presentato" (rimossa). |
| 2026-08-02 | **Sprint C — punto 2: formattazione valuta condivisa**. Nuova `lib/formato-valuta.ts` (`formattaValuta()`): simbolo € + separatore delle migliaia + nessuna cifra decimale (`"€ 3.500"`), sostituisce i 5 punti indipendenti trovati nella verifica. **Bug/quirk di `Intl.NumberFormat` verificato empiricamente prima di scrivere l'utility**: con `maximumFractionDigits` impostato, `Intl.NumberFormat('it-IT', {...})` non raggruppa le migliaia di default in Node 20/ICU 78 (mostra `"3500"` invece di `"3.500"`) — serve `useGrouping: true` esplicito. Campo di inserimento valore (Preventivo) lasciato invariato (input numerico nativo, nessuna formattazione durante la digitazione): un input mascherato con separatore delle migliaia richiederebbe passare da `type="number"` a `type="text"` con parsing manuale (gestione cursore, ambiguità "." come separatore migliaia vs decimale) — rischio di bug non giustificato, il prompt permetteva esplicitamente questa scelta (formattazione solo alla visualizzazione dopo il salvataggio). |
| 2026-08-02 | **Sprint C — punto 3: Acquisto, flusso allegati da zero**. `SatelliteOrdine` riceve un nuovo prop `allegati`, riusa `AllegatoTrigger` (`richiedeEtichetta`, stessa modale di `feature/allegati-modale`) e `AllegatoLista` (stessa lista a 3 colonne di Appuntamento/Progetto) — nessun componente nuovo, solo composizione. Nessuna migrazione dati (0 satelliti `acquisti` in produzione). `SatelliteNuovoOrdine` (form di creazione) non toccato: come per tutti gli altri satelliti, gli allegati si aggiungono solo dopo la creazione. |
| 2026-08-02 | **Bug scoperto e corretto durante la verifica end-to-end del punto 1 — `cloneElement` inaffidabile attraverso il confine Server/Client Component**. Cliccare il nome del Preventivo apriva ancora il form di modifica completo (Valore editabile, checkbox Accettato/Rifiutato) invece della vista sola lettura introdotta nello sprint "ux rifiniture" del 2/8 — ma lo stesso identico meccanismo (`LavoroSatelliteTabella`, `cloneElement`/`isValidElement` per forzare `isOwner=false` a runtime su un elemento pre-costruito lato server) funzionava correttamente per Appuntamento e Progetto sulla stessa pagina. **Diagnosticato con un log temporaneo** (poi rimosso): `isValidElement()` sull'elemento `<SatellitePreventivo .../>` tornava `false` (mentre per Appuntamento/Progetto tornava `true`), perché quello specifico riferimento a Client Component arrivava dal server ancora avvolto in un riferimento "lazy" non risolto (`{_payload: {status: 'fulfilled', value: {...}}}`) invece che come elemento React piatto — dipende da come Next.js serializza quel particolare riferimento attraverso il confine RSC, non da un bug nel componente stesso: **`cloneElement` su un elemento passato da un Server Component a un Client Component non è una tecnica affidabile in generale**, anche se sembra funzionare per alcuni casi. **Fix architetturale**: `RigaSatellite.contenuto` (uno solo, con override a runtime) sostituito da `contenutoModifica` + `contenutoLettura`, entrambi costruiti per intero lato server in `page.tsx` con l'`isOwner` già corretto ciascuno — `LavoroSatelliteTabella` si limita a scegliere quale mostrare, nessun `cloneElement`/`isValidElement` più necessario. Verificato su tutti i tipi di satellite (Appuntamento, Progetto, Preventivo, Campione, Acquisto, Costruzione, Noleggio): sola lettura e modifica corrette ovunque, nessun errore in console durante l'intera sequenza di test. **Lezione per il futuro**: se serve mostrare la stessa istanza di un componente satellite in due modalità diverse a seconda di un'interazione client-side, costruire entrambe le varianti lato server (anche se ridondante) invece di tentare un override a runtime su un elemento già passato attraverso il confine RSC. |
| 2026-08-02 | **Sprint C — verifica end-to-end e stato deploy**. Verificato end-to-end (Supabase locale, porte offset +1000, + Playwright, ambiente smontato a fine test): Progetto rosso senza allegati → giallo dopo il primo allegato caricato tramite la modale → verde dopo aver flaggato Accettato, con `lavoro.stato` verificato invariato (query diretta) in tutti e tre i passaggi; valuta "€ 1.234" (valore non tondo, 1234) verificata sia in Dashboard sia nel dettaglio Preventivo; Acquisto — allegato caricato tramite la modale, visibile in lista a 3 colonne con etichetta e data, eliminato singolarmente con conferma; regressione verificata su Costruzione/Noleggio/Campione (apertura sola lettura e modifica su entrambe, nessun errore console). **Migration `0029` applicata dall'utente su Supabase Cloud durante la sessione, verificata su richiesta esplicita** (`ho eseguito la migration, verifica che sia quella giusta`): confermato via REST che i 9 record progetto avessero la mappatura attesa (2 `true`/7 `false`) e che `lavori_dashboard()`/`lavoro_pronto_per_montaggio()` rispondessero correttamente con la nuova logica. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/sprint-c-documenti`, non mergiato in `main`, non deployato**. |
| 2026-08-02 | **Verifica di rinforzo del fix cloneElement/RSC, richiesta esplicitamente prima del merge**: la prima verifica del fix (vedi riga precedente) copriva Costruzione/Noleggio/Campione solo con un controllo "nessun errore in console" — **insufficiente**, segnalato dall'utente: lo stesso tipo di controllo non avrebbe mai rilevato il bug originale su Preventivo (non lanciava errori, mostrava semplicemente il form sbagliato in silenzio). Rifatta la verifica su tutti e 7 i tipi di satellite (incluso un Lavoro di test con un'istanza di ciascuno) con un'asserzione puntuale per tipo su un elemento presente **solo** nella variante di modifica (bottone "Salva"/"Salva note", checkbox "Accettato"/"Prenotazione effettuata", bottone "Segna come consegnato", trigger "Allega file") — verificato assente cliccando il nome (sola lettura) e presente cliccando la matita (modifica), per ciascuno dei 7 tipi individualmente. Tutti e 7 confermati corretti, nessun errore JS residuo. Ambiente Supabase locale smontato, dati di test eliminati a fine verifica. |
| 2026-08-02 | **Sprint D — punto 1: Campionatura, ogni riga torna un'istanza indipendente** (nessun raggruppamento per serie, nessuna catena di revisioni). Prima di scrivere la migration, un controllo sui dati reali di produzione (8 righe `tipo='campione'`) ha rivelato un conflitto non coperto esplicitamente dal prompt: cambiare la logica SQL del gate/dashboard da `stato` a `campione_consegnato` si applica per forza a **tutte** le righe, comprese le 3 storiche `stato='non_necessario'` (verdi/gate-passing nel vecchio modello) — una delle quali su un Lavoro reale con `stato='accettato'`, oggi aperto. Senza intervento, quella riga sarebbe tornata bloccante dall'oggi al domani, pur non toccando `stato`/`serie`/`revisione_di` come richiesto. **Segnalato esplicitamente e confermato con l'utente prima di procedere**: backfill mirato solo sulla nuova colonna (`campione_consegnato = true where stato in ('approvato', 'non_necessario')`), che preserva il comportamento verde/gate-passing già in produzione per quelle righe, senza toccare `stato`/`serie`/`revisione_di`. Migration `0030_campione_indipendente.sql` (non applicata a nessun database): nuove colonne `campione_consegnato boolean not null default false` e `campione_data_consegna timestamptz`; backfill come sopra; **drop** del check `lavoro_satellite_campione_serie_check` (colonna `serie` resta in schema per compatibilità storica, semplicemente non più richiesta/scritta per nuove righe); trigger `set_satellite_data_ultimo_cambio_stato` esteso a `campione_consegnato` (stesso principio già seguito per `preventivo_accettato`/`progetto_accettato`); `lavoro_pronto_per_montaggio()`/`lavori_dashboard()` aggiornate — rosso finché `descrizione` è vuota, verde quando `campione_consegnato=true` (indipendentemente dalla descrizione, stessa priorità di Preventivo/Progetto), giallo implicito. Nuovo componente dedicato `SatelliteCampione` (non più `RevisionabileChain`, ormai senza altri consumer — rimosso insieme a tutto l'apparato "revisionabile": `TipoRevisionabile`, `coloreRevisionabile`, `labelStatoRevisionabile`, `azioniPossibiliRevisionabile`, `generaNuovaRevisione`, `STATI_CAMPIONE`/`STATO_CAMPIONE_LABEL`, `STATI_PROGETTO`/`STATO_PROGETTO_LABEL`, `raggruppaPerSerie` — Preventivo/Progetto ne erano già usciti l'1/8 e il 2/8, Campione era rimasto l'unico consumer). `costruisciCatena()` **non** rimossa: resta in uso dal Preventivo per mostrare eventuali catene storiche precedenti all'1/8. Campi del nuovo componente: `descrizione` (colonna già esistente, riusata as-is), `data_creazione` (già esistente, automatica, mostrata in sola lettura — nessun campo editabile separato, non richiesto), checkbox `consegnato`, `campione_data_consegna` (stampata a `now()` solo alla transizione false→true, azzerata alla transizione inversa — pattern "leggi poi scrivi" già in uso per `data_presentazione`), campo "Note (esito)" che riusa `descrizione_libera` (già condivisa con Costruzione per lo stesso scopo). Allegati invariati (stesso `SatelliteAllegati`, nessun `richiedeEtichetta`, come già era). "Aggiungi attività": Campionatura torna al pattern generico crea-poi-apri già usato da Progetto/Costruzione/Noleggio (nuova `creaCampione()`, nessun parametro), rimossa la richiesta del nome serie. Nuova numerazione "Campionatura 1"/"Campionatura 2" quando ce n'è più di una, stesso pattern di Costruzione/Noleggio/Briefing. |
| 2026-08-02 | **Sprint D — punto 2: Noleggio, la "compagnia" diventa un vero Fornitore**. `aggiornaNoleggio()` esteso con `fornitoreSedeId`/`note`, riusa `fornitore_sede_id` (colonna già esistente, condivisa con Acquisto) invece di introdurre un campo testo "compagnia" — **nessuna migration necessaria**. `SatelliteNoleggio` guadagna lo stesso pattern di ricerca-e-seleziona fornitore già usato in `SatelliteNuovoOrdine` per Acquisto (`cercaFornitoreSedi`), ma — a differenza di Acquisto, dove il fornitore si imposta solo alla creazione — qui resta modificabile anche dopo, nel dettaglio stesso (nessun form di creazione dedicato per Noleggio). Campo "Note" aggiunto riusando `descrizione_libera`. **Scelta esplicita, segnalata come richiesto**: il semaforo binario (rosso/verde su `prenotazione_effettuata`) resta invariato — il fornitore selezionato **non** è richiesto per il passaggio a verde, resta un dato anagrafico complementare, coerente con Acquisto dove categoria/fornitore non condizionano il colore. |
| 2026-08-02 | **Sprint D punti 1-2 — verificati end-to-end** (Supabase locale, porte offset +1000, build di produzione + Playwright, ambiente smontato a fine test): Campionatura — nessun campo "Nome della serie" al momento della creazione; rosso senza descrizione → giallo con descrizione salvata → verde con "Consegnato" flaggato, verificato sia in UI sia via query diretta (`serie=null`, `revisione_di=null`, `campione_consegnato`/`campione_data_consegna` coerenti) su entrambe le istanze create; due Campionatura sullo stesso Lavoro correttamente numerate "1"/"2", indipendenti; `lavori_dashboard()`/`lavoro_pronto_per_montaggio()` via RPC diretta confermano conteggi e gate coerenti con il nuovo modello. Noleggio — form di ricerca fornitore funzionante, selezione persistita e mostrata correttamente in sola lettura e in modifica, campo note persistito. **Nessuna regressione**: Progetto/Preventivo/Costruzione/Verifica misure/Montaggio/Acquisto tutti creati/aperti/modificati senza errori console, nessun crash residuo del tipo cloneElement/RSC. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non testato**: il backfill `campione_consegnato` della migration 0030 (nessun dato storico nell'ambiente locale, seedato da zero — il ragionamento è stato verificato analiticamente contro i dati reali di produzione prima di scrivere la migration, non con un test end-to-end contro dati storici). **Lavoro su branch `feature/sprint-d-produzione`, non mergiato in `main`, non deployato, migration `0030` non applicata a nessun database** — come richiesto esplicitamente. Punto 3 (Acquisto) resta in sospeso in attesa della conferma dell'utente sui valori dello stato attuale. |
| 2026-08-02 | **Sprint D — punto 3 (Acquisto), solo la parte confermata indipendentemente**: aggiunto il campo data alla vista `SatelliteOrdine` ("Creato il ...", riusa `data_creazione` già esistente, nessuna migration). **Il resto del punto 3 resta esplicitamente in sospeso** su richiesta dell'utente: i 3 valori esatti dello stato Acquisto sono `da_acquistare` (default alla creazione) → `acquistato` (bottone "Segna come acquistato") → `ricevuto` (bottone "Segna come ricevuto"), transizioni manuali one-way via `azioniPossibiliAcquisti()`/`avanzaStatoOrdine()` (`lib/lavori/satelliti.ts`/`satelliti-meta.ts`) — nessuna mappatura del semaforo toccata in attesa della conferma esplicita dell'utente su questi valori. |
| 2026-08-02 | **Sprint D — punto 3 completato: semaforo Acquisto ridefinito su righe valorizzate, stati/bottoni invariati**. `coloreAcquisti()` (`lib/lavori/satelliti-meta.ts`) cambia firma da `(stato)` a `(stato, haRigheValorizzate)`: rosso se nessuna riga in `lavoro_satellite_articolo`, **a prescindere dallo stato** (priorità massima — caso limite reale, non solo teorico: `avanzaStatoOrdine()` non ha mai richiesto righe presenti per avanzare, verificato con un test end-to-end dedicato: un Acquisto senza righe portato a `acquistato` resta rosso); altrimenti verde se `stato in ('acquistato', 'ricevuto')` (entrambi contano come "ordinato", nessuna distinzione di colore fra i due — la differenza resta nel dato/etichetta di stato, invariata); altrimenti giallo. Propagato a tutti i punti che leggevano `coloreAcquisti()`: `components/satellite-ordine.tsx` (usa il prop `righe` già disponibile), `app/(app)/lavori/[id]/page.tsx` (usa `righePerSatellite` già disponibile). **Conseguenza necessaria non esplicitamente richiesta ma indispensabile per coerenza**: `satellitiBloccantiMontaggio()` (mirror JS del gate, usato per il messaggio "cosa manca") leggeva `stato` per Acquisto — ora richiede un terzo parametro `righePerSatellite` e riusa `coloreAcquisti()` direttamente, per non duplicare la nuova regola con una logica divergente. Migration `0031_acquisto_semaforo_righe.sql` (non applicata a nessun database): stesso principio applicato lato SQL — `lavoro_pronto_per_montaggio()` (Acquisto blocca se non esiste alcuna riga in `lavoro_satellite_articolo` OPPURE `stato not in ('acquistato','ricevuto')`) e `lavori_dashboard()` (rosso = nessuna riga; verde = riga presente **e** stato in quell'insieme; giallo implicito) — necessario per evitare che Dashboard e gate mostrassero conteggi divergenti rispetto al pallino nel dettaglio Lavoro, stesso principio di sincronia SQL/JS già seguito in tutti gli sprint precedenti su questo genere di cambio. **Verificato end-to-end** (Supabase locale, porte offset +1000, build di produzione + Playwright, ambiente smontato a fine test): Acquisto creato senza righe → rosso; "Segna come acquistato" senza righe → **ancora rosso** (confermata la priorità "a prescindere dallo stato"); secondo Acquisto creato con una riga valorizzata → giallo (stato `da_acquistare`); "Segna come acquistato" → verde; "Segna come ricevuto" → **ancora verde, nessun cambio visibile** (etichette di stato "Acquistato"/"Ricevuto" invariate, solo il colore non cambia più tra i due); `lavori_dashboard()`/`lavoro_pronto_per_montaggio()` via RPC diretta confermano 2 rossi (Briefing + Acquisto senza righe)/1 verde (Acquisto con riga, ricevuto) e gate bloccato, coerenti con la tabella UI. Satellite di test eliminato a fine verifica. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/sprint-d-produzione`, non mergiato in `main`, non deployato, migration `0031` non applicata a nessun database**. |
| 2026-08-02 | **Sprint D (produzione) — merge e deploy**: migration `0030`/`0031` applicate dall'utente su Supabase Cloud (verificato via REST prima del merge: `lavoro_satellite.campione_consegnato` presente e valorizzata) — al primo tentativo la `0031` era stata eseguita da sola, fallita con `column ls.campione_consegnato does not exist` perché presuppone la `0030` già applicata (entrambe ridefiniscono `lavoro_pronto_per_montaggio()`/`lavori_dashboard()` sullo stesso modello); risolto eseguendole nell'ordine corretto. Branch `feature/sprint-d-produzione` mergiato in `main` (fast-forward) e deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) su richiesta esplicita dell'utente — verificato con `docker compose ps` (container `districo` up) e `curl -L https://districo.it` (200 dopo redirect a `/login`, comportamento atteso per una richiesta non autenticata). |
| 2026-08-02 | **Rimozione trigger `crea_satelliti_post_accettazione()` — secondo (e ultimo) dei due automatismi storici di creazione satelliti**. La sezione "Revisione strutturale 2026-07-25" più sotto in questo stesso file (punto 10) descrive i due momenti automatici originali: alla creazione del Lavoro (`crea_satelliti_iniziali()`) e alla sua accettazione (`crea_satelliti_post_accettazione()`, introdotto nella `0012`, crea Verifica misure/Acquisto/Costruzione/Noleggio/Montaggio quando `lavoro.stato` transita a `'accettato'`). Il primo è già stato ridotto al solo Briefing dallo Sprint "fondamenta" (`0023`, 2/8): con questa migration anche il secondo viene rimosso — **da oggi nessuna attività, oltre al Briefing iniziale, si crea più automaticamente**: tutte (ripetibili o no, incluse quelle di esecuzione) si aggiungono esclusivamente tramite il modale "Aggiungi attività", coerente con l'intero impianto costruito dallo Sprint "fondamenta" in poi. Il trigger era rimasto un residuo del vecchio modello (Sprint A, 25/7), mai disattivato quando lo Sprint "fondamenta" aveva spostato la creazione delle attività di esecuzione al modale — scoperto durante una verifica di sola lettura richiesta esplicitamente dall'utente, che ha trovato la funzione ancora attiva (ultima ridefinizione nella `0022`, mai droppata) e ancora effettivamente invocata dal `UPDATE` su `lavoro.stato` dentro `impostaPreventivoDecisione()` (`lib/lavori/satelliti.ts`) — non una chiamata esplicita in quella funzione, ma un side-effect invisibile dal solo codice applicativo. Migration `0032_rimuovi_trigger_creazione_post_accettazione.sql` (non applicata a nessun database): `drop trigger`/`drop function`, non solo disabilitazione — verificato prima di procedere che `crea_satelliti_post_accettazione()` non fosse referenziata da nient'altro (nessun altro trigger, `EXECUTE` già revocato da tutti i ruoli dalla `0012`, mai chiamabile direttamente dall'app). **Nessuna migrazione dati**: i Lavori già passati per `accettato` fino ad oggi (inclusi eventuali dati di test di sprint precedenti) mantengono i satelliti auto-creati che hanno già ricevuto — la rimozione vale solo per le transizioni future, stesso principio già seguito per la rimozione del primo automatismo. **Verificato end-to-end** (Supabase locale, porte offset +1000, build di produzione + Playwright, ambiente smontato a fine test): Lavoro di test con solo Briefing → Preventivo aggiunto manualmente, valorizzato, flaggato Accettato → `lavoro.stato` passato correttamente ad `accettato` (`accettato_at`/`prima_accettazione_at` valorizzati) ma **nessun** satellite aggiuntivo creato (verificato sia in tabella UI sia via query diretta: solo Briefing + Preventivo, 2 righe totali); ripetuto il ciclo Rifiutato → Accettato di nuovo, stesso risultato in entrambe le transizioni, nessuna creazione automatica mai. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/rimozione-trigger-accettazione` (creato da `main`, indipendente dal resto dello Sprint D), non mergiato in `main`, non deployato, migration `0032` non applicata a nessun database**. |
| 2026-08-02 | **Rimozione trigger accettazione — merge e deploy**: migration `0032` applicata dall'utente su Supabase Cloud (drop trigger/funzione — nessuna colonna nuova da verificare via REST come per le migration precedenti, confermata sulla parola dell'utente). Branch `feature/rimozione-trigger-accettazione` mergiato in `main` (fast-forward) e deployato su apphub su richiesta esplicita dell'utente — verificato con `docker compose ps` e `curl -L https://districo.it` (200). |
| 2026-08-02 | **Fix modale "Aggiungi attività" — Acquisto: overflow orizzontale e righe a testo libero**. Causa dell'overflow: la riga di 3 input affiancati (`components/satellite-nuovo-ordine.tsx`) — descrizione (`w-full`, nessun `flex-1`/`min-w-0`) + colore/finitura (`w-32` fisso) + quantità (`w-20` fisso) dentro un `<div className="flex gap-2">` — senza `min-w-0` esplicito il browser non permette all'input di testo di restringersi sotto la sua larghezza minima intrinseca (tipicamente ben oltre 300px), quindi la somma con i due campi a larghezza fissa supera facilmente la larghezza della modale (`sm:max-w-lg`, piena larghezza su mobile) non appena lo spazio disponibile è stretto — pattern classico di overflow Flexbox con `<input>`, non specifico di questo componente. **Risolto insieme alla ristrutturazione richiesta**, non separatamente: i campi Colore/finitura e Quantità sono stati eliminati, sostituiti da un solo campo di testo libero per riga ("Articolo", placeholder con l'esempio del documento di revisione — es. "truciolare nobilitato bianco W10100 sp. 25 – 2 pannelli"), con `min-w-0 flex-1` espliciti sull'unico input rimasto nella riga, eliminando strutturalmente la causa dell'overflow oltre a soddisfare il punto 2. **Nessuna migrazione**: `lavoro_satellite_articolo.quantita` resta `numeric not null check (quantita > 0)` e `colore_finitura` resta nullable — entrambe le colonne restano a schema (condivise/non più significative) ma non più raccolte da UI, scritte con un default fisso (`colore_finitura: null`, `quantita: 1`) da `creaOrdine()` (`lib/lavori/satelliti.ts`) per soddisfare il vincolo, senza alcun significato residuo — scelta esplicitamente permessa dal prompt ("se è solo un cambio di UI che scrive tutto in un'unica colonna testo"). **Conseguenza necessaria non esplicitamente richiesta**: la lista di sola lettura delle righe in `components/satellite-ordine.tsx` mostrava `descrizione — colore_finitura × quantita`; con colore_finitura sempre nullo e quantita sempre 1 per i nuovi Acquisti, avrebbe mostrato un fuorviante "× 1" su ogni riga — semplificata a mostrare solo `descrizione`. Basso rischio sui dati storici (0 righe `lavoro_satellite_articolo` in produzione al momento della verifica Sprint D del 2/8). **Verificato end-to-end** (Supabase locale, porte offset +1000, build di produzione + Playwright, ambiente smontato a fine test, screenshot ispezionati a 1280px e 375px): nessun overflow orizzontale (`document.documentElement.scrollWidth === clientWidth`) su entrambi i viewport con due righe compilate; due righe con l'esempio del documento e un secondo articolo, entrambe salvate e mostrate correttamente nel dettaglio. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/fix-modale-acquisto` (da `main`), non mergiato, non deployato, nessuna migration da applicare (nessuna modifica di schema)**. |
| 2026-08-02 | **Fix: annullare l'accettazione del Preventivo ora riporta `lavoro.stato` a `opportunita` automaticamente** — segnalato inizialmente come "solo testo superato" (il messaggio di conferma diceva esplicitamente "Lo stato del lavoro non tornerà automaticamente indietro"), ma la verifica del comportamento reale ha confermato che il messaggio era **corretto**: `impostaPreventivoDecisione()` (`lib/lavori/satelliti.ts`) toccava `lavoro.stato` solo nel ramo `decisione === 'accettato' \|\| decisione === 'rifiutato'`, mai quando `decisione === null` (annullamento) — comportamento noto e già segnalato nello Sprint "fondamenta" del 2/8 (vedi riga sopra in questa tabella) come limitazione accettata, non un bug nuovo. **Decisione presa oggi, su richiesta esplicita dell'utente**: cambiare comunque il comportamento, rendendo `lavoro.stato` una funzione pura dei due flag `preventivo_accettato`/`preventivo_rifiutato`, ricalcolata a ogni cambiamento incluso il reset — `accettato` -> `'accettato'`, `rifiutato` -> `'rifiutato'`, nessuno dei due -> `'opportunita'`. **Nessuna guardia aggiuntiva necessaria per `lavoro.stato='completato'`**: `assertSatelliteModificabile()` blocca l'intera funzione prima di questo punto per qualunque Lavoro completato, quindi il nuovo ramo "reset" non può mai essere raggiunto in quel caso — verificato esplicitamente (vedi sotto), non solo assunto. `accettato_at`/`prima_accettazione_at` non toccati dal reset (restano quello che erano, stesso principio già seguito da `riapriLavoro()` in `lib/lavori/actions.ts`, che non li tocca nemmeno lui in un reset verso `opportunita`). Messaggio di conferma per l'annullamento accettazione semplificato in `components/satellite-preventivo.tsx`, rimossa la frase ora effettivamente falsa: resta solo *"Annullare l'accettazione del preventivo?"*. Nessuna migration (solo logica applicativa). **Verificato end-to-end** (Supabase locale, porte offset +1000, build di produzione + Playwright, ambiente smontato a fine test, dati di test creati via SQL diretto ed eliminati insieme all'intero ambiente locale): (1) preventivo senza flag -> Accettato spuntato -> `lavoro.stato='accettato'`, `accettato_at`/`prima_accettazione_at` valorizzati; (2) Accettato -> Rifiutato spuntato -> `lavoro.stato='rifiutato'`, timestamp di accettazione invariati; (3) Rifiutato -> Accettato di nuovo -> poi Accettato deselezionato (reset) -> `lavoro.stato` torna a `'opportunita'`, timestamp di accettazione ancora invariati (immutabili per design); (4) Lavoro `completato` con Preventivo già accettato -> checkbox assenti nella modale in sola lettura, bottone "Modifica" disabilitato in tabella, tentativo diretto di `PATCH` via REST (autenticato come il proprietario reale, bypassando la UI) sui due flag -> risposta `[]` (0 righe modificate, RLS `0021` blocca), `lavoro.stato` e i flag confermati invariati via query diretta. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Committato, pushato e deployato su apphub lo stesso giorno** su richiesta esplicita dell'utente — nessuna migration da applicare. |
| 2026-08-02 | **Fix conseguente: la colonna "Valore" della Dashboard mostrava l'importo del Preventivo solo se `preventivo_accettato=true`** — segnalato dall'utente subito dopo il fix precedente ("tornando ad opportunità si perde l'importo inserito, invece va mantenuto sempre"). L'importo (`valore_complessivo`) non era mai stato realmente perso a DB: nessun codice lo tocca durante `impostaPreventivoDecisione()` o il reset, e il campo "Valore" nel dettaglio Preventivo (`components/satellite-preventivo.tsx`, riga con `defaultValue={corrente.valore_complessivo}`) lo mostra sempre correttamente indipendentemente dai flag. Il problema era solo nel join laterale dedicato di `lavori_dashboard()` (introdotto dalla `0018`, esteso dalla `0019`), che filtrava esplicitamente `ls2.preventivo_accettato = true` — appena il fix precedente ha reso possibile tornare da `accettato` a `opportunita`, quella colonna sparisce pur con l'importo ancora presente sulla riga. Migration `0033_valore_preventivo_sempre_visibile.sql`: il filtro passa dal flag di accettazione allo stesso criterio "rilevante" già usato nel join laterale principale della funzione (`not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls2.id)`) — mostra quindi sempre l'importo della riga Preventivo corrente (non superata da una revisione più recente di un'eventuale vecchia catena pre-1/8), indipendentemente da accettato/rifiutato/in attesa. **Nome colonna `valore_preventivo_accettato` mantenuto invariato** (nessuna rinomina, pur essendo ora un nome parzialmente impreciso): rinominarla avrebbe richiesto un `DROP FUNCTION` più il touch di `lib/types/database.types.ts` e `app/(app)/lavori/page.tsx` per un solo cambio di etichetta interna, senza beneficio per l'utente — stesso principio già seguito altrove nel progetto per colonne il cui significato è scivolato senza rinominarle (`acquisto_categoria`, `colore_finitura`). Nessuna modifica applicativa: solo la funzione SQL. **Verificato** (Supabase locale, porte offset +1000, ambiente smontato a fine test, chiamata diretta alla RPC `lavori_dashboard()` via REST autenticata come il proprietario reale, Preventivo di test con `valore_complessivo=1234.56`): valore mostrato correttamente in tutti gli stati testati — nessun flag/opportunita, accettato, e di nuovo opportunita dopo annullamento (il caso segnalato) — sempre `1234.56`, mai `null`; verificato anche via query diretta che il valore resti a DB pure con `preventivo_rifiutato=true` (stato in cui il Lavoro non compare comunque in Dashboard, per il filtro preesistente e indipendente `l.stato in ('opportunita','accettato')`, invariato). **Migration `0033` non ancora applicata a Supabase Cloud**. |
| 2026-08-03 | **Verifica preliminare Sprint E (dashboard)**: risultati completi in `docs/verifica-sprint-e-2026-08-03.txt` (committato, branch `feature/sprint-e-dashboard`). Confermato via lettura codice + verifica visiva (Supabase locale + Playwright, 375px): (1) i 4 KPI in Dashboard erano ancora i vecchi (`kpi_durate()`, 0018); (2) Dashboard mostra solo `opportunita`/`accettato`, Conclusi mostra `completato`/`rifiutato` mescolati con badge, nessun filtro; (3) colonna Avanzamento = pallino + numero a fianco, non numero dentro il pallino; (4) tabella Dashboard su mobile: nessun overflow di *pagina*, ma il contenitore `overflow-x-auto` nasconde Stato/Avanzamento/Valore/elimina dietro uno scroll interno senza alcun indizio visivo (241px nascosti su 375px, verificato con `wrapper.scrollWidth`); (5) le altre 9 modali satellite già pulite, nessun overflow. |
| 2026-08-03 | **Sprint E (dashboard) — nuovi 4 KPI, sostituiscono i 4 precedenti**. Migration `0034_kpi_dashboard_nuovi.sql` (non applicata a nessun database): `drop function kpi_durate()`, nuova `kpi_dashboard()`. Criteri di calcolo esatti, decisi esplicitamente dall'utente: **KPI 1 "Totale lavori in corso"** — conteggio puntuale (nessuna finestra temporale) dei Lavori propri (owner o ospite accettato) con `stato in ('opportunita', 'accettato')`. **KPI 2 "Importo lavori accettati"** — somma di `valore_complessivo` della riga Preventivo "rilevante" (corrente, non superata da una revisione più recente — stessa identica logica del gate `lavoro_pronto_per_montaggio()`/del fix Valore Dashboard della `0033`: `not exists (select 1 from lavoro_satellite pr where pr.revisione_di = ls.id)`) sui Lavori con `stato = 'accettato'` **esattamente** — un Lavoro `completato` non conta più, per scelta esplicita dell'utente (non è "quanto ho accettato nel tempo", è "quanto ho attualmente accettato e non ancora completato/rifiutato"); nessuna finestra temporale, somma sullo stato attuale. **KPI 3 "Tempo medio per realizzare un preventivo"** — media in giorni di `data_esito_preventivo - data_primo_briefing_concluso` sui Lavori con almeno un Preventivo che ha raggiunto un esito finale (`preventivo_accettato=true` **OPPURE** `preventivo_rifiutato=true` — entrambi contano allo stesso modo per questo KPI), dove `data_primo_briefing_concluso = MIN(data_ultimo_cambio_stato)` tra i satelliti `tipo='appuntamento'`/`tipo_appuntamento='briefing'`/`concluso=true` per quel Lavoro (gestisce il caso di più Briefing sullo stesso Lavoro, ripetibile dallo Sprint "fondamenta" del 2/8) e `data_esito_preventivo = data_ultimo_cambio_stato` della riga Preventivo rilevante; finestra rolling `kpi_finestra_mesi` (da `artigiano`, default 12), ancorata su `data_esito_preventivo`. **Verificato prima di procedere, come richiesto esplicitamente**: il trigger `set_satellite_data_ultimo_cambio_stato()` (ultima definizione `0030_campione_indipendente.sql`, righe 47-60) aggiorna già correttamente `data_ultimo_cambio_stato` sia al cambio di `concluso` sia al cambio di `preventivo_accettato`/`preventivo_rifiutato` — **non serve alcuna colonna dedicata né alcun touch aggiuntivo al trigger**, riusabile così com'è. Limite noto e accettato (segnalato, non risolto): riflette l'ULTIMO cambio della colonna osservata, non il primo — se un Briefing/Preventivo viene fatto oscillare avanti e indietro più volte, il timestamp usato è quello dell'ultima transizione, non della prima; caso limite raro, non gestito, si applicherebbe comunque a qualunque uso di questa stessa colonna nel progetto. **KPI 4 "Tempo medio per completare un lavoro"** — media in giorni di `completato_at - data_lavoro` (cast a `timestamptz`, mezzanotte) sui Lavori con `stato = 'completato'`; finestra rolling su `completato_at`, stesso `kpi_finestra_mesi`. **Colonna di apertura confermata `data_lavoro`** (non `created_at`): è quella mostrata in UI come "Aperto il" (redesign dettaglio Lavoro del 31/7), editabile dall'artigiano — `created_at` è il timestamp tecnico di inserimento riga, non il concetto di "apertura lavoro" a cui si riferisce il KPI. **Nessun semaforo/target per nessuno dei 4 nuovi KPI** (a differenza dei 4 precedenti, colorati vs `artigiano.target_*_giorni`): il prompt di questo sprint non richiede alcun confronto con un obiettivo — card uniformi, mai colorate. Conseguenza accettata e segnalata, non risolta in questo sprint: le colonne `artigiano.target_preventivo_giorni`/`target_progetto_giorni`/`target_produzione_giorni`/`target_montaggio_giorni` (0018) restano a schema ma non sono più lette da nessun KPI — il form "Obiettivi" in Profilo/Impostazioni (`components/profilo-obiettivi-form.tsx`) resta invariato e continua a salvarle, semplicemente senza più alcun effetto visibile; solo `kpi_finestra_mesi` resta effettivamente usata. KPI 1/2 (conteggio/somma puntuali) mostrano sempre un numero reale anche se zero (`lib/lavori/kpi.ts` non usato per questi due, nessun concetto di "dati insufficienti" — uno zero è una risposta valida); KPI 3/4 (medie rolling) riusano `formattaGiorni()`/lo stesso pattern "Dati insufficienti" già in uso per i vecchi KPI quando `campione=0`. Nuovo `components/kpi-dashboard.tsx` (`KpiDashboardCards`) sostituisce `KpiDurateDashboard`/`KpiDurateNeutro`, entrambi eliminati. |
| 2026-08-03 | **Sprint E — KPI rimossi dalla pagina Conclusi**: decisione presa esplicitamente con l'utente (chiesta perché i nuovi KPI 1/2 descrivono lavori *in corso*, mostrarli su una pagina di lavori *chiusi* sarebbe stato incoerente) tra tre opzioni proposte (solo KPI 3/4 neutri, nessun KPI, tutti e 4 neutri) — scelta **nessun KPI su Conclusi**: `app/(app)/statistiche/page.tsx` non chiama più alcuna RPC KPI, `KpiDurateNeutro` eliminato insieme a `KpiDurateDashboard`. |
| 2026-08-03 | **Sprint E — filtro Tutti/Completati/Rifiutati su Conclusi**: `app/(app)/statistiche/page.tsx` guadagna `searchParams: Promise<{ stato?: string }>` (stesso pattern già in uso in `app/(app)/clienti/page.tsx` per la ricerca) — tre `Link` (`/statistiche`, `/statistiche?stato=completato`, `/statistiche?stato=rifiutato`), "Tutti" di default, pagina resta un Server Component puro, nessun client component/JS necessario. |
| 2026-08-03 | **Sprint E — colonna Avanzamento: numero dentro il pallino, ingrandito**. `app/(app)/lavori/page.tsx`: nuovo `BadgeConteggio` (`h-6 w-6 rounded-full flex items-center justify-center text-white text-[11px]`, sostituisce il vecchio pallino decorativo `h-2 w-2` + numero a fianco in `RiepilogoSatelliti`). Stesso componente riusato identico nella nuova vista a card mobile (punto successivo) — un'unica fonte per il rendering del conteggio, non duplicato. Verificato visivamente con un Lavoro di test a 13 rossi (due cifre): leggibile, non compresso né tagliato. |
| 2026-08-03 | **Sprint E — layout mobile a card per la Dashboard, sostituisce lo scroll interno nascosto**. `app/(app)/lavori/page.tsx`: la tabella esistente (invariata) viene nascosta sotto il breakpoint `md` (`hidden ... md:block`, era sempre visibile con `overflow-x-auto`) e sostituita da una nuova vista a card impilate (`space-y-3 md:hidden`) con le stesse 6 informazioni (Cliente, Descrizione/titolo con icona appuntamento scaduto, Stato, Avanzamento, Valore, elimina) — nessuna informazione dietro scroll interno/orizzontale. Il bottone elimina (`LavoroEliminaBottone`, client component con `onClick`) resta **fuori** dal `Link` che avvolge il resto della card (stessa struttura già in uso nella tabella, dove è nella propria `<td>` non avvolta da `Link`) — per non annidare un `<button>` dentro un `<a>`, che avrebbe fatto scattare anche la navigazione al click sul cestino. **Bug di sviluppo evitato durante l'implementazione, non arrivato a produzione**: un tentativo di formattare il file con `prettier` (mai usato in questo progetto, installato al volo da `npx` senza alcuna configurazione) ha riscritto l'intero file in virgolette doppie e punto e virgola, stile opposto a quello di tutto il resto del codebase (virgolette singole, nessun `;`) — annullato immediatamente con `git checkout` non appena notato nel diff, richiesto di riscrivere a mano la sola porzione mobile (persa nell'annullamento, essendo ancora non committata). **Lezione per il futuro**: non usare `prettier`/formatter generici non già configurati nel progetto — il progetto non ne ha uno, lo stile esistente (single-quote, no semicolon) va rispettato a mano; se serve annullare una modifica sbagliata, verificare prima con `git status`/`git diff` cosa si sta per scartare, specialmente se ci sono altre modifiche non correlate ancora non committate nello stesso file. |
| 2026-08-03 | **Sprint E — verifica end-to-end completa**. Supabase locale (porte offset +1000), build di produzione + Playwright, ambiente smontato a fine test, dati di test creati via SQL diretto (incluso il trucco "due passaggi" per backdatare `data_ultimo_cambio_stato` senza farlo sovrascrivere dal trigger: prima il cambio del flag osservato, poi un secondo `UPDATE` che tocca solo `data_ultimo_cambio_stato` senza toccare le colonne osservate dal trigger, che quindi non lo sovrascrive) e poi eliminati. **KPI verificati con calcolo a mano su un artigiano con 9 Lavori di test**: 2 `opportunita` + 4 `accettato` (incluso il Lavoro dedicato alla verifica Avanzamento, anch'esso `accettato`) → **KPI 1 = 6** (corretto, il conteggio iniziale "a mente" di 5 nella preparazione del test aveva scordato quel nono Lavoro); 3 Preventivi accettati con valore 1000/2000/3000 su Lavori `accettato`, un quarto Preventivo (rifiutato, valore 500) su un Lavoro `rifiutato` correttamente escluso → **KPI 2 = € 6.000** esatti; due coppie Briefing-concluso/Preventivo-esito backdatate a 5.0 e 3.0 giorni di distanza (una `accettato`, una `rifiutato`, a conferma che entrambi gli esiti contano) → **KPI 3 = 4.0 giorni** esatti; due Lavori completato con `data_lavoro`/`completato_at` a 20.4 e 10.4 giorni di distanza → **KPI 4 = 15.4 giorni** esatti (un primo tentativo con `completato_at` sbagliato — stessa data di `data_lavoro` per errore di battitura nell'SQL di test, non un bug applicativo — aveva prodotto 0.4 giorni; corretto e riverificato). **Caso "dati insufficienti" verificato su un secondo artigiano senza alcun Lavoro**: KPI 1 = `0` reale, KPI 2 = `€ 0` reale, KPI 3/4 = **"Dati insufficienti"** — confermata la distinzione voluta tra "zero è una risposta valida" (1/2) e "nessun dato disponibile" (3/4). **Filtro Conclusi**: Tutti (3 Lavori: 1 rifiutato + 2 completati) → Completati (solo i 2) → Rifiutati (solo 1) → Tutti di nuovo (3), tutti i sottoinsiemi corretti, URL riflette `?stato=`. **Avanzamento a due cifre**: Lavoro con 13 rossi/3 gialli/5 verdi (12 Acquisti senza righe + 1 Briefing non concluso = 13 rossi, 3 Acquisti con riga in `da_acquistare` = 3 gialli, 5 Progetti accettati = 5 verdi), badge "13" verificato leggibile via screenshot, non compresso. **Mobile 375px**: nessun overflow di pagina (`scrollWidth === clientWidth === 375`), tabella confermata `display:none` (`isVisible()` = `false`), 6 card renderizzate con tutte le informazioni visibili senza alcuno scroll — verificato via screenshot. Dati di test eliminati (9 Lavori + 1 Cliente, verificato 0 righe residue), utenti di test lasciati nell'istanza locale (comunque distrutta con `supabase stop --no-backup` a fine sessione). `tsc --noEmit`/`eslint`/`npm run build` puliti sull'intero progetto. **Lavoro su branch `feature/sprint-e-dashboard`, non mergiato in `main`, non deployato, migration `0034` non applicata a nessun database** — come richiesto esplicitamente. |
| 2026-08-03 | **Form "Obiettivi" in Profilo/Impostazioni — nota "in fase di revisione" sui 4 campi ormai morti, non rimozione**. Richiesta iniziale dell'utente: nascondere l'intero form (5 campi: `target_preventivo/progetto/produzione/montaggio_giorni` + `kpi_finestra_mesi`), dato che i nuovi KPI del Sprint E non hanno più semaforo/target. **Discrepanza segnalata prima di procedere**: `kpi_finestra_mesi`, nello stesso form/stessa azione (`aggiornaObiettiviKpi()`, `lib/profilo/actions.ts`), è invece tuttora attivamente usato dai nuovi KPI 3/4 (finestra rolling) — nasconderlo insieme agli altri 4 avrebbe tolto all'artigiano l'unico modo di cambiarlo. Tre opzioni presentate, **l'utente ha scelto**: lasciare tutti e 5 i campi visibili e funzionanti (nessuna rimozione/hiding), aggiungendo solo una nota esplicativa. `components/profilo-obiettivi-form.tsx`: nota grigia (`bg-gray-50`) sopra i 4 campi target ("Sezione in fase di revisione: questi 4 obiettivi non influenzano più i KPI attuali... Restano salvabili ma senza alcun effetto visibile"); il campo "Finestra temporale per le medie" separato da un `border-t` con una didascalia opposta ("Usata dai KPI 'Tempo medio preventivo' e 'Tempo medio completamento' in Dashboard — questo campo resta attivo"). **Nessuna modifica a schema/azione**: le colonne DB restano tutte invariate e continuano a salvarsi tutte (compresi i 4 campi "morti", esattamente come richiesto — "le colonne DB restano invariate, solo l'interfaccia non lo mostra più" si applica qui come "l'interfaccia continua a mostrarle ma segnala che non hanno effetto", non come rimozione). Verificato end-to-end (Supabase locale, porte offset +1000, build di produzione + Playwright, ambiente smontato a fine test): entrambe le note visibili nel DOM; submit del form con `kpi_finestra_mesi` modificato a `6` → messaggio "Obiettivi salvati" mostrato e valore confermato via query diretta sul DB. `tsc --noEmit`/`eslint` puliti. |

| 2026-08-03 | Scartata l'idea di filtrare la tendina Fornitore in Acquisti in base alla Categoria_Acquisto selezionata: un fornitore reale copre spesso più categorie merceologiche insieme (es. lo stesso fornitore vende sia ferramenta che bordi), quindi un vincolo derivato (storico d'uso) o un tag esplicito fornitore↔categoria introdurrebbe rigidità inutile. La tendina Fornitore in Acquisti mostra sempre tutte le sedi fornitore, senza filtro per categoria. Nota: il legame `Artigiano_Fornitore_Categoria` descritto nel modello dati come "tag personale per categoria" non è mai stato implementato nel codice/schema — resta solo teorico, non c'è nulla da rimuovere. |

| 2026-08-03 | **Combobox riutilizzabile per Cliente (creazione Lavoro) e Fornitore (Acquisti)**, sostituisce il campo di sola ricerca testuale in entrambi i punti. Nuovo `components/combobox.tsx` (generico, `fetchOptions(query)` + `onSelect`): al focus con campo vuoto chiama subito `fetchOptions('')` per mostrare l'elenco completo in tendina (nessun debounce), digitando filtra con lo stesso debounce di 300ms già in uso; chiusura su click fuori (nuovo `mousedown` listener) oltre che sulla selezione. Il componente gestisce solo la fase "non ancora selezionato": la UI del "già selezionato" (chip con bottone "Cambia") resta gestita dai due chiamanti esattamente come prima, nessuna modifica al flusso di selezione/deselezione. `cercaClienti()` (`lib/clienti/actions.ts`) estesa per supportare query vuota (prima ritornava `[]` subito): ora restituisce l'elenco completo dei clienti dell'artigiano ordinato per nome (limite 200, RLS "cliente: solo proprietario" già scoping — nessun filtro `artigiano_id` esplicito necessario), la ricerca filtrata sale da limite 10 a 20 per coerenza con `cercaFornitoreSedi()`. `cercaFornitoreSedi()` (`lib/fornitori/actions.ts`) già supportava query vuota (l'intero catalogo condiviso si carica e filtra lato JS, commento preesistente); corretto solo l'ordinamento, che ordinava per `sede.nome` invece che per il `label` visibile (ragione sociale + sede) — ora ordinato per label, coerente con "elenco completo ordinato alfabeticamente" del Combobox. **Discrepanza segnalata e risolta con l'utente prima di procedere**: la richiesta assumeva un filtro esistente "categoria → fornitore filtrato per categoria" nella tendina Acquisti, ma categoria e fornitore sono due campi indipendenti nel form e nello schema (nessuna relazione fornitore↔categoria, né diretta né tramite storico ordini) — **scelto esplicitamente di non introdurne uno** (né derivato dallo storico né come tag esplicito): un fornitore reale copre spesso più categorie merceologiche insieme, un vincolo di quel tipo introdurrebbe rigidità inutile. La tendina Fornitore in Acquisti mostra quindi sempre tutte le sedi fornitore, senza filtro per categoria — comportamento invariato rispetto a prima, solo con tendina completa al focus invece che vuota. Noleggio (altro consumer di `cercaFornitoreSedi()`) **non toccato**, resta sul vecchio campo di sola ricerca — fuori dallo scope esplicito della richiesta (solo Cliente/Lavoro e Fornitore/Acquisti). **Verificato end-to-end** (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test, artigiano/5 clienti/2 fornitori(3 sedi) di test creati via SQL diretto): tendina cliente mostra tutti e 5 i clienti ordinati alfabeticamente al focus; digitare "Ver" filtra a "Marco Verdi"; selezione collassa a chip "Cambia"; stesso comportamento su Fornitore Acquisti (3 sedi al focus, filtro "Legnostore" a 1 risultato); chiusura su click fuori; messaggio "Nessun risultato" per query senza match. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non ancora committato** — modifiche solo in working tree, in attesa di conferma. |

| 2026-08-03 | **Combobox Cliente/Fornitore — commit e deploy**: nessuna migration coinvolta. Committato direttamente su `main` (il lavoro era già su `main`, non su un branch feature, quindi nessun merge separato), pushato e deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) su richiesta esplicita dell'utente — verificato con `docker compose ps` (container `districo` up, commit `bc14583`) e `curl -L https://districo.it` (200). |

| 2026-08-03 | **Semplificazione stato Acquisto — flag `ordinato`, sostituisce il vecchio stato a 3 valori testuali**. **Due discrepanze segnalate e risolte con l'utente prima di procedere**: (1) il modello "bozza/concluso via invio o chiusura manuale" descritto nella richiesta appartiene a `ordine_acquisto`/`ordine_acquisto_riga`, tabelle del brief originale del 16/7 mai collegate al codice dopo la revisione strutturale del 25/7 (zero riferimenti fuori da `database.types.ts`) — il target reale è l'attività Acquisto in uso (`lavoro_satellite` `tipo='acquisti'`, stato `da_acquistare`/`acquistato`/`ricevuto` dalla `0012`/`0031`), non quella tabella morta; (2) "quantità, prezzi" editabili per referenza non esistono nel modello attuale (righe ridotte a un solo campo di testo libero dal fix modale del 2/8, nessuna colonna prezzo mai esistita) — **l'utente ha confermato**: GIALLO = tutto modificabile ma solo fornitore/referenze (testo libero)/valore complessivo, nessuna reintroduzione di campi strutturati quantità/prezzo. Migration `0035_acquisto_ordinato.sql`: nuova colonna `ordinato boolean not null default false` (check `tipo = 'acquisti' or ordinato = false`, stesso pattern di `preventivo_accettato`/`progetto_accettato`/`campione_consegnato`); backfill mirato (verificato contro i dati reali di produzione prima di scrivere la migration, 3 righe esistenti: `ordinato = true where stato in ('acquistato', 'ricevuto')`, preservando il comportamento verde/gate-passing già in produzione); `lavoro_satellite_tipo_stato_check` rilassato per `acquisti` (stesso trattamento già riservato a `preventivo` dalla `0022`: colonna `stato` non più vincolata, resta in schema per le righe storiche); trigger `set_satellite_data_ultimo_cambio_stato` esteso a `ordinato`; `lavoro_pronto_per_montaggio()`/`lavori_dashboard()` aggiornate (rosso: manca fornitore o nessuna referenza; verde: `ordinato=true`, priorità massima; giallo implicito). **Nuovo semaforo JS** `coloreAcquisti(ordinato, haFornitore, haRighe)`/`labelStatoAcquisti()` (`lib/lavori/satelliti-meta.ts`) sostituiscono le funzioni legate al vecchio stato (`STATO_ACQUISTI_LABEL`, `azioniPossibiliAcquisti` rimosse); `satellitiBloccantiMontaggio()` semplificata (acquisti bloccante solo su `!ordinato`, non serve più `righePerSatellite` come parametro — rimosso dalla firma e dal call site in `app/(app)/lavori/[id]/page.tsx`). **Nuova capacità non esistente prima**: modifica di fornitore/categoria/referenze/valore dopo la creazione (`aggiornaOrdine()`, `lib/lavori/satelliti.ts`) — prima l'unico punto di compilazione era il form di creazione, mai più modificabile. **Correzione lo stesso giorno, prima del commit**: la prima stesura trattava `ordinato` come commit definitivo mai reversibile (con `confirm()` nativo) — **sbagliato**, segnalato dall'utente: il flag è un **toggle liberamente reversibile** finché l'ordine non è stato inviato via mail, senza alcuna conferma in nessuna delle due direzioni; l'unico evento davvero irreversibile resta l'invio mail stesso. `impostaAcquistoOrdinato()` (solo-attivazione) sostituita da `impostaOrdinatoAcquisto(satelliteId, lavoroId, ordinato: boolean)` (toggle nelle due direzioni): attivare richiede ancora fornitore+referenza presenti (validato server-side su dati freschi da DB); disattivare non ha requisiti; **entrambe le direzioni bloccate solo se `data_invio_ordine` è già valorizzato** (quello sì il lock permanente, verificato leggendo lo stato reale a DB). `aggiornaOrdine()` invariata nella sua guardia (blocca comunque la modifica dei campi finché `ordinato=true`, a prescindere dalla reversibilità del flag — per rimodificare i campi bisogna prima disattivare "ordinato", non serve eliminare/ricreare l'Acquisto come nella prima stesura). Guardia a due livelli oltre al gate generico "Lavoro modificabile" (`assertSatelliteModificabile`): **enforcement proporzionato a un solo flag su un solo tipo satellite**, niente nuova migration RLS, stesso principio già seguito per gli altri flag booleani accettato/consegnato di Preventivo/Progetto/Campione. `components/satellite-ordine.tsx`: form editabile con Combobox riutilizzabile per il fornitore finché `!ordinato`, vista di sola lettura altrimenti; bottone "Segna come ordinato" (attiva, salva prima i campi correnti) quando `!ordinato`; bottone "Annulla ordinato" (disattiva, nessun salvataggio necessario dato che a `ordinato=true` il form non è renderizzato) accanto a "Invia ordine" quando `ordinato && !data_invio_ordine`; **nessuno dei due bottoni compare più una volta che `data_invio_ordine` è valorizzato** — solo il badge permanente. **"Invia ordine"**: nessuna modifica alla logica di invio (`lib/lavori/ordini-email.ts`, invariata) — solo la visibilità del bottone, condizionata a `ordinato=true` e `data_invio_ordine` non ancora valorizzato: una volta inviato, sparisce **permanentemente**, sostituito dal badge "Ordine inviato il [data]" (già esistente, mai stato nascosto correttamente prima). **Nessun concetto di "merce ricevuta"** reintrodotto (esplicitamente scartato, come richiesto). Verificato end-to-end due volte (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test, dati di test creati via SQL diretto) — la seconda dopo la correzione del toggle: Acquisto senza fornitore/referenze → rosso; Combobox fornitore + referenza + "Salva" → giallo; "Segna come ordinato" (**nessun dialog di conferma**) → verde, campi non editabili; "Annulla ordinato" (**nessun dialog**) → torna giallo, campi di nuovo modificabili con i valori precedenti intatti; simulato un invio via SQL diretto (`data_invio_ordine` valorizzato) → sia "Annulla ordinato" sia "Invia ordine" spariscono, resta solo il badge, verificato anche dopo reload completo della pagina; `lavoro_pronto_per_montaggio()`/`lavori_dashboard()` verificate via RPC diretta con 3 Acquisti di test (rosso/giallo/verde simultanei) — conteggio esatto `{rossi:1 (Briefing), gialli:1, verdi:1}`, gate `false`. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non ancora committato — migration `0035` non applicata a nessun database**, in attesa di conferma. |

| 2026-08-03 | **Flag `ordinato` Acquisto — merge e deploy**: migration `0035` applicata dall'utente su Supabase Cloud (verificato via REST prima del push: colonna `ordinato` presente, backfill corretto sui 3 Acquisti reali — 2 `ricevuto`/`acquistato` → `true`, 1 `da_acquistare` → `false`, nessuna perdita di `stato`/`fornitore_sede_id`/`data_invio_ordine`). Codice committato (`fb21b3e`) e pushato direttamente su `main` (nessun merge separato, il lavoro era già su `main`), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `fb21b3e`) e `curl -L https://districo.it` (200). |

| 2026-08-03 | **Preventivo torna a essere creato automaticamente, affiancato al Briefing** — risolve alla radice il caso limite "Lavoro senza Preventivo" (`lavoro.stato` dipende esclusivamente dai flag `preventivo_accettato`/`preventivo_rifiutato` dal 2/8: senza il satellite, quella logica non ha nulla su cui applicarsi). Preventivo qui inteso come "stima del valore del lavoro", non necessariamente il documento formale — resta un'attività normale, modificabile/eliminabile come le altre, nessun trattamento speciale oltre alla creazione automatica. Migration `0036_preventivo_auto_creato.sql`: `crea_satelliti_iniziali()` inserisce ora sia Briefing sia Preventivo (prima solo Briefing, dallo Sprint "fondamenta" del 2/8, `0023`). **Verificato prima di scrivere la migration**: c'era un caso reale in produzione, il Lavoro "Pannelli scorrevoli" (`accettato`, con 3 Acquisti reali collegati) privo di Preventivo — **l'utente lo ha creato manualmente** prima di procedere; nessun backfill nella migration (solo forward-looking, stesso principio già seguito dalla `0023`: riguarda solo i Lavori creati da ora in poi), confermati via REST tutti e 9 i Lavori reali con almeno un Preventivo. Nessuna modifica all'ordine logico delle attività (`lib/lavori/attivita-ordine.ts`, invariato): Preventivo era già dopo Progetto nell'elenco `ORDINE_ATTIVITA`, un Progetto aggiunto successivamente si colloca già correttamente tra Briefing e Preventivo. **"Aggiungi attività" non offre più Preventivo come opzione** per un Lavoro nuovo (esiste già dalla creazione) — conseguenza automatica del filtro `preventivoEsiste` già esistente (Sprint "fondamenta"), nessuna modifica di codice necessaria oltre al trigger. |
| 2026-08-03 | **Rimossi due messaggi testuali di stato ridondanti rispetto al semaforo** (stesso principio per entrambi, per riferimento futuro se ne emergessero altri: il semaforo rosso/giallo/verde è l'unico indicatore di stato per attività, nessun messaggio testuale dedicato dovrebbe duplicarlo o presupporre obbligatorietà/priorità implicita). (1) **"In attesa di preventivo"** (`app/(app)/lavori/[id]/page.tsx`, mostrato quando `stato='opportunita'` e nessun Preventivo esistente) — rimosso senza sostituto; reso ancora più marginale dal punto precedente (Preventivo ora sempre presente dalla creazione), ma rimosso comunque esplicitamente come richiesto, non lasciato come "dead code innocuo". (2) **"Pronto per il montaggio"/"Non ancora pronto per il montaggio"** (`components/lavoro-segna-completato.tsx`) — rimosso insieme al box colorato (verde/grigio) che lo conteneva, per lo stesso motivo esplicitato dall'utente: presupponeva implicitamente il Montaggio come traguardo sempre atteso, quando non è un'attività obbligatoria (es. un artigiano può produrre per un altro che si occupa lui del montaggio). **Giudizio non esplicitamente richiesto, applicato con cautela**: la riga "Attività ancora da completare: Briefing, Progetto, ..." nello stesso componente è stata **mantenuta** — non duplica un singolo semaforo (aggrega dinamicamente tutte le attività bloccanti il gate, di qualunque tipo) né presuppone una priorità fissa tra attività, quindi non ricade nel principio esplicitato; rimuoverla avrebbe lasciato il bottone "Segna lavoro completato" disabilitato senza alcuna spiegazione del perché. Segnalato qui per trasparenza, rivedibile se l'utente la considera comunque ridondante. Nessuna modifica al nome della funzione SQL `lavoro_pronto_per_montaggio()`/RPC collegate (solo interno, non user-facing — stesso principio già seguito altrove nel progetto per nomi il cui significato è scivolato senza rinominarli). Verificato end-to-end (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test): nuovo Lavoro creato dal flusso reale → Briefing e Preventivo entrambi presenti, ordine corretto, nessun "In attesa di preventivo"; Progetto aggiunto via "Aggiungi attività" → si colloca correttamente tra Briefing e Preventivo; Preventivo portato ad accettato (`lavoro.stato='accettato'`) → nessun testo "pronto per il montaggio" in pagina, bottone "Segna lavoro completato" presente ma disabilitato, lista "Attività ancora da completare: Briefing, Progetto" ancora visibile. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non ancora committato — migration `0036` non applicata a nessun database**, in attesa di conferma. |

| 2026-08-03 | **Preventivo auto-creato + messaggi rimossi — merge e deploy**: migration `0036` applicata dall'utente su Supabase Cloud (verificato creando ed eliminando un Lavoro di test reale via REST: il trigger crea sia Briefing sia Preventivo, nessuna riga residua dopo la pulizia). Codice committato (`a75348b`) e pushato direttamente su `main` (nessun merge separato), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `a75348b`) e `curl -L https://districo.it` (200). |

| 2026-08-03 | **Flag `ordinato` di Acquisto rappresentato come checkbox, non più come coppia di bottoni d'azione**. Corretto lo stesso giorno del toggle reversibile: bottoni "Segna come ordinato"/"Annulla ordinato" sostituiti da un'unica checkbox "Ordinato" (`components/satellite-ordine.tsx`, stesso pattern già in uso per `progetto_accettato` in `SatelliteProgetto`) — riflette `satellite.ordinato`, si attiva/disattiva con un click, nessuna conferma nativa (coerente con l'essere uno stato reversibile, non un'azione che "accade"). `handleSegnaOrdinato()`/`handleAnnullaOrdinato()` unificate in un solo `handleToggleOrdinato(checked)`: se `checked` salva prima i campi correnti del form (ancora "sporco" a quel punto) poi imposta il flag, altrimenti lo disattiva soltanto — stessa logica server (`impostaOrdinatoAcquisto()`) invariata, solo la UI cambia. "Invia ordine" resta un bottone d'azione separato, invariato nello stile e nel comportamento (rappresenta un evento reale e irreversibile, non un flag). **Nessuna modifica al layout complessivo della modale**, come richiesto — resta un intervento a sé, da affrontare insieme all'omogeneità di stile tra tutti i modali dei satelliti. Verificato end-to-end (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test): nessun bottone "Segna come ordinato"/"Annulla ordinato" residuo; checkbox despuntata allo stato giallo; click → spuntata, verde, campi in sola lettura, nessun dialog di conferma; click di nuovo → despuntata, giallo, campi di nuovo modificabili con i valori precedenti intatti, nessun dialog. `tsc --noEmit`/`eslint`/`npm run build` puliti. |
| 2026-08-03 | **Rimosso il bottone manuale "Segna lavoro completato"**, senza sostituirlo con altro meccanismo. Motivazione dell'utente: era un sostituto provvisorio nato per necessità pratica, in attesa del vero meccanismo di chiusura mai costruito (l'entità `Pagamento` con acconto/saldo, il cui saldo chiude automaticamente il Lavoro — lettura assunta dal modello dati originale del 16/7, mai riconfermata dopo la revisione strutturale del 25/7, vedi nuova nota in "Prossimi passi aperti" più sotto). **Conseguenza esplicitamente accettata, non un difetto**: da questo momento non esiste più alcun modo, manuale o automatico, di portare un Lavoro a `stato='completato'` — la chiusura resta un argomento deliberatamente rimandato. **Pulizia a cascata del codice reso orfano** (nessun altro consumer dopo la rimozione, verificato con una ricerca mirata prima di eliminare ciascun pezzo, stesso principio già seguito in tutto il progetto per il dead code): eliminato `components/lavoro-segna-completato.tsx` (file intero); rimossa `completaLavoro()` da `lib/lavori/actions.ts` (unica funzione che scriveva `stato='completato'` in tutto il codebase); rimossa `satellitiBloccantiMontaggio()` da `lib/lavori/satelliti-meta.ts` (unico consumer era il messaggio "cosa manca" del bottone ora sparito); rimossi da `app/(app)/lavori/[id]/page.tsx` la chiamata alla RPC `lavoro_satellite_stato_effettivo()` e il calcolo di `statoEffettivoById` che ne derivava (serviva solo a `satellitiBloccantiMontaggio()`). **Non toccate** (restano necessarie per i Lavori già `completato` in produzione): la RPC SQL `lavoro_pronto_per_montaggio()` stessa (nessuna migration, resta nello schema anche se oggi non più invocata da nessun codice applicativo — rimuoverla sarebbe stato un cambio di schema non richiesto), `assertLavoroModificabile()`/sola lettura satelliti per `stato='completato'`, `LavoroRiapri` (completato→accettato resta necessario per i Lavori già chiusi). Verificato che l'intero blocco venga eliminato correttamente senza lasciare riferimenti pendenti (`tsc --noEmit`/`eslint`/`npm run build` puliti) — verificato anche dal vivo (Supabase locale + Playwright, stesso giro di test del punto precedente) che il bottone e ogni testo residuo legato al montaggio siano assenti dalla pagina di un Lavoro `accettato`. Nessuna migration in questo intervento (solo codice applicativo). |

| 2026-08-03 | **Checkbox `ordinato` + rimozione "Segna lavoro completato" — merge e deploy**: nessuna migration in questo giro. Codice committato (`ef24503`) e pushato direttamente su `main` (nessun merge separato), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `ef24503`) e `curl -L https://districo.it` (200). |

| 2026-08-03 | **Combobox riutilizzabile applicato anche al campo "Compagnia (fornitore)" di Noleggio** — terzo punto di applicazione dello stesso `components/combobox.tsx` già usato per Cliente (creazione Lavoro) e Fornitore (Acquisti). `SatelliteNoleggio` (`components/satellite-noleggio.tsx`) perde la propria ricerca inline (`query`/`risultati`/`useEffect` con debounce manuale) in favore di `<Combobox fetchOptions={cercaFornitoreSedi} onSelect={setSede} />`, stessa `cercaFornitoreSedi()` di prima (già supporta query vuota, invariata). Nessun filtro per categoria (coerente con la decisione già presa per Acquisti: un fornitore reale copre spesso più categorie merceologiche, nessun vincolo derivato). Verificato end-to-end (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test, 2 fornitori di test): tendina con elenco completo e ordinato alfabeticamente al focus; filtro digitando; selezione che collassa a chip con "Cambia", stesso comportamento già verificato per gli altri due punti. `tsc --noEmit`/`eslint`/`npm run build` puliti. Nessuna migration. |

| 2026-08-03 | **Combobox fornitore Noleggio — merge e deploy**: nessuna migration. Codice committato (`e9c9ee9`) e pushato direttamente su `main` (nessun merge separato), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `e9c9ee9`) e `curl -L https://districo.it` (200). |

| 2026-08-03 | **Nuova attività "Chiusura Lavoro" — nuovo (e unico) meccanismo di chiusura del Lavoro**, sostituisce il vecchio bottone manuale "Segna lavoro completato" (rimosso lo stesso giorno, in una sessione precedente). Auto-creata insieme a Briefing e Preventivo (migration `0037_chiusura_lavoro.sql`, `crea_satelliti_iniziali()` esteso con un terzo insert `tipo='chiusura'`), non ripetibile, sempre ultima nell'ordine visualizzato (`lib/lavori/attivita-ordine.ts`, aggiunta in coda a `ORDINE_ATTIVITA`/`RIPETIBILE_ATTIVITA=false` — coerente col fatto che rappresenta letteralmente la fine del flusso). Nuova `creaChiusura()` come fallback manuale per i Lavori creati prima di questa modifica (stesso principio già seguito per Preventivo il giorno precedente), disponibile da "Aggiungi attività" solo se non esiste già. **Semaforo binario** (nessun giallo, come Noleggio): rosso finché `chiusura_conclusa=false`, verde quando `true` — quel flag è il trigger diretto che porta `lavoro.stato` a `'completato'` (`impostaChiusuraConclusa()`, `lib/lavori/satelliti.ts`), non un'azione a sé stante. **Guardia non esplicitamente richiesta ma verificata necessaria prima di scrivere la funzione**: poiché Chiusura è auto-creata fin dalla nascita del Lavoro (come Briefing/Preventivo), senza un controllo un Lavoro ancora `opportunita` potrebbe passare direttamente a `completato` scavalcando l'accettazione guidata dal Preventivo — `impostaChiusuraConclusa()` rifiuta il passaggio a verde se `lavoro.stato` non è già `'accettato'`, messaggio d'errore esplicito mostrato in UI. **Reversibile come toggle** (checkbox "Concluso", nessun `confirm()` nativo, stesso principio già corretto per il flag `ordinato` di Acquisto lo stesso giorno) — ma solo fino al momento della prima attivazione: appena il flag passa a `true`, `lavoro.stato` diventa `'completato'` **nella stessa chiamata**, e da quel momento `assertSatelliteModificabile()` (invariata) blocca qualunque ulteriore scrittura su questo satellite esattamente come su tutti gli altri — quindi in pratica non c'è mai una finestra utile per despuntarlo autonomamente. **Nessuna funzione "riapri" dedicata**: l'unico sblocco resta "Riapri lavoro" (`LavoroRiapri`/`riapriLavoro()`, invariati, agnostici a come il Lavoro sia diventato `completato`) — dopo la riapertura (`completato→accettato`) il satellite torna modificabile e la checkbox, ancora spuntata, può essere disattivata liberamente (riporta `lavoro.stato` a `'accettato'`, già il suo valore corrente in quel momento: no-op innocuo). **Campi**: Data (`chiusura_data`, valorizzata a `now()` alla prima transizione a concluso — stesso pattern "leggi poi scrivi" già usato per `campione_data_consegna` — poi liberamente modificabile tramite il campo data, indipendente dal flag); Riepilogo costi sostenuti (sola lettura, calcolato in `app/(app)/lavori/[id]/page.tsx` sommando `valore_complessivo` degli Acquisti con `ordinato=true` e `costo` dei Noleggi con `prenotazione_effettuata=true` — le voci non confermate non entrano, come richiesto); Acconti ricevuti (righe libere ripetibili — etichetta/data/importo — **nessuna tabella Pagamento dedicata**: vivono come `chiusura_acconti jsonb` sul satellite stesso, esattamente come richiesto); Valore (preventivo) (sola lettura, dal Preventivo "rilevante" — stessa logica già usata per la colonna Valore Dashboard/KPI 2, non superato da una revisione più recente — hoisted in `page.tsx` per essere condiviso tra la riga Preventivo esistente e Chiusura, nessuna duplicazione); Valore - Acconti (sola lettura, calcolato **lato client dallo stato locale non ancora salvato** degli acconti — aggiornamento live mentre si compila il form, non solo dopo "Salva", per un riscontro immediato). **Bug di layout scoperto e corretto in fase di verifica**: la riga di un acconto (etichetta/data/importo/rimuovi) inizialmente usava `grid-cols-[1fr_auto_auto_auto]` con `inputClass()` (che include `w-full`) anche sui campi a larghezza fissa — il campo etichetta risultava largo ~26px invece di riempire lo spazio disponibile, perché due classi Tailwind di larghezza (`w-full` e `w-32`/`w-24`) applicate insieme hanno la stessa specificità CSS e quale vince dipende dall'ordine di generazione nel foglio di stile compilato da Tailwind, non dall'ordine nella stringa `className` — **non affidabile combinarle**. Corretto con un helper dedicato `inputClassFisso()` (stesse classi di `inputClass()` meno `w-full`) per i soli campi a larghezza fissa. **Rifinitura responsive aggiunta durante la stessa verifica** (non esplicitamente richiesta ma necessaria: a 375px l'etichetta restava leggibile per solo ~3 caratteri pur senza generare overflow orizzontale): riga acconto passata da `grid` fisso a `flex flex-wrap` con l'etichetta a `basis-full` (va sempre a capo da sola su mobile) e `sm:basis-0 sm:flex-1` (torna in riga con gli altri campi da `sm:` in su) — nessun overflow a nessuna larghezza, etichetta sempre pienamente leggibile. **Partecipa al conteggio rosso/verde di `lavori_dashboard()`** come qualunque altra attività (nessuna eccezione: altrimenti, non comparendo in nessuna delle due condizioni esistenti, sarebbe stata sempre "giallo" per default) — conseguenza accettata e non un difetto: un Lavoro `accettato` mostrerà sempre almeno un rosso (Chiusura) finché non viene davvero chiuso, a quel punto esce comunque dalla dashboard (`where stato in ('opportunita','accettato')`). Verificato end-to-end (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test, screenshot ispezionati a 1280px e 375px): Briefing+Preventivo+Chiusura tutti presenti e nell'ordine corretto su un Lavoro nuovo; Chiusura assente dalle opzioni di "Aggiungi attività" (già esiste); tentativo di concludere un Lavoro ancora `opportunita` → errore mostrato, nessuna scrittura; Lavoro portato ad `accettato`, Riepilogo costi sostenuti verificato esatto (€ 950 = 800 Acquisto ordinato + 150 Noleggio prenotato, un secondo Acquisto non confermato correttamente escluso); due acconti aggiunti, "Valore - Acconti" aggiornato live (€ 3.500 = 5.000 - 1.500) prima ancora di salvare, persistiti dopo un reload completo; checkbox "Concluso" **senza alcun dialog di conferma** → `lavoro.stato='completato'`, badge "Completato" e bottone "Riapri lavoro" comparsi; vista di sola lettura (click sul nome) verificata senza alcun campo editabile, acconti mostrati in tabella a 3 colonne (etichetta sinistra/data centro/importo destra) come richiesto. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non ancora committato — migration `0037` non applicata a nessun database**, in attesa di conferma. |
| 2026-08-03 | **Nota architetturale per riferimento futuro, SOLO documentazione — nessuna implementazione** (richiesto esplicitamente di non toccare nulla ora): l'ordine delle Attività di trattativa è oggi definito in codice (`lib/lavori/attivita-ordine.ts`, `ORDINE_ATTIVITA`), uguale per tutti gli artigiani a prescindere dal mestiere. Se in futuro emergerà un bisogno **reale** (non ipotetico) di ordini diversi per mestieri diversi — es. un'attività "Smaltimento" collocata diversamente per un'impresa edile rispetto a un falegname — si estenderà lo stesso pattern già previsto fin dal brief originale per `Fase_Template` (ordine personalizzabile per artigiano, con un default di sistema, vedi `CLAUDE-ARCHIVIO.md` riga 40/126: "modificabile dall'artigiano in qualsiasi momento... ogni Lavoro copia le fasi al momento della creazione, le modifiche al template non toccano i lavori già in corso") anche alle Attività di trattativa. **Distinzione importante da preservare quando si affronterà**: il catalogo dei *tipi* di attività possibili (Briefing/Progetto/Preventivo/.../Chiusura) resta comunque definito in codice — ogni tipo richiede sviluppo dedicato per i propri campi/comportamento/semaforo, non diventa mai dato configurabile — **solo l'ordine** tra i tipi già esistenti diventerebbe personalizzabile per artigiano. |

| 2026-08-03 | **Chiusura Lavoro — merge e deploy**: migration `0037` applicata dall'utente su Supabase Cloud (verificato creando ed eliminando un Lavoro di test reale via REST: il trigger crea Briefing+Preventivo+Chiusura, nuove colonne `chiusura_conclusa`/`chiusura_data`/`chiusura_acconti` presenti ai valori di default, nessuna riga residua dopo la pulizia). Codice committato (`263e815`) e pushato direttamente su `main` (nessun merge separato), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `263e815`) e `curl -L https://districo.it` (200). |

| 2026-08-04 | **Restyling modale Appuntamento (Briefing/Verifica misure/Montaggio, stesso componente condiviso) — TEMPLATE DI RIFERIMENTO per il restyling di tutti gli altri modali satellite**, da replicare nel prossimo intervento su Acquisto/Noleggio/Progetto/Campionatura/Costruzione/Preventivo/Chiusura. **Precisazione di scope non esplicitamente distinta dall'utente**: "solo Briefing, non estendere agli altri modali" è stato inteso come riferito ai *tipi* satellite diversi (Acquisto, Noleggio, ecc.), non ai tre sottotipi di Appuntamento — questi condividono lo stesso identico componente `SatelliteAppuntamento` da sempre, non è tecnicamente possibile ridisegnare solo Briefing lasciando Verifica misure/Montaggio sul vecchio layout senza introdurre una biforcazione ad hoc mai richiesta. **Layout**: (1) il pallino di stato si è spostato nell'header del `Modal` generico, accanto al titolo (`components/modal.tsx`, prop `titolo` allargata da `string` a `React.ReactNode` — retrocompatibile, chi passa una stringa continua a funzionare invariato), eliminando la riga che il componente satellite ripeteva al proprio interno con lo stesso pallino+nome. **Opt-in per riga**, non un default globale: nuovo campo `RigaSatellite.titoloConPallino?: boolean` (`lavoro-satelliti-tabella.tsx`), impostato a `true` solo dalle tre righe Appuntamento in `page.tsx` — applicarlo a ogni satellite senza aver anche rimosso l'intestazione interna degli altri tipi (fuori scope in questo giro) avrebbe prodotto un doppio pallino lì, motivo per cui questo pezzo del template non è ancora esteso a tutti. (2) Nella riga liberata: a sinistra un link "Allegati (n)" (icona graffetta esistente + conteggio `allegati.length`) che fa da switch di vista, a destra la checkbox "Concluso" invariata — questa riga resta **fissa**, non fa parte del contenuto che cambia con la vista. (3) Sotto: switch Generale (Data/Descrizione, invariati) ↔ Allegati (lista + trigger upload, stessa logica esistente solo riposizionata) tramite un semplice toggle di stato locale (`vista`), nessuna paginazione/carosello — link "← Generale" per tornare indietro. (4) **"Salva" resta visibile in entrambe le viste**, come richiesto: verificato prima di decidere che upload/eliminazione allegati sono già auto-salvanti (chiamano la Server Action direttamente, `router.refresh()` immediato) — ma "Concluso" vive nella riga fissa sopra, quindi resta modificabile (e da salvare) anche mentre si guarda la vista Allegati, "Salva" resta necessario lì per quel campo specifico, non solo per Data/Descrizione. **Conseguenza accettata, non esplicitamente discussa**: il pallino nell'header del Modal ora riflette lo stato *salvato* (prop statico calcolato server-side), non più le modifiche non ancora salvate nel form come faceva il vecchio pallino interno — allinea Appuntamento allo stesso comportamento già presente in tutti gli altri satelliti (es. Progetto, il cui pallino usa sempre `satellite.progetto_accettato`, mai lo stato locale della checkbox), quindi non è un'eccezione nuova ma un disallineamento che si chiude. Rimosso il prop `titolo` da `SatelliteAppuntamento` (non più usato internamente, il nome vive ora solo nell'header del Modal) e i 6 punti di passaggio in `page.tsx` che lo valorizzavano. Verificato end-to-end (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test, screenshot ispezionati a 1280px e 375px): pallino+"Briefing" uniti nell'header, zero occorrenze duplicate di "Briefing" nel corpo del modale; riga "Allegati (0)"/"Concluso" presente; vista Generale di default (Data/Descrizione); switch ad Allegati nasconde Data, mostra "← Generale", "Salva" resta visibile; Concluso+Salva → pallino della riga in tabella e dell'header del modale diventano verdi dopo il refresh; upload di un allegato in vista Allegati → compare in lista, contatore aggiornato a "Allegati (1)"; nessun overflow orizzontale su mobile in nessuna delle due viste. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non ancora committato.** |

| 2026-08-04 | **Restyling modale Appuntamento — merge e deploy**: nessuna migration. Codice committato (`2178674`) e pushato direttamente su `main` (nessun merge separato), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `2178674`) e `curl -L https://districo.it` (200). |

| 2026-08-04 | **Correzione alla vista Allegati del template modale Appuntamento** (stesso giorno del restyling iniziale, vedi riga precedente): la prima versione teneva "Concluso" fisso nella riga in alto in entrambe le viste, e aggiungeva un secondo link "← Generale" + trigger icon-only separato più sotto nel corpo — una riga extra non richiesta, non la stessa struttura a due elementi della vista Generale. **Corretto**: la riga in alto ora cambia contenuto con la vista, invece di restare fissa — vista Generale invariata (sinistra "Allegati (n)", destra "Concluso"); vista Allegati: sinistra "Generale" (testo semplice, nessuna icona fermaglio, torna alla vista precedente), destra "+ Aggiungi allegato" (icona+testo, apre lo stesso `AllegatoModale` di sempre). Lo spazio centrale in vista Allegati è ora solo `AllegatoLista` (elenco+eliminazione, invariati) — nessun elemento di navigazione lì dentro. **Nuovo prop opzionale `label?: string` su `AllegatoTrigger`** (`components/satellite-allegati.tsx`): quando presente, il bottone mostra icona+testo invece della sola icona — retrocompatibile, tutti gli altri usi esistenti (Acquisto, Chiusura, il trigger icon-only ancora presente altrove) restano invariati non passando questo prop. **Conseguenza accettata**: "Concluso" non è più visibile/modificabile mentre si guarda la vista Allegati (prima lo era, essendo nella riga fissa) — resta comunque nello stato locale del form, quindi "Salva" (ancora visibile in entrambe le viste) lo persiste comunque se modificato prima di passare a quella vista; nessuna perdita di dati, solo temporaneamente non visibile. Verificato end-to-end (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test, screenshot ispezionati a 1280px e 375px): riga corretta in entrambe le viste, nessuna riga "← Generale" residua nel corpo, "Concluso" assente in vista Allegati, upload tramite "+ Aggiungi allegato" funzionante (allegato compare nell'elenco centrale, contatore aggiornato), "Salva" presente in entrambe le viste, nessun overflow orizzontale su mobile. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non ancora committato.** |

| 2026-08-04 | **Correzione vista Allegati — merge e deploy**: nessuna migration. Codice committato (`5b3f8e2`) e pushato direttamente su `main` (nessun merge separato), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `5b3f8e2`) e `curl -L https://districo.it` (200). |

| 2026-08-04 | **Due correzioni al modale Appuntamento, vista Allegati — due bug di layout scoperti e risolti in fase di verifica, condivisi con tutti i satelliti che riusano `AllegatoLista`/`AllegatoTrigger`**. (1) **Bottone "Aggiungi allegato" da testo a icona con badge**: rimosso il prop `label` di `AllegatoTrigger` (introdotto il giorno precedente solo per questo caso, unico consumer — sostituito, non lasciato come opzione morta), nuovo prop `iconaConBadge?: boolean` che sovrappone un piccolo cerchio "+" (colore primario) in alto a destra dell'icona fermaglio, ingrandita a `h-5 w-5` (era `h-4 w-4` altrove nel modale) — nessun testo accanto. (2) **Layout riga allegato realmente a 3 colonne**: la data non era mai stata visivamente centrata nella riga da quando questo layout esiste (dal 2/8) — la colonna era `auto` (larga esattamente quanto il testo), quindi `text-center` al suo interno non aveva alcun effetto, la data restava semplicemente accostata al cestino. Corretto con `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` (colonne esterne uguali, la colonna `auto` della data risulta quindi geometricamente centrata nella riga, indipendentemente da quanto sono lunghi nome e cestino) — **due bug CSS distinti scoperti nel farlo, entrambi degni di nota per il futuro**: (a) la keyword `1fr` in `grid-template-columns` equivale a `minmax(auto,1fr)`, non `minmax(0,1fr)` — la colonna del nome non si sarebbe mai ristretta sotto la larghezza naturale del testo (quindi mai troncata) nonostante `min-w-0` sull'elemento, perché quel `min-w-0` agisce sull'elemento, non sul minimo della colonna stessa; (b) un primo tentativo di correzione aggiungeva anche `justify-self-start` al link del nome (pensando servisse per l'allineamento a sinistra, già implicito) — quella classe fa dimensionare l'elemento al proprio contenuto invece di riempire la cella della griglia (il default per un grid item è `stretch`), vanificando di nuovo `truncate` (l'elemento tornava largo quanto il testo intero, es. 318px anche dentro una cella da 160px) — rimossa, nessuna classe `justify-self-*` necessaria sul nome. Verificato con `getComputedStyle`/bounding box diretti (non solo screenshot) prima di considerarlo risolto: `aOffsetWidth` allineato alla larghezza di colonna, `aScrollWidth` maggiore (conferma il contenuto testuale troncato con ellissi). **Nessuna regressione sugli altri satelliti che riusano lo stesso `AllegatoLista`** (Acquisto verificato esplicitamente: riga allegato ancora corretta, centrata, troncata, nessun overflow) — il fix è nel componente condiviso, si applica automaticamente ovunque. Verificato end-to-end (Supabase locale, porte offset +1000, build di sviluppo + Playwright, ambiente smontato a fine test, screenshot ispezionati a 1280px e 375px, righe di test con nome corto e nome lungo per verificare il centraggio in entrambi i casi): scarto tra centro riga e centro data pari a 0px per entrambe le righe; nessun overflow orizzontale su mobile. `tsc --noEmit`/`eslint`/`npm run build` puliti. **Non ancora committato.** |

| 2026-08-04 | **Fix riga allegato/bottone Aggiungi allegato — merge e deploy**: nessuna migration. Codice committato (`8b981d5`) e pushato direttamente su `main` (nessun merge separato), deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose build && docker compose up -d`) — verificato con `docker compose ps` (container `districo` up, commit `8b981d5`) e `curl -L https://districo.it` (200). |
| 2026-08-05 | **Sprint UI-1 (fondamenta restyling) — punto 1: `inputClass()` centralizzata**, primo dei quattro interventi meccanici/basso rischio pianificati a partire dall'audit `docs/audit-ui.md` (committato lo stesso giorno, discovery-only, nessuna modifica applicata da quel commit in sé). La funzione era dichiarata localmente e identica in 19 file, riducibile a soli 2 corpi reali — nuovo modulo condiviso `lib/input-class.ts` (stesso livello di `lib/formato-valuta.ts`, preso a modello): un'unica `inputClass(hasError = false)` copre entrambe le varianti (i chiamanti senza gestione errore continuano a scrivere `inputClass()`, il parametro opzionale collassa correttamente sullo stesso output della vecchia stringa fissa), più `inputClassFisso(hasError = false)` (variante nata in `satellite-chiusura.tsx` per i campi a larghezza fissa di una riga, stessa stringa meno `w-full`) — assorbita nel modulo condiviso perché concettualmente la stessa stringa, non una vera eccezione. **Lasciata fuori** l'unica vera eccezione (`fornitore-sede-contatto-form.tsx`, padding `px-2.5 py-1.5` invece di `px-3 py-2`, occorrenza singola in tutto il progetto): centralizzarla avrebbe richiesto un parametro di padding non altrimenti necessario, per un solo consumer — lasciata locale al file. 18 file toccati (i 19 meno l'eccezione), solo rimozione della dichiarazione locale + import, nessun call site modificato (le firme coincidono). `tsc --noEmit`/`eslint`/`npm run build` puliti. |
| 2026-08-05 | **Sprint UI-1 — punto 2: `aDateLocal()` centralizzata** in nuovo `lib/date-utils.ts`. Duplicata identica in soli 2 file (`satellite-chiusura.tsx`, `satellite-noleggio.tsx`) — portata minore di `inputClass()` ma stesso principio. **`aDatetimeLocal()` (`satellite-appuntamento.tsx`) non assorbita**: helper diverso e più complesso (gestisce anche l'ora, unico consumer, nessuna duplicazione reale da correggere) — segnalato in un commento nel nuovo modulo per chi lo cercasse lì in futuro. `tsc --noEmit`/`eslint` puliti. |
| 2026-08-05 | **Sprint UI-1 — punto 3: label dei campi form uniformate a `text-sm`**, risolve lo split rilevato dall'audit (`text-xs` in `lavoro-form.tsx` + tutti gli 8 satelliti vs `text-sm` in Cliente/Fornitore/Profilo/pagine auth, senza alcun criterio riconoscibile). 34 occorrenze in 9 file (`lavoro-form.tsx`, `fornitore-sede-form.tsx`, `allegato-modale.tsx`, e i satelliti Appuntamento/Campionatura/Preventivo/Acquisto/Noleggio/Chiusura) — selezionate con il pattern esatto `mb-1 block text-xs font-medium text-gray-700`, che in tutti e 9 i file identifica **solo** le label (incluse due `<span>` che fungono da etichetta di un gruppo di campi, non di un singolo input: "Acconti ricevuti" in Chiusura, "Referenze" in Acquisto — stesso trattamento delle vere `<label>`, coerente col loro ruolo). **Non toccati i bottoni/link che condividono `text-xs font-medium text-gray-700` senza il prefisso `mb-1 block`** (bottoni "Salva" outline, link "Cambia"/"+ Aggiungi riga"/"+ Aggiungi acconto") — fuori scope esplicito del punto 3 ("solo le label"), lasciati alla revisione del bottone Salva già segnalata nell'audit come incoerenza a sé (due dimensioni/due stili, nessun pattern di posizione). `tsc --noEmit`/`eslint` puliti. |
| 2026-08-05 | **Sprint UI-1 — punto 4: titolo/descrizione del Lavoro sulla card Dashboard mobile allineato a `text-sm`** (`app/(app)/lavori/page.tsx`), come già sulla tabella desktop — prima ereditava il default del `<body>` (16px, nessuna classe `text-*` esplicita sul paragrafo), risultando visivamente più grande su mobile che su desktop per lo stesso dato, omissione non intenzionale rilevata dall'audit. Nessun'altra modifica alla card (Cliente/Stato erano già `text-xs`, coerenti con la tabella). `tsc --noEmit`/`eslint` puliti. **Sprint UI-1 concluso — 4/4 punti completati, 4 commit distinti su `feature/ui-1-fondamenta`.** |
| 2026-08-05 | **Sprint UI-1 — merge e deploy**: nessuna migration. Branch `feature/ui-1-fondamenta` mergiato in `main` (fast-forward) e deployato su apphub (`ssh root@178.105.199.29`, `git pull && docker compose up -d --build`) su richiesta esplicita dell'utente — verificato con `docker compose ps` (container `districo` up, commit `ebb3cb4`) e `curl -L https://districo.it` (200). |
| 2026-08-05 | **Falso allarme post-deploy UI-1 — sintomi (avvio lento, apertura Lavoro lenta, back su Dashboard mostra "nessun lavoro" falso, refresh risolve) non causati dal codice**. Indagine sistematica: build mode `next start`/`NODE_ENV=production` confermati (nessun residuo `next dev`); log container puliti, nessun errore/retry/timeout, `Ready in 176ms`; CPU/RAM/load del VPS a riposo al momento del controllo; `git diff` tra il commit pre-deploy e quello deployato conferma che UI-1 ha toccato **solo** file in `components/`/`app/(auth)/.../-form.tsx`/una classe in `lavori/page.tsx` + i due nuovi moduli `lib/` — zero tocchi a `next.config.ts`/`Dockerfile`/`docker-compose.yml`/`middleware.ts`/`layout.tsx`/provider/data-fetching. Nessuna cache Next.js configurata sopra le route coinvolte (invariato). **Ipotesi principale, poi confermata dall'utente in incognito ("sembra ok")**: non un bug applicativo ma un effetto collaterale intrinseco di qualunque deploy che sostituisce l'intero container — un tab del browser rimasto aperto **da prima** del deploy referenzia gli hash dei chunk JS della build vecchia (nessun `generateBuildId` fisso in `next.config.ts`, comportamento standard Next.js), che spariscono dal server appena il container viene sostituito; una navigazione client-side successiva (click, back) con quel bundle ormai orfano può fallire silenziosamente invece di un errore esplicito — combacia con tutti i sintomi riportati, incluso "refresh risolve". **Nessun fix di codice necessario/applicato** — segnalato per consapevolezza futura: chi testa subito dopo un deploy dovrebbe aspettarsi questo comportamento su un tab già aperto, non è un regressione da inseguire. **Trovato per strada, non correlato ai sintomi ma reale**: `docker system df` su apphub mostrava 54.43GB di build cache Docker mai ripulita dai deploy passati (disco al 85%, 12G liberi) — ripulita con `docker builder prune -f` su richiesta esplicita dell'utente, **53.3GB liberati** (disco 85%→16%, 61G liberi), container/immagine in uso non toccati (verificato `docker compose ps` + `curl` ancora 200 dopo la pulizia). Da ripetere periodicamente in futuro, non automatizzato in questo giro. |
| 2026-08-05 | **Sprint UI-2 — bottone Salva flottante con dirty-state, pattern stabilizzato e propagato a tutti i form editabili dell'app**. Nessuna libreria di form nel progetto (verificato in `package.json` prima di iniziare) — costruito da zero. **4 primitivi condivisi, nuovi**: `lib/use-dirty-form.ts` (`useDirtyForm(valoriCorrenti)` — confronto per valore, `JSON.stringify`, contro una baseline in `useState` catturata al primo render; `segnaSalvato(nuovaBaseline?)` sposta la baseline dopo un salvataggio riuscito); `components/salva-flottante.tsx` (`SalvaFlottante` — barra sticky in basso, visibile solo se `visibile` (dirty) è vero, bleed `-mx-4 -mb-4` per "sanguinare" fino al bordo del contenitore ospitante, funziona senza calibrazione per-chiamante perché ogni contenitore toccato usa lo stesso padding `4`=1rem; `onSalva` assente → `type="submit"`, affida il salvataggio al `<form>` che la contiene, usato da Cliente/Fornitore); `components/dialog-conferma.tsx` (`DialogConferma` — dialog generico riusabile, lista di opzioni `primaria`/`secondaria`/`testuale`, portal con z-index sopra la Modal); `components/modal.tsx` esteso con un Context interno e l'hook `useProteggiChiusuraModal(dirty, onTentativoChiusura)` — permette a un componente satellite (client component, dentro la Modal) di intercettare X/backdrop/Esc quando ha modifiche non salvate, **senza che `LavoroSatelliteTabella` debba conoscerne il dirty-state**: una Context, a differenza di un tentativo di `cloneElement`/prop-passing dall'esterno, funziona correttamente indipendentemente da come l'elemento ha attraversato il confine RSC — stesso principio del bug cloneElement-su-RSC già scoperto e corretto nello Sprint C (2/8). **Copertura**: 7 satelliti con almeno un campo a salvataggio manuale (Appuntamento — pilota, Preventivo, Campionatura, Costruzione, Noleggio, Acquisto/`satellite-ordine.tsx`, Chiusura Lavoro) più Cliente e Fornitore. **Progetto escluso**, verificato esplicitamente su richiesta dell'utente prima di procedere: nessun campo a salvataggio manuale, solo una checkbox auto-salvante (nessun "non salvato" possibile da segnalare) e allegati (già un flusso di conferma indipendente via `AllegatoModale`). **`satellite-nuovo-ordine.tsx`** (form di creazione Acquisto, unico con coppia Crea/Annulla in tutto il progetto) resta **fuori dal pattern principale** ma riceve un trattamento dedicato: conferma su Annulla/X/backdrop solo se il form ha già dati compilati, stesso `DialogConferma` ma a **2** opzioni ("Continua modifica"/"Scarta e chiudi", nessun "Salva ed esci" — qui il salvataggio vero è il submit "Crea", non un salvataggio in background). **Cliente/Fornitore**: stesso hook + componente barra, ma **nessun dialog a 3 opzioni** — sono form a pagina intera, non in una Modal, nessun "bottone chiudi" unico da proteggere; scelta esplicita dell'utente tra 3 opzioni presentate: solo l'avviso nativo del browser (`beforeunload`, nuovo `lib/use-avvisa-uscita-pagina.ts`) alla chiusura/reload reale della scheda, **nessuna** intercettazione dei Link interni (nav, "Nuovo lavoro", lista Lavori associati) — richiederebbe un sistema di route-guard applicativo esplicitamente giudicato fuori scope. Riflesso anche sulla creazione (form vuoto = non dirty, il bottone "Crea cliente"/"Crea fornitore" compare solo dopo la prima modifica, stesso criterio del resto del pattern). **Bug di layout scoperto durante la verifica del pilota, corretto prima di propagare**: `SalvaFlottante` deve essere **sibling** del div a bordo di ciascun satellite (non annidato dentro) — altrimenti la sua `sticky` resta vincolata all'altezza di quel div (dimensionato sul proprio contenuto) invece che all'area scrollabile piena della Modal. **Fix più a monte, stesso giro**: altezza della Modal su mobile cambiata da `h-[92vh]` fissa a `max-h-[92vh]` (stesso principio già in uso su desktop, `sm:max-h-[85vh]`) — con altezza fissa, un form corto lasciava uno spazio vuoto sotto la barra invece di restarle incollata (sticky non aggancia nulla se il contenuto non richiede scroll); con `max-h` la Modal si dimensiona sul contenuto fino al tetto del 92%, nessuna perdita del comportamento "quasi schermo intero" per i form lunghi. **Fix incidentale su Preventivo**: il campo Valore era un input non controllato (`defaultValue`+`onChange` separati), che faceva partire il dirty-state sempre da vuoto indipendentemente dal valore già presente — reso controlled con stato iniziale corretto. Per i satelliti con un flag auto-salvante che persiste anche i campi manuali come effetto collaterale (Chiusura: `Concluso`; Acquisto: `Ordinato`), il gestore del toggle richiama `segnaSalvato()` dopo il salvataggio, altrimenti la barra resterebbe visibile con dati già persistiti. **Verificato end-to-end** (Supabase locale, porte offset +1000, dev server + Playwright, 5 commit distinti — primitivi, pilota, propagazione 6 satelliti, Cliente/Fornitore, conferma Annulla Acquisto): tutti gli scenari (compare/sparisce, dialog 3 e 2 opzioni, salva/scarta, `beforeunload` intercettato, X/backdrop/Esc uniformi, nessuna regressione su Progetto/toggle auto-salvanti) su tutti i tipi coinvolti; nessun overflow orizzontale mobile/desktop anche con contenuto lungo (Chiusura con più acconti). `tsc --noEmit`/`eslint`/`npm run build` puliti. **Lavoro su branch `feature/ui-2-salva-flottante`, non mergiato in `main`, in attesa di revisione.** |

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
- **[2026-08-03] Chiusura del Lavoro oggi priva di qualunque meccanismo, manuale o automatico.** Il bottone manuale "Segna lavoro completato" è stato rimosso (vedi tabella "Decisioni prese"): era un sostituto provvisorio, mai stato il meccanismo definitivo. Il meccanismo pensato fin dall'inizio — l'entità `Pagamento` (acconto/saldo) il cui saldo chiude automaticamente il Lavoro, vedi `CLAUDE-ARCHIVIO.md` (righe 43/128/271, cronologia 16-19/7) — non è mai stato implementato: è rimasto per tutto questo tempo una lettura assunta dal modello dati originale, mai costruita né riconfermata dopo la revisione strutturale del 25/7 (che ha sostituito interamente il vecchio ciclo di vita trattativa/esecuzione/chiuso con l'attuale opportunita/accettato/rifiutato/completato). **Da affrontare insieme**: la definizione completa del modello Pagamento (acconti ripetibili + saldo che chiude il Lavoro) è il prossimo argomento da riprendere per ridare al Lavoro una via di chiusura, questa volta definitiva.

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
