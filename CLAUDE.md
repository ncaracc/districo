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
| 2026-07-16 | Stack tecnico: segue il pattern multi-tenant già in uso per Falegname in Cloud (Next.js 15 + Supabase/Postgres con RLS), coerente con l'albero decisionale delle convenzioni VPS, data la necessità di multi-tenancy e condivisione parziale dei dati tra artigiani. |
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
| 2026-07-17 | Porta interna Docker assegnata: **3002** (3001 risultava occupata da un'app "preventivi" non documentata in convenzioni-vps.md; Falegname in Cloud usa in realtà la porta 3100, fuori dal range convenzionale 3001-3099). File pronti in `districo-config/`: `docker-compose.yml`, `Dockerfile`, `districo.conf` (Nginx), `.env.example`, `setup-cartelle-vps.sh`. |
| 2026-07-17 | VPS Hetzner (178.105.199.29) rinominato da `scattimiei` ad **`apphub`**, per riflettere il ruolo multi-app del server (ora ospita anche Districo, oltre a Scattimiei e altre app non documentate: "preventivi", stack "lab" con Grafana/Prometheus/Authentik). Il nome progetto nel pannello Hetzner Cloud resta "scattimiei.it" — è un'etichetta cosmetica separata dall'hostname del sistema operativo, non aggiornata. |
| 2026-07-17 | Repo GitHub creato e pushato: `ncaracc/districo` (privato). Autenticazione HTTPS via Personal Access Token (permesso `repo`), credenziali salvate con `git config --global credential.helper store` su server-a5. |
| 2026-07-17 | Docker installato su apphub (non presente in precedenza, prima app Node/Next.js del VPS). Container `districo` avviato in produzione, porta 3002, healthcheck via redirect 307 a `/login` (middleware auth attivo). |
| 2026-07-17 | Storage allegati: cartelle create su apphub (`/srv/apps/districo/uploads/lavori`, `/uploads/profili`), montate come volume Docker. Backup di questa cartella nello script comune ancora da fare (script stesso non ancora scritto per nessuna app). |
| 2026-07-17 | Dominio districo.it migrato da nameserver Aruba a **Cloudflare** (`clara.ns.cloudflare.com`, `jonah.ns.cloudflare.com`), coerente con le convenzioni VPS. Record MX/SPF/DKIM/DMARC di Aruba preservati identici durante la migrazione (la posta `info@districo.it` resta gestita da Aruba, solo il DNS passa a Cloudflare). Tutti i record mail (`mail`, `mx`, `pop3`, `smtp`, `webmail`, `admin`, `autoconfig`, `imap`) impostati su "DNS only" (non proxati), per non rompere i protocolli di posta che non passano dal proxy Cloudflare. Record A dell'apice e `www` puntati a 178.105.199.29, anch'essi temporaneamente "DNS only" per permettere la validazione Certbot. |
| 2026-07-17 | HTTPS attivato via Certbot (`certbot --nginx -d districo.it -d www.districo.it`). Certificato Let's Encrypt attivo, scadenza 2026-10-16, rinnovo automatico configurato. Sito raggiungibile in produzione su https://districo.it. |
| 2026-07-17 | **Deploy iniziale completato**: repo GitHub, Supabase Cloud, Docker su apphub, Nginx, DNS Cloudflare, HTTPS — tutta la catena infrastrutturale è live. Restano aperti solo: script di backup comune, flusso di autenticazione applicativo (login/registrazione, in pausa da sessione precedente), e il task futuro di migrazione di Falegname in Cloud a Supabase Cloud. |

## Modello dati — schizzo v1 (aggiornato)

Entità principali emerse finora (da raffinare quando si passa a schema reale):

- `Artigiano` — id, nome, cognome, ragione_sociale (opz.), partita_iva (opz.), specializzazione, telefono, email, indirizzo (via, civico, CAP, località), immagine_profilo (opz.)
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

### Note tecniche emerse in fase di implementazione

- `sla_attivita`: PostgreSQL non ammette colonne nullable in una PRIMARY KEY, neanche con COALESCE nella definizione. Soluzione adottata: `id UUID PRIMARY KEY` surrogato + `CREATE UNIQUE INDEX` con espressione `COALESCE(artigiano_id, '00000000-...')` — funziona perché gli expression index supportano COALESCE, le PK no.
- `NEXT_PUBLIC_SUPABASE_URL` deve essere la base dell'URL senza path (es. `https://xxx.supabase.co`), non includere `/rest/v1/`.
- Admin RLS: nessun accesso diretto alle tabelle operative. Solo funzioni/view SQL con `SECURITY DEFINER` esporranno metriche aggregate. Il guard in `app/(admin)/layout.tsx` legge `is_admin` dalla tabella `artigiano`.
- **Ambiente dev**: Node.js 18 non è compatibile con Next.js 15/16 (richiede ≥20). Installato Node.js 20 via nvm (`nvm use 20`). Dev server: `npm run dev -- --port 3456`.
- **Fix Tailwind/Turbopack**: `@tailwindcss/oxide` non trova il binding nativo in modalità Turbopack. Fix: copiare `node_modules/@tailwindcss/oxide-linux-x64-gnu/tailwindcss-oxide.linux-x64-gnu.node` dentro `node_modules/@tailwindcss/oxide/`. Va rifatto se si cancella `node_modules`.
- Nessuna credenziale di connessione diretta Postgres (connection string) salvata in locale: le migration vengono applicate a mano via SQL Editor Supabase, non con `supabase db push`.

### Da implementare (prossima sessione)

- Testare end-to-end il flusso di registrazione/login in browser (non ancora verificato con un signup reale, per evitare di creare utenti/email di test in produzione senza conferma).
- Flusso onboarding da invito: `app/(auth)/invito/[token]`.
- Pagine applicative: lista lavori, dettaglio lavoro (schermata più critica), clienti, fornitori, profilo/impostazioni.

## Prossimi passi aperti

- Possibile sviluppo futuro (non deciso, solo segnato): un "profilo cliente" trasversale ai vari artigiani (es. il cliente finale vede tutti i lavori fatti su una sua proprietà, o lascia recensioni) — richiederebbe un'anagrafica cliente separata dal perimetro del singolo artigiano, con consenso esplicito del cliente.
- Vista cliente sull'avanzamento del lavoro → seconda release, dopo il primo rilascio funzionante dell'app.
- Definire in dettaglio i KPI della voce menu "Statistica" (economici e di performance).
- Task infrastrutturale separato: migrare Falegname in Cloud da Supabase self-hosted a Supabase Cloud, per uniformità con Districo.
- Scrivere lo script di backup comune (`/srv/scripts/backup-all.sh`), non ancora esistente per nessuna app sul VPS.
- Valutare se aggiungere l'app "preventivi" e lo stack "lab" (Grafana/Prometheus/Authentik) a `convenzioni-vps.md` — per ora lasciati fuori su richiesta esplicita; "preventivi" verrà sostituita da Falegname in Cloud, "lab" da valutare per eventuale rimozione (verificare prima che nulla dipenda da Authentik per il login).
- Definire progressivamente le voci finali del menu hamburger.
- Passare a mockup/CSS delle schermate rimanenti (lista lavori, dettaglio cliente, ecc.) dopo aver validato lo stile sul dettaglio Lavoro.
