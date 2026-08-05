# Audit UI — leggibilità e coerenza (2026-08-05)

Solo discovery, nessuna modifica applicata. Riferimenti a file:riga dello stato attuale di `main` (commit `8b981d5`).

**Nota preliminare sui tipi di satellite**: la richiesta elenca 8 tipi incluso "Lavorazione esterna", ma quel tipo è stato **unificato in Acquisti** il 2026-08-02 (Sprint C) — non esiste più come satellite a sé. I tipi realmente presenti oggi sono 8: Appuntamento (sottotipi Briefing/Verifica misure/Montaggio, stesso componente `SatelliteAppuntamento`), Progetto, Preventivo, Campionatura, Acquisto, Costruzione, Noleggio, Chiusura Lavoro.

---

## 1) Font e dimensioni

### Label dei campi form — split netto in due convenzioni, mai armonizzate

| Convenzione | File |
|---|---|
| `text-xs font-medium` | `lavoro-form.tsx` (9 label), tutti i `satellite-*.tsx` con campi editabili: `satellite-appuntamento.tsx:130,143`, `satellite-campione.tsx:83,106`, `satellite-preventivo.tsx:83`, `satellite-ordine.tsx:154,175,189,221`, `satellite-noleggio.tsx:79,101,107,115,129`, `satellite-chiusura.tsx:122,129`, `fornitore-sede-form.tsx` (7 label), `allegato-modale.tsx:59,73` |
| `text-sm font-medium` | `cliente-form.tsx` (5 label), `fornitore-form.tsx` (2 label), `profilo-obiettivi-form.tsx` (5 label), `profilo-smtp-form.tsx` (6 label), `nuovo-lavoro-standalone-form.tsx` (4 label), `satellite-nuovo-ordine.tsx` (4 label — nota: il "fratello in sola creazione" di `satellite-ordine.tsx`, stesso satellite tipo Acquisto ma con label a due dimensioni diverse tra crea e modifica), tutte le pagine `(auth)` (login, registrazione, invito, password-dimenticata, reimposta-password) |

Nessun criterio riconoscibile per la scelta (non è "satellite vs anagrafica": `satellite-nuovo-ordine.tsx` è `text-sm` mentre `satellite-ordine.tsx`, stesso dominio, è `text-xs`). Il testo dei value negli `<input>`/`<textarea>` è invece **uniforme a `text-sm`** ovunque (stessa funzione `inputClass()` duplicata in ~10 file, vedi sezione 5).

### Viste sola-lettura dei satelliti
Tutte usano `text-sm text-gray-700` (a volte con `text-gray-600` per un sotto-testo secondario) — **questa parte è coerente**: `satellite-appuntamento.tsx:156`, `satellite-campione.tsx:130`, `satellite-noleggio.tsx:156`, `satellite-ordine.tsx:236-246`, `satellite-costruzione.tsx:97`, `satellite-chiusura.tsx:196`. Le eccezioni sono le "etichette di stato" secondarie (badge "Stato"/valore accanto), sempre `text-xs` (`satellite-progetto.tsx:71-72`, `satellite-campione.tsx:70-71`, `satellite-ordine.tsx:146`, `satellite-costruzione.tsx:68`, `satellite-chiusura.tsx:106`) — coerenti tra loro.

### Numeri/importi
- **KPI Dashboard** (`kpi-dashboard.tsx:23,28,33,42`): `text-2xl font-medium` — le uniche cifre "grandi" di tutta l'app.
- **Preventivo/Acquisto/Noleggio/Chiusura** (valore mostrato inline, sola lettura o nel riepilogo): sempre `text-sm` (`satellite-preventivo.tsx:105`, `satellite-ordine.tsx:245`, `satellite-noleggio.tsx:164`, `satellite-chiusura.tsx:111,113,115` — qui con `font-medium` extra sul numero ma stessa dimensione `text-sm` del contenitore). Nessuna incoerenza qui — sono contestualmente "numeri di dettaglio", non KPI.
- **Colonna "Valore" Dashboard** (tabella desktop `lavori/page.tsx:220` e card mobile `:161`): `text-sm`/nessuna classe esplicita (eredita `text-sm` dalla tabella su desktop, eredita il default del body — vedi punto sotto — sulla card mobile).

