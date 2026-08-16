'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { cifraPassword, decifraPassword } from '@/lib/crypto/credenziali-smtp'
import { sendEmailPersonale, traduciErroreSmtp } from '@/lib/email/send-email-personale'

type AzioneResult = { ok: true } | { ok: false; error: string }
type TestSmtpResult = { ok: true; email: string } | { ok: false; error: string }

// Obiettivi (4 campi "giorni") RIMOSSI il 2026-08-19 (vedi CLAUDE.md —
// "Inventario Impostazioni" + questa sessione): confermati inerti,
// nessuna query in tutto il codice li leggeva più dal 3/8, colonne
// droppate dalla migration 0055 dopo aver verificato che tutti gli
// artigiani reali avessero ancora esattamente i valori di default (nessun
// dato personalizzato perso). `kpi_finestra_mesi` — l'unico campo del
// vecchio gruppo "Obiettivi" ancora effettivamente usato (Tempo medio
// preventivo/completamento, kpi_dashboard()) — SOPRAVVIVE, spostato in una
// nuova sotto-sezione "Statistiche" a sé, non più bundlato con i 4 campi
// morti.
type StatisticheFields = {
  kpiFinestraMesi: number
}

export async function aggiornaStatistiche(fields: StatisticheFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { error } = await supabase
    .from('artigiano')
    .update({ kpi_finestra_mesi: fields.kpiFinestraMesi })
    .eq('id', user.id)

  if (error) {
    console.error('aggiornaStatistiche: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  revalidatePath('/lavori')
  return { ok: true }
}

// Tariffe orarie manodopera (2026-08-19, vedi CLAUDE.md — tariffe orarie e
// costo manodopera): due preferenze personali dell'artigiano, stesso
// pattern di aggiornaObiettiviKpi sopra. A differenza degli Obiettivi
// (senza più alcun effetto sui KPI attuali), queste alimentano un calcolo
// reale — il costo manodopera di Costruzione/Montaggio e il Margine di
// Chiusura Lavoro (vedi lib/lavori/dettaglio-lavoro-data.ts) — quindi
// `revalidatePath('/lavori')` non basta da sola: ogni pagina Lavoro già
// visitata mostra il valore aggiornato solo al prossimo caricamento (Server
// Component, nessuna sottoscrizione live) — comportamento accettato, stesso
// principio di ogni altra preferenza server-side in questo progetto.
type TariffeOrarieFields = {
  tariffaCostruzione: number
  tariffaMontaggio: number
}

export async function aggiornaTariffeOrarie(fields: TariffeOrarieFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  if (fields.tariffaCostruzione < 0 || fields.tariffaMontaggio < 0) {
    return { ok: false, error: 'Le tariffe orarie non possono essere negative' }
  }

  const { error } = await supabase
    .from('artigiano')
    .update({
      tariffa_oraria_costruzione: fields.tariffaCostruzione,
      tariffa_oraria_montaggio: fields.tariffaMontaggio,
    })
    .eq('id', user.id)

  if (error) {
    console.error('aggiornaTariffeOrarie: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  revalidatePath('/lavori')
  return { ok: true }
}

// Testo mail ordine — Apertura/Congedo personalizzabili PER TONO
// (2026-08-19, vedi CLAUDE.md — CORREGGE il design del 17/8, una singola
// coppia): il tono si sceglie ora al momento dell'invio (vedi
// components/satellite-ordine.tsx/lib/lavori/ordini-email.ts), perché
// dipende dal fornitore a cui si scrive, non è una preferenza fissa
// dell'artigiano — servono quindi due coppie indipendenti, entrambe
// opzionali (null = usa il default applicativo di quel tono). Stringa
// vuota (o di soli spazi) trattata come "non impostato" (null), stesso
// principio già in uso per gli altri campi opzionali dei form di questo
// file (es. coloreFinitura in referenze.ts). Il valore SALVATO quando non
// è vuoto resta però quello originale, non `.trim()`-ato: i default
// (DEFAULT_APERTURA_*/CONGEDO_*, lib/lavori/mail-ordine-testo.ts)
// terminano deliberatamente con un `\n` (riga vuota prima dell'elenco
// referenze) — un `.trim()` incondizionato lo avrebbe silenziosamente
// perso ad ogni salvataggio, bug riprodotto e corretto nella sessione del
// 17/8, stessa cautela mantenuta qui.
type TestoMailFields = {
  aperturaFormale: string
  congedoFormale: string
  aperturaInformale: string
  congedoInformale: string
}

export async function aggiornaTestoMail(fields: TestoMailFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { error } = await supabase
    .from('artigiano')
    .update({
      mail_ordine_apertura_formale: fields.aperturaFormale.trim() ? fields.aperturaFormale : null,
      mail_ordine_congedo_formale: fields.congedoFormale.trim() ? fields.congedoFormale : null,
      mail_ordine_apertura_informale: fields.aperturaInformale.trim() ? fields.aperturaInformale : null,
      mail_ordine_congedo_informale: fields.congedoInformale.trim() ? fields.congedoInformale : null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('aggiornaTestoMail: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}

type CredenzialiSmtpFields = {
  host: string
  porta: number
  username: string
  password: string // vuota = non modificare quella già salvata
  sicurezza: 'ssl' | 'starttls' | 'nessuna'
}

export async function aggiornaCredenzialiSmtp(fields: CredenzialiSmtpFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const update: {
    smtp_host: string | null
    smtp_porta: number | null
    smtp_username: string | null
    smtp_sicurezza: 'ssl' | 'starttls' | 'nessuna'
    smtp_password_cifrata?: string
  } = {
    smtp_host: fields.host.trim() || null,
    smtp_porta: fields.porta || null,
    smtp_username: fields.username.trim() || null,
    smtp_sicurezza: fields.sicurezza,
  }

  // La password non viene mai rimandata al client (vedi ProfiloSmtpForm): un campo
  // vuoto in submit significa "non modificarla", non "cancellala".
  if (fields.password.trim()) {
    update.smtp_password_cifrata = cifraPassword(fields.password.trim())
  }

  const { error } = await supabase.from('artigiano').update(update).eq('id', user.id)

  if (error) {
    console.error('aggiornaCredenzialiSmtp: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}

// Testa le credenziali SMTP personali GIÀ SALVATE (non i valori eventualmente
// modificati e non ancora inviati nel form): apre una connessione reale e invia
// un'email di prova all'artigiano stesso (mittente e destinatario coincidono),
// stessa infrastruttura di invio già usata per gli ordini
// (lib/email/send-email-personale.ts) — nessun meccanismo separato.
export async function testaCredenzialiSmtp(): Promise<TestSmtpResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('nome, email, smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza')
    .eq('id', user.id)
    .maybeSingle()

  if (
    !artigiano ||
    !artigiano.smtp_host ||
    !artigiano.smtp_porta ||
    !artigiano.smtp_username ||
    !artigiano.smtp_password_cifrata ||
    !artigiano.smtp_sicurezza
  ) {
    return { ok: false, error: 'Nessuna credenziale SMTP salvata: configurale e salvale prima di testarle.' }
  }

  try {
    await sendEmailPersonale({
      smtp: {
        host: artigiano.smtp_host,
        porta: artigiano.smtp_porta,
        username: artigiano.smtp_username,
        password: decifraPassword(artigiano.smtp_password_cifrata),
        sicurezza: artigiano.smtp_sicurezza,
      },
      mittenteNome: artigiano.nome,
      to: artigiano.email,
      subject: 'Test credenziali SMTP - Districo',
      html: '<p>Questa email conferma che le tue credenziali SMTP personali su Districo funzionano correttamente.</p>',
    })
  } catch (err) {
    console.error('testaCredenzialiSmtp: invio fallito', err)
    return { ok: false, error: traduciErroreSmtp(err) }
  }

  return { ok: true, email: artigiano.email }
}

// =============================================================
// Profilo — dati anagrafici, email, immagine (2026-08-19, vedi CLAUDE.md —
// riorganizzazione Profilo/Impostazioni). Nuova pagina /profilo, distinta
// da /profilo/impostazioni: qui vivono i dati che IDENTIFICANO l'artigiano
// (nome, contatti, indirizzo, dati fiscali), non le sue preferenze
// applicative. Prima di questa sessione nessuno di questi campi (a parte
// nome/cognome/specializzazione/telefono/email/paese, raccolti in
// registrazione) aveva alcuna UI di modifica.
// =============================================================

type AnagraficaFields = {
  nome: string
  cognome: string
  ragioneSociale: string | null
  partitaIva: string | null
  codiceFiscale: string | null
  specializzazione: string
  telefono: string
  via: string | null
  civico: string | null
  cap: string | null
  localita: string | null
  provincia: string | null
  paese: string
}

export async function aggiornaAnagraficaArtigiano(fields: AnagraficaFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  if (!fields.nome.trim() || !fields.cognome.trim()) {
    return { ok: false, error: 'Nome e cognome sono obbligatori' }
  }
  if (!fields.specializzazione.trim()) {
    return { ok: false, error: 'La specializzazione è obbligatoria' }
  }
  if (!fields.telefono.trim()) {
    return { ok: false, error: 'Il telefono è obbligatorio' }
  }
  // Stesso vincolo del CHECK a schema (artigiano_codice_fiscale_se_partita_iva,
  // validato per davvero dalla migration 0055): anticipato qui lato
  // applicativo per un messaggio d'errore leggibile invece del testo grezzo
  // di una violazione di CHECK constraint.
  if (fields.partitaIva?.trim() && !fields.codiceFiscale?.trim()) {
    return { ok: false, error: 'Il codice fiscale è obbligatorio se inserisci la partita IVA' }
  }

  // specializzazione custom ("Altro..."): stesso comportamento del trigger
  // di post-signup (handle_new_artigiano) — la registra come non ufficiale
  // se non esiste già, da promuovere manualmente a voce del menu se
  // ricorrente. Qui esplicito (non un trigger) perché questo è un UPDATE,
  // non un INSERT su auth.users.
  // Stesso `on conflict (valore) do nothing` del trigger SQL di post-signup
  // (handle_new_artigiano) — qui espresso come upsert con ignoreDuplicates,
  // l'equivalente lato client. Un errore qui (improbabile, solo la tabella
  // dei suggerimenti) è solo loggato: non deve mai bloccare il salvataggio
  // dell'anagrafica.
  const { error: specErr } = await supabase
    .from('specializzazione')
    .upsert({ valore: fields.specializzazione.trim(), ufficiale: false }, { onConflict: 'valore', ignoreDuplicates: true })
  if (specErr) console.error('aggiornaAnagraficaArtigiano: upsert specializzazione', specErr)

  const { error } = await supabase
    .from('artigiano')
    .update({
      nome: fields.nome.trim(),
      cognome: fields.cognome.trim(),
      ragione_sociale: fields.ragioneSociale?.trim() || null,
      partita_iva: fields.partitaIva?.trim() || null,
      codice_fiscale: fields.codiceFiscale?.trim() || null,
      specializzazione: fields.specializzazione.trim(),
      telefono: fields.telefono.trim(),
      via: fields.via?.trim() || null,
      civico: fields.civico?.trim() || null,
      cap: fields.cap?.trim() || null,
      localita: fields.localita?.trim() || null,
      provincia: fields.provincia?.trim() || null,
      paese: fields.paese,
    })
    .eq('id', user.id)

  if (error) {
    console.error('aggiornaAnagraficaArtigiano: update fallito', error)
    // Il CHECK a schema (partita_iva/codice_fiscale) resta comunque la
    // guardia autoritativa — la validazione applicativa sopra copre il
    // caso comune, ma un bypass diretto (improbabile da questa UI) finisce
    // comunque qui con un errore generico, non un crash.
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo')
  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}

// Email: NON un update diretto su artigiano.email — cambierebbe il dato
// mostrato/usato come mittente senza toccare l'email di LOGIN
// (auth.users.email), disallineando le due in modo silenzioso e
// pericoloso (l'utente continuerebbe ad accedere con la vecchia email,
// convinto di averla già cambiata). `supabase.auth.updateUser({ email })`
// usa il flusso di conferma nativo di Supabase (double_confirm_changes=true
// in questo progetto, vedi config.toml: un'email di conferma parte sia
// verso il vecchio sia verso il nuovo indirizzo) — artigiano.email si
// aggiorna da solo, in modo autoritativo, solo a conferma avvenuta
// (trigger on_auth_user_email_updated, migration 0055), non da qui.
// Questa action è quindi client-side nel vero senso: va chiamata dal
// browser (supabase.auth.updateUser gira lato client con il client
// standard, non da un Server Action con un client server-side scoped alla
// richiesta) — non esposta qui, vedi components/profilo-anagrafica-form.tsx.

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
const LATO_AVATAR = 512
const QUALITA_AVATAR = 85

// Immagine profilo: upload con crop già fatto lato client (quadrato,
// components/profilo-avatar-upload.tsx) — qui solo una normalizzazione
// server-side difensiva (mai fidarsi ciecamente di un crop fatto nel
// browser): resize forzato a un quadrato fisso 512×512 con `fit: 'cover'`,
// innocuo su un input già quadrato, ma protegge comunque da un client
// modificato che inviasse un'immagine non quadrata. Stesso toolchain
// (sharp) e stessa cartella (UPLOADS_DIR) già in uso per gli allegati
// satellite (lib/lavori/allegati.ts) — file su disco, non Supabase
// Storage, coerente con l'infrastruttura esistente.
export async function caricaImmagineProfilo(formData: FormData): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Nessuna immagine selezionata' }
  }

  const { data: attuale } = await supabase.from('artigiano').select('immagine_profilo').eq('id', user.id).maybeSingle()

  const cartella = path.join(UPLOADS_DIR, 'profili', user.id)
  await fs.mkdir(cartella, { recursive: true })
  const nomeFile = `${randomUUID()}.jpg`
  const percorsoAssoluto = path.join(cartella, nomeFile)

  try {
    const bufferOriginale = Buffer.from(await file.arrayBuffer())
    const buffer = await sharp(bufferOriginale, { animated: false })
      .rotate()
      .resize({ width: LATO_AVATAR, height: LATO_AVATAR, fit: 'cover' })
      .jpeg({ quality: QUALITA_AVATAR })
      .toBuffer()
    await fs.writeFile(percorsoAssoluto, buffer)
  } catch (err) {
    console.error('caricaImmagineProfilo: elaborazione fallita', err)
    return { ok: false, error: "Errore nell'elaborazione dell'immagine, riprova" }
  }

  const storagePath = path.posix.join('profili', user.id, nomeFile)
  const { error } = await supabase.from('artigiano').update({ immagine_profilo: storagePath }).eq('id', user.id)

  if (error) {
    console.error('caricaImmagineProfilo: update fallito', error)
    await fs.unlink(percorsoAssoluto).catch(() => {})
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  // Sostituisce l'immagine precedente (richiesto esplicitamente): rimossa
  // solo DOPO che la nuova è già salvata e collegata con successo — se
  // qualcosa fosse fallito sopra, la vecchia resta comunque valida invece
  // di lasciare l'artigiano senza alcuna immagine.
  if (attuale?.immagine_profilo) {
    await fs.unlink(path.join(UPLOADS_DIR, attuale.immagine_profilo)).catch(() => {})
  }

  revalidatePath('/profilo')
  return { ok: true }
}

export async function rimuoviImmagineProfilo(): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { data: attuale } = await supabase.from('artigiano').select('immagine_profilo').eq('id', user.id).maybeSingle()
  if (!attuale?.immagine_profilo) return { ok: true }

  const { error } = await supabase.from('artigiano').update({ immagine_profilo: null }).eq('id', user.id)
  if (error) {
    console.error('rimuoviImmagineProfilo: update fallito', error)
    return { ok: false, error: "Errore nella rimozione, riprova" }
  }

  await fs.unlink(path.join(UPLOADS_DIR, attuale.immagine_profilo)).catch(() => {})

  revalidatePath('/profilo')
  return { ok: true }
}
