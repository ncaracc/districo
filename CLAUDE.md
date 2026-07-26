# Districo — Contesto di progetto

Questo file va aggiornato a ogni decisione importante presa nel progetto (nome, funzionalità, architettura, scelte di design, ecc.), così che chiunque riprenda il progetto — umano o assistente — abbia il contesto aggiornato. Aggiungere una riga alla tabella "Decisioni prese" per ogni scelta fatta, senza cancellare la cronologia precedente.

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
| 2026-07-16 | Nome scelto: **Districo** (da "districare": sciogliere un nodo/una matassa; in senso figurato, risolvere una situazione intricata). Dominio districo.it verificato disponibile al momento della ricerca. |
| 2026-07-16 | Payoff: "l'assistente per l'artigiano" |
| 2026-07-16 | Logo: tipografico, stile lemma da vocabolario (sillabazione con punto mediano + accento tonico: di·strì·co), grassetto serif, nero su sfondo bianco. File: `districo_logo.svg` |
| 2026-07-16 | Stack tecnico: segue il pattern multi-tenant già in uso per Falegname in Cloud (Next.js 15 + Supabase/Postgres con RLS), coerente con l'albero decisionale delle convenzioni infrastrutturali condivise (https://github.com/ncaracc/infra-docs), data la necessità di multi-tenancy e condivisione parziale dei dati tra artigiani. |
| 2026-07-16 | Fasi di lavoro: personalizzabili per singolo artigiano, con un template di default clonabile per chi non vuole configurarle da zero. Ogni lavoro congela una copia delle proprie fasi al momento della creazione, così eventuali modifiche successive al template dell'artigiano non alterano i lavori già in corso. *(superato/raffinato dalle decisioni successive sul modello Attività/Fasi)* |
| 2026-07-16 | Ruolo Admin: vede solo statistiche aggregate (utenti attivi, lavori in corso/completati, nuove iscrizioni) e dati di utilizzo (tempo medio per fase, colli di bottiglia). Zero accesso al contenuto di clienti, fornitori o lavori. Il vincolo va implementato a livello di RLS/database, non solo nascosto in UI, così la garanzia di privacy è strutturale. |
| 2026-07-16 | Modello di accesso tra artigiani: isolamento singolo per default, condivisione solo puntuale per singolo lavoro ("a quattro mani" tramite tabella ponte Lavoro_Artigiani). Nessun concetto di team/studio fisso per ora, ma il modello è pensato per non richiedere una riscrittura se in futuro si aggiungerà. |
| 2026-07-16 | Anagrafica Artigiano: nome, cognome, ditta (opzionale), specializzazione (termine scelto al posto di "mestiere" — da confermare in via definitiva), telefono, email (= username di accesso), indirizzo (località obbligatoria, resto opzionale). Pensata fin da subito in ottica di community di artigiani, utile per eventuali future azioni commerciali. |
| 2026-07-16 | Anagrafica Cliente: descritto come "il tesoretto dell'artigiano" — anagrafica completa ma permissiva, unico campo davvero obbligatorio è nome/ragione sociale, resto libero (telefono, email, indirizzo, note). |
| 2026-07-16 | Anagrafica Fornitori: **condivisa** tra tutti gli artigiani (non di proprietà del singolo), per fare efficienza quando più artigiani usano lo stesso fornitore. Modello a due livelli: `Fornitore` (l'azienda, con partita IVA come chiave forte) + `Fornitore_Sede` (le sedi fisiche, es. Ferexpert Bologna e Ferexpert Verona sono due sedi dello stesso Fornitore). Deduplicazione in fase di censimento tramite ricerca fuzzy sul nome + controllo esatto sulla P.IVA. Prevista anche una tabella di note private per artigiano legate a una sede fornitore (es. sconti concordati), separata dall'anagrafica condivisa. |
| 2026-07-16 | Artigiano ospite su un lavoro condiviso ("a quattro mani"): accesso in sola lettura a lavoro e cliente, nessuna modifica. Da implementare come flag ruolo (owner/ospite) in `Lavoro_Artigiani`, con policy RLS che vietano scrittura su Cliente e limitano le scritture su Lavoro/Lavoro_Fasi in base al ruolo. |
| 2026-07-16 | Specializzazione artigiano: menu a tendina con possibilità di inserire un valore personalizzato. I valori personalizzati vengono segnalati (es. coda "da rivedere") per dare la facoltà di promuoverli a voce ufficiale del menu. |
| 2026-07-16 | Anagrafica Cliente confermata **non condivisa** tra artigiani (a differenza dei Fornitori): se due artigiani diversi servono lo stesso cliente reale (es. stesso committente per lavori diversi), ognuno ha una propria scheda Cliente indipendente, senza alcun collegamento visibile tra loro. Scelta intenzionale a tutela della riservatezza del portafoglio clienti di ciascun artigiano. Il collegamento tra artigiani avviene solo se uno invita esplicitamente l'altro sullo stesso Lavoro ("a quattro mani"), mai per inferenza automatica dal nome del cliente. |
| 2026-07-16 | Creazione lavoro: solo l'artigiano proprietario della scheda Cliente può creare un nuovo Lavoro. Diventa automaticamente riga in `Lavoro_Artigiani` con ruolo=owner, stato=accettato. |
| 2026-07-16 | Invito secondo artigiano ("a quattro mani"): se già iscritto a Districo, riceve una notifica in-app e deve accettare esplicitamente (stato "in sospeso" finché non risponde). Se non ancora iscritto, riceve una mail con link di registrazione univoco (token legato all'invito); dopo la registrazione, l'account viene agganciato automaticamente al lavoro ma l'accettazione esplicita resta l'ultimo passo dell'onboarding, per un comportamento uniforme in entrambi i casi. `Lavoro_Artigiani` esteso con: artigiano_id (nullable), email_invitata, ruolo, stato (invitato/accettato/rifiutato), token_invito, scadenza_invito. |
| 2026-07-16 | Onboarding — verifica email: obbligatoria per chi si registra "a freddo" (accesso bloccato finché non verifica). Chi si registra tramite link di invito salta la verifica, perché il click sul link (ricevuto su quella email) è già prova sufficiente di possesso. |
| 2026-07-16 | Onboarding — flusso da invito: email precompilata e non modificabile (legata al token), nessuna verifica aggiuntiva, stesso form anagrafica del flusso normale, con un passo finale in più di conferma esplicita della partecipazione al lavoro. |
| 2026-07-16 | Onboarding — campi anagrafica artigiano alla registrazione: obbligatori nome, cognome, specializzazione, telefono, indirizzo completo (via, civico, CAP, località). Opzionali solo Ragione Sociale (rinominata da "ditta") e Partita IVA, perché non tutti gli artigiani hanno una ragione sociale distinta dal proprio nome. |
| 2026-07-16 | Immagine profilo artigiano: opzionale, non richiesta in fase di registrazione (si propone più avanti dal profilo). Upload con crop a rapporto fisso quadrato/circolare, standard da avatar. Se assente, avatar di default generato dalle iniziali (nome + cognome). Modificabile in qualsiasi momento, sostituisce l'immagine precedente. |
| 2026-07-16 | Scelta/creazione cliente in fase di creazione lavoro: ricerca semplice per nome (non fuzzy, a differenza dei Fornitori) perché la rubrica clienti è personale e piccola, non condivisa su larga scala. Creazione di un cliente nuovo consentita al volo dentro il flusso di creazione lavoro, senza dover passare prima dall'anagrafica clienti. Il cliente associato a un lavoro è modificabile anche dopo la creazione. |
| 2026-07-16 | Scadenza inviti "a quattro mani": token_invito valido 10 giorni. Notifica di promemoria 1 giorno prima della scadenza, e notifica a scadenza avvenuta. Se scaduto e non accettato, il lavoro resta mono-artigiano; l'owner può rimandare l'invito (nuovo token, nuova scadenza di 10 giorni). |
| 2026-07-16 | Dominio districo.it registrato (con email inclusa, rinnovo automatico attivo, scadenza 16/7/2027). |
| 2026-07-16 | **Modello Lavoro ridisegnato in due nature**: **Attività** libere e ripetibili prima dell'accettazione (trattativa) + **Fasi** di esecuzione dopo l'accettazione. Il gate tra le due è l'evento libero "lavoro accettato" (nessun vincolo sulle Attività per poterlo segnare). |
| 2026-07-16 | Entità `Attività` generica (non una tabella per tipo): id, lavoro_id, tipo (briefing/progetto/preventivo/sopralluogo/campioni), stato (da_fare/in_corso/bloccata/fatta), data_appuntamento (opz.), data_apertura, data_chiusura, commenti. Nessuna obbligatoria (briefing incluso), nessun ordine imposto, ripetibile all'infinito (es. N sopralluoghi). |
| 2026-07-16 | Preventivo trattato come Attività di tipo `preventivo`, con campo `revisione_di` che lega ogni nuova versione alla precedente — storico delle revisioni senza tabella dedicata. Aggiunto campo `importo` per l'ammontare del preventivo. |
| 2026-07-16 | SLA per tipo di Attività: personalizzabili per artigiano (stesso principio del Fase_Template), con default di sistema (es. preventivo max 7 giorni). Superamento SLA: evidenziato in UI + notifica attiva, stesso pattern promemoria inviti "a quattro mani". |
| 2026-07-16 | Tracciamento tempo a due livelli: tempo totale del lavoro (da apertura prima Attività a consegna/montaggio) + tempo per singola Attività/Fase, confrontato con l'SLA per individuare colli di bottiglia (alimenta anche la metrica admin già prevista). |
| 2026-07-16 | Nessuna Attività di trattativa è obbligatoria, briefing incluso: l'artigiano aggiunge solo le attività che servono per quel lavoro specifico, in qualsiasi ordine. |
| 2026-07-16 | 'Lavoro accettato' è un gate libero: l'artigiano lo segna quando vuole, senza vincoli sullo stato delle Attività di trattativa. |
| 2026-07-16 | Il `Fase_Template` di esecuzione è modificabile dall'artigiano in qualsiasi momento dalle impostazioni/profilo. Resta valida la decisione precedente sul congelamento: ogni Lavoro copia le fasi al momento della creazione, quindi le modifiche al template non toccano i lavori già in corso. |
| 2026-07-16 | Fasi di esecuzione **libere nell'ordine** (l'artigiano può avere più fasi aperte insieme, non c'è vincolo di sequenza rigida), ma l'interfaccia deve **sempre evidenziare le fasi non concluse**, per non perderne traccia. |
| 2026-07-16 | Vista cliente sull'avanzamento del lavoro: rimandata a seconda release, dopo il primo rilascio funzionante dell'app. Non fa parte del modello dati iniziale. |
| 2026-07-16 | Gestione economica del Lavoro: entità `Pagamento` — id, lavoro_id, tipo (acconto/saldo), importo, data, note. Acconti ripetibili, saldo unico. **Il saldo registrato chiude definitivamente il Lavoro**, a prescindere dallo stato delle Fasi di esecuzione. |
| 2026-07-16 | Allegati (PDF, foto) gestiti in un **unico repository per Lavoro**, senza collegamenti granulari a singole Attività/Fasi/Fornitori. Entità `Allegato` — id, lavoro_id, tipo (pdf/foto), nome_file, url/path, data_caricamento, note (opz.). |
| 2026-07-16 | UI — Stile generale: minimal, leggibilità elevata, interfaccia totalmente responsive, **mobile-first**. Navigazione tramite **menu hamburger** a scomparsa. |
| 2026-07-16 | UI — Palette colori: prevalentemente bianco/nero/grigio (coerente col logo). Eccezioni mirate: colori "a LED" (rosso/giallo/verde) riservati esclusivamente agli **stati** (da fare/in corso/bloccata/fatta, SLA superato). Pulsanti con un set di colori accesi ma **limitato e rigorosamente uniforme** in tutta l'app — niente tavolozza ampia o colori diversi per bottoni simili. |
| 2026-07-16 | UI — Tipografia: il **serif resta esclusivamente nel logo**. Tutta l'interfaccia (titoli, liste, form, testi) usa un **sans-serif** molto leggibile, per velocità di lettura su mobile. |
| 2026-07-16 | UI — Voci del menu hamburger: da definire progressivamente, non bloccate ora (base ragionevole: Lavori, Clienti, Fornitori, Profilo/Impostazioni, aperta a modifiche). |
| 2026-07-16 | UI — Aggiunta voce menu **"Statistica"**: KPI economici (es. fatturato, incassi, importi preventivi/saldi) e di performance (es. tempi medi per Attività/Fase, SLA superati) — da dettagliare in una sessione dedicata. |
| 2026-07-16 | Approvvigionamento: acquisti gestiti in **un'unica finestra modale**, per lavoro: categoria → fornitore (filtrato per categoria) → articolo/descrizione/colore-finitura/quantità → prezzo. `Categoria_Acquisto` creata liberamente da ogni artigiano (nessuna predefinita, es. pannelli, bordi, ferramenta, sistemi di illuminazione, lavorazione esterna fabbro/vetraio...). Fornitori taggati per categoria in modo specifico per artigiano (tag personale, non condiviso, a differenza dell'anagrafica Fornitore condivisa). |
| 2026-07-16 | `Articolo` salvato è legato a un `Fornitore_Sede` specifico (codice/prezzo hanno senso solo lì); flag "salva articolo" in fase d'acquisto per riutilizzarlo senza ricercare il codice; propone l'ultimo prezzo pagato a quel fornitore. |
| 2026-07-16 | Un `Ordine_Acquisto` si considera concluso quando l'artigiano invia la mail al fornitore, oppure quando lo chiude manualmente (es. ordine gestito fuori app, lavorazione esterna concordata a voce). Nessun tracciamento intermedio di conferma/ricezione per ora — stato semplice: bozza → concluso (via invio o chiusura manuale). |
| 2026-07-16 | Aggiunta entità `Fornitore_Sede_Contatto` — id, fornitore_sede_id, nome, email, telefono (opz.), ruolo (opz.), flag `destinatario_ordini` (bool). Una sede fornitore può avere più contatti, ma solo quelli flaggati ricevono la mail automatica degli ordini (es. Ferexpert: due contatti email censiti, solo uno riceve gli ordini). |
| 2026-07-16 | Catalogo `Articolo` **condiviso per fornitore_sede** (nessun `artigiano_id`): stesso codice/descrizione visibile a tutti gli artigiani che usano quel fornitore. Rimosso `ultimo_prezzo` come colonna statica: il prezzo suggerito in fase d'acquisto va calcolato a runtime come `MAX(created_at)` su `Ordine_Acquisto_Riga` filtrata per `articolo_id` + join `Ordine_Acquisto → Lavoro → Lavoro_Artigiani` con `artigiano_id = auth.uid()` — così ogni artigiano vede il proprio ultimo prezzo pagato, anche se il catalogo è condiviso. RLS `Articolo`: SELECT aperta a tutti gli artigiani autenticati; lo storico prezzi resta filtrato per artigiano tramite le policy già vigenti su `Lavoro` e `Ordine_Acquisto`. |
| 2026-07-17 | Modello economico riconfermato esplicitamente: il saldo registrato chiude definitivamente il Lavoro, a prescindere dallo stato delle Fasi. |
| 2026-07-17 | Storage Allegati/immagine_profilo: cartella dedicata sul VPS (`/srv/apps/districo/uploads/`, sottocartelle `lavori/` e `profili/`), non object storage — coerente con l'infrastruttura semplice già in uso. Struttura, backup e modalità di serving (proxy dall'app, non Nginx statico diretto, per rispettare le policy RLS sugli Allegati) preparati in `districo-config/`. |
| 2026-07-17 | Notifiche: canale in-app + email, configurabile per singola tipologia dal pannello di controllo dell'artigiano. Aggiunta entità `Notifica_Preferenza` (artigiano_id, tipo_notifica, canale_email bool). |
| 2026-07-17 | Provider email transazionale: SMTP Aruba (`smtps.aruba.it`, porta 465 SSL), casella `info@districo.it` creata appositamente. Invio centralizzato in un'unica funzione `sendEmail()` per restare liberi di cambiare provider se in futuro servisse più capacità. |
| 2026-07-17 | Hosting database confermato: **Supabase Cloud** (non self-hosted) — per tenere il VPS scalabile indipendentemente dal numero di app future. Falegname in Cloud usa oggi Supabase self-hosted via Docker sul VPS; pianificata migrazione futura di Falegname allo stesso modello Cloud, per uniformità (task separato, non bloccante per Districo). |
| 2026-07-17 | Porta interna Docker assegnata: **3002** (3001 risultava occupata da un'app "preventivi" non documentata in https://github.com/ncaracc/infra-docs/blob/main/convenzioni-vps.md; Falegname in Cloud usa in realtà la porta 3100, fuori dal range convenzionale 3001-3099). File pronti in `districo-config/`: `docker-compose.yml`, `Dockerfile`, `districo.conf` (Nginx), `.env.example`, `setup-cartelle-vps.sh`. |
| 2026-07-17 | VPS Hetzner (178.105.199.29) rinominato da `scattimiei` ad **`apphub`**, per riflettere il ruolo multi-app del server (ora ospita anche Districo, oltre a Scattimiei e altre app non documentate: "preventivi", stack "lab" con Grafana/Prometheus/Authentik). Il nome progetto nel pannello Hetzner Cloud resta "scattimiei.it" — è un'etichetta cosmetica separata dall'hostname del sistema operativo, non aggiornata. |
| 2026-07-17 | Repo GitHub creato e pushato: `ncaracc/districo` (privato). Autenticazione HTTPS via Personal Access Token (permesso `repo`), credenziali salvate con `git config --global credential.helper store` su server-a5. |
| 2026-07-17 | Docker installato su apphub (non presente in precedenza, prima app Node/Next.js del VPS). Container `districo` avviato in produzione, porta 3002, healthcheck via redirect 307 a `/login` (middleware auth attivo). |
| 2026-07-17 | Storage allegati: cartelle create su apphub (`/srv/apps/districo/uploads/lavori`, `/uploads/profili`), montate come volume Docker. Backup di questa cartella nello script comune ancora da fare (script stesso non ancora scritto per nessuna app). |
| 2026-07-17 | Dominio districo.it migrato da nameserver Aruba a **Cloudflare** (`clara.ns.cloudflare.com`, `jonah.ns.cloudflare.com`), coerente con le convenzioni infrastrutturali condivise (https://github.com/ncaracc/infra-docs). Record MX/SPF/DKIM/DMARC di Aruba preservati identici durante la migrazione (la posta `info@districo.it` resta gestita da Aruba, solo il DNS passa a Cloudflare). Tutti i record mail (`mail`, `mx`, `pop3`, `smtp`, `webmail`, `admin`, `autoconfig`, `imap`) impostati su "DNS only" (non proxati), per non rompere i protocolli di posta che non passano dal proxy Cloudflare. Record A dell'apice e `www` puntati a 178.105.199.29, anch'essi temporaneamente "DNS only" per permettere la validazione Certbot. |
| 2026-07-17 | HTTPS attivato via Certbot (`certbot --nginx -d districo.it -d www.districo.it`). Certificato Let's Encrypt attivo, scadenza 2026-10-16, rinnovo automatico configurato. Sito raggiungibile in produzione su https://districo.it. |
| 2026-07-17 | **Deploy iniziale completato**: repo GitHub, Supabase Cloud, Docker su apphub, Nginx, DNS Cloudflare, HTTPS — tutta la catena infrastrutturale è live. Restano aperti solo: script di backup comune, flusso di autenticazione applicativo (login/registrazione, in pausa da sessione precedente), e il task futuro di migrazione di Falegname in Cloud a Supabase Cloud. |
| 2026-07-18 | Indirizzo artigiano internazionalizzato: campi via, civico, CAP/postal code, città, **provincia** (nuova colonna, opzionale — label variabile per paese, es. "Provincia" per Italia, "State" per USA, assente per micro-stati come Vaticano/San Marino/Lussemburgo/Islanda) e **paese** (nuova colonna, tendina con elenco paesi, default Italia). Lista paesi/prefissi/label mantenuta in `lib/paesi.ts`, condivisa da registrazione e onboarding da invito. Convenzione registrata anche trasversalmente in `infra-docs` (`convenzioni_UI.md`) per essere riusata identica in Falegname in Cloud e app future. |
| 2026-07-18 | Validazione Partita IVA condizionata al paese: formato rigido (11 cifre numeriche) solo se paese = Italia; per qualsiasi altro paese il campo resta libero, senza validazione di formato, perché gli schemi VAT esteri variano troppo per avere una regex unica sensata. |
| 2026-07-18 | Telefono: nel form spostato **dopo** il blocco indirizzo (prima veniva subito dopo la specializzazione). Aggiunto un selettore di prefisso internazionale, precompilato automaticamente in base al paese scelto nell'indirizzo ma sempre modificabile a mano (per il caso in cui il telefono non sia dello stesso paese di residenza). A livello di storage non è stata aggiunta una colonna separata: il prefisso e il numero vengono concatenati in un'unica stringa nella colonna `telefono` già esistente, per non introdurre una colonna dedicata a fronte di un beneficio marginale. |
| 2026-07-18 | Password: aggiunto il classico toggle "occhio" mostra/nascondi in chiaro su tutti i campi password dell'app (login, registrazione, conferma password, onboarding da invito), tramite un componente condiviso `components/password-input.tsx` invece di duplicare la UI in ogni form. |
| 2026-07-18 | **Dominio canonico per link email: `https://www.districo.it`** (non l'apice `districo.it`, pur restando entrambi live e coperti da Certbot). `NEXT_PUBLIC_SITE_URL` allineato a questo valore in `.env` (locale e produzione) e nel fallback hardcoded di `lib/email/templates.ts`. Aggiunto `emailRedirectTo` esplicito alla chiamata `supabase.auth.signUp()` in `registrazione-form.tsx`, invece di affidarsi implicitamente al solo "Site URL" configurato nella dashboard Supabase — causa del bug per cui il link di conferma email puntava a `localhost:3000` (default mai cambiato in dashboard). Il "Site URL"/"Redirect URLs" su Supabase restano comunque impostazioni di dashboard, non coperte dal codice: va aggiornata manualmente (vedi nota sotto). |
| 2026-07-18 | SMTP custom per le mail di sistema di Supabase Auth (conferma email, reset password): **non configurabile da codice/env**, è un'impostazione di progetto Supabase (dashboard, o Management API con un access token che non è disponibile in locale). Restano quindi sender diversi per le due categorie di email: `sendEmail()` nostro (SMTP Aruba, `info@districo.it`) per gli inviti "a quattro mani", il mailer di default Supabase (`noreply@mail.app.supabase.io`) per conferma/reset — finché non si configura SMTP custom lato dashboard Supabase. |
| 2026-07-18 | **Fix lint di sicurezza del Database Linter Supabase** (migration `0004_fix_lint_security.sql`, testata in locale con Postgres in Docker + shim di `auth.users`/`auth.uid()`/ruoli `anon`/`authenticated`, comportamento verificato end-to-end): `search_path = public` esplicito su `is_artigiano_del_lavoro`, `is_owner_del_lavoro`, `ultimo_prezzo_articolo` (mancava, a differenza di `handle_new_artigiano` che lo aveva già); estensione `pg_trgm` spostata da `public` a schema dedicato `extensions` (gli indici GIN già creati restano validi, referenziano l'operator class per OID non per nome); policy `"lavoro: inserimento se si possiede il cliente"` riaffermata con `DROP POLICY`+`CREATE POLICY` per correggere un `WITH CHECK (true)` presente solo sul DB live (il file 0001 in questo repo aveva già la versione corretta — la divergenza indica una modifica fatta a mano nello SQL Editor, mai riportata nei sorgenti); EXECUTE revocato da `PUBLIC`/`anon` su `is_artigiano_del_lavoro`/`is_owner_del_lavoro`/`ultimo_prezzo_articolo` (restano eseguibili da `authenticated`, necessario perché le RLS di più tabelle le invocano nel contesto di sessione del chiamante) e completamente da `handle_new_artigiano` (deve scattare solo dal trigger di signup). `rls_auto_enable()`, citata negli avvisi del linter, non risulta in nessuna migration di questo repo (creata a mano nello SQL Editor, probabilmente utility di setup mai ripulita): la migration la individua dinamicamente via `pg_proc` e le revoca EXECUTE qualunque sia la sua firma, senza generare errori se non esiste. |
| 2026-07-18 | **Vulnerabilità trovata oltre la richiesta originale**: `ultimo_prezzo_articolo(p_articolo_id, p_artigiano_id)` accettava `p_artigiano_id` come parametro passato dal chiamante invece di derivarlo da `auth.uid()`, pur essendo `SECURITY DEFINER` (bypassa la RLS sulle tabelle interrogate) — un utente autenticato qualsiasi avrebbe potuto leggere lo storico prezzi di un altro artigiano passando il suo id. Corretto rimuovendo il parametro `p_artigiano_id` dalla firma (nessun call site da aggiornare, la funzione non era ancora richiamata da nessuna UI). Coerente con la decisione già presa in precedenza sul calcolo runtime "con `artigiano_id = auth.uid()`" — l'implementazione era divergente dalla decisione originale. |
| 2026-07-18 | **Fix ai lint di sicurezza rimasti dopo la 0004** (migration `0005_fix_lint_security_grants.sql`): il Database Linter continuava a segnalare `security_definer_function_executable` su tutte e 4 le funzioni, sia per `anon` che per `authenticated`. Causa individuata dall'utente: `REVOKE EXECUTE ... FROM PUBLIC` toglie solo il grant implicito allo pseudo-ruolo PUBLIC, ma ogni progetto Supabase esegue una tantum `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role` — quindi ogni funzione nuova riceve grant **espliciti** a quei ruoli, indipendenti da PUBLIC e non toccati dalla 0004. Il test locale della 0004 non aveva riprodotto il problema perché lo shim Postgres/Docker usato non replicava questo meccanismo di default privileges — **corretto lo shim di test** per includerlo, dopo di che il bug si è riprodotto esattamente come segnalato (`anon` restava in grado di eseguire le funzioni). Fix: `REVOKE EXECUTE ... FROM anon, authenticated` esplicito su `handle_new_artigiano` (zero ruoli utente, solo il trigger), `REVOKE EXECUTE ... FROM anon` esplicito sui 3 helper (resta il grant `authenticated` già concesso nella 0004). Verificato via `pg_proc.proacl` prima/dopo, comportamento a runtime (anon → `permission denied` su tutte e 4; authenticated → le 3 helper continuano a rispondere), e che il trigger di signup crei ancora correttamente la riga `artigiano` nonostante `handle_new_artigiano` non abbia più alcun grant per ruoli utente. |
| 2026-07-18 | **502 Bad Gateway in produzione su `/lavori` e `/clienti/[id]`** (non un bug applicativo — il container rispondeva 200 su `localhost:3002`, nessun errore nei log). Causa: Nginx segnalava `upstream sent too big header while reading response header from upstream` — il `proxy_buffer_size` di default (4-8K) non basta più a contenere gli header di risposta (in particolare i `Set-Cookie` di sessione `@supabase/ssr`), da quando `raw_user_meta_data`/il JWT dell'artigiano contengono molti più campi (indirizzo completo con provincia/paese, ragione sociale, P.IVA, ecc.) rispetto a un progetto Supabase minimale. Fix: aggiunti `proxy_buffer_size 32k; proxy_buffers 8 32k; proxy_busy_buffers_size 64k;` al blocco `location /` di `/etc/nginx/sites-available/districo.conf` su apphub (backup del file originale lasciato accanto, `districo.conf.bak-<timestamp>`), `nginx -t` + `systemctl reload nginx`. **Non è una configurazione tracciata nei sorgenti del repo** (vive solo sul VPS) — da tenere a mente se si ricostruisce l'ambiente da zero, e potenzialmente da generalizzare in `infra-docs` per altre app Next.js+Supabase con lo stesso pattern. |
| 2026-07-18 | **Bug reale in produzione: creazione Lavoro sempre fallita con "Errore nella creazione del lavoro, riprova"** — non era né un problema di 0006 (mai raggiunta: il fallimento avveniva un passo prima) né della policy INSERT su `lavoro` (verificata via `pg_policies` live: testo identico al file, corretto). Causa: `creaLavoro()` faceva `.insert(...).select('id').single()`, cioè un `INSERT ... RETURNING` — e **Postgres richiede che la riga restituita da una RETURNING soddisfi anche la policy SELECT della tabella**, non solo il `WITH CHECK` dell'INSERT. La policy SELECT su `lavoro` (`is_artigiano_del_lavoro`) richiede una riga owner in `lavoro_artigiani` che a quel punto non esiste ancora (creata nello statement successivo) — stessa famiglia di problema "circolare" già affrontata nella 0006, ma qui via il meccanismo RETURNING invece del WITH CHECK diretto, quindi non coperta da quel fix. Diagnosticato riproducendo l'errore end-to-end via REST con un utente di test reale (creato e ripulito subito dopo, incluso un cliente/lavoro di debug), isolando che lo stesso identico insert riesce con `Prefer: return=minimal` e fallisce con `return=representation`. **Fix**: l'id del Lavoro viene generato lato applicazione (`crypto.randomUUID()`) ed evitata del tutto la `RETURNING` sull'insert — nessuna modifica a schema/RLS necessaria. Aggiunto anche `console.error()` sui due branch di errore di `creaLavoro()` (prima venivano inghiottiti in silenzio, senza comparire nemmeno nei log del container) e il messaggio d'errore mostrato all'utente ora include il testo reale dell'eccezione Postgres invece del generico "riprova". |
| 2026-07-18 | **Fix lint sfuggito nella 0006** (migration `0007_fix_lint_possiede_cliente.sql`): la funzione `possiede_cliente_del_lavoro` (introdotta nella 0006) aveva ricevuto `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT ... TO authenticated`, ma non l'esplicito `REVOKE ... FROM anon` — stesso pattern già risolto nella 0005 per le altre 3 funzioni, sfuggito qui perché la 0006 nasceva come fix RLS (bootstrap owner), non come fix lint. Testata con lo stesso metodo delle precedenti (Postgres in Docker + shim con `ALTER DEFAULT PRIVILEGES`): dopo il fix `anon` riceve `permission denied`, `authenticated` continua a poterla eseguire (verificato anche che il bootstrap owner di `lavoro_artigiani` dalla 0006 non abbia regressioni). Gli avvisi rimasti (`authenticated` sulle 4 funzioni helper, `auth_leaked_password_protection`) restano intenzionalmente non toccati: attesi per design (RLS le richiede) o legati al piano Free di Supabase. |
| 2026-07-19 | **Layout globale Header/Contenuto/Footer**, applicato solo in versione desktop per ora (il comportamento mobile/hamburger esistente resta invariato sotto il breakpoint `md`). Header e Footer spostati dal layout di `(app)` al **root layout** (`app/layout.tsx`), quindi visibili di default su tutte le pagine dell'app, incluse quelle di `(auth)` (registrazione, invito) — non solo nell'area autenticata come prima. `components/app-nav.tsx` (già esistente per l'hamburger mobile) è stato esteso invece di duplicato: su desktop mostra il logo a sinistra, il menu centrato orizzontalmente (Lavori, Clienti, Fornitori, Statistica, Profilo/Impostazioni — le ultime tre restano placeholder non cliccabili "in arrivo", coerente con le decisioni già prese) e il logout a destra, tramite CSS grid a 3 colonne per centrare davvero la nav indipendentemente dalla larghezza di logo/logout; su mobile resta l'hamburger esistente, non toccato. La voce "Nuovo cliente" (presente prima nell'hamburger) è stata rimossa dal menu di navigazione: non è tra le voci elencate in questa decisione, resta comunque raggiungibile dal bottone dedicato nella lista Clienti. Nuovo `components/site-footer.tsx`: 3 colonne centrate (logo al 50% dell'altezza dell'header, link a `/privacy` e `/cookie-policy` — nuove pagine placeholder pubbliche "Contenuto in arrivo", aggiunte a `PUBLIC_PATHS` nel middleware — ed email `info@districo.it`, non ancora definita altrove nel progetto quindi usata come da richiesta). |
| 2026-07-19 | **Title tag e favicon**: title impostato a "Districo - l'assistente per l'artigiano" (stesso payoff già deciso il 16/7) nei metadata di `app/layout.tsx`. **Il file `districo_logo.svg` citato non risultava presente da nessuna parte nel repo** (né in `public/`, né altrove) — costruito da zero seguendo la spec già scritta in questo documento (tipografico "di·strì·co", sillabazione con punto mediano + accento tonico, grassetto serif, nero su bianco), confermato dall'utente di procedere così senza attendere il file originale (esiste una copia in PDF nei file di progetto, ma non trovata su questo filesystem). Favicon generata dalla stessa spec, ridotta alla sola iniziale "d" minuscola: `app/icon.svg` (vettoriale, convenzione Next.js), più `app/favicon.ico` e `app/apple-icon.png` renderizzati da quell'SVG con `sharp` (già presente come dipendenza transitiva di Next.js, nessuna nuova dipendenza aggiunta) — l'ICO è stato costruito a mano (header + directory entries) incorporando PNG a 16x16 e 32x32, formato supportato da tutti i browser moderni. |
| 2026-07-19 | **Colore primario per bottoni/CTA: blu petrolio `#1D4E5F`**, testo bianco sopra. Introdotto come token Tailwind (`--primary` in `:root`, esposto come `--color-primary` nel blocco `@theme inline` di `globals.css`, stesso pattern già in uso per `--color-background`/`--color-foreground`), quindi disponibile come `bg-primary`/`ring-primary` ovunque, con lo stato hover ottenuto via modificatore di opacità (`hover:bg-primary/90`) invece di un secondo colore hardcoded. Sostituisce `bg-gray-900`/`hover:bg-gray-700` (il colore ad hoc usato finora) su **tutti** i bottoni primari/CTA dell'app (non solo "Accedi", coerente con "deve diventare il colore di default... in tutta l'app"): login, registrazione, onboarding da invito, form cliente, nuovo lavoro, nuova attività, segna-lavoro-accettato, card invito pendente, lista clienti. Non toccati i colori di stato rosso/giallo/verde già usati per Attività/SLA, né i focus-ring dei campi input (restano grigi, non sono CTA). |
| 2026-07-19 | **Pagina di login**: rimossi titolo "Accedi" e sottotitolo "Bentornato su Districo" (il form parla da sé, coerente con l'header ora globale che già mostra il logo). Header nascosto specificamente su questa pagina (unica eccezione: `AppNav` ritorna `null` se `usePathname() === '/login'`), il Footer invece resta visibile come su tutte le altre pagine. Bottone "Accedi" aggiornato al nuovo colore primario (vedi riga sopra). |
| 2026-07-19 | **Fix dimensioni logo**: nell'header portato da `h-6` a `h-9` (era troppo piccolo per essere il primo elemento riconoscibile a colpo d'occhio accanto alla nav); nel footer da `h-3` (con `opacity-80`, illeggibile) a `h-5` senza opacità ridotta — non più esattamente al 50% dell'header (~56%), ma leggibile e comunque visibilmente più piccolo, come richiesto esplicitamente in alternativa al rapporto esatto. |
| 2026-07-19 | **Ulteriore ritaratura dimensioni logo**: la dimensione scelta per l'header (`h-9`) è risultata più adatta al footer — spostata lì (`h-5` → `h-9`), e l'header aumentato di conseguenza a `h-12` per mantenere la gerarchia visiva (header sempre più prominente del footer). |
| 2026-07-19 | **Fix bug "Uscita in corso…" mostrato a riposo**: `AppNav` vive nel root layout e non si smonta mai passando da/verso `/login` (ritorna solo `null`), quindi lo stato React persiste tra un logout e la sessione successiva — se `uscendo` restava `true` (es. per un'interruzione del flusso), il testo restava bloccato per sempre invece di sparire dopo il logout. Fix: `setUscendo(false)` in un blocco `finally` di `handleLogout()`, così lo stato si resetta sempre, a prescindere da successo/fallimento del `signOut()`. |
| 2026-07-19 | **Header nascosto su Privacy/Cookie Policy per utenti non loggati**: chi arriva su `/privacy` o `/cookie-policy` senza sessione non deve vedere menù né bottone Esci (nulla di riservato da mostrare/azionare); al loro posto un bottone "Home" in fondo al testo, assente per chi è invece loggato (per cui l'header resta quello normale). `RootLayout` è diventato un server component che legge l'utente via `lib/supabase/server` e passa `isLoggedIn` ad `AppNav`. |
| 2026-07-19 | **Procedura di deploy** (eseguita per la prima volta end-to-end in questa sessione, non documentata prima): su apphub, `cd /srv/apps/districo && git pull origin main && docker compose build districo && docker compose up -d`. Il checkout su apphub è un clone dello stesso repo GitHub (`.git` presente in `/srv/apps/districo`), `docker-compose.yml` locale al VPS è **non tracciato** (coerente con la nota già presa sul 17/7 sulla config VPS non nei sorgenti) — va preservato, non sovrascritto da un futuro `git clean`. |
| 2026-07-19 | **Logo definitivo ricevuto dall'utente** (file di progetto, non nel repo — incollato come codice SVG in chat), sostituisce la versione ricostruita a mano il 19/7 mattina. **Supera la decisione del 16/7 "nero su sfondo bianco"**: il logo usa ora un accento rosso `#e63946` (puntino di sillabazione, accento tonico sulla ì, arco/sorriso sotto la parola) su testo nero, font Playfair Display (bold) invece del serif di sistema generico. **Il colore rosso `#e63946` diventa il colore primario di tutta l'app** (bottoni/CTA), su richiesta esplicita dell'utente — sostituisce il blu petrolio `#1D4E5F` scelto la mattina del 19/7 (mai arrivato in produzione prima di essere superato). **Attenzione**: questo rosso coincide con la tonalità già usata per lo stato "bloccata" delle Attività e per i messaggi di errore nei form (`text-red-600`/`bg-red-50`, Tailwind) — non più distinguibile a colpo d'occhio da un CTA come previsto dalla decisione originale sui colori "a LED" riservati agli stati. Segnalato esplicitamente, l'utente ha confermato di voler comunque il rosso ovunque; non ancora rivisitati i colori di stato per differenziarli. |
| 2026-07-19 | **Font Playfair Display (bold) e Lora (italic) auto-ospitati dentro l'SVG**, non caricati come Google Font della pagina: un `<img src="/districo_logo.svg">` esterno non ha accesso ai `<link>`/`@font-face` del documento che lo referenzia (contesto "immagine", niente fetch di risorse esterne), quindi i font sono incorporati come **base64 dentro un `<style>` nello stesso file SVG** (unico modo per farli renderizzare correttamente sia in `<img>` che inline). Solo i subset Google Fonts effettivamente necessari (non i font interi): Playfair Display Bold — subset "latin" (lettere/punteggiatura di base) + subset "vietnamese" (unico che contiene il glifo dell'accento combinante U+0300 usato dall'accento tonico) —, Lora Italic — subset "latin" —, per un peso ragionevole (i due subset Playfair ~29KB, Lora ~22KB). |
| 2026-07-19 | **Bug nel file originale corretto in fase di implementazione**: il codice fornito usava l'accento combinante Unicode U+0300 (`&#x0300;`) in un `<tspan>` separato per colorarlo diversamente dalla lettera base — questo rompe la composizione del glifo nel motore di rendering testato (librsvg/Pango, usato da `sharp` per generare le anteprime PNG): mostrava un cerchietto tratteggiato segnaposto invece dell'accento, perché la marca combinante isolata in un run di testo separato perde l'aggancio alla lettera precedente. **Fix**: sostituito con il carattere spaziante U+02CB (MODIFIER LETTER GRAVE ACCENT, non combinante — si comporta come un carattere normale in sequenza, stesso principio già usato per il punto di sillabazione "·"), riposizionato sopra la "ı" con `dx`/`dy` manuali tarati per via visiva (con compensazione uguale e contraria sul `tspan` successivo, altrimenti l'offset si propaga cumulativamente al resto della parola). Verificato via rendering `sharp` sia a piena risoluzione sia alla dimensione reale di visualizzazione (h-12 header, h-9 footer) prima di installare i file definitivi. |
| 2026-07-19 | **Solo marchio (senza payoff) per header/footer/favicon**, su richiesta esplicita: a `h-12`/`h-9` il payoff "l'assistente per l'artigiano" incluso nel file originale sarebbe stato illeggibile. `public/districo_logo.svg` contiene solo "di·strì·co" (viewBox ritagliato a `0 0 380 66`, senza lo spazio vuoto che prima ospitava il payoff). Il file completo con payoff è stato comunque generato e salvato come **`public/districo_logo_payoff.svg`** per usi futuri più grandi (es. landing page) — non referenziato da nessun componente per ora. `app/icon.svg`/`app/favicon.ico`/`app/apple-icon.png` rigenerati con lo stesso font Playfair Display per coerenza con il nuovo marchio (resta solo la "d" nera, nessun accento rosso: è la sola iniziale, non c'è punto di sillabazione da colorare). |
| 2026-07-19 | **Logo ricostruito come vettori puri (glifi trasformati in `<path>`), sostituendo l'approccio a font incorporato via `@font-face` base64 della decisione precedente** — segnalato dall'utente come visivamente "confuso" in produzione (accento fuori posto, arco troppo vicino al testo), sintomo tipico di font che non si applica in un `<img>` esterno in alcuni browser (supporto a `@font-face` dentro SVG caricati come `<img>` incoerente tra Chrome/Firefox/Safari) e ricade sul serif di sistema, per cui gli scostamenti manuali (`dx`/`dy`) tarati sui glifi di Playfair Display risultavano sbagliati. **Fix strutturale**: font Playfair Display Bold (variabile, istanziato a peso 700) e Lora Italic aperti con `fontTools` + shaping reale via `uharfbuzz` (stesso motore OpenType usato dai browser) per ottenere posizioni/kerning corretti, poi ogni glifo convertito in contorno vettoriale (`SVGPathPen`) e scritto come `<path>` nell'SVG finale — **nessuna dipendenza da font a runtime**, risultato identico in ogni browser. Il glifo "ì" (`igrave`) è un composito nel font (`dotlessi` + `gravecomb`): decomposto nei due componenti per colorare l'accento di rosso mantenendo il posizionamento esatto disegnato dalla fonderia, invece di ricostruirlo a mano con un carattere modificatore U+02CB come nel primo tentativo. L'arco parte ora esattamente dal centro dei due punti di sillabazione (calcolato dallo shaping reale, non più coordinate fisse stimate) e scende sotto la baseline invece di iniziare sopra il testo, eliminando la sensazione di "arco troppo vicino alle lettere". Rigenerati con lo stesso metodo: `public/districo_logo.svg`, `public/districo_logo_payoff.svg`, `app/icon.svg` (+ `favicon.ico`/`apple-icon.png` da esso). |
| 2026-07-19 | **Icona "mobile"/app-icon ricevuta dall'utente** (secondo file di progetto, per usi futuri): marchio "di" con due pallini e un arco a sorriso ai lati, stesso principio grafico del logo completo ma in formato compatto/quadrato. Colore originale dell'utente era arancione `#ff6b35`, **unificato al rosso `#e63946`** del resto del brand su richiesta esplicita ("il colore deve essere unico"). Ricostruita con la stessa pipeline vettoriale (font→shaping→path) e salvata come **`public/districo_icon_mobile.svg`**, non ancora collegata all'app. **Verificata e scartata per il favicon del browser**: a 16×16px (dimensione reale della tab) il dettaglio (due pallini + arco + due lettere serif) risulta un'illeggibile macchia; resta adatta solo a icone più grandi (apple-touch-icon/home screen, tipicamente 180×180) dove si legge bene. Il favicon del browser continua a usare la sola iniziale "d" (`app/icon.svg`). |
| 2026-07-19 | **Ritaratura verticale dell'arco del logo principale**: segnalato dall'utente in produzione come ancora troppo vicino al testo, al punto da sembrare sovrapposto alle lettere. Aumentato lo scostamento del punto di controllo della curva sotto ai puntini (`arc_ctrl_y`) da 26 a 40 unità (stesso sistema di coordinate del font, 1000 unità/em a font-size 34), invariato tutto il resto della pipeline (font→shaping→path già introdotta nella riga precedente). Verificato: il favicon in produzione era già quello nuovo (contenuto identico al file aggiornato, hash cambiato nel `<link rel="icon">`) — il caso di "vedo ancora la vecchia favicon" segnalato dall'utente è quasi certamente cache del browser sulla tab (le favicon vengono cache-ate dai browser in modo più aggressivo e indipendente dal resto della pagina), non un problema lato server/deploy. |
| 2026-07-19 | **Colore primario tornato al nero**: il rosso `#e63946` introdotto poche ore prima come colore di bottoni/CTA viene ritirato — resta riservato esclusivamente al logo/brand e agli usi già esistenti (stato "bloccata" delle Attività, messaggi di errore nei form), coerente con la decisione originale sui colori "a LED". Nuovo `--primary: #111827` in `globals.css` — stesso nero già usato per i testi principali (`text-gray-900`), non nero puro. Essendo un singolo token Tailwind già usato da tutti i bottoni/CTA dell'app, il cambio si è propagato automaticamente senza toccare i singoli componenti (verificato su login e registrazione). |
| 2026-07-19 | **Layout pagina di login ridisegnato**: contenuto racchiuso in una card (`bg-gray-50`, `rounded-2xl`, `shadow-sm`, padding interno) invece del form "nudo" sulla pagina bianca. Spaziatura verticale del form uniformata a `space-y-6` (era `space-y-5`, percepita più stretta prima del bottone "Accedi" per contrasto visivo tra campo bordato e bottone pieno, non per un gap CSS realmente diverso). **Fix strutturale della centratura**: `app/(auth)/layout.tsx` (condiviso da login/registrazione/invito) usava `h-full` per centrare verticalmente — dipende da una catena di percentuali attraverso più antenati (html→body flex→div flex-1→questo layout) che in pratica non si risolveva in altezza piena nel browser, lasciando la card ancorata in alto. Sostituito con `min-h-screen`, robusto perché non dipende dal contesto degli antenati (si appoggia solo al viewport), corregge la centratura su tutte e tre le pagine auth, non solo login. |
| 2026-07-19 | **Flusso "password dimenticata" con Supabase Auth**: nuove pagine `app/(auth)/password-dimenticata` (richiesta reset: form email → `supabase.auth.resetPasswordForEmail()`, messaggio di successo identico indipendentemente dall'esistenza dell'email per non rivelare quali indirizzi sono registrati) e `app/(auth)/reimposta-password` (destinazione del link ricevuto via email: rileva la sessione di recovery tramite `onAuthStateChange` — evento `PASSWORD_RECOVERY` o `INITIAL_SESSION` con sessione già presente — mostra il form nuova password, chiama `supabase.auth.updateUser({password})`, poi `signOut()` esplicito e redirect a `/login` invece di lasciare attiva la sessione di recovery). Entrambe le pagine aggiunte a `PUBLIC_PATHS` nel middleware: il link di recovery deve essere raggiungibile prima che il client JS possa scambiare il token, quindi la richiesta HTTP iniziale non può essere bloccata come "non autenticata". Link "Hai dimenticato la password?" aggiunto nel form di login. Mail di reset inviata dal mailer di sistema di Supabase (non dal nostro `sendEmail()`/Aruba), stesso limite già documentato per conferma email/registrazione. |
| 2026-07-19 | **Scoperta tecnica sul flusso di recovery — due meccanismi Supabase, entrambi validi**: il link `/auth/v1/verify?token=...&type=recovery` generato da Supabase può risolversi in due modi diversi lato client: **implicit** (redirect con `#access_token=...` in frammento URL) se il client non ha un `code_verifier` PKCE in corso, o **PKCE** (redirect con `?code=...`) se la richiesta di reset è partita da un client con `flowType: 'pkce'` (il default di `@supabase/ssr`, usato da `resetPasswordForEmail()` nel nostro flusso reale). Letto nei sorgenti di `@supabase/auth-js`: **entrambi i percorsi emettono correttamente l'evento `PASSWORD_RECOVERY`**, quindi la pagina `reimposta-password` funziona in entrambi i casi senza bisogno di distinguerli esplicitamente — ma un client configurato `flowType: 'pkce'` **rifiuta** (`AuthPKCEGrantCodeExchangeError`) un URL di callback in stile implicit (mismatch flow), quindi non vanno mai mescolati a mano. Rilevante solo per chi in futuro debba testare/debuggare questo flusso: `supabase.auth.admin.generateLink()` (API admin) produce sempre link stile implicit, **diverso** dal link reale che riceve un utente (generato da `resetPasswordForEmail()` lato client, stile PKCE) — per verificare la pagina end-to-end senza inviare email reali va quindi iniettata una sessione valida (es. cookie `sb-<ref>-auth-token`), non un frammento `#access_token` costruito a mano. |
| 2026-07-19 | **"Rimani connesso"**: checkbox nel form di login, checked di default (nessun cambiamento di comportamento per chi non se ne accorge). **Scoperta tecnica che ha determinato l'implementazione**: `@supabase/ssr` 0.12.3 ignora qualunque `cookieOptions.maxAge` custom passato a `createBrowserClient` — ad ogni scrittura del cookie di sessione lo sovrascrive comunque con `DEFAULT_COOKIE_OPTIONS.maxAge` (400 giorni), verificato leggendo `node_modules/@supabase/ssr/dist/main/cookies.js`. Non è quindi possibile accorciare direttamente la durata del cookie di Supabase in base alla checkbox. **Soluzione adottata** (`lib/auth/remember.ts`): due cookie applicativi separati, scritti al login lato client — `districo-remember-choice` (persistente, stesso maxAge di 400 giorni, registra la scelta `0`/`1`) e `districo-session-alive` (cookie di sessione vero, **senza** maxAge, sparisce alla chiusura effettiva del browser — a differenza di `sessionStorage`, i cookie sono condivisi tra tab quindi non scatena falsi positivi aprendo una nuova scheda). Il **middleware** ad ogni richiesta autenticata verifica: se `remember-choice === '0'` e `session-alive` è assente, la sessione è considerata scaduta (il browser è stato chiuso e riaperto) → `supabase.auth.signOut()` (scope globale, invalida anche il refresh token) e redirect a `/login`, con i cookie di clear riportati sulla response di redirect. Verificato end-to-end con Playwright: login senza "rimani connesso" + simulazione riavvio browser (solo cookie persistenti mantenuti) → sessione scaduta correttamente; con "rimani connesso" → sessione ancora valida. Cookie ripuliti anche al logout esplicito (`components/app-nav.tsx`). |
| 2026-07-19 | **Bug scoperto durante il testing del flusso password**: `/password-dimenticata` e `/reimposta-password` mostravano il menu completo con bottone "Esci" anche a visitatori non loggati (stesso limite già noto per `/registrazione`/`/invito`, mai risolto — vedi nota "Da rivedere" del 19/7 mattina). Qui particolarmente fuori luogo trattandosi di pagine del flusso di login stesso. Aggiunte a `PAGINE_PUBBLICHE` in `components/app-nav.tsx`, stesso trattamento già riservato a `/privacy`/`/cookie-policy` (header nascosto se non loggato). `/registrazione` e `/invito` restano con il limite pre-esistente, non toccati in questo giro. |
| 2026-07-19 | **Fix footer non visibile nella card di login senza scroll**: il fix precedente (`h-full` → `min-h-screen` in `app/(auth)/layout.tsx`) risolveva la centratura ma forzava quell'area a **almeno** un'intera viewport di altezza, spingendo il Footer sempre sotto la piega anche quando il contenuto (login) è corto. Corretto sostituendo la catena "percentuali"/"viewport fisso" con una catena di **flexbox coerente dall'alto in basso**: `app/layout.tsx` rende il wrapper `<div className="flex-1">` esso stesso un contenitore flex (`flex-1 flex flex-col min-h-0`), e `app/(auth)/layout.tsx` usa `flex-1` (non più `min-h-screen`) per riempire esattamente lo spazio residuo tra header e Footer, qualunque esso sia — niente più valori fissi o percentuali da risolvere lungo la catena di antenati. Risultato: la card di login si centra esattamente nello spazio disponibile e il Footer resta sempre visibile senza scroll quando il contenuto è corto; le pagine con contenuto lungo (es. registrazione) restano scrollabili normalmente, nessuna regressione (verificato con Playwright a diverse altezze di viewport). |
| 2026-07-19 | **Registrazione ridotta a 7 campi** (nome, cognome, specializzazione, paese, email, telefono, password), per ridurre il "muro di testo" che scoraggiava il completamento. **Rimandati al completamento profilo** (schermata non ancora costruita, solo pianificata — vedi "Prossimi passi aperti"): indirizzo completo (via/civico/CAP/località/provincia), ragione sociale, partita IVA, nuovo campo `codice_fiscale`, immagine profilo. Il campo "Conferma password" è stato rimosso insieme al resto: l'elenco dei 7 campi richiesto era esplicitamente esaustivo ("SOLO questi"), scelta consapevole e non un'omissione — se in futuro serve va reintrodotto esplicitamente. Il flusso di invito "a quattro mani" (`invito-form.tsx`) **non è stato toccato**: continua a raccogliere il set di campi completo (indirizzo/ragione sociale/P.IVA inclusi), diverge quindi ora dalla registrazione standard — la decisione del 18/7 "stesso form anagrafica, tenuti identici" è superata su questo punto, intenzionalmente, per restare nello scope richiesto. Layout della pagina allineato al login: nessun header per chi non è loggato (`/registrazione` aggiunta a `PAGINE_PUBBLICHE`), card centrata — estratto un componente condiviso `components/auth-card.tsx` (già usato da login/password-dimenticata/reimposta-password, riusato qui invece di duplicare gli stili). |
| 2026-07-19 | **Schema `artigiano` aggiornato** (migration `0008_registrazione_minimale.sql`, testata in locale con Postgres in Docker — shim minimo di `auth.users`/tabella `artigiano`/trigger, stesso metodo delle migration precedenti): `localita` reso nullable (era l'unico campo indirizzo `NOT NULL`, `via`/`civico`/`cap` erano già nullable dalla 0001) — non più raccolto in registrazione. Nuova colonna `codice_fiscale` (nullable) + vincolo `check (partita_iva is null or codice_fiscale is not null) NOT VALID` (obbligatorio solo se è stata inserita la P.IVA, serve per poter fatturare — stessa logica condizionale già esistente per la P.IVA legata al paese). `NOT VALID` deliberato: non rivalida le righe esistenti (potrebbero avere già una P.IVA senza codice fiscale), ma si applica a ogni nuovo insert/update da qui in poi; una `VALIDATE CONSTRAINT` retroattiva potrà seguire quando la schermata Profilo permetterà di completare i dati mancanti. Verificato in locale: signup con solo i 7 campi (indirizzo/ragione sociale/P.IVA/CF risultano `NULL`), inserimento con P.IVA senza CF rifiutato sia in `INSERT` (trigger di signup) sia in `UPDATE` (rilevante per il futuro profilo), inserimento con P.IVA e CF entrambi presenti riuscito. Il campo `immagine_profilo` per la foto profilo **esisteva già** nello schema (nullable, dalla 0001) — nessuna modifica necessaria lì. Trigger `handle_new_artigiano()` aggiornato di conseguenza (aggiunto `codice_fiscale` all'insert, resta compatibile sia con la registrazione minimale sia con l'invito che invia ancora il set completo). **Migration non ancora eseguita sul progetto Supabase reale** — stesso limite di tutte le migration precedenti (nessuna connection string diretta disponibile in locale): va applicata a mano sullo SQL Editor **prima** di mettere in produzione il nuovo form di registrazione, perché il trigger attualmente live richiede ancora `localita NOT NULL` e fallirebbe su un signup che non la invia più. |
| 2026-07-19 | **Template email "Confirm signup" di Supabase Auth personalizzato** (non è codice applicativo: va incollato a mano in Supabase Dashboard → Authentication → Email Templates, non coperto da migration/deploy come il resto dell'app). Oggetto: "Conferma il tuo indirizzo e-mail". Corpo bilingue **italiano poi inglese** (due paragrafi distinti), bottone di conferma nero (`#111827`, stesso colore primario dell'app) con `{{ .ConfirmationURL }}`, più link di fallback in chiaro sotto il bottone, footer con `info@districo.it`. Layout table-based con stili inline (compatibilità Outlook/client email, niente CSS esterno né SVG). HTML pronto salvato in `supabase/email-templates/confirm-signup.html` (tracciato nel repo solo come riferimento/backup del testo incollato in dashboard, non eseguito da alcun deploy). Logo: usata la versione **con payoff** (non la sola iniziale della favicon), esportata da `public/districo_logo_payoff.svg` in PNG raster (le email HTML non supportano SVG in modo affidabile, specialmente Outlook) via lo stesso script Node+`sharp` già in uso per favicon/apple-icon. Il file SVG originale aveva un vuoto verticale marcato tra il marchio e il payoff (spaziatura pensata per usi tipo landing page, non validata prima d'ora in un contesto compatto come un header email): ritagliato via script (rilevamento righe di pixel bianche) a un gap più contenuto prima dell'export, per una resa più equilibrata a dimensione ridotta. PNG risultante 1100×503px (retina-ready per una larghezza di visualizzazione ~220px nel template), salvato in `public/email-assets/districo-logo-payoff.png` — cartella nuova, servita automaticamente da Next.js come asset statico pubblico (nessuna route dedicata necessaria). **URL pubblico usato nel template: `https://www.districo.it/email-assets/districo-logo-payoff.png`** (dominio canonico per link email, stessa decisione del 18/7), quindi richiede il deploy di questo file in produzione prima che il template funzioni davvero — non basta salvarlo nel repo. |
| 2026-07-19 | **Template email "Reset Password" di Supabase Auth personalizzato**, stesso trattamento e stesso stile del template "Confirm signup" appena sopra: layout table-based identico, stesso logo PNG con payoff già ospitato su `https://www.districo.it/email-assets/districo-logo-payoff.png` (riusato as-is, nessun nuovo export), stesso bottone nero, stesso schema bilingue italiano-poi-inglese, stesso footer con `info@districo.it`. Oggetto: "Reimposta la tua password". **Verificato che la variabile Supabase è la stessa `{{ .ConfirmationURL }}`** usata in "Confirm signup" (non cambia nome tra i template di default), punta al link che atterra su `/reimposta-password` (già implementata, vedi decisione "Rimani connesso"/flusso password dimenticata del 19/7). HTML pronto salvato in `supabase/email-templates/reset-password.html`, stesso posto e stesso trattamento (riferimento/backup, non eseguito da deploy) del template precedente. |
| 2026-07-19 | **Sprint 2 revisione strutturale — gap trovato nello schema Sprint 1**: il form "aggiungi appuntamento" della UI dettaglio Lavoro richiede un campo data, ma `lavoro_satellite` (migration 0009) non aveva nessuna colonna libera per questo (solo `data_creazione`/`data_ultimo_cambio_stato`, entrambe automatiche). Segnalato invece di essere risolto in autonomia; l'utente ha scelto di aggiungere una **migration separata** (`0010_lavoro_satellite_data_appuntamento.sql`, `data_appuntamento timestamptz` nullable) invece di riaprire la 0009 già committata, per tenere lo Sprint 1 "congelato" così com'è stato consegnato. |
| 2026-07-19 | **Modello Attività (trattativa) superato dal modello a satelliti**, stesso trattamento già riservato a `Fase_Template`/`Lavoro_Fasi` nello Sprint 1: la tabella `attivita` resta nello schema Postgres (non cancellata, possibili dati storici), ma **ogni riferimento/uso attivo è stato rimosso dalla UI** — sezione "Attività" nel dettaglio Lavoro (sostituita interamente dalla sezione satelliti), badge "N attività aperte" nella lista Lavori. Rimossi di conseguenza `components/attivita-card.tsx`, `components/nuova-attivita-form.tsx` e le server action `creaAttivita`/`aggiornaAttivita`/`nuovaRevisionePreventivo` in `lib/lavori/actions.ts` (nessun altro chiamante). Nessuna FK esterna referenzia `attivita` (solo un self-FK interno su `revisione_di`), quindi nessuna migration di schema necessaria per questa deprecazione — stesso motivo per cui non ne era servita una per `Fase_Template`/`Lavoro_Fasi`. **`lavoro.accettato_at` cambia natura**: da gate che condizionava l'accesso alla fase di esecuzione a **flag puramente informativo** (verificato che non fosse mai referenziato da nessuna RLS/check constraint — l'unico "gate" era lato UI React nel dettaglio Lavoro), pensato per la futura dashboard (Sprint 3) per distinguere lavori ancora in trattativa informale da lavori confermati dal cliente. Non blocca né sblocca più nulla nel dettaglio Lavoro: i satelliti (già così fin dalla loro introduzione nello Sprint 2) restano utilizzabili indipendentemente dal suo valore. Il bottone "Segna lavoro accettato" resta, così come l'accoppiamento esistente con `lavoro.stato: 'trattativa' → 'esecuzione'` (mera etichetta di stato generale, non referenziata da alcuna policy/vincolo — non toccato, fuori scope di questa decisione). |
| 2026-07-20 | **Sprint 3 revisione strutturale — ambiguità trovata e risolta con l'utente prima di procedere**: la chiusura del Lavoro nella sezione "Dashboard" era descritta come "montaggio verde", ma il traguardo `montaggio` non esiste ancora come tipo di satellite nello schema (resta da definire, vedi "Prossimi passi aperti"). Confermato con l'utente: si usa il campo `lavoro.stato = 'chiuso'` già esistente dalla 0001 (oggi impostato da nessun codice) come criterio di esclusione dalla dashboard — quando il gate montaggio verrà implementato, sarà lui a far scattare quella transizione, stesso pattern di `accettato_at` → `stato='esecuzione'`. |
| 2026-07-20 | **Sprint 3 revisione strutturale — dashboard implementata** (migration `0011_lavori_dashboard.sql`, funzione `lavori_dashboard()`): pagina `/lavori` rinominata **"Dashboard"** in UI (titolo H1 e voce di menu `components/app-nav.tsx`; URL invariato). Formula del punteggio di urgenza fissata (vedi sezione "Dashboard (nuova home page)" più sotto per il dettaglio ed esempio numerico): somma su satelliti non-appuntamento, non-verdi, non superati da revisione più recente, di `giorni da data_ultimo_cambio_stato × peso` (1.0 rosso, 0.5 giallo). Calcolo lato SQL in un'unica query (no N+1), `SECURITY INVOKER` (non definer) per restare soggetta alle RLS esistenti senza bisogno di passare `artigiano_id` dall'esterno. Riepilogo a contatori colorati per riga (pallino + numero). Verificato end-to-end con stack Supabase locale + Playwright (ambiente poi smontato completamente). **Non ancora eseguita sul progetto Supabase Cloud di produzione** (vedi "Prossimi passi aperti"). |
| 2026-07-26 | **Fix post-test end-to-end (4 fix) sul dettaglio Lavoro** — vedi sezione "Sprint D" più sotto per il dettaglio: (1) aggiunta la modifica del Lavoro dopo la creazione (descrizione, data di apertura `data_lavoro` — nuova colonna, migration `0015` —, indirizzo completo); (2) **"Segna lavoro completato" ora bloccato (client E server) se `lavoro_pronto_per_montaggio()` è falso** — supera esplicitamente la decisione dello Sprint C che lo lasciava sempre libero; (3) verificato (nessun fix necessario) che il flag `non_necessario` per gli appuntamenti `verifica_misure`/`montaggio` fosse già correttamente implementato dallo Sprint C; (4) convenzione UI uniformata in **tutti** i form dell'app: asterisco rosso sui campi obbligatori, nessuna etichetta testuale "(opz.)" sui facoltativi (impliciti per assenza di asterisco). |
| 2026-07-26 | **Fix 5 e 6 (stesso giro dei 4 fix sopra)** — vedi sezione "Sprint D" per il dettaglio: (5) azione **"Riapri lavoro"** su un Lavoro `completato`/`rifiutato`, con conferma nativa (`window.confirm`), che riporta lo stato al valore precedente logico (completato→accettato, rifiutato→opportunità) senza toccare satelliti/dati collegati; (6) voce di menu **"Statistica" attivata** (era placeholder "in arrivo"), nuova pagina `/statistiche` con lista minima dei Lavori chiusi (completato/rifiutato: titolo, cliente, data, stato, link al dettaglio), ordinata per `data_lavoro` decrescente, nessun KPI/grafico in questo giro. **Pulizia dati di prova eseguita in produzione prima del commit**: eliminati i 2 Lavori di test presenti sul progetto Supabase Cloud reale (incluso uno con `stato='completato'` nonostante satelliti bloccanti ancora rossi — sintomo di un test manuale precedente all'introduzione del gate del fix 2), via DELETE diretto con la service role key già presente in `.env.local`, cascata su tutte le tabelle figlie (già tutte `on delete cascade` dalla 0001/0009/0012, nessuna migration necessaria), verificato con una query di conteggio che `lavoro` risultasse a 0 righe; Clienti e Fornitori non toccati (nessuna FK nella direzione opposta). |

## Modello dati — schizzo v1 (aggiornato)

Entità principali emerse finora (da raffinare quando si passa a schema reale):

- `Artigiano` — id, nome, cognome, specializzazione, telefono (prefisso internazionale + numero concatenati), email, paese (tendina, default Italia) — raccolti in registrazione. **Compilabili solo in un secondo momento dal profilo** (opz., nullable): ragione_sociale, partita_iva (formato validato solo se paese = Italia), codice_fiscale (obbligatorio se e solo se è impostata la partita_iva, vincolo a livello DB), indirizzo (via, civico, CAP/postal code, città, provincia — label variabile per paese), immagine_profilo.
- `Cliente` — id, artigiano_id (di proprietà di un singolo artigiano), nome/ragione sociale, telefono, email, indirizzo, note
- `Fornitore` — id, ragione sociale, partita IVA, settore/categoria merceologica (condiviso tra tutti gli artigiani)
- `Fornitore_Sede` — id, fornitore_id, città, indirizzo, contatti locali, referente
- `Fornitore_Sede_Contatto` — id, fornitore_sede_id, nome, email, telefono (opz.), ruolo (opz.), destinatario_ordini (bool). Filtra chi riceve la mail automatica dell'Ordine_Acquisto.
- `Artigiano_Fornitore_Nota` — artigiano_id, fornitore_sede_id, nota privata (es. sconti concordati)
- `Artigiano_Fornitore_Categoria` — artigiano_id, fornitore_sede_id, categoria_id (tag personale per artigiano di quali categorie copre quel fornitore)
- `Categoria_Acquisto` — id, artigiano_id, nome (libera, nessuna predefinita)
- `Lavoro` — id, cliente_id, titolo, descrizione, created_at, stato generale (nessun owner singolo fisso)
- `Lavoro_Artigiani` (tabella ponte) — lavoro_id, artigiano_id (nullable finché non registrato), email_invitata, ruolo (owner/ospite), stato (invitato/accettato/rifiutato), token_invito, scadenza_invito
- `Attività` — id, lavoro_id, tipo (briefing/progetto/preventivo/sopralluogo/campioni), stato (da_fare/in_corso/bloccata/fatta), data_appuntamento (opz.), data_apertura, data_chiusura, commenti, revisione_di (nullable, solo preventivo), importo (solo tipo=preventivo). Rappresenta la fase di trattativa, chiusa dal gate libero "lavoro accettato".
- `SLA_Attività` — artigiano_id, tipo_attività, giorni_max (personalizzabile per artigiano, con default di sistema)
- `Fase_Template` — id, artigiano_id, nome_fase, ordine (personalizzabile in qualsiasi momento; si applica solo alla fase di esecuzione: approvvigionamento, produzione, consegna/montaggio)
- `Lavoro_Fasi` — id, lavoro_id, nome_fase, ordine, stato, data_inizio, data_fine (copia congelata del template al momento della creazione del lavoro; ordine libero, ma UI evidenzia sempre le fasi non concluse)
- `Pagamento` — id, lavoro_id, tipo (acconto/saldo), importo, data, note. Il saldo chiude definitivamente il Lavoro.
- `Allegato` — id, lavoro_id, tipo (pdf/foto), nome_file, url/path, data_caricamento, note (opz.). Repository unico per lavoro, nessun collegamento granulare.
- `Articolo` — id, fornitore_sede_id, codice (opz.), descrizione, colore/finitura (opz.). Catalogo **condiviso** tra tutti gli artigiani per quella sede fornitore. Nessun `artigiano_id`, nessun `ultimo_prezzo` statico: il prezzo suggerito si calcola a runtime dall'ultima `Ordine_Acquisto_Riga` dell'artigiano corrente su quell'articolo (join `Ordine_Acquisto → Lavoro → Lavoro_Artigiani`).
- `Ordine_Acquisto` — id, lavoro_id, fornitore_sede_id, categoria_id, stato (bozza/concluso), data_invio (opz.), data_chiusura_manuale (opz.), totale
- `Ordine_Acquisto_Riga` — id, ordine_id, articolo_id (nullable se voce non salvata), descrizione, colore/finitura, quantità, prezzo_unitario

Tracciamento tempo: a due livelli — tempo totale del lavoro (da apertura prima Attività a consegna/montaggio) + tempo per singola Attività/Fase, confrontato con l'SLA per individuare colli di bottiglia (alimenta anche la metrica admin già prevista).

Vista Admin: accede solo a conteggi/metriche calcolate sopra queste tabelle, mai al contenuto diretto di Cliente/Fornitore/Lavoro.

## UI / Stile — linee guida

- Mobile-first, totalmente responsive, navigazione via menu hamburger a scomparsa.
- Palette: bianco/nero/grigio come base; colori "a LED" (rosso/giallo/verde) riservati agli stati; palette bottoni limitata e uniforme in tutta l'app.
- Tipografia: serif (stile logo) solo nel logo/marchio; sans-serif ovunque nell'interfaccia.
- Schermata più critica da disegnare per prima: dettaglio Lavoro, deve rendere evidente "cosa manca per andare avanti" (Attività aperte/bloccate/SLA superati, Fasi non concluse).

## Stato implementazione

### Fatto (2026-07-17)

- Progetto Next.js 15 (App Router, TypeScript, Tailwind) inizializzato in `/var/www/districo`
- Dipendenze Supabase installate: `@supabase/supabase-js`, `@supabase/ssr`
- Struttura cartelle: `app/(auth)`, `app/(app)`, `app/(admin)`, `components/`, `lib/`, `supabase/`
- `lib/supabase/client.ts` e `server.ts` — client browser e server con gestione cookie SSR
- `middleware.ts` — protegge tutte le rotte autenticate, redirect post-login → `/lavori`
- `lib/types/database.types.ts` — tipi TypeScript completi per tutte le tabelle e funzioni
- `supabase/migrations/0001_initial.sql` — schema completo **già eseguito** su Supabase (progetto `bktlarffomwpckbqrncu`)
- `supabase/seed.sql` — 15 specializzazioni + 5 SLA default di sistema **già eseguiti**
- `.env.local` configurato con le credenziali reali del progetto Supabase
- `app/(auth)/login/page.tsx` — form login completato: struttura HTML (step 1) + validazione client con errori inline (step 2). Mancano step 3 (Supabase) e step 4 (redirect).

### Fatto (2026-07-18)

- **Login completato**: step 3 (`supabase.auth.signInWithPassword()`, con messaggi di errore dedicati per credenziali errate/email non verificata) + step 4 (redirect a `/lavori`).
- **Pagina registrazione** (`app/(auth)/registrazione`): form anagrafica artigiano completo (nome, cognome, ragione sociale e P.IVA opzionali, specializzazione da tendina + opzione "Altro...", telefono, indirizzo, email, password+conferma), validazione client, chiamata `supabase.auth.signUp()` con anagrafica passata come `options.data` (user metadata), schermata di conferma "controlla la tua email". La tendina specializzazioni è popolata **server-side** leggendo la tabella `specializzazione` con un client admin (service role), per evitare di dover aprire la RLS in lettura pubblica.
- `lib/supabase/admin.ts`: nuovo client Supabase con service role key, **solo per uso server-side** (mai importato da un client component) — bypassa la RLS per letture pubbliche pre-autenticazione (es. lista specializzazioni in registrazione).
- `supabase/migrations/0002_artigiano_signup_trigger.sql`: trigger `on_auth_user_created` (after insert su `auth.users`, `security definer`) che crea automaticamente la riga `artigiano` leggendo `raw_user_meta_data`; se la specializzazione scelta è "Altro...", la registra in tabella con `ufficiale = false` (da promuovere manualmente, coerente con la decisione presa sulle specializzazioni custom). Il trigger scatta solo se i metadata contengono `nome`, per non interferire con eventuali altri inserimenti in `auth.users`. **Eseguita su Supabase** — copre sia la registrazione normale (`signUp`) sia quella da invito (`admin.auth.admin.createUser`, che inserisce comunque in `auth.users` e fa scattare lo stesso trigger).
- `lib/types/database.types.ts`: aggiunti `Views: Record<string, never>` a livello di schema e `Relationships: []` a ogni tabella — richiesti dal tipo `GenericSchema`/`GenericTable` di `@supabase/postgrest-js` per evitare che TypeScript risolva le query a `never`. Il problema non era emerso prima perché nessun file toccava `.from(...).select(...)` con quel client.
- **Flusso onboarding da invito** (`app/(auth)/invito/[token]`): pagina server-side che legge l'invito via client admin (bypassa RLS, necessario perché l'invitato non è ancora autenticato), gestisce i casi invito non valido/già completato/non più in stato "invitato"/scaduto, poi mostra `InvitoForm` (stesso form anagrafica della registrazione normale, email precompilata e disabilitata) con uno step finale di conferma esplicita partecipazione.
  - `lib/lavoro-artigiani/inviti.ts`: `invitaArtigiano()` (se l'email è già di un artigiano registrato inserisce riga `invitato` senza token/email; altrimenti genera `token_invito` + scadenza 10gg e invia mail), `rinviaInvito()` (nuovo token/scadenza), `accettaInvito()`/`rifiutaInvito()` (update stato, usati sia da chi si registra ex-novo sia da chi era già iscritto).
  - `lib/lavoro-artigiani/registrazione-invito.ts`: `registraDaInvito()` valida il token (non consumato, non scaduto), crea l'utente con `admin.auth.admin.createUser({ email_confirm: true })` (salta la verifica email, coerente con la decisione presa), poi collega `artigiano_id` alla riga invito.
  - `lib/lavoro-artigiani/dettagli.ts`: `getNomeInvitante()` helper per mostrare chi ha invitato (letto via admin client perché l'invitato non ancora accettato non passerebbe la RLS su `lavoro`).
  - `lib/email/{send-email,templates}.ts`: `sendEmail()` centralizzato su nodemailer/SMTP Aruba, come da decisione presa; template invito con link a `/invito/[token]`.
  - `app/(app)/lavori/invito-pending-card.tsx`: card sulla lista lavori per accettare/rifiutare un invito ricevuto (artigiano già registrato) — funge da notifica in-app.
  - **Nessuna UI ancora collegata a `invitaArtigiano`/`rinviaInvito`** (nessun bottone "invita collega"): logica pronta, in attesa della schermata dettaglio Lavoro dove andrà agganciata.
  - **Gap corretti**: (1) `sendEmail()` in `invitaArtigiano`/`rinviaInvito` ora è in try/catch — se l'invio fallisce, la riga invito con token resta comunque salvata e la funzione ritorna `esito: 'email_fallita'` invece di lanciare un'eccezione (la UI futura potrà mostrare "invito creato, email non partita, usa rinvia"); (2) in `registraDaInvito`, se `createUser` va a buon fine ma il collegamento a `lavoro_artigiani` fallisce, ora si tenta il rollback (`admin.auth.admin.deleteUser`) dell'utente appena creato, così un retry sullo stesso link di invito funziona; se anche il rollback fallisce, l'errore restituito invita esplicitamente a contattare l'assistenza invece di fallire silenziosamente.
- **Indirizzo internazionalizzato, P.IVA condizionata, prefisso telefono, password visibile** (form registrazione e onboarding da invito, unica anagrafica toccata per ora: Artigiano):
  - `lib/paesi.ts`: elenco di ~50 paesi (Italia default) con nome, iso2, prefisso telefonico e label del campo provincia/stato/regione (null per i paesi dove il campo non si applica, es. Vaticano, San Marino, Lussemburgo, Islanda).
  - `supabase/migrations/0003_artigiano_indirizzo_internazionale.sql`: aggiunge `provincia` (nullable) e `paese` (not null, default `'Italia'`) alla tabella `artigiano`; aggiorna il trigger `handle_new_artigiano` (da 0002) per includere i due nuovi campi nell'insert. **Da eseguire manualmente sullo SQL Editor Supabase**, stesso limite delle migration precedenti (nessuna connection string diretta salvata in locale).
  - Form (`registrazione-form.tsx` e `invito-form.tsx`, tenuti identici): il blocco indirizzo ora include provincia (renderizzata solo se il paese selezionato ha una label, altrimenti il campo sparisce del tutto) e la tendina paese; il blocco telefono è stato spostato subito dopo l'indirizzo e affiancato da una tendina prefisso che si auto-sincronizza col paese finché l'utente non lo modifica manualmente (flag `prefissoManuale` locale al form).
  - Partita IVA: validazione `/^\d{11}$/` applicata solo quando `paese === 'Italia'`; per qualsiasi altro paese il campo resta libero.
  - `components/password-input.tsx`: nuovo componente condiviso con toggle occhio (SVG inline, nessuna nuova dipendenza), usato in login, registrazione e onboarding da invito.
  - `lib/lavoro-artigiani/registrazione-invito.ts`: il tipo `Anagrafica` e i metadata passati a `admin.auth.admin.createUser()` includono ora `provincia`/`paese`.
  - `lib/types/database.types.ts`: aggiunti `provincia`/`paese` alla tabella `artigiano`.
- **Anagrafica Cliente** (`app/(app)/clienti/`): nessuna migration necessaria, lo schema `cliente` già copriva esattamente la decisione presa (nome come unico campo obbligatorio, resto libero) e la RLS "cliente: solo proprietario" era già `FOR ALL USING (artigiano_id = auth.uid())`.
  - `components/cliente-form.tsx`: un solo form client component riusato sia per la creazione sia per la modifica (branch su presenza di `clienteId`), invece di duplicare la UI come inevitabile nel flusso registrazione/invito (lì erano davvero due flussi diversi; qui è la stessa entità, quindi un componente condiviso è la scelta giusta). In modalità modifica, dopo il salvataggio resta sulla pagina con un messaggio "Modifiche salvate" + `router.refresh()`; in modalità creazione, redirige al dettaglio del nuovo cliente appena creato.
  - `lib/clienti/actions.ts`: `creaCliente()`/`aggiornaCliente()`, stesso pattern delle altre server action del progetto (`lib/lavoro-artigiani/`, `lib/lavoro-artigiani/registrazione-invito.ts`).
  - Lista clienti (`app/(app)/clienti/page.tsx`): ricerca per nome implementata come **form GET con query param `?q=`**, filtrato server-side con `ilike` (non fuzzy, coerente con la decisione presa) — nessun JS client-side necessario, la pagina è un semplice server component che rilegge `searchParams`.
  - Dettaglio (`app/(app)/clienti/[id]/page.tsx`): interroga anche la tabella `lavoro` per `cliente_id` — la tabella esiste già nello schema ma non ha ancora una UI di creazione, quindi la lista risulta correttamente vuota con uno stato "Nessun lavoro registrato per questo cliente" invece di un placeholder finto; non appena esisterà un flusso di creazione Lavoro, questa sezione mostrerà i risultati reali senza modifiche.
  - Cliente non ha una vista di eliminazione (nessuna richiesta esplicita, evitato per non introdurre UI non richiesta).
- **Menu hamburger** (`components/app-nav.tsx`, integrato in `app/(app)/layout.tsx`): voci attive Lavori/Clienti/Nuovo cliente (link reali), voci Fornitori/Statistica/Profilo-Impostazioni mostrate come placeholder non cliccabili con etichetta "in arrivo" (nessuna pagina dietro, evita 404), voce Esci che chiama `supabase.auth.signOut()` lato client (stesso pattern già usato per login/signIn) e reindirizza a `/login`. Menu a comparsa sotto l'header quando aperto, non un drawer laterale — più semplice e coerente con "menu hamburger a scomparsa" già deciso, nessuna libreria aggiuntiva.
- **Modello Lavoro + Attività di trattativa**: lo schema (`lavoro`, `lavoro_artigiani`, `attivita`) e le relative RLS esistevano già interamente in `0001_initial.sql` esattamente come da decisioni prese — nessuna nuova colonna necessaria. `lavoro.accettato_at` (nullable) è già di per sé il gate libero richiesto (booleano implicito + data), nessun campo aggiuntivo.
  - **Bug RLS trovato e corretto** (migration `0006_fix_lavoro_artigiani_owner_insert.sql`): la policy `"lavoro_artigiani: inserimento solo owner"` richiedeva `is_owner_del_lavoro(lavoro_id)`, verificabile solo se esiste già una riga owner per quel lavoro — condizione impossibile da soddisfare per il primissimo insert (quello che crea proprio quella riga). Prima di questo fix, **nessun lavoro creato tramite insert autenticato normale avrebbe mai potuto ottenere la sua riga owner** (solo un bypass service-role l'avrebbe permesso). Prima versione del fix (mai deployata) tentava di verificare il possesso del cliente con un `EXISTS` diretto su `lavoro`/`cliente` dentro il `WITH CHECK` — testata in locale, falliva comunque, perché quella sotto-query resta soggetta alla RLS delle tabelle referenziate: la SELECT su `lavoro` è a sua volta filtrata da `is_artigiano_del_lavoro`, che dipende dalla stessa riga `lavoro_artigiani` che si sta cercando di creare — la stessa circolarità riproposta un livello più in basso. Risolto con una funzione helper dedicata `possiede_cliente_del_lavoro(p_lavoro_id)`, `SECURITY DEFINER` (bypassa la RLS internamente, stesso pattern di `is_owner_del_lavoro`/`is_artigiano_del_lavoro`, `search_path = public`, `EXECUTE` revocato da `PUBLIC` e concesso solo ad `authenticated`). Testato end-to-end in locale (Postgres in Docker + shim, stesso metodo delle migration 0004/0005): owner bootstrap riuscito, un secondo artigiano non può auto-assegnarsi owner sul lavoro altrui, il path di invito preesistente (owner già stabilito che invita un ospite) continua a funzionare, creazione di un'Attività riuscita subito dopo, gate "lavoro accettato" testato.
  - Lo shim di test Docker usato per queste migration aveva un altro gap di fedeltà scoperto in questo giro: mancava `grant usage on schema auth` / `grant execute on function auth.uid()` a `anon`/`authenticated` (su Supabase reale concesso di default) — senza quei grant, qualunque policy che chiama `auth.uid()` direttamente (non tramite una funzione `SECURITY DEFINER`) fallisce con "permission denied for schema auth" nel solo ambiente di test, non in produzione. Corretto nello shim.
  - `lib/lavori/actions.ts`: `creaLavoro()` (insert lavoro + insert riga owner in `lavoro_artigiani`, rollback via client admin se il secondo insert fallisce — stesso pattern di `registraDaInvito`), `segnaLavoroAccettato()` (imposta `accettato_at` **e** transita `lavoro.stato` da `trattativa` a `esecuzione`, coerente con la decisione che quello è il gate tra le due fasi), `creaAttivita()`, `aggiornaAttivita()` (stato + commenti; se stato passa a `fatta` imposta anche `data_chiusura`), `nuovaRevisionePreventivo()` (sempre una nuova riga con `revisione_di`, mai un update in place, come da decisione presa).
  - Colori "a LED" applicati esattamente dove la decisione UI li riserva — allo stato delle Attività, non al `lavoro.stato` generale (che resta un badge grigio neutro, essendo una fase/lifecycle diversa dagli stati "da fare/in corso/bloccata/fatta"): `da_fare`=grigio, `in_corso`=giallo, `bloccata`=rosso, `fatta`=verde.
  - Pagine: `app/(app)/lavori/page.tsx` (lista reale: query su `lavoro_artigiani` dell'artigiano corrente, join manuale in JS verso `cliente` per il nome — niente embed PostgREST, coerente con `Relationships: []` nei types e con il pattern già usato altrove nel progetto — indicazione rapida di stato lavoro + conteggio attività aperte/bloccate), `app/(app)/lavori/[id]/page.tsx` (schermata critica: elenco Attività ordinato per priorità di stato — bloccata/in_corso/da_fare prima di fatta — bottone "Segna lavoro accettato" libero senza vincoli, form nuova attività e gestione stato/commenti/revisioni visibili solo al owner tramite `is_owner_del_lavoro` via RPC, sola lettura per un eventuale ospite). Bottone "Nuovo lavoro" aggiunto al dettaglio Cliente esistente (form inline espandibile, non una pagina separata).
  - **Non implementato in questo giro, su richiesta esplicita**: Fasi di esecuzione, SLA (nessuna UI, solo lo schema/tabella già esistente), Pagamenti, Allegati.

### Fatto (2026-07-19, rifinitura pagina di login)

- Colore primario dell'app riportato al nero (`--primary: #111827` in `globals.css`), il rosso `#e63946` resta solo su logo/brand e sugli usi già esistenti (stato "bloccata", errori form).
- `app/(auth)/login/page.tsx`: card (`bg-gray-50 rounded-2xl shadow-sm`), spaziatura uniformata (`space-y-6`), checkbox "Rimani connesso" (`accent-primary`, non `text-primary` — i checkbox nativi seguono `accent-color`, non `color`), link "Hai dimenticato la password?".
- `app/(auth)/layout.tsx`: `h-full` → `min-h-screen` per una centratura verticale robusta (fix strutturale, si applica anche a registrazione/invito).
- Nuove pagine `app/(auth)/password-dimenticata` e `app/(auth)/reimposta-password`, aggiunte a `PUBLIC_PATHS` nel middleware e a `PAGINE_PUBBLICHE` in `components/app-nav.tsx`.
- `lib/auth/remember.ts`: helper `applyRememberChoice()`/`clearRememberCookies()` per il meccanismo "Rimani connesso" (due cookie applicativi, vedi decisione dedicata sopra); richiamato da `login/page.tsx` al login e da `components/app-nav.tsx` al logout.
- `middleware.ts`: enforcement della scadenza sessione "non ricordata" (redirect a `/login` + `signOut()` se il cookie di sessione applicativo non c'è più ma quello di Supabase sì).
- Verificato con Playwright end-to-end (utente di test creato via admin API ed eliminato subito dopo, nessuna email reale inviata): reset password completo, login con "rimani connesso" attivo/disattivo, simulazione di riavvio del browser in entrambi i casi. `npm run build`/`tsc --noEmit`/`eslint` puliti.

### Note tecniche emerse in fase di implementazione

- `sla_attivita`: PostgreSQL non ammette colonne nullable in una PRIMARY KEY, neanche con COALESCE nella definizione. Soluzione adottata: `id UUID PRIMARY KEY` surrogato + `CREATE UNIQUE INDEX` con espressione `COALESCE(artigiano_id, '00000000-...')` — funziona perché gli expression index supportano COALESCE, le PK no.
- `NEXT_PUBLIC_SUPABASE_URL` deve essere la base dell'URL senza path (es. `https://xxx.supabase.co`), non includere `/rest/v1/`.
- Admin RLS: nessun accesso diretto alle tabelle operative. Solo funzioni/view SQL con `SECURITY DEFINER` esporranno metriche aggregate. Il guard in `app/(admin)/layout.tsx` legge `is_admin` dalla tabella `artigiano`.
- **Ambiente dev**: Node.js 18 non è compatibile con Next.js 15/16 (richiede ≥20). Installato Node.js 20 via nvm (`nvm use 20`). Dev server: `npm run dev -- --port 3456`.
- **Fix Tailwind/Turbopack**: `@tailwindcss/oxide` non trova il binding nativo in modalità Turbopack. Fix: copiare `node_modules/@tailwindcss/oxide-linux-x64-gnu/tailwindcss-oxide.linux-x64-gnu.node` dentro `node_modules/@tailwindcss/oxide/`. Va rifatto se si cancella `node_modules`.
- Nessuna credenziale di connessione diretta Postgres (connection string) salvata in locale: le migration vengono applicate a mano via SQL Editor Supabase, non con `supabase db push`.

### Da implementare (prossima sessione)

- Testare end-to-end il flusso di registrazione/login/invito in browser con un account reale (finora solo review statica: typecheck e `npm run build` puliti, RLS e logica rilette a mano, ma nessun signup reale eseguito per non creare utenti/email di test in produzione senza conferma esplicita).
- Pagine applicative ancora mancanti: fornitori, profilo/impostazioni. Clienti e Lavoro/Attività di trattativa (lista, dettaglio, creazione) ora implementate.
- Prossimo giro sul modello Lavoro (esplicitamente rimandato in questo): Fasi di esecuzione, SLA (UI), Pagamenti, Allegati; bottone "invita collega" da agganciare al dettaglio Lavoro ora che esiste.
- **Layout Header/Footer applicato solo a desktop per ora** (richiesta esplicita) — resta da fare la versione mobile del nuovo header (oggi su mobile c'è ancora solo l'hamburger con logo, senza le rifiniture desktop) e valutare se il footer a 3 colonne va adattato per schermi piccoli (oggi impilato in colonna singola via `grid-cols-1`, mai rifinito visivamente).
- L'header globale ora compare anche su `/dashboard` (area admin) e su `/invito/[token]`, non solo nell'area artigiano — coerente con la richiesta di renderlo globale, ma non esplicitamente valutato se sia l'esperienza voluta per un amministratore o per chi arriva da un invito senza ancora un account. Da rivedere se serve un'eccezione dedicata (stesso meccanismo già usato per `/login`).
- Valutare se estendere indirizzo internazionalizzato/prefisso telefono/validazione P.IVA anche ad altre anagrafiche con indirizzo (es. Cliente, Fornitore) — per ora limitato solo ad Artigiano su richiesta esplicita.
- **Azione manuale richiesta sulla dashboard Supabase (Authentication → URL Configuration)**: impostare Site URL su `https://www.districo.it` e aggiungere a Redirect URLs `https://www.districo.it/**` (e opzionalmente `https://districo.it/**`, dato che l'apice resta comunque raggiungibile) — necessario perché il codice può specificare `emailRedirectTo` ma Supabase rifiuta/ignora redirect fuori da questa allowlist. Finché non è fatto, il link di conferma email potrebbe continuare a puntare a `localhost:3000` (default mai cambiato) invece che al dominio corretto.
- **Azione manuale opzionale sulla dashboard Supabase (Authentication → Emails → SMTP Settings)**: configurare un SMTP custom (stesse credenziali Aruba già in uso per `sendEmail()`) se si vuole che anche le mail di sistema (conferma email, reset password) partano da `info@districo.it` invece che da `noreply@mail.app.supabase.io` — non è possibile impostarlo da codice/env, è una configurazione di progetto Supabase.
- **Eseguire `supabase/migrations/0007_fix_lint_possiede_cliente.sql` sul progetto Supabase** (SQL Editor) — testata in locale, non ancora applicata in produzione. Dopo l'esecuzione, ri-lanciare il Database Linter: dovrebbe sparire `anon_security_definer_function_executable` su `possiede_cliente_del_lavoro`; restano attesi per design gli avvisi su `authenticated` per le 4 funzioni helper (necessario perché la valutazione delle policy RLS avviene nel contesto di sessione del chiamante) e `auth_leaked_password_protection` (piano Free).
- **Azione manuale richiesta sulla dashboard Supabase (Authentication → Email Templates → Confirm signup)**: incollare oggetto e HTML pronti in `supabase/email-templates/confirm-signup.html` (vedi decisione dedicata). Il template referenzia `https://www.districo.it/email-assets/districo-logo-payoff.png`: verificare che l'URL risponda 200 in produzione **prima** di salvare il template su Supabase (il file va deployato col resto del sito, non basta il commit).
- **Azione manuale richiesta sulla dashboard Supabase (Authentication → Email Templates → Reset Password)**: incollare oggetto e HTML pronti in `supabase/email-templates/reset-password.html` (vedi decisione dedicata) — stesso URL logo già live, nessuna verifica di deploy aggiuntiva necessaria.

## Prossimi passi aperti

- Possibile sviluppo futuro (non deciso, solo segnato): un "profilo cliente" trasversale ai vari artigiani (es. il cliente finale vede tutti i lavori fatti su una sua proprietà, o lascia recensioni) — richiederebbe un'anagrafica cliente separata dal perimetro del singolo artigiano, con consenso esplicito del cliente.
- Vista cliente sull'avanzamento del lavoro → seconda release, dopo il primo rilascio funzionante dell'app.
- Definire in dettaglio i KPI della voce menu "Statistica" (economici e di performance).
- Task infrastrutturale separato: migrare Falegname in Cloud da Supabase self-hosted a Supabase Cloud, per uniformità con Districo.
- Scrivere lo script di backup comune (`/srv/scripts/backup-all.sh`), non ancora esistente per nessuna app sul VPS.
- Valutare se aggiungere l'app "preventivi" e lo stack "lab" (Grafana/Prometheus/Authentik) a https://github.com/ncaracc/infra-docs/blob/main/convenzioni-vps.md — per ora lasciati fuori su richiesta esplicita; "preventivi" verrà sostituita da Falegname in Cloud, "lab" da valutare per eventuale rimozione (verificare prima che nulla dipenda da Authentik per il login).
- Definire progressivamente le voci finali del menu hamburger.
- Passare a mockup/CSS delle schermate rimanenti (lista lavori, dettaglio cliente, ecc.) dopo aver validato lo stile sul dettaglio Lavoro.
- **Schermata Profilo** (non ancora costruita): dove l'artigiano completerà i dati rimandati dalla registrazione minimale del 19/7 — indirizzo completo (via/civico/CAP/località/provincia), ragione sociale, partita IVA, codice fiscale (obbligatorio se e solo se ha impostato la P.IVA — vincolo già applicato a livello DB), immagine profilo. Voce di menu "Profilo/Impostazioni" già presente come placeholder "in arrivo".
- **Badge su "Profilo/Impostazioni"** nel menu, visibile finché l'artigiano non ha completato almeno l'indirizzo completo (unico dato tra quelli rimandati che resta necessario al funzionamento dell'app, es. per future esigenze di fatturazione/logistica) — ragione sociale, P.IVA, codice fiscale e foto profilo restano opzionali e non condizionano la scomparsa del badge.
- **Cambio password dalla schermata Profilo/Impostazioni** (oggi possibile solo via "Password dimenticata" da sloggato).

## Revisione strutturale 2026-07-19 — Modello "a stella" centrato sul Lavoro

> Questa sezione **supera** il modello precedente di Fasi di esecuzione
> (Fase_Template/Lavoro_Fasi) e il gate manuale "lavoro accettato", oltre a
> ridefinire la chiusura del Lavoro. Le voci precedenti restano in
> cronologia sopra per riferimento storico, ma non sono più valide dove
> in contraddizione con quanto segue.

### Principio generale

Il Lavoro è il centro. Attorno gli ruotano **satelliti**: oggetti con un
proprio ciclo di stato che rappresentano "le cose che devono succedere
perché il lavoro proceda". Il lavoro avanza verso il montaggio solo
quando tutti i satelliti presenti (quelli effettivamente aggiunti a quel
lavoro) sono verdi. Aggiungere un satellite a lavoro avanzato riapre il
gate del montaggio finché anche quello non è verde.

Le vecchie Fasi di esecuzione (approvvigionamento/produzione/consegna
come oggetto mosso a mano) sono superate: lo stato di avanzamento si
legge dai satelliti, non si muove più manualmente.

### Entità satellite (unica tabella, discriminata per `tipo`)

| Tipo | Stati | Note |
|---|---|---|
| `appuntamento` | 🔴 fissato → 🟢 fatto | tipo libero (briefing, rilievo, presentazione...); nota **obbligatoria** al passaggio a verde; **non conta** per lo sblocco del montaggio (informativo/parallelo) |
| `preventivo` | 🔴 in preparazione → 🟡 presentato → 🟢 accettato | solo se flag "necessario preventivo" sul Lavoro; `revisione_di` per storico; **niente prezzo per riga**, solo eventuale `valore_complessivo` opzionale; precisione economica delegata a Falegname in Cloud, possibile integrazione futura tra le due app |
| `progetto` | 🔴 in preparazione → 🟡 presentato → 🟢 accettato | solo se flag "necessario progetto"; `revisione_di` per storico |
| `acquisto_materiale` | 🔴 da acquistare → 🟡 acquistato → 🟢 ricevuto | lista di voci strutturate (`Articolo`: codice, specifiche, descrizione, quantità — **senza prezzo per riga**); `valore_complessivo` opzionale sul satellite; legato a Fornitore/Fornitore_Sede |
| `acquisto_ferramenta` | stessa logica di `acquisto_materiale` | stesso pattern, tipo separato solo per categorizzazione |
| `lavorazione_esterna` | 🔴 da consegnare → 🟡 in lavorazione → 🟢 completata | fabbro/vetraio/falegname esterno/laccatore: nessun catalogo `Articolo`, descrizione libera + `valore_complessivo` opzionale |
| `campione` | 🔴 da preparare → 🟡 preparato → 🟢 ricevuto dal cliente | ripetibile: più cicli sullo stesso Lavoro se servono altre varianti |

`Articolo`: mantenuto per tracciabilità e correttezza dell'ordine verso
il fornitore (codice/specifiche/descrizione), **rimosso il campo
prezzo/ultimo_prezzo** — non vogliamo obbligare l'artigiano a verificare
prezzi, non è l'obiettivo dell'app.

### Chiusura del Lavoro

Il Lavoro è considerato chiuso quando il satellite/traguardo **montaggio
è verde**, a prescindere dallo stato di acconti/saldo. Il modello
economico (`Pagamento`: acconto/saldo) resta un tracciamento parallelo,
utile ma senza effetto sullo stato operativo del Lavoro. *(Questo
sostituisce la lettura precedente "il saldo chiude il Lavoro".)*

Il **montaggio** stesso resta da definire in dettaglio (prossimo
argomento aperto).

### Dashboard (nuova home page) — Sprint 3 implementato 2026-07-20

- Sostituisce l'elenco lavori ordinato cronologicamente. Resta sulla
  route `/lavori` (nessun cambio URL), ma l'etichetta nel menu e il
  titolo H1 della pagina sono ora **"Dashboard"** (coerente con "Menu
  laterale confermato: Dashboard (Lavori)..." qui sotto).
- **"Chiuso" = `lavoro.stato = 'chiuso'`** (campo già esistente dalla
  0001, non il satellite/traguardo "montaggio" — che non esiste ancora
  come tipo di satellite nello schema, resta da definire in un prossimo
  sprint). Oggi nessun codice imposta mai `stato = 'chiuso'`: quando il
  gate "montaggio" verrà implementato, sarà lui a far scattare quella
  transizione (stesso pattern già in uso per `accettato_at` →
  `stato = 'esecuzione'`). La dashboard filtra semplicemente `WHERE
  stato <> 'chiuso'`; i lavori chiusi resteranno visibili solo nella
  futura sezione Statistica.
- **Formula del punteggio di urgenza (fissata, non più da tarare)**:
  per ogni lavoro, somma su tutti i satelliti **non-appuntamento** e
  **non superati da una revisione più recente** (stessa esclusione già
  usata da `lavoro_pronto_per_montaggio` per preventivo/progetto — solo
  l'ultima versione della catena conta) che **non sono nel proprio
  stato finale ("verde")**:

  `Σ (giorni trascorsi da data_ultimo_cambio_stato) × peso`

  dove `peso = 1.0` se il satellite è nel primo stato della propria
  sequenza semaforo ("rosso"), `0.5` se è in uno stato intermedio
  ("giallo"). I satelliti verdi non contribuiscono (peso implicito 0).
  Gli appuntamenti sono sempre esclusi (coerente con "non contano per
  il gate montaggio"). Punteggio più alto in cima; un lavoro senza
  alcun satellite non-verde ha punteggio 0 e finisce in fondo, ma resta
  visibile. **Esempio concreto verificato in test**: Lavoro con un
  `acquisto_materiale` rosso fermo da 12 giorni (12 × 1.0 = 12.0) + una
  `lavorazione_esterna` rossa ferma da 8 giorni (8 × 1.0 = 8.0) +
  un appuntamento (escluso) → punteggio **20.0**, ordinato prima di un
  Lavoro con solo un `preventivo` giallo fermo da 1 giorno (1 × 0.5 =
  **0.5**).
- **Calcolo lato SQL** (funzione `lavori_dashboard()`, migration
  `0011_lavori_dashboard.sql`), non lato client: una singola query con
  `LEFT JOIN LATERAL` per lavoro, non N+1. **SECURITY INVOKER** (non
  `security definer`): legge `lavoro`/`lavoro_artigiani`/
  `lavoro_satellite` con i permessi del chiamante, quindi resta
  soggetta alle RLS già esistenti su quelle tabelle — nessun
  `artigiano_id` passato dall'esterno, si usa sempre `auth.uid()`
  internamente (stessa lezione della vulnerabilità corretta il 18/7 in
  `ultimo_prezzo_articolo`). Ritorna anche i conteggi
  `satelliti_rossi`/`_gialli`/`_verdi` (stessa esclusione
  appuntamento/revisione superata) per il riepilogo in UI, evitando un
  secondo giro di query.
- Ogni riga lavoro in dashboard mostra un **riepilogo compresso a
  contatori** dei satelliti (pallino colorato + numero, es. 🔴2 🟡1 🟢2),
  non pallini singoli per satellite — priorità alla leggibilità della
  schermata. Se un lavoro non ha ancora nessun satellite, mostra "Nessun
  satellite" invece di contatori tutti a zero.
- Menu laterale confermato: Dashboard (Lavori), Clienti, Fornitori,
  Statistica, Account (impostazioni/personalizzazioni).
- **Verificato end-to-end** (stack Supabase locale via CLI 2.109.1 +
  Playwright, poi tutto smontato — nessuna traccia rimasta): login,
  titolo/voce menu "Dashboard", lavoro chiuso assente dalla lista,
  ordinamento per punteggio corretto con lo scenario sopra, contatori
  colorati corretti su entrambe le righe. **Nota emersa in fase di
  test**: la CLI Supabase locale 2.109.1 non espone più di default le
  tabelle nuove ai ruoli `anon`/`authenticated`/`service_role` (flag
  `auto_expose_new_tables`, deprecato, rimosso il 2026-10-30) — puro
  artefatto dell'ambiente di test locale (il progetto Supabase Cloud di
  produzione, creato prima di questo cambiamento, non è affetto),
  gestito abilitando il flag temporaneamente solo per la sessione di
  test, `config.toml` poi ripristinato via `git checkout`.

### Acquisti — distinzione materiale/ferramenta vs. lavorazione esterna

La distinzione è legata a **come lavora il fornitore**, non decisa
articolo per articolo: fornitori con catalogo (pannelli, ferramenta,
bordi) → `acquisto_materiale`/`acquisto_ferramenta` con `Articolo`
strutturato; fornitori "su misura" (fabbro, vetraio, laccatore,
falegname esterno) → `lavorazione_esterna`, descrizione libera, nessun
catalogo.

### Prossimi passi aperti (aggiornato)

- Definire in dettaglio l'oggetto/traguardo **montaggio** (gate finale
  di chiusura Lavoro) — da cui dipenderà la transizione reale a
  `lavoro.stato = 'chiuso'`, oggi mai impostata da nessun codice.
- **Eseguire `supabase/migrations/0011_lavori_dashboard.sql` sul
  progetto Supabase Cloud** (SQL Editor) — testata in locale, non
  ancora applicata in produzione, stesso limite di tutte le migration
  precedenti.
- Rivalutare in futuro un'eventuale integrazione tra Districo e
  Falegname in Cloud per il dettaglio economico dei preventivi.
- (voci precedenti non ancora affrontate restano valide sotto)

## Revisione strutturale 2026-07-25 — Ciclo di vita Lavoro, Fornitori, ristrutturazione satelliti (Sprint A: schema)

> Questa sezione **supera/estende** la "Revisione strutturale 2026-07-19"
> precedente (mantenuta sopra per cronologia): cambia la macchina a stati
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

## Sprint B (2026-07-25) — UI fase di trattativa

> Chiude il build lasciato volutamente rotto alla fine dello Sprint A su
> `app/(app)/lavori/[id]/page.tsx`, `lib/lavori/actions.ts`,
> `lib/lavori/satelliti.ts`. Copre la gestione dei satelliti di
> trattativa (Appuntamento briefing, Progetto, Preventivo, Campione) e
> la transizione di stato del Lavoro. Non tocca i satelliti di
> esecuzione (Sprint C).

### 1) Vista satelliti — fase trattativa
Riscritti da zero `lib/lavori/satelliti-meta.ts` (tipi/stati/colori/
costruzione catene per famiglia) e `lib/lavori/satelliti.ts` (server
action), eliminati i file del vecchio modello satellite ormai privi di
senso (`components/satellite-card.tsx`, `nuovo-satellite-form.tsx`,
`satelliti-section.tsx`, `segna-accettato-button.tsx` — nessun
riferimento residuo verificato prima della rimozione). Nuovi componenti
mirati invece di un'unica sezione generica:
- `components/satellite-briefing.tsx`: data, descrizione (`<textarea>`,
  newline preservati sia in modifica sia in visualizzazione via
  `whitespace-pre-wrap`), flag `concluso`, allegati. Nessun controllo su
  `non_necessario` in UI (per il briefing è bloccato a `false` solo dal
  check DB della 0012 — qui semplicemente non viene mai esposto un
  controllo per cambiarlo, coerente con "va nascosto").
- `components/satellite-revisionabile.tsx` (`RevisionabileChain`):
  componente riutilizzato tale e quale per Progetto, Preventivo e,
  per-serie, per Campione — parametrizzato su `tipo` (che sceglie il set
  di stati/etichette/colori) più due flag (`mostraValore` solo
  Preventivo, `mostraDescrizione` solo Campione). Mostra la revisione
  **corrente** (leaf: nessun'altra riga referenzia il suo id via
  `revisione_di`) con i controlli attivi, e le revisioni storiche in
  elenco compatto sotto. **Colore/etichetta di ogni riga (corrente e
  storiche) letti da `lavoro_satellite_stato_effettivo()`**, mai dallo
  stato grezzo direttamente: è così che una revisione superata appare
  "Accettato" quando l'ultima della catena lo è, senza che la riga
  storica venga mai scritta. **Verificato anche a livello DB** in fase
  di test (vedi sotto): la riga superata resta `necessaria_revisione`
  nella colonna reale.
- `components/satellite-campione.tsx`: raggruppa i satelliti Campione
  per `serie` (`raggruppaPerSerie`), una `RevisionabileChain` per
  gruppo, più form "+ Nuova serie" che chiama `creaNuovaSerieCampione()`
  (nuova riga radice, `revisione_di` nullo, stato `in_preparazione`).
- Richiesta di revisione (`impostaStatoRevisionabile`, in
  `lib/lavori/satelliti.ts`): se il nuovo stato è quello "richiede
  nuova revisione" per la famiglia (`necessaria_revisione` per
  progetto/preventivo, `necessario_nuovo_campione` per campione), la
  server action **inserisce prima** la nuova riga (`revisione_di` =
  riga corrente, stato `in_preparazione`, stessa `serie` se campione),
  **poi** aggiorna lo stato della riga precedente — se il secondo passo
  fallisce, la riga appena creata viene eliminata (stesso pattern di
  rollback già in uso in `creaLavoro`/`creaSatellite`). Nessuna
  "navigazione" esplicita verso la nuova revisione: dopo
  `router.refresh()` compare semplicemente in cima come nuova riga
  "Corrente", già pronta per essere lavorata.
- **Semplificazione consapevole sugli allegati nella catena**: upload
  mostrato solo sulla revisione corrente (non su ogni riga storica) —
  gli allegati esistenti restano comunque visibili in lettura su
  qualunque riga li abbia; evita di affollare la UI di widget di upload
  su righe ormai chiuse. Non esplicitamente richiesto in questi termini,
  scelta per restare essenziali.
- **Descrizione libera non aggiunta a Progetto/Preventivo**: il prompt
  la richiedeva esplicitamente solo per Appuntamento e Campione — non
  estesa per coerenza con quanto chiesto, pur essendo la colonna
  `descrizione` generica e già disponibile per qualunque tipo.

### 2) Transizione di stato del Lavoro
`lib/lavori/actions.ts`: `segnaLavoroAccettato()` sostituita da
`segnaLavoroStato(lavoroId, 'accettato' | 'rifiutato')`.
**"Segna come accettato" resa sempre disponibile, senza vincolare lo
stato dei satelliti di trattativa** (nessun controllo tipo "tutti verdi
prima di poter accettare"). Motivazione: coerente con "transizioni
SEMPRE MANUALI" — testualmente la decisione che ha introdotto questa
stessa macchina a stati nello Sprint A — e con la filosofia già in uso
nel vecchio gate "lavoro accettato" (mai stato condizionato dallo stato
delle Attività di trattativa). L'artigiano decide quando un'opportunità
è matura per diventare un lavoro accettato; il sistema non blocca in
base a condizioni automatiche sui satelliti, che restano modificabili
liberamente anche a lavoro già accettato. "Segna come rifiutato" sempre
disponibile da `opportunita`, nessuna condizione. Entrambi i bottoni
spariscono non appena lo stato non è più `opportunita` (nessuna
"marcia indietro" implementata, non richiesta).
`accettato_at` continua a essere popolato alla transizione verso
`accettato`, pur restando ridondante con `stato = 'accettato'` (già
segnalato come ridondanza nota nello Sprint A, non risolta qui:
toccarla non era nello scope di questo sprint).
`components/lavoro-stato-azioni.tsx` (ex `SegnaAccettatoButton`): due
bottoni, "Segna come accettato" con lo stile primario (`bg-primary`,
usato per l'azione principale), "Segna come rifiutato" con lo stesso
stile secondario/outline già usato altrove per "Annulla" (bordo grigio,
non rosso) — **deliberatamente non rosso**: il rosso/LED resta
riservato agli stati dei satelliti (decisione UI originale), non alle
azioni sul Lavoro, per non introdurre una seconda semantica di colore
bottone nella stessa schermata.
Badge stato Lavoro reso più prominente (font-medium, non solo
`text-gray-600`) ma **volutamente ancora neutro/grigio**, non colorato:
coerente con la decisione originale che distingue esplicitamente
`lavoro.stato` (fase/lifecycle) dagli stati satellite (che sole usano i
colori "a LED").

### 3) Allegati sui satelliti
**Nessun meccanismo di upload esisteva già da riusare** (verificato:
nessuna route/azione toccava `storage_path` o cartelle upload in
nessun punto del codice) — gli Allegati erano stati esplicitamente
rimandati fin dal 18/7 ("Non implementato in questo giro... Allegati").
Costruito da zero seguendo l'architettura già decisa il 17/7 (cartella
dedicata sul VPS, proxy applicativo invece di file statici Nginx, per
rispettare le RLS):
- `lib/lavori/allegati.ts` — `caricaAllegatiSatellite()`: scrive su
  disco sotto `path.join(process.cwd(), 'uploads', 'lavori', lavoroId,
  satelliteId, '<uuid>-<nomefile-sanificato>')` — `process.cwd()`
  risolve a `/app` in produzione (il `Dockerfile` esistente già crea
  `/app/uploads` e monta lì il volume host `/srv/apps/districo/uploads`
  secondo le decisioni pregresse, mai attuate finora) e alla root del
  repo in locale, senza bisogno di una nuova variabile d'ambiente.
  Insert su `lavoro_satellite_allegato` **dopo** la scrittura su disco;
  se l'insert fallisce (es. RLS, artigiano non owner) il file appena
  scritto viene eliminato — difesa aggiuntiva anche se la UI non
  espone mai l'upload a un non-owner.
- `app/api/allegati/satellite/[id]/route.ts` — GET che legge la riga
  `lavoro_satellite_allegato` con il client Supabase **autenticato
  lato server** (non admin): la RLS di lettura ("chi è nel lavoro")
  filtra da sola l'accesso, un `id` di un allegato non proprio
  restituisce semplicemente nessuna riga → 404, senza bisogno di un
  controllo esplicito nel codice della route. File letto da disco e
  restituito con `Content-Type` dedotto da una piccola mappa
  estensione→mime (pdf/jpg/jpeg/png/webp/gif) e
  `Content-Disposition: inline`. Non aggiunta al middleware come rotta
  pubblica: se la sessione scade, l'utente viene rediretto a `/login`
  invece di ricevere un 401 JSON — accettabile per un link cliccato da
  dentro l'app, non è un'API di terze parti.
- `components/satellite-allegati.tsx`: widget condiviso (lista +
  upload multiplo) riusato identico in `satellite-briefing.tsx` e
  `satellite-revisionabile.tsx`.

### Scoperta e correzione fuori dallo scope letterale: dashboard rotta dal nuovo `lavoro.stato`
`app/(app)/lavori/page.tsx` non risultava tra i file "da sistemare"
segnalati a fine Sprint A, ma **restava silenziosamente rotto dal punto
di vista funzionale** (non a compile-time) dopo la revisione del
17/25: `STATO_LABEL` mappava ancora `trattativa/esecuzione/chiuso`
(mostrava il valore grezzo del nuovo enum come testo, es. "opportunita",
per qualunque lavoro), e soprattutto `lavori_dashboard()` (`0011`)
filtrava `where l.stato <> 'chiuso'` — valore che non esiste più nel
nuovo modello, quindi **nessun lavoro sarebbe mai stato escluso dalla
dashboard**, nemmeno quelli `completato`. Analizzando la stessa
funzione è emerso un secondo problema, anch'esso mai toccato dalla
0012: la classificazione rosso/verde per il punteggio di urgenza
referenziava ancora `acquisto_materiale`/`acquisto_ferramenta` e gli
stati vecchi di `lavorazione_esterna`, e non copriva affatto
`campione`/`costruzione`/`noleggio` — questi tre sarebbero sempre
risultati "né rossi né verdi", quindi sempre pesati 0.5 nel punteggio
indipendentemente dal loro stato reale.
**Corretto in `supabase/migrations/0013_lavori_dashboard_nuovo_stato.sql`**
(non riaprendo la 0012, già committata — stesso principio già seguito
per la 0009/0010): `lavori_dashboard()` ora filtra con un allow-list
esplicito `where l.stato in ('opportunita', 'accettato')` (un lavoro
`rifiutato` è terminale quanto uno `completato`, non ha più bisogno di
comparire nella dashboard operativa), e la classificazione rosso/verde
copre tutti gli 8 tipi del nuovo modello, incluso `noleggio` (che non
usa `stato` ma `prenotazione_effettuata`/`non_necessario`).
`STATO_LABEL` in `lavori/page.tsx` aggiornata al nuovo enum. Questa
correzione **non era nella lista esplicita di file da sistemare**
fornita a inizio Sprint B: segnalata qui perché è un effetto diretto
del cambio di modello `lavoro.stato` introdotto nello Sprint A, non
un'estensione di funzionalità — lasciarla rotta avrebbe significato
consegnare una dashboard con etichette e filtri silenziosamente errati
insieme alla nuova UI di trattativa.

### Verifica end-to-end (Sprint B)
Stack Supabase locale via CLI 2.109.1 (porte temporaneamente spostate
di +1000 in `config.toml` per non collidere con lo stack Docker già
attivo di Falegname in Cloud sulla stessa macchina, più
`auto_expose_new_tables` abilitato temporaneamente per lo stesso motivo
già noto dallo Sprint 3 — `config.toml` ripristinato via `git checkout`
a fine test) + Playwright headless, eseguiti su una copia isolata del
progetto (per via del lock di Next.js che impedisce due `next dev` sulla
stessa directory: il dev server dell'utente su porta 3456 non è mai
stato toccato). Copertura: registrazione e sessione, creazione Lavoro
con verifica dei 4 segnaposto automatici, compilazione briefing
(descrizione multi-riga verificata via `.inputValue()` dopo reload) e
upload di un allegato (verificato anche su disco), richiesta di
revisione su Progetto con **verifica diretta sul DB** che la riga
superata mantenga `stato = 'necessaria_revisione'` mentre la UI la
mostra "Accettato" tramite `lavoro_satellite_stato_effettivo()`,
compilazione valore su Preventivo, creazione di una seconda serie di
Campione (entrambe le serie visibili e distinte), transizione di due
Lavori diversi rispettivamente a `accettato` (placeholder esecuzione
mostrato, bottoni spariti) e a `rifiutato` (nessun placeholder,
coerente con l'assenza di satelliti di esecuzione per un lavoro mai
accettato). Ambiente smontato interamente al termine (container,
volumi Docker, copia isolata del progetto, dev server di test);
`npm run build`/`tsc --noEmit`/`eslint` puliti sull'intero progetto.

## Sprint C (2026-07-25) — UI fase di esecuzione, Fornitori, invio email ordini

> Chiude il placeholder minimo lasciato dallo Sprint B per i satelliti di
> esecuzione (Appuntamento verifica_misure/montaggio, Acquisti,
> Lavorazione esterna, Costruzione, Noleggio), costruisce l'anagrafica
> Fornitori (era solo placeholder di menu), e aggiunge l'invio email
> ordine. Usa le migration 0012/0013 già pronte dallo Sprint A/B più una
> nuova migration 0014 (credenziali SMTP personali per artigiano, vedi
> punto 3) — nessuna migration ancora applicata a Supabase Cloud.

### 1) Anagrafica Fornitori
**RLS verificata prima di procedere, nessuna ambiguità trovata**:
`fornitore`/`fornitore_sede`/`fornitore_sede_contatto` hanno policy
`for all using (auth.uid() is not null)` fin dalla `0001` (mai toccate
dalla `0012`) — CRUD pieno per qualunque artigiano autenticato, nessuna
colonna `artigiano_id`: modello condiviso esattamente come da brief del
16/7, non serve alcuna modifica RLS. `lib/fornitori/actions.ts` non fa
quindi alcun controllo di proprietà, solo autenticazione implicita
tramite il client Supabase server-side.

Pagine `app/(app)/fornitori` (lista + ricerca per ragione sociale, GET
`?q=`, stesso pattern di `clienti`), `/fornitori/nuovo`,
`/fornitori/[id]` (anagrafica fornitore + elenco sedi, ciascuna con i
propri contatti). CRUD completo a tutti e tre i livelli
(`FornitoreForm`, `FornitoreSedeForm`, `FornitoreSedeContattoForm`),
eliminazione con conferma `confirm()` nativa (nessun modale custom nel
progetto finora, non introdotto per questo). Voce **"Fornitori"**
spostata da `VOCI_IN_ARRIVO` a `VOCI_ATTIVE` in `app-nav.tsx`.

Indirizzo sede: stessi 7 campi del Lavoro (`indirizzo, civico, cap,
citta, provincia, sigla, nazione`), stesso componente di scelta nazione
con label provincia dinamica (`lib/paesi.ts`, già in uso per
Artigiano/Lavoro).

`cercaFornitoreSedi()` (per il form "nuovo ordine" nel dettaglio
Lavoro): il catalogo condiviso è caricato per intero (fornitori + sedi)
e filtrato lato JS sia su ragione sociale sia su nome sede — scelta
deliberata invece di due query `ilike` separate, perché il catalogo è
censito collettivamente da tutti gli artigiani (non per singolo
artigiano) e resta di dimensioni contenute; da rivedere con una vera
ricerca server-side se in futuro cresce molto.

### 2) Satelliti — fase esecuzione
`components/satellite-briefing.tsx` (Sprint B) generalizzato in
`components/satellite-appuntamento.tsx` (`SatelliteAppuntamento`),
riusato identico per `briefing` (`mostraNonNecessario={false}`, invariato)
e per `verifica_misure`/`montaggio` (`mostraNonNecessario={true}`: qui
il flag è liberamente impostabile, a differenza del briefing dove resta
bloccato a `false` dal check DB della `0012`). `components/satellite-
nuovo-appuntamento.tsx`: due bottoni "+ Verifica misure"/"+ Montaggio"
per aggiungerne altri manualmente — verificato che più istanze di
`montaggio` sullo stesso Lavoro convivano senza alcun collegamento tra
loro, come richiesto.

`components/satellite-nuovo-ordine.tsx` (creazione) +
`components/satellite-ordine.tsx` (card esistente) per Acquisti/
Lavorazione esterna: ricerca fornitore_sede con debounce (stesso
pattern di `nuovo-lavoro-standalone-form.tsx`), righe libere
(descrizione + quantità, riuso di `lavoro_satellite_articolo` già esteso
a `lavorazione_esterna` dalla `0012`), valore complessivo, categoria
(solo Acquisti). Bottoni di stato generati dinamicamente da
`azioniPossibiliOrdine()` (un solo bottone alla volta, verso lo stato
successivo della sequenza). Più istanze dello stesso tipo sullo stesso
Lavoro: nessun vincolo, verificato in test (il segnaposto creato
all'accettazione convive con gli ordini creati manualmente).

`components/satellite-costruzione.tsx`: testo libero (`descrizione_libera`,
già generico in tabella), stati con `data_inizio`/`data_fine` impostate
**automaticamente** dalla server action `avanzaStatoCostruzione()` al
cambio di stato (non dall'utente) — tempo trascorso calcolato e
mostrato (`giorni` se ≥1, altrimenti `ore`, arrotondato per difetto con
minimo 1 ora per evitare "0 ore").

`components/satellite-noleggio.tsx`: date da/a, costo, `prenotazione_
effettuata` e `non_necessario` — semaforo binario (nessun giallo),
esattamente come vincolato dallo schema (`stato` sempre `NULL` per
questo tipo).

### 3) Invio email ordine
**Corretto in corso di sprint, su indicazione esplicita dopo una prima
implementazione con SMTP di sistema**: l'invio ordini usa le
**credenziali SMTP personali di ciascun artigiano** (mittente reale =
la sua email), configurabili in Profilo/Impostazioni — **non** lo SMTP
Aruba (`info@districo.it`) già in uso per gli inviti "a quattro mani" e
per le email transazionali applicative. I due canali email dell'app
restano quindi tre in totale, ciascuno con un mittente diverso: mailer
di sistema Supabase Auth (conferma/reset, non configurabile da codice),
SMTP Aruba di sistema (`lib/email/send-email.ts`, solo inviti a quattro
mani), SMTP personale per artigiano (`lib/email/send-email-personale.ts`,
solo ordini).

**Schema** (migration `0014_smtp_personale_artigiano.sql`): 5 colonne
nullable aggiunte direttamente su `artigiano` (`smtp_host`, `smtp_porta`,
`smtp_username`, `smtp_password_cifrata`, `smtp_sicurezza` — check su
`'ssl'|'starttls'|'nessuna'`), non una tabella dedicata: relazione 1:1,
stesso trattamento già riservato a `ragione_sociale`/`partita_iva`.
Nessuna nuova RLS: le policy "artigiano vede/aggiorna solo se stesso"
(0001) coprono già queste colonne.

**Cifratura della password a riposo** (`lib/crypto/credenziali-smtp.ts`):
AES-256-GCM, chiave in `SMTP_CREDENZIALI_KEY` (32 byte, base64) — **solo
nell'ambiente applicativo, mai nel database**: chi accede al solo DB
(dump, SQL Editor) vede un ciphertext, non la password. Nessun
meccanismo di cifratura preesistente nel progetto: introdotto da zero,
scelta motivata dalla disponibilità nativa in Node (nessuna nuova
dipendenza) e dall'autenticazione integrata di GCM (rileva manomissioni
del ciphertext). **La password non viene mai rimandata al client**:
`ProfiloSmtpForm` mostra sempre il campo vuoto con placeholder
"lascia vuoto per non modificarla" — un submit vuoto lascia
`smtp_password_cifrata` invariata, solo un valore non vuoto la
ricifra e sostituisce. Verificato in test che il campo torni
sempre vuoto dopo il salvataggio/reload, mai popolato col valore
esistente.

**Pagina Profilo/Impostazioni** (`app/(app)/profilo/impostazioni`,
prima solo placeholder di menu "in arrivo", ora voce attiva):
form minimale (host, porta, sicurezza, username/email, password) via
`lib/profilo/actions.ts` → `aggiornaCredenzialiSmtp()`.

**Nuovo `lib/lavori/ordini-email.ts`**:
- `contattiPerInvio(fornitoreSedeId)`: solo i contatti **con email**
  (senza, non ha senso proporli nel dropdown — un contatto solo-
  cellulare non è escluso dall'anagrafica, solo dalla selezione invio).
- `inviaOrdineSatellite()`: **verifica per prima cosa le credenziali SMTP
  dell'artigiano corrente** (tutti e 4 i campi host/porta/username/
  password devono essere presenti) — se mancano anche solo in parte,
  ritorna un risultato con `richiedeConfigurazione: true` e un messaggio
  dedicato, che `SatelliteOrdine` mostra con un link diretto a
  `/profilo/impostazioni` (`components/satellite-ordine.tsx`) invece del
  generico errore di invio. **Nessun tentativo di invio silenzioso**:
  verificato in test che senza credenziali non parta alcuna chiamata
  SMTP (Mailpit riceve zero messaggi).
- Oggetto `Ordine [materiale|ferramenta|lavorazione esterna] rif. [nome
  cliente]` — **scelta per il caso non previsto dal template**: se un
  Acquisti non ha `acquisto_categoria` impostata (campo facoltativo), il
  testo tra parentesi diventa "acquisti" (fallback generico, non
  "materiale" per non affermare il falso). Corpo HTML fedele al
  template fisso richiesto (righe unite da `<br>`), **firma corretta in
  corso di sprint**: inizialmente hardcoded a "Nicola" (testo letterale
  del prompt originale), disallineata non appena il mittente è diventato
  l'email personale di un artigiano qualsiasi — corretta per usare
  `artigiano.nome` (stesso valore già usato come nome mittente
  nell'header dell'email), coerente col tono informale "Ciao [contatto]"
  già presente nel template. Invio in try/catch —
  errori SMTP (credenziali errate, server irraggiungibile) **non
  bloccano l'app**: ritornano un messaggio d'errore alla UI (pannello
  "Invia ordine" resta aperto) invece di lanciare un'eccezione.
  Registrazione dell'invio (`data_invio_ordine`, `contatto_invio_id`)
  fatta **dopo** l'invio riuscito; se anche solo quella fallisse (RLS,
  errore di rete), l'email è comunque già partita — segnalato con un
  messaggio dedicato ("Email inviata, ma non è stato possibile
  registrare l'invio") invece del generico errore di invio, per non far
  credere all'utente che l'ordine non sia stato mandato.

**Verificato end-to-end** (stesso stack Supabase locale + Mailpit +
Playwright, poi smontato): tentativo di invio senza credenziali →
bloccato con messaggio e link funzionante, **zero email inviate**
(verificato su Mailpit); configurazione credenziali (puntate a Mailpit
come "server SMTP personale" per il test) → password mai ripresentata
in chiaro nel form; secondo tentativo di invio → riuscito, email
intercettata da Mailpit con **mittente reale = l'indirizzo email
personale configurato dall'artigiano, non `info@districo.it`**
(asserzione esplicita di non-uguaglianza). Verificato anche a livello
DB che `smtp_password_cifrata` contenga ciphertext (formato
`iv.tag.dati`, tutti base64), non la password in chiaro.

### 4) Gate "pronto per il montaggio" e completamento
Banner + azione unificati in `components/lavoro-segna-completato.tsx`,
visibile solo quando `lavoro.stato === 'accettato'`. **"Segna lavoro
completato" reso sempre disponibile, senza vincolo sul gate né sul
numero/stato degli appuntamenti di montaggio** — stessa motivazione già
data per "Segna come accettato" nello Sprint B ("transizioni sempre
manuali"): il gate resta un'informazione a supporto ("Pronto"/"Non
ancora pronto per il montaggio", stesso banner colore neutro verde/grigio
già usato nello Sprint 1/2 per l'analogo indicatore), mai un blocco.
`segnaLavoroStato()` (già introdotta nello Sprint B per accettato/
rifiutato) estesa per accettare anche `'completato'`, stessa funzione,
nessuna duplicazione.

### Scoperta e correzione fuori dallo scope letterale: STATO_LABEL residuo in `clienti/[id]/page.tsx`
Stessa classe di problema già corretta nello Sprint B per la dashboard:
la lista "Lavori associati" nel dettaglio Cliente aveva ancora
`STATO_LABEL` con `trattativa/esecuzione/chiuso`. Corretta al nuovo
enum (`opportunita/accettato/rifiutato/completato`) — nessuna migration
coinvolta, solo un dizionario UI lato client. Verificato con `grep` che
non restassero altri residui dello stesso tipo altrove nel progetto.

### Verifica end-to-end (Sprint C)
Stesso metodo degli sprint precedenti (Supabase locale via CLI 2.109.1,
porte spostate temporaneamente, `config.toml` ripristinato via `git
checkout` a fine test, copia isolata del progetto per il lock di
`next dev`, dev server reale dell'utente su `:3456` mai toccato) +
Playwright, con l'aggiunta di **Mailpit** (incluso nello stack Supabase
locale, porta SMTP `1025` esposta abilitando `smtp_port` in
`config.toml`) come "servizio di test tipo Mailhog" richiesto: le env
var `SMTP_*` dell'app puntate a Mailpit invece che ad Aruba per la sola
sessione di test, email intercettate e verificate via l'API HTTP di
Mailpit (oggetto, destinatario, corpo) invece di un invio reale.
**Bug trovato e corretto nel test stesso, non nell'app**: un primo
tentativo con `SMTP_USER=test` (non un indirizzo email valido) faceva
fallire l'invio con "553 The address is not a valid RFC 5321 address"
sul `MAIL FROM` — corretto usando un indirizzo con formato valido nelle
credenziali di test.
**Secondo bug trovato e corretto nel test**: l'asserzione iniziale su
"gate pronto" usava un match di sottostringa (`text=Pronto per il
montaggio`) che risultava vero anche quando il banner mostrava "**Non
ancora** pronto per il montaggio" (sottostringa contenuta), dando un
falso positivo mentre a DB un satellite Acquisti era ancora rosso.
Corretto con: un controllo negativo esplicito prima (il banner deve
mostrare "non ancora"), un match esatto sul testo dopo, e una verifica
indipendente chiamando `lavoro_pronto_per_montaggio()` via REST
direttamente contro il DB per far concordare UI e funzione SQL. Anche
un'ambiguità di selettore sul bottone "Salva" del Noleggio (matchava un
div contenitore più ampio condiviso con altre card) è stata corretta
scoping sulla card specifica.
Copertura completa: censimento fornitore con sede e contatto (con
ricerca), creazione di un ordine Acquisti con fornitore/riga/valore,
invio email verificato end-to-end via Mailpit (oggetto con categoria e
cliente corretti, corpo con la riga d'ordine, destinatario corretto),
registrazione `data_invio_ordine` verificata sia in UI sia a DB,
appuntamenti multipli di montaggio, gate verificato falso poi vero
(con cross-check DB), transizione lavoro a `completato`. Ambiente
smontato al termine (container, volumi, copia isolata, dev server di
test); `npm run build`/`tsc --noEmit`/`eslint` puliti sull'intero
progetto.

## Sprint D (2026-07-26) — 6 fix sul dettaglio Lavoro/Statistica, emersi dal test end-to-end in produzione

### 1) Modifica del Lavoro dopo la creazione
Il Lavoro non era mai modificabile dopo la creazione (solo `titolo` e
`descrizione` venivano impostati alla creazione, nessuna azione di
update). Aggiunta un'azione di modifica per descrizione, data di
apertura e indirizzo completo — **titolo escluso deliberatamente**, non
richiesto e resta fisso dalla creazione.

**Nuova colonna `lavoro.data_lavoro`** (migration
`0015_lavoro_data_apertura.sql`, `date` nullable, backfillata sui lavori
esistenti da `created_at::date`, poi `default current_date` per i nuovi
insert): rappresenta la data di apertura del lavoro/inizio trattativa,
distinta dal timestamp tecnico `created_at` (che resta invariato,
riferimento di sistema non esposto in UI) — pensata per il caso in cui
il lavoro venga registrato in app qualche giorno dopo l'apertura reale.
Nullable a DB per sicurezza sul backfill, ma **obbligatoria in UI**
(client-side, il form di modifica non permette di salvarla vuota):
l'obbligatorietà percepita non richiede necessariamente un vincolo
`NOT NULL` a livello di schema, coerente con lo stile già "tutti
nullable" dei campi indirizzo del Lavoro introdotti dalla 0012.

`lib/lavori/actions.ts`: nuova `aggiornaLavoro()` — nessun controllo di
ownership esplicito nel codice, la policy RLS `"lavoro: modifica solo
owner"` (già presente dalla 0001) lo garantisce a livello DB, nessuna
nuova RLS necessaria. `creaLavoro()` estesa per impostare `data_lavoro`
alla creazione (oggi), esplicitamente invece di affidarsi solo al
default di colonna.

UI: **stesso pattern di modifica già in uso per i satelliti** (form
sempre pronto, non un modale) invece del pattern "form dedicato sempre
visibile" di `ClienteForm` — scelto un **toggle** (`components/
lavoro-info.tsx`, stato locale `modifica`) perché il dettaglio Lavoro è
già denso di sezioni (satelliti); mostra descrizione/data/indirizzo in
sola lettura con un link "Modifica" (solo per l'owner), che rivela
`components/lavoro-form.tsx` — stessa struttura indirizzo (nazione/
provincia/sigla con label provincia dinamica da `lib/paesi.ts`) già
usata in `fornitore-sede-form.tsx`, per coerenza.

### 2) Gate su "Segna lavoro completato" — supera la decisione dello Sprint C
La decisione originale dello Sprint C ("transizioni sempre manuali",
nessun vincolo nemmeno sul completamento) è **superata esplicitamente**:
"Segna lavoro completato" è ora bloccato se `lavoro_pronto_per_montaggio()`
risulta falso (un satellite bloccante — acquisti, lavorazione esterna,
costruzione, noleggio, oltre a preventivo/progetto/campione — non
ancora verde/accettato/non_necessario). Gli appuntamenti restano sempre
esclusi dal calcolo, invariato. "Segna come accettato"/"rifiutato"
restano **senza vincoli**, non toccati da questa decisione.

**Enforcement su due livelli, non solo il bottone disabilitato**:
`segnaLavoroStato()` (`lib/lavori/actions.ts`) verifica lato server la
stessa RPC `lavoro_pronto_per_montaggio()` già esistente (riusata così
com'è, nessuna nuova logica SQL) prima di accettare la transizione a
`'completato'`, e rifiuta con un messaggio dedicato se falsa. Motivo:
un vincolo reale — non solo un suggerimento in UI — deve valere anche
se il client viene manomesso (bottone riabilitato via devtools).
**Verificato esplicitamente**: bottone forzato "enabled" via JS e
cliccato — il server ha rifiutato la richiesta, confermato leggendo
direttamente lo stato del Lavoro a DB (rimasto `accettato`, non
`completato`).

**Messaggio "cosa manca"**: nessuna funzione SQL/UI esistente elencava
già i satelliti bloccanti (il gate esistente esponeva solo il booleano
`pronto`) — costruito `satellitiBloccantiMontaggio()` in
`lib/lavori/satelliti-meta.ts`, un **mirror in JS della stessa identica
logica SQL** di `lavoro_pronto_per_montaggio()` (0012/0013): stessa
esclusione appuntamenti, stessa esclusione revisioni superate (leaf via
`revisione_di`), stessi criteri di stato per verde per tipo. Non
ricalcola il booleano (quello resta l'unica fonte di verità, riusata
via RPC sia in UI sia nel gate server-side sopra), serve solo a
derivare quali satelliti sono bloccanti dai dati già presenti sulla
pagina (nessuna nuova query). `satelliteTipoLabelBreve()` genera
l'etichetta (con serie per Campione, categoria per Acquisti se
presenti). `LavoroSegnaCompletato` mostra `disabled={loading || !pronto}`
e, se non pronto, l'elenco "Satelliti ancora da completare: ...".

### 3) Flag "non necessario" su Montaggio — verificato, nessun fix necessario
Verifica esplicita richiesta prima di intervenire: il flag
`non_necessario` per gli appuntamenti di sottotipo `verifica_misure` e
`montaggio` era **già** liberamente impostabile in UI fin dallo Sprint C
(`SatelliteAppuntamento` con `mostraNonNecessario` a `true` per
entrambi, `false` solo per `briefing`), il vincolo DB (`0012`) blocca
`non_necessario = true` solo per `briefing`, e `aggiornaAppuntamento()`
scrive il valore senza alcuna condizione aggiuntiva. Nessuna modifica
di codice necessaria — segnalato qui per chiudere esplicitamente il
punto, coerente con "verifica lo stato attuale" della richiesta.

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

### 5) Azione "Riapri lavoro"
Nel dettaglio di un Lavoro con stato `completato` o `rifiutato`, nuova
azione **"Riapri lavoro"** (`components/lavoro-riapri.tsx`) che riporta
lo stato al valore precedente logico — `completato → accettato`,
`rifiutato → opportunita` — con conferma nativa (`window.confirm`,
stesso pattern già in uso per l'eliminazione di sede/contatto fornitore,
nessun modale custom introdotto). Nuova server action `riapriLavoro()`
in `lib/lavori/actions.ts`: **nessun controllo di gate** (a differenza
di `segnaLavoroStato()` verso `'completato'`) — riaprire è sempre
concesso, coerente con l'essere un'azione correttiva/di emergenza, non
un avanzamento del ciclo di vita. Nessun'altra colonna toccata:
`accettato_at`, i satelliti e ogni altro dato collegato restano
invariati (per un lavoro che torna `accettato`, `accettato_at` resta
quello della prima accettazione, non viene ripristinato/azzerato — non
richiesto, e comunque già ridondante con `stato` per decisione
pregressa). Integrata nel branch "else" già esistente in
`app/(app)/lavori/[id]/page.tsx` (quello che prima mostrava solo la
data di accettazione per lavori non più in opportunità/accettato), solo
per l'owner.

### 6) Lista minima "Lavori chiusi" in Statistica
Voce di menu **"Statistica" attivata** (era placeholder "in arrivo" fin
dallo Sprint 3): spostata da `VOCI_IN_ARRIVO` a `VOCI_ATTIVE` in
`components/app-nav.tsx`. Nuova pagina `app/(app)/statistiche/page.tsx`
(route **plurale** `/statistiche`, coerente con la convenzione già in
uso per `/clienti`/`/fornitori`/`/lavori` — la label di menu resta
singolare "Statistica", è solo un'etichetta; **riusata la cartella
`app/(app)/statistiche/` già esistente ma vuota** dal 17/7, probabile
scaffold iniziale mai completato). Lista semplice dei Lavori con
`stato in ('completato', 'rifiutato')`, ordinata per `data_lavoro`
decrescente (la colonna introdotta dal fix 1, non `created_at`): stesso
pattern visivo della Dashboard (`ul`/`li` con `divide-y`, join manuale
verso `cliente` per il nome, nessun embed PostgREST). **Nessun KPI/
grafico**, come richiesto esplicitamente per questo giro — la voce di
menu "Statistica" resta quindi minima ma non più un placeholder.

### Pulizia dati di prova in produzione (prima del commit)
Su richiesta esplicita, eliminati direttamente sul progetto Supabase
Cloud reale (non locale) i **2 Lavori di test** trovati nella tabella
`lavoro` prima di procedere: "Arredi in nicchia" (`stato='completato'`
nonostante satelliti Acquisti/Lavorazione esterna/Costruzione ancora
rossi — quasi certamente creato durante un test manuale in produzione
precedente all'introduzione del gate del fix 2, quando "completato" era
ancora sempre libero) e "Lavoro 2" (`stato='opportunita'`), entrambi
collegati alla stessa scheda Cliente "Debora". Eseguito con una `DELETE`
diretta via REST usando la `SUPABASE_SERVICE_ROLE_KEY` già presente in
`.env.local` (bypassa la RLS, non serve altro accesso): tutte le
tabelle figlie (`lavoro_artigiani`, `attivita`, `lavoro_fasi`,
`pagamento`, `allegato`, `ordine_acquisto`→`ordine_acquisto_riga`,
`lavoro_satellite`→`lavoro_satellite_allegato`/`lavoro_satellite_articolo`)
erano già tutte `on delete cascade` fin dalle migration 0001/0009/0012
— nessuna nuova migration necessaria per la pulizia stessa. Verificato
con query di conteggio (`Content-Range` su `lavoro` e su
`lavoro_satellite`) che entrambe le tabelle risultassero a 0 righe dopo
l'operazione, e che il Cliente "Debora" e l'unico Fornitore censito
restassero intatti (non referenziati dalla direzione opposta, quindi
mai a rischio comunque).

### Verifica end-to-end
Stesso metodo degli sprint precedenti: Supabase locale via CLI 2.109.1
(porte spostate temporaneamente +1000 in `config.toml` per evitare
collisioni con lo stack Docker di Falegname in Cloud già attivo sulla
stessa macchina, ripristinato via `git checkout` a fine test), copia
isolata del progetto in scratchpad per il lock di `next dev`
(node_modules copiato con hardlink `cp -al`, non symlink — Turbopack
rifiuta un symlink che punta fuori dalla working directory del
progetto), dev server reale dell'utente su `:3456` mai toccato. Utente
di test e cliente creati via chiamate REST dirette a Supabase (non SDK:
`@supabase/supabase-js` più recente richiede Node 22+ per il client
Realtime, ambiente ha Node 20). **Scoperto un artefatto della CLI
locale 2.109.1** (stessa famiglia di problema già nota dallo Sprint 3
con `auto_expose_new_tables`): a differenza del progetto Supabase Cloud
di produzione, l'istanza locale non concede di default a `service_role`
i privilegi su tabelle già esistenti — grant allargati manualmente
(`GRANT`/`ALTER DEFAULT PRIVILEGES`) solo per la sessione di test, mai
propagati al progetto reale.

Copertura fix 1-4: modifica Lavoro (descrizione/data/indirizzo) salvata
e persistita dopo reload; gate verificato bloccato con messaggio "cosa
manca" a satelliti tutti rossi, poi sbloccato avanzando manualmente
ogni satellite bloccante (Progetto/Preventivo/Campione "non
necessario", Acquisti/Lavorazione esterna/Costruzione fino a verde,
Noleggio "non necessario") fino a "Pronto per il montaggio" e
completamento riuscito; tentativo di bypass del bottone disabilitato
(riabilitato via `page.evaluate`) rifiutato dal server, verificato
anche a DB che lo stato restasse `accettato`; asterischi/assenza di
"(opz.)" verificati su registrazione e sul form "nuovo lavoro".

Copertura fix 5-6 (sessione di test separata, stesso metodo): 3 Lavori
creati, 2 portati a `completato`/`rifiutato` direttamente a DB (per non
dover ririfare la sequenza di sblocco del gate, non oggetto di questo
giro) — verificato che `/statistiche` li elenchi entrambi insieme a un
terzo lasciato chiuso, con etichette stato corrette e link funzionante
al dettaglio; riapertura di entrambi tramite il nuovo bottone (dialogo
di conferma auto-accettato in Playwright) con verifica che tornino
rispettivamente ad `Accettato` (azioni di completamento di nuovo
disponibili) e `Opportunità` (azioni accetta/rifiuta di nuovo
disponibili); dopo la riapertura, `/statistiche` non li elenca più
mentre il terzo Lavoro resta, e la Dashboard li rimostra correttamente
mentre il terzo resta escluso. Ambiente smontato al termine (container,
volumi, copia isolata, config.toml ripristinato); `npm run build`/
`tsc --noEmit`/`eslint` puliti sull'intero progetto.

### Prossimi passi aperti (aggiornato)
- **Eseguire `supabase/migrations/0015_lavoro_data_apertura.sql` sul
  progetto Supabase Cloud** (SQL Editor) — testata in locale, non
  ancora applicata in produzione, stesso limite di tutte le migration
  precedenti. **Unica migration introdotta in questo giro complessivo**:
  i fix 5 e 6 non hanno richiesto alcuna modifica di schema.
- (voci precedenti non ancora affrontate restano valide sopra)