### Testo nei bottoni — la maggiore incoerenza reale trovata
Il bottone primario "Salva" (`bg-primary ... text-white`) compare a **due dimensioni diverse** a seconda del satellite, senza un criterio:

| Dimensione | Satellite / file |
|---|---|
| `text-sm` (pieno stile "azione principale") | Appuntamento (`satellite-appuntamento.tsx:170`, inoltre `w-full`), Campione (`satellite-campione.tsx:124`), Noleggio (`satellite-noleggio.tsx:150`) |
| `text-xs` (compresso, stile più simile a un'azione secondaria) | Costruzione — "Salva note" (`satellite-costruzione.tsx:110`), Ordine — "Segna come consegnato"/invio (`satellite-ordine.tsx:309,342`), Fornitore_sede_contatto (`fornitore-sede-contatto-form.tsx:87`) |

Il bottone "Salva" secondario/outline (`border-gray-300 ... text-gray-700`) è **ancora più incoerente**: `text-xs` in Chiusura/Costruzione/Ordine/Preventivo(valore) contro `text-sm` altrove (8 occorrenze) — nessun pattern chiaro fra le due famiglie di stile (pieno vs outline) e le due dimensioni (xs vs sm). Il bottone primario "Crea"/"Salva modifiche" dei form a pagina intera (Cliente/Fornitore, `cliente-form.tsx:172`, `fornitore-form.tsx:102`) usa `text-sm` con `py-2.5` (leggermente più alto dei `py-2` dei satelliti).

### Card/righe della Dashboard — mobile vs desktop
- **Desktop** (tabella, `lavori/page.tsx:170`): tutta la tabella eredita `text-sm` dal `<table className="w-full text-left text-sm">`.
- **Mobile** (card, `lavori/page.tsx:137-166`): il titolo del Lavoro (`<p className="mt-1 flex items-center gap-1.5 font-medium text-gray-900">{l.titolo}`, riga 147) **non ha alcuna classe `text-*` esplicita** — eredita il default del `<body>` (16px, nessun override in `globals.css`, confermato: nessuna regola `font-size` globale). Risultato: lo stesso dato (titolo/descrizione del Lavoro) è visivamente **più grande su mobile (16px) che su desktop (14px, `text-sm`)** — probabilmente non intenzionale, la card sembra semplicemente non aver ricevuto lo stesso `text-sm` di contesto della tabella. Cliente (`text-xs`) e Stato (`text-xs`) sulla card sono invece coerenti con la tabella.

### Titoli — coerenti
`text-2xl font-bold` per ogni H1 di pagina (Dashboard, Clienti, Fornitori, dettaglio Lavoro `lavoro-info.tsx:79`, dettaglio Cliente/Fornitore). `text-sm font-semibold` per gli H2 di sezione (es. "Sedi", "Dati cliente", "Lavori associati"). Il titolo del `Modal` generico (`modal.tsx:54`) è invece `text-sm font-semibold` — stessa dimensione degli H2 di pagina, molto più piccolo dei veri H1: coerente in sé, ma è l'unico "titolo di primo livello" dell'esperienza (nome del satellite aperto) a non avere alcuna enfasi tipografica maggiore.

---

## 2) Elementi comuni tra finestre (i 7/8 tipi di satellite)

Tutti i satelliti condividono lo stesso `Modal` (`modal.tsx`) come contenitore: header fisso in alto (fuori scroll) con **titolo a sinistra + X a destra**, corpo con scroll verticale (`overflow-y-auto`) sotto. Il bottone **matita (modifica)** e il bottone **cestino (elimina)** non sono mai dentro il Modal: vivono nella tabella attività (`lavoro-satelliti-tabella.tsx:253-286`, colonna "Azioni" a destra), fuori da qualsiasi scroll del dettaglio.

| Elemento | Appuntamento | Progetto | Preventivo | Campionatura | Acquisto | Costruzione | Noleggio | Chiusura |
|---|---|---|---|---|---|---|---|---|
| **Bottone chiudi (X)** | header Modal, in alto a destra, fuori scroll — **identico per tutti** (componente condiviso) |||||||
| **Bottone modifica (matita)** | tabella attività, fuori dal Modal — **identico per tutti** |||||||
| **Semaforo/pallino di stato** | **Header del Modal**, accanto al titolo (2026-08-04, `titoloConPallino`, solo qui) | corpo, in alto (`satellite-progetto.tsx:52`) | corpo, in alto (`:70`) | corpo, in alto (`:64`) | corpo, in alto (`:143`) | corpo, in alto (`:65`) | corpo, in alto (`:72`) | corpo, in alto (`:103`) |
| **Bottone salva** | fondo body, `w-full` pieno, dentro scroll | **assente** (checkbox auto-salva) | metà body, accanto al campo Valore; Accettato/Rifiutato auto-salvano | fondo body | metà body (dopo allegati, prima di "Ordinato") | subito sotto la textarea (quasi in cima) | fondo body | metà body, affiancato alla checkbox "Concluso" |
| **Sezione allegati** | subito sotto la riga pallino/titolo, switch di vista dedicato | dentro il box grigio "Stato", dopo il trigger | dentro il box grigio "Corrente" | dentro il box grigio "Stato", in fondo | dopo i campi editabili, prima del bottone Salva | **assente** | **assente** | **assente** |

**Il pattern NON è uniforme su nessuno dei 5 elementi elencati**, tranne chiudi e matita (che sono strutturalmente condivisi, non per convenzione ripetuta). In particolare:
- Solo **Appuntamento** ha già ricevuto il "template di riferimento" del 2026-08-04 (semaforo nell'header del Modal, titolo senza ripetizione nel corpo) — gli altri 7 mostrano ancora nome+pallino duplicati nel corpo (il Modal li mostra già come testo semplice nell'header, senza pallino). È lo stesso solco esplicitamente segnalato in CLAUDE.md come "da replicare nel prossimo intervento".
- **3 tipi su 8 (Costruzione, Noleggio, Chiusura) non hanno alcuna sezione allegati**, mentre gli altri 5 sì — non per una decisione esplicita di scope quanto per non essere ancora stati toccati (la tabella `lavoro_satellite_allegato` non ha alcuna restrizione di tipo, per decisione esplicita del 26/7).
- La posizione del bottone Salva rispetto agli allegati/checkbox varia da satellite a satellite senza una regola: a volte prima (Costruzione), a volte dopo (Acquisto, Progetto n/a), a volte affiancato a un toggle (Chiusura).

---

## 3) Bottone Salva — stato attuale per form

| Form | Fisso in fondo? | Serve scroll? | Auto-save su toggle? | Note |
|---|---|---|---|---|
| Appuntamento | Sì, in fondo al body, `w-full` | Sì se descrizione lunga (`rows=8`) | No (Concluso richiede comunque "Salva") | Unico con indicatore "Salvato" post-submit |
| Progetto | **Nessun bottone Salva** | — | Sì, "Accettato" auto-salva (`impostaProgettoAccettato`) | |
| Preventivo | Due punti di salvataggio distinti | No | Sì, Accettato/Rifiutato auto-salvano (con `window.confirm` nativo) | Il campo Valore ha un suo bottone "Salva" dedicato accanto |
| Campionatura | Sì, in fondo | Possibile con note lunghe | No | |
| Acquisto | A metà form (non in fondo) | Sì | Sì, "Ordinato" auto-salva (e salva anche i campi correnti prima di attivarsi) | Comportamento a due velocità: submit esplicito per i campi + toggle immediato per lo stato |
| Costruzione | **In alto** (subito sotto la textarea, non in fondo) | No | No (avanzamento stato è un bottone separato, non salva le note) | "Salva note" e "avanza stato" sono due azioni scollegate |
| Noleggio | Sì, in fondo | Sì | **No** — "Prenotazione effettuata" richiede comunque "Salva" | Diverge da Progetto/Preventivo/Chiusura, unico checkbox binario che non auto-salva |
| Chiusura | A metà form, affiancato a "Concluso" | No | Sì, "Concluso" auto-salva (salva prima i campi correnti, poi il flag) | |
| Cliente | Sì, in fondo, `w-full` | Dipende dal contenuto Note | No | Mostra "Modifiche salvate." dopo submit |
| Fornitore | Sì, in fondo, `w-full` | No | No | |

**Nessuna logica di "dirty state" esiste nel codice** (verificato con ricerca su `beforeunload`/`isDirty`/`dirty`/`hasChanges`/`unsaved` in tutto `lib`/`components`/`app`: zero risultati). Chiudere il Modal (X, backdrop, Esc) durante la compilazione di un satellite **non avverte mai** di eventuali modifiche non salvate — comportamento uniforme in negativo, cioè un problema condiviso da tutti i satelliti, non un'incoerenza tra di essi. L'unico segnale di "salvato" visibile è transitorio: `salvato` booleano in Appuntamento (testo "Salvato" sotto il bottone) e in Cliente/Fornitore (banner "Modifiche salvate."/"Modifiche salvate"); gli altri satelliti non mostrano alcuna conferma oltre al refresh della pagina.

---

## 4) Allegati — nome file vs etichetta

La colonna `lavoro_satellite_allegato.etichetta` è `NOT NULL` (migration `0025`, backfill storico completo) — **non esistono righe storiche senza etichetta**, nessun fallback necessario per quel caso.

Il nome file tecnico (`nome_file`) non è mai mostrato in UI: `AllegatoLista` (`satellite-allegati.tsx:78`) mostra sempre `a.etichetta`. Il nome file grezzo resta usato solo internamente per l'header `Content-Disposition` del download (`app/api/allegati/satellite/[id]/route.ts:41,47`).

**Il punto reale da segnalare**: `etichetta` viene popolata con un vero valore inserito dall'utente solo quando il flusso passa dalla modale dedicata (`richiedeEtichetta=true` su `AllegatoTrigger`). Se non passa quel prop, `caricaAllegatiSatellite()` (`lib/lavori/allegati.ts:107`) usa il fallback `etichetta: etichettaCondivisa ?? f.name` — cioè **il nome file originale finisce comunque mostrato in lista, sotto le mentite spoglie di "etichetta"**, per i satelliti che non hanno mai adottato la modale:

| `richiedeEtichetta` | Satelliti | Effetto |
|---|---|---|
| `true` (etichetta reale) | Appuntamento (`satellite-appuntamento.tsx:116`), Progetto (`satellite-progetto.tsx:76`), Acquisto (`satellite-ordine.tsx:258`) | Etichetta scelta dall'utente in modale |
| `false`/non passato (fallback a filename) | **Preventivo** (`satellite-preventivo.tsx:108`, via `SatelliteAllegati`), **Campionatura** (`satellite-campione.tsx:137`, via `SatelliteAllegati`) | Ogni nuovo allegato caricato oggi su questi due tipi mostra il **nome del file originale** come se fosse un'etichetta descrittiva |
| — | Costruzione, Noleggio, Chiusura | Nessuna sezione allegati, il problema non si pone (vedi sezione 2) |

Questo è coerente con quanto già annotato in CLAUDE.md ("Preventivo/Progetto/Campione, non toccato" al 2/8) tranne che nel frattempo Progetto **è** stato migrato alla modale (Sprint C, stesso giorno) — la nota in CLAUDE.md è quindi leggermente stale: oggi solo **Preventivo e Campionatura** restano sul vecchio flusso senza etichetta reale.

---

## 5) Componenti/utility condivisi già esistenti

Punti naturali dove centralizzare le nuove convenzioni invece di duplicare satellite per satellite:

| Componente/utility | File | Cosa fa oggi | Uso |
|---|---|---|---|
| `Modal` | `components/modal.tsx` | Contenitore generico (header+scroll), già accetta un `titolo: ReactNode` | Tutti i satelliti + "Aggiungi attività" |
| `AllegatoLista` / `AllegatoTrigger` | `components/satellite-allegati.tsx` | Lista a 3 colonne + trigger di upload, separati per essere posizionabili indipendentemente | Appuntamento, Progetto, Preventivo, Campionatura, Acquisto |
| `SatelliteAllegati` | `components/satellite-allegati.tsx` (stesso file) | Wrapper di compatibilità che compone Lista+Trigger nell'ordine "vecchio" | Preventivo, Campionatura (i due rimasti sul flusso senza etichetta, vedi sez. 4) |
| `AllegatoModale` | `components/allegato-modale.tsx` | Form file+etichetta dentro una `Modal` annidata | Riusato da `AllegatoTrigger` quando `richiedeEtichetta` |
| `Combobox` | `components/combobox.tsx` | Ricerca+selezione generica con debounce | Cliente (creazione Lavoro), Fornitore (Acquisto, Noleggio) |
| `formattaValuta()` | `lib/formato-valuta.ts` | Formattazione unica `€ 1.234` | Preventivo, Acquisto, Noleggio, Chiusura, Dashboard, KPI |
| `DOT_COLOR` / `ColoreSemaforo` | `lib/lavori/satelliti-meta.ts` | Mappa colore→classe Tailwind per il pallino di stato | Tutti i satelliti + tabella attività + Dashboard |
| `inputClass()` | **Duplicata identica** in ~10 file (`lavoro-form.tsx`, ogni `satellite-*.tsx` con campi editabili, `allegato-modale.tsx` non la usa ma replica la stessa stringa inline) | Stessa stringa Tailwind per bordo/padding/focus dell'input | — |
| `IconaMatita`/`IconaCestino`/`IconaGraffetta`/`IconaCalendario`/`IconaPin`/`IconaChiudi` | `components/icons.tsx` | Set di icone SVG hand-drawn, stroke-based, coerenti | In tutta l'app |
| `LABEL_ATTIVITA` / `ORDINE_ATTIVITA` / `RIPETIBILE_ATTIVITA` | `lib/lavori/attivita-ordine.ts` | Fonte di verità per nomi/ordine dei tipi attività | Tabella attività, "Aggiungi attività" |

**Osservazione per il restyling**: `inputClass()` è il candidato più immediato da centralizzare in un unico modulo condiviso (es. `lib/ui.ts` o un componente `<Input>`) — oggi una modifica alla dimensione/padding degli input richiederebbe toccare ~10 file uno per uno. Lo stesso vale per le classi dei bottoni (`bg-primary ... text-sm font-medium ...` vs le varianti outline/xs), oggi scritte inline e mai estratte.

---

## 6) Input data e ora

Tutti gli input di data/ora dell'app usano controlli **nativi del browser** (`<input type="date">`/`type="datetime-local"`) — nessun date picker custom, nessuna libreria (verificato: nessuna dipendenza tipo `react-datepicker`/`flatpickr`/`dayjs` in `package.json`), nessun trio di `<select>` giorno/mese/anno.

| Campo | File:riga | Tipo di controllo | Data+ora o solo data | Helper di conversione ISO→input |
|---|---|---|---|---|
| `data_appuntamento` (Briefing/Verifica misure/Montaggio) | `satellite-appuntamento.tsx:135` | `type="datetime-local"` | **Data + ora** | `aDatetimeLocal()` locale al file (righe 14-19, la più elaborata: pad manuale di ore/minuti) |
| `chiusura_data` (Chiusura Lavoro) | `satellite-chiusura.tsx:125` | `type="date"` | Solo data | `aDateLocal()` locale al file (righe 25-28) |
| `data` di ogni riga acconto (Chiusura Lavoro) | `satellite-chiusura.tsx:140` | `type="date"` | Solo data | stessa `aDateLocal()` del punto sopra |
| `data_da` (Noleggio) | `satellite-noleggio.tsx:104` | `type="date"` | Solo data | `aDateLocal()` **duplicata identica** (righe 15-18) |
| `data_a` (Noleggio) | `satellite-noleggio.tsx:110` | `type="date"` | Solo data | stessa `aDateLocal()` del punto sopra |
| `data_lavoro` (apertura Lavoro, solo in modifica) | `lavoro-form.tsx:113` | `type="date"` | Solo data | **nessuno** — il campo arriva già come stringa `YYYY-MM-DD` (colonna `date`, non `timestamptz`), non serve troncare un ISO |

Solo 6 punti di inserimento data/ora in tutta l'app, in 4 componenti. Nessun'altra scadenza/data è inserita dall'utente: `scadenza_invito` (inviti "a quattro mani", `lib/lavoro-artigiani/inviti.ts:15`) è calcolata server-side, mai un campo di un form. **La creazione del Lavoro non chiede alcuna data** (`nuovo-lavoro-standalone-form.tsx` non ha alcun campo data) — `data_lavoro` si imposta solo in un secondo momento, da "Modifica" nel dettaglio Lavoro.

### Il pattern di `satellite-chiusura.tsx` e dove NON è replicato

Il pattern indicato come più funzionale è: `type="date"` nativo + helper `aDateLocal(iso) => iso.slice(0,10)` per convertire il timestamp ISO letto dal DB nel formato `YYYY-MM-DD` richiesto dall'input, più lo stesso `inputClass()` di sempre.

- **Replicato esattamente** (stessa firma, stesso corpo, funzione duplicata di nuovo — non condivisa) in **1 altro file**: `satellite-noleggio.tsx` (2 campi, `data_da`/`data_a`).
- **Non replicato in 2 punti**, per motivi diversi:
  - `lavoro-form.tsx:113` — stesso widget `type="date"`, ma **senza l'helper**: la colonna sorgente (`data_lavoro`) è già un `date` puro a DB, non un `timestamptz`, quindi non c'è nulla da troncare. Stessa UX finale, implementazione leggermente diversa per una ragione di schema, non un'incoerenza da correggere.
  - `satellite-appuntamento.tsx:135` — widget **diverso** (`datetime-local`, non `date`) con un helper **diverso e più complesso** (`aDatetimeLocal`, gestisce anche ore/minuti) — necessario perché l'Appuntamento è l'unico tipo che richiede anche l'orario, non una mancata uniformazione.

In sintesi: il pattern "data pura" di Chiusura è già coerente ovunque serva solo una data (Chiusura, Noleggio, apertura Lavoro) — la sola vera duplicazione di codice (non di semplice pattern) è `aDateLocal()` copiata identica in `satellite-chiusura.tsx` e `satellite-noleggio.tsx`, mai estratta in un modulo condiviso.

---

## 7) `inputClass()` — portata della duplicazione

**19 file** definiscono una propria funzione locale `inputClass()` (mai importata da un modulo condiviso — verificato: nessun `import` di `inputClass` in tutto il repo, ogni file la ridichiara da zero):

| File:riga | Firma | Corpo |
|---|---|---|
| `components/satellite-appuntamento.tsx:10` | `()` | stringa base (bordo grigio fisso) |
| `components/satellite-campione.tsx:15` | `()` | stringa base, identica |
| `components/satellite-chiusura.tsx:9` | `()` | stringa base, identica |
| `components/satellite-costruzione.tsx:14` | `()` | stringa base, identica |
| `components/satellite-noleggio.tsx:11` | `()` | stringa base, identica |
| `components/satellite-nuovo-ordine.tsx:9` | `()` | stringa base, identica |
| `components/satellite-ordine.tsx:14` | `()` | stringa base, identica |
| `components/satellite-preventivo.tsx:10` | `()` | stringa base, identica |
| `components/lavoro-form.tsx:20` | `()` | stringa base, identica |
| `components/fornitore-sede-form.tsx:28` | `()` | stringa base, identica |
| `components/combobox.tsx:7` | `()` | stringa base, identica (uso interno per il proprio `<input type="search">`) |
| `components/profilo-obiettivi-form.tsx:7` | `()` | stringa base, identica |
| `components/profilo-smtp-form.tsx:9` | `()` | stringa base, identica |
| `components/fornitore-sede-contatto-form.tsx:9` | `()` | **variante**: `px-2.5 py-1.5` invece di `px-3 py-2` (padding più compresso, contesto: form annidato in una card più piccola) |
| `components/cliente-form.tsx:17` | `(hasError: boolean)` | **variante**: bordo/focus condizionale rosso su errore |
| `components/fornitore-form.tsx:10` | `(hasError: boolean)` | stessa variante `hasError`, identica a Cliente |
| `components/nuovo-lavoro-standalone-form.tsx:9` | `(hasError = false)` | stessa variante `hasError` (parametro con default invece di obbligatorio, unica differenza di firma) |
| `app/(auth)/invito/[token]/invito-form.tsx:53` | `(hasError: boolean)` | stessa variante `hasError`, identica |
| `app/(auth)/registrazione/registrazione-form.tsx:37` | `(hasError: boolean)` | stessa variante `hasError`, identica |

Più `inputClassFisso()` in `components/satellite-chiusura.tsx:21` — variante locale volutamente senza `w-full`, per i campi a larghezza fissa della riga acconto (vedi commento nel file: combinare `w-full` con una larghezza fissa nella stessa classe è risultato inaffidabile per la specificità CSS generata da Tailwind).

**Riepilogo**: 19 dichiarazioni di `inputClass()` (+1 variante `Fisso`) in altrettanti file, che si riducono in realtà a **2 corpi distinti**:
1. Stringa fissa senza gestione errore (13 file: tutti i satelliti + `lavoro-form.tsx` + `fornitore-sede-form.tsx` + `combobox.tsx` + `profilo-obiettivi-form.tsx` + `profilo-smtp-form.tsx`).
2. Stringa con parametro `hasError` per il bordo rosso condizionale (5 file: `cliente-form.tsx`, `fornitore-form.tsx`, `nuovo-lavoro-standalone-form.tsx`, `invito-form.tsx`, `registrazione-form.tsx` — tutti identici tranne la sintassi del parametro).

Più l'unica vera eccezione di padding (`fornitore-sede-contatto-form.tsx`). Centralizzare converrebbe in un unico modulo con due varianti esportate (es. `inputClass()`/`inputClass({ hasError })`), toccando 19 file per la sola rimozione della dichiarazione locale (l'uso via `className={inputClass()}` nel JSX resterebbe invariato in ognuno).

