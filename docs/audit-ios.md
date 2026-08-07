# Audit iOS Safari/WebKit — Modal di test, login, componenti condivisi (2026-08-07)

Solo discovery, nessuna modifica applicata. Riferimenti a file:riga dello stato attuale di `main` (commit `f64bdb0`).

**Contesto**: nato dalla catena di bug reali trovati testando su iPhone (bottone Salva che copre il testo, Data/Ora sovrapposti nella Modal di test, zoom automatico su tutta l'app innescato dal form di login) — invece di continuare a inseguirli uno alla volta, questo è un giro sistematico sui 7 punti classici indicati, più due trovati per strada non nella lista originale.

---

## 1) Font-size sotto 16px su input/select/textarea

**La causa sistemica è una sola**: `lib/input-class.ts:24,32` — `inputClass()`/`inputClassFisso()` usano `text-sm` (14px). Sono importate da **~20 file** (praticamente tutti i satelliti reali, Cliente, Fornitore, Profilo Obiettivi/SMTP, Lavoro, Combobox, invito/registrazione) — quindi la stragrande maggioranza dei campi testo di tutta l'app è già a 14px, sotto la soglia che innesca lo zoom automatico di Safari al focus. Sistemare questi due punti risolverebbe la maggioranza dei casi in un colpo solo (stesso principio già usato per la centralizzazione Sprint UI-1).

**Non centralizzati — file con classe letterale identica a `inputClass()`, sfuggiti alla centralizzazione del 5/8 (probabilmente perché non esistevano ancora o non sono form "satellite")**:

| File:riga | Campo | Note |
|---|---|---|
| `app/(auth)/login/page.tsx:79,100` | Email, Password | **Prima pagina toccata da ogni utente** — causa confermata dall'utente dello zoom su Dashboard post-login |
| `app/(auth)/password-dimenticata/page.tsx:75` | Email | |
| `app/(auth)/reimposta-password/page.tsx:133,151` | Password, Conferma password | |
| `app/(app)/clienti/page.tsx:40` | Ricerca cliente | |
| `app/(app)/fornitori/page.tsx:35` | Ricerca fornitore | |
| `components/allegato-modale.tsx:83` | Etichetta allegato | |
| `components/profilo-categorie-acquisto-form.tsx:57` | Nuova categoria | |
| `components/fornitore-sede-contatto-form.tsx:10` | Nome/Cognome/Cellulare/Email contatto | `inputClass()` **locale** al file (padding diverso, eccezione già documentata in `lib/input-class.ts`) — stesso font-size letterale, va corretta separatamente |
| `components/satellite-ordine.tsx:342` | Select destinatario email ordine | Unico `<select>` fuori dalla centralizzazione — il resto dei campi di questo stesso file usa già `inputClass()` |

**Non a rischio (verificato, non serve toccarli)**: tutte le `<input type="checkbox">` del progetto (Appuntamento/Progetto/Campionatura/Chiusura/Acquisto/Noleggio/Preventivo — 8 occorrenze, checkbox non è focusabile in modo da innescare lo zoom); l'email disabilitata in `invito-form.tsx:212` (`disabled`, non riceve mai focus).

**`components/test/modal-test.tsx`**: già corretto per Data/Ora (commit `f64bdb0`, oggetto della sessione precedente) e per il textarea (`TESTO_FONT_SIZE=16`, decisione di design dell'8/7 indipendente dal bug zoom, stesso valore per coincidenza). Da notare per quando si applica il fix al punto 1 sopra: se `inputClassFisso()` diventa 16px di default, l'override esplicito `DATA_ORA_FONT_SIZE` in questo file resta corretto ma **ridondante** — da ripulire nello stesso giro per non lasciare due fonti dello stesso valore.

**Valutazione**: causa **confermata** dello zoom su Dashboard post-login (login non passa da `inputClass()`). Causa **probabile** di eventuali segnalazioni analoghe non ancora arrivate da Clienti/Fornitori/Profilo/qualunque satellite — non ancora testate dal vivo su iPhone, ma stesso identico meccanismo.

---

## 2) `position: fixed`/`absolute` in Modal/SalvaFlottante/dialoghi

| Componente | Uso | Note |
|---|---|---|
| `components/modal.tsx:121-122` (produzione, tutti gli 8 satelliti reali) | `fixed inset-0` per overlay+backdrop | Pattern standard, nessuna gestione tastiera/keyboard-aware — **vedi finding sotto** |
| `components/dialog-conferma.tsx:37-38` | `fixed inset-0` per overlay+backdrop | Stesso pattern, rischio minore (contenuto tipicamente solo bottoni, non campi testo lunghi) |
| `components/salva-flottante.tsx:73` (**condiviso, ma variante `pillola` mai usata da nessun chiamante reale — vedi finding sotto**) | `fixed bottom-[50px] left-1/2` | |
| `components/test/modal-test.tsx:263,517` | Box Modal `fixed` (mobile)/`relative` (desktop) + bottone Salva `absolute` ancorato al box | Unico punto con gestione tastiera (`useTastieraBox`) |
| `components/app-nav.tsx:252,258` | Overlay+pannello menu mobile `fixed` | Nessun campo testo dentro, rischio tastiera non applicabile |

### Finding A (il più rilevante di questo punto): la gestione tastiera esiste SOLO in `modal-test.tsx`, MAI propagata

`components/modal.tsx` (usato da tutti gli 8 satelliti reali in produzione) **non ha alcuna gestione di `window.visualViewport`**, nessun riposizionamento del box quando la tastiera si apre — è esattamente lo stato "pre-fix" (prima del passo 6/9 della Modal di test) applicato a tutta l'app reale. La barra `SalvaFlottante` in produzione (`variante="barra"`, `sticky bottom-0`, non `fixed`) è strutturalmente diversa dal bottone pillola e meno esposta allo stesso bug esatto, ma **non è stata verificata su iPhone reale** in questa forma — non si può escludere che, con una Modal alta e la tastiera aperta, la barra finisca comunque sotto la tastiera (il box della Modal in produzione non si restringe mai per lasciarle spazio, essendo dimensionato solo in `vh`, vedi punto 7).

### Finding B: `SalvaFlottante` ha una `variante="pillola"` (`salva-flottante.tsx:64-78`) mai agganciata a nessun consumer reale, con il comportamento "vecchio" (pre-fix) congelato dentro

Grep su tutto `app`+`components`: nessun chiamante passa `variante="pillola"` — è codice morto/prematuro (il commento del file stesso lo definisce "stile in esplorazione, non ancora adottato altrove"). È `fixed bottom-[50px]`, **senza** l'ancoraggio al box né `useTastieraBox` — cioè ha esattamente il bug che è stato trovato e corretto nel passo 8/9 della Modal di test, non quello corretto. **Rischio concreto**: se in un prossimo sprint si collega questa variante a un componente reale copiando l'idea dalla Modal di test senza risincronizzare l'implementazione, si reintroduce da capo il bug già risolto lì.

---

## 3) `window.visualViewport` — resize/scroll/offsetTop

Unico consumer in tutto il progetto: `components/test/modal-test.tsx:84-117` (`useTastieraBox`). **Già corretto secondo i criteri richiesti**: ascolta sia `resize` sia `scroll` di `visualViewport` (righe 106-107, commento esplicito sul perché servono entrambi su iOS), usa `offsetTop` nella formula di `top`/`bottom` (righe 96-97), non solo `height`. Nessun'altra occorrenza nel progetto — conferma diretta del Finding A del punto 2 (zero gestione tastiera fuori dal sandbox).

---

## 4) `overflow-y: auto`/`scroll` con altezza dinamica + auto-resize textarea

Unico consumer del pattern "auto-grow via `scrollHeight`" in tutto il progetto: `components/test/modal-test.tsx:315-320` (`el.style.height = scrollHeight`, dentro il body `overflow-y-auto` di `ModalTestShell`). Tutti i textarea di produzione (`satellite-appuntamento.tsx` rows=8, `satellite-campione.tsx` rows=3×2, `satellite-costruzione.tsx` rows=3, `satellite-noleggio.tsx` rows=3, `nuovo-lavoro-standalone-form.tsx` rows=3, `cliente-form.tsx`) hanno **altezza fissa** (`rows={n}`, scroll interno proprio del textarea, non del contenitore antenato) — il pattern rischioso (il caret che spinge l'ANTENATO a scrollare, non il textarea stesso) oggi esiste solo nella Modal di test.

**Valutazione**: rischio contenuto oggi a `modal-test.tsx` (già oggetto del Problema A in lavorazione). Da rivalutare **se** in futuro un satellite reale adottasse lo stesso pattern auto-grow (non previsto ora).

---

## 5) Flexbox `min-width` — layout affiancati con input/select nativi

Verificato empiricamente (non per assunzione): `.grid-cols-2` compilato da Tailwind v4 in questo progetto è `grid-template-columns:repeat(2,minmax(0,1fr))` — **le griglie CSS (`grid-cols-2`) sono già protette** dal bug (colonne che si restringono sotto il contenuto), a differenza del Flexbox (`flex`+`flex-1`, dove il default è `min-width:auto`, il bug già trovato in Data/Ora).

**Righe grid con più input/select nativi affiancati (già protette, verificate)**: `satellite-noleggio.tsx:129-141` (Data "Da"/"A", due `<input type="date">`), `fornitore-sede-contatto-form.tsx:84-87` (Nome/Cognome/Cellulare/Email).

**Righe flex con input/select nativi affiancati**: tutte già protette con `min-w-0` esplicito, aggiunte nei fix precedenti — `satellite-ordine.tsx:218`, `satellite-nuovo-ordine.tsx:155`, `satellite-chiusura.tsx:150`, `modal-test.tsx` Data/Ora (sessione corrente).

**Unico gap reale trovato**: `components/profilo-categorie-acquisto-form.tsx:52-58` — `<form className="flex gap-2">` con un `<input className="w-full ...">` (nessun `flex-1`/`min-w-0` esplicito) accanto a un `<button className="shrink-0 ...">`. Rischio **basso** rispetto al caso Data/Ora: è un `<input>` di solo testo, la cui larghezza minima intrinseca non varia quanto quella di un `<select>`/`<input type="date">` tra iOS e Android — probabilmente non causa overlap reale, ma è l'unico punto del progetto senza il trattamento `min-w-0 flex-1` ormai standard altrove nello stesso pattern.

---

## 6) `safe-area-inset` (notch/home indicator)

**Nessun uso di `env(safe-area-inset-*)` in tutto il progetto** (grep su `app`+`components`, zero risultati) e **nessun `viewport-fit=cover`** nel meta viewport (confermato anche via `curl` diretto su `districo.it/login` in una verifica precedente — solo `width=device-width, initial-scale=1`).

**Valutazione**: **non è un bug attivo oggi**. Senza `viewport-fit=cover`, Safari non estende il layout sotto l'area del notch/home indicator e `env(safe-area-inset-*)` risolverebbe comunque a `0` anche se venisse aggiunto ora — quindi il bottone Salva pillola (`bottom: 20px` fisso), il pannello menu mobile e i dialoghi non rischiano oggi di finire visivamente sotto l'home indicator. **Rischio latente da tracciare**: se in futuro il progetto adottasse `viewport-fit=cover` (es. per un design edge-to-edge), **tutti** gli elementi `fixed`/`absolute` ancorati al bordo inferiore (bottone Salva pillola, barra `SalvaFlottante` sticky, pannello menu mobile, dialoghi) andrebbero rivisti per aggiungere `env(safe-area-inset-bottom)` — nessuna urgenza ora.

---

## 7) Unità `vh` vs `dvh`

| File:riga | Classe | Contesto |
|---|---|---|
| `components/modal.tsx:134` | `max-h-[92vh]` (**nessun prefisso `sm:` → si applica anche su mobile**), `sm:max-h-[85vh]` | **Produzione, tutti gli 8 satelliti reali** |
| `components/test/modal-test.tsx:263` | `sm:max-h-[80vh]` (**solo desktop**, prefissato `sm:`) | Modal di test |

### Finding C — il più rilevante non nella lista originale, rischio concreto non ancora manifestato

**Su iOS Safari, `vh` viene calcolato contro il viewport "massimo" (barra degli indirizzi collassata), non contro l'area realmente visibile in quel momento** — quando la barra è ancora espansa (es. subito dopo aver aperto la pagina Lavoro senza aver ancora scrollato), l'area visibile reale è più piccola di quanto assume `92vh`. `dvh` (dynamic viewport height, supportato da iOS Safari 15.4+) risolve esattamente questo, ricalcolando in base allo stato reale della UI del browser.

- **`modal-test.tsx` non è esposto nella pratica**: su mobile il box è dimensionato da `inset-5` + l'override JS di `useTastieraBox` (già basato su `visualViewport`, che riflette correttamente l'area visibile reale) — `vh` compare solo nella classe `sm:` (solo desktop, dove il problema del toolbar collassabile non esiste). Rischio basso qui.
- **`components/modal.tsx` (produzione) è invece pienamente esposto**: `max-h-[92vh]` si applica anche su mobile, **senza alcun meccanismo equivalente a `useTastieraBox`** (confermato al punto 2/3) che lo corregga. Se un satellite si apre mentre la barra degli indirizzi è ancora visibile, il box può essere dimensionato più alto dell'area realmente visibile — con l'aggravante che `document.body.style.overflow = 'hidden'` (riga 107 di `modal.tsx`) **blocca lo scroll della pagina sottostante mentre la Modal è aperta**, quindi non ci sarebbe alcun modo per l'utente di raggiungere la parte tagliata (incluso il bottone Salva in fondo, se sticky) finché la barra non collassa da sola.

**Valutazione**: rischio **alto e non ancora testato su iPhone reale** (nessuno dei satelliti reali è mai stato aperto su iOS finora, essendo la propagazione del design ancora da fare) — a differenza degli altri punti di questo audit, questo non è "in attesa di propagazione", è **già live in produzione oggi** su tutti gli 8 satelliti.

---

## Riepilogo — priorità suggerita (da confermare insieme, nessun fix applicato)

| # | Finding | Stato | Urgenza |
|---|---|---|---|
| 1 | Font-size 14px sistemico (`lib/input-class.ts` + 9 file letterali) | Causa **confermata** dello zoom login | **Alta** — causa nota, fix meccanico |
| 7 (Finding C) | `vh` non `dvh` in `modal.tsx` produzione, nessun fallback tastiera | Rischio **non testato**, ma già live su tutti gli 8 satelliti | **Alta** — non "in attesa di propagazione", è già in produzione |
| 2 (Finding A) | Nessuna gestione tastiera nella Modal/SalvaFlottante di produzione | Rischio noto e già tracciato in CLAUDE.md ("prossimo passo") | Media — richiede lo sprint di propagazione già pianificato |
| 2 (Finding B) | `variante="pillola"` morta con comportamento pre-fix | Nessun impatto utente oggi (mai usata) | Bassa — solo da correggere/rimuovere prima che qualcuno la agganci |
| 5 | `profilo-categorie-acquisto-form.tsx` senza `min-w-0` | Rischio basso, incoerenza di pattern | Bassa |
| 4, 6 | Auto-grow textarea, safe-area-inset | Nessun rischio attivo oggi | Nessuna azione ora |