---

## Riepilogo incoerenze da decidere prima di intervenire

1. Due convenzioni di dimensione per le label dei form (`text-xs` vs `text-sm`), senza criterio — quale adottare come standard?
2. Bottone "Salva" a due dimensioni (`text-xs`/`text-sm`) e due stili (pieno/outline) sparsi tra i satelliti, senza un pattern di posizione (fondo/metà/inizio del form).
3. Solo Appuntamento ha il semaforo nell'header del Modal; gli altri 7 satelliti duplicano nome+pallino nel corpo — restyling già "in coda" secondo CLAUDE.md.
4. 3 satelliti (Costruzione, Noleggio, Chiusura) non hanno alcuna sezione allegati — assente per non essere mai stata aggiunta, non per scelta di design.
5. 2 satelliti (Preventivo, Campionatura) mostrano il nome file grezzo come "etichetta" per mancata migrazione alla modale con etichetta.
6. Titolo/descrizione del Lavoro nella card Dashboard mobile eredita il font-size di default (16px) invece di `text-sm` (14px) come nella tabella desktop — probabile omissione, non intenzionale.
7. Nessuna gestione di "modifiche non salvate" da nessuna parte — se il restyling introduce un pattern di dirty-state, sarà una funzionalità nuova, non un riuso.
8. `inputClass()` duplicata in **19 file** (non ~10 come stimato nella prima passata): si riduce a soli 2 corpi distinti + 1 eccezione di padding — centralizzare è un intervento meccanico e a basso rischio prima di toccare lo stile.
9. `aDateLocal()` (helper di conversione data ISO→`YYYY-MM-DD`) duplicata identica in `satellite-chiusura.tsx` e `satellite-noleggio.tsx` — stesso tipo di duplicazione di `inputClass()`, portata minore ma stesso principio.
10. Gli input di data/ora sono già ragionevolmente coerenti (solo controlli nativi, nessuna libreria): l'unica vera differenza è Appuntamento (`datetime-local`, serve l'ora) contro tutti gli altri (`date`, solo giorno) — differenza dovuta al dominio, non un'incoerenza da correggere.
