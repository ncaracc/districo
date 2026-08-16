'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { aggiornaAnagraficaArtigiano } from '@/lib/profilo/actions'
import { CampiIndirizzo } from '@/components/campi-indirizzo'
import { PasswordInput } from '@/components/password-input'
import { PAESI, PAESE_DEFAULT, trovaPaese } from '@/lib/paesi'
import { inputClass } from '@/lib/input-class'

const ALTRO = '__altro__'

type Fields = {
  nome: string
  cognome: string
  ragioneSociale: string
  partitaIva: string
  codiceFiscale: string
  codiceSdi: string
  pec: string
  specializzazione: string
  prefissoTelefono: string
  numeroTelefono: string
  via: string
  civico: string
  cap: string
  localita: string
  provincia: string
  paese: string
}

// Divide il telefono salvato ("+39 3482316562") in prefisso+numero per
// riusare lo stesso controllo a due campi già in uso in registrazione
// (registrazione-form.tsx) — split sul primo spazio, coerente con come
// viene ricomposto al salvataggio (`${prefisso} ${numero}`.trim()) sia qui
// sia lì.
function dividiTelefono(telefono: string): { prefisso: string; numero: string } {
  const spazio = telefono.indexOf(' ')
  if (spazio === -1) return { prefisso: trovaPaese(PAESE_DEFAULT)?.prefisso ?? '+39', numero: telefono }
  return { prefisso: telefono.slice(0, spazio), numero: telefono.slice(spazio + 1) }
}

export function ProfiloAnagraficaForm({
  initialValues,
  specializzazioni,
  emailAttuale,
}: {
  initialValues: {
    nome: string
    cognome: string
    ragioneSociale: string | null
    partitaIva: string | null
    codiceFiscale: string | null
    codiceSdi: string | null
    pec: string | null
    specializzazione: string
    telefono: string
    via: string | null
    civico: string | null
    cap: string | null
    localita: string | null
    provincia: string | null
    paese: string
  }
  specializzazioni: string[]
  emailAttuale: string
}) {
  const router = useRouter()
  const telefonoIniziale = dividiTelefono(initialValues.telefono)
  const specializzazioneNota = specializzazioni.includes(initialValues.specializzazione)

  const [fields, setFields] = useState<Fields>({
    nome: initialValues.nome,
    cognome: initialValues.cognome,
    ragioneSociale: initialValues.ragioneSociale ?? '',
    partitaIva: initialValues.partitaIva ?? '',
    codiceFiscale: initialValues.codiceFiscale ?? '',
    codiceSdi: initialValues.codiceSdi ?? '',
    pec: initialValues.pec ?? '',
    specializzazione: specializzazioneNota ? initialValues.specializzazione : ALTRO,
    prefissoTelefono: telefonoIniziale.prefisso,
    numeroTelefono: telefonoIniziale.numero,
    via: initialValues.via ?? '',
    civico: initialValues.civico ?? '',
    cap: initialValues.cap ?? '',
    localita: initialValues.localita ?? '',
    provincia: initialValues.provincia ?? '',
    paese: initialValues.paese,
  })
  // Specializzazione custom (ramo "Altro..."): testo libero separato, come
  // in registrazione — precompilato col valore attuale solo se non è già
  // una delle voci ufficiali/note elencate.
  const [specializzazioneAltro, setSpecializzazioneAltro] = useState(specializzazioneNota ? '' : initialValues.specializzazione)
  const [prefissoManuale, setPrefissoManuale] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  function handleIndirizzoChange(campo: 'indirizzo' | 'civico' | 'cap' | 'citta' | 'siglaProvincia' | 'nazione', valore: string) {
    // Mappa i nomi generici di CampiIndirizzo (condivisi con Lavoro/Sede
    // Fornitore) sulle colonne reali di `artigiano`, che hanno nomi propri
    // (via/localita/provincia/paese invece di indirizzo/citta/sigla-
    // provincia/nazione) — stesso componente, nessuna duplicazione della
    // griglia/dell'ordine dei campi (Città → Provincia → Nazione, vedi
    // CLAUDE.md 2026-08-13).
    if (campo === 'nazione') {
      // Cambiare Paese aggiorna anche il prefisso telefonico proposto,
      // stesso comportamento di registrazione-form.tsx — solo se l'utente
      // non ha già scelto un prefisso diverso a mano.
      const info = trovaPaese(valore)
      setFields((f) => ({
        ...f,
        paese: valore,
        prefissoTelefono: !prefissoManuale && info?.prefisso ? info.prefisso : f.prefissoTelefono,
      }))
      return
    }
    const mappa = { indirizzo: 'via', civico: 'civico', cap: 'cap', citta: 'localita', siglaProvincia: 'provincia' } as const
    setFields((f) => ({ ...f, [mappa[campo]]: valore }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    // Stessa regex di CambioEmail: la PEC è a tutti gli effetti un
    // indirizzo email, validata solo se compilata (opzionale, nessun
    // vincolo incrociato col Codice SDI — vedi CLAUDE.md).
    if (fields.pec.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.pec.trim())) {
      setLoading(false)
      setErrore('Inserisci un indirizzo PEC valido')
      return
    }

    const specializzazione = fields.specializzazione === ALTRO ? specializzazioneAltro : fields.specializzazione
    const telefono = `${fields.prefissoTelefono} ${fields.numeroTelefono}`.trim()

    const result = await aggiornaAnagraficaArtigiano({
      nome: fields.nome,
      cognome: fields.cognome,
      ragioneSociale: fields.ragioneSociale || null,
      partitaIva: fields.partitaIva || null,
      codiceFiscale: fields.codiceFiscale || null,
      codiceSdi: fields.codiceSdi || null,
      pec: fields.pec || null,
      specializzazione,
      telefono,
      via: fields.via || null,
      civico: fields.civico || null,
      cap: fields.cap || null,
      localita: fields.localita || null,
      provincia: fields.provincia || null,
      paese: fields.paese,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setSalvato(true)
    router.refresh()
  }

  return (
    <div className="space-y-10">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}
        {salvato && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Dati salvati.</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="anagrafica-nome" className="mb-1 block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <input id="anagrafica-nome" value={fields.nome} onChange={set('nome')} className={inputClass()} />
          </div>
          <div>
            <label htmlFor="anagrafica-cognome" className="mb-1 block text-sm font-medium text-gray-700">
              Cognome <span className="text-red-500">*</span>
            </label>
            <input id="anagrafica-cognome" value={fields.cognome} onChange={set('cognome')} className={inputClass()} />
          </div>
        </div>

        <div>
          <label htmlFor="anagrafica-specializzazione" className="mb-1 block text-sm font-medium text-gray-700">
            Specializzazione <span className="text-red-500">*</span>
          </label>
          <select
            id="anagrafica-specializzazione"
            value={fields.specializzazione}
            onChange={set('specializzazione')}
            className={inputClass()}
          >
            {specializzazioni.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value={ALTRO}>Altro...</option>
          </select>
        </div>

        {fields.specializzazione === ALTRO && (
          <div>
            <label htmlFor="anagrafica-specializzazione-altro" className="mb-1 block text-sm font-medium text-gray-700">
              Specifica la tua specializzazione <span className="text-red-500">*</span>
            </label>
            <input
              id="anagrafica-specializzazione-altro"
              value={specializzazioneAltro}
              onChange={(e) => setSpecializzazioneAltro(e.target.value)}
              className={inputClass()}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="anagrafica-prefisso" className="mb-1 block text-sm font-medium text-gray-700">
              Prefisso
            </label>
            <select
              id="anagrafica-prefisso"
              value={fields.prefissoTelefono}
              onChange={(e) => {
                setPrefissoManuale(true)
                setFields((f) => ({ ...f, prefissoTelefono: e.target.value }))
              }}
              className={inputClass()}
            >
              {PAESI.map((p) => (
                <option key={p.iso2} value={p.prefisso}>
                  {p.prefisso} — {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="anagrafica-telefono" className="mb-1 block text-sm font-medium text-gray-700">
              Telefono <span className="text-red-500">*</span>
            </label>
            <input id="anagrafica-telefono" type="tel" value={fields.numeroTelefono} onChange={set('numeroTelefono')} className={inputClass()} />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-5">
          <p className="mb-3 text-sm font-medium text-gray-700">Dati fiscali</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="anagrafica-ragione-sociale" className="mb-1 block text-sm font-medium text-gray-700">
                Ragione sociale
              </label>
              <input id="anagrafica-ragione-sociale" value={fields.ragioneSociale} onChange={set('ragioneSociale')} className={inputClass()} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="anagrafica-partita-iva" className="mb-1 block text-sm font-medium text-gray-700">
                  Partita IVA
                </label>
                <input id="anagrafica-partita-iva" value={fields.partitaIva} onChange={set('partitaIva')} className={inputClass()} />
              </div>
              <div>
                <label htmlFor="anagrafica-codice-fiscale" className="mb-1 block text-sm font-medium text-gray-700">
                  Codice fiscale {fields.partitaIva.trim() && <span className="text-red-500">*</span>}
                </label>
                <input id="anagrafica-codice-fiscale" value={fields.codiceFiscale} onChange={set('codiceFiscale')} className={inputClass()} />
              </div>
            </div>
            {fields.partitaIva.trim() && !fields.codiceFiscale.trim() && (
              <p className="text-xs text-gray-500">Il codice fiscale è obbligatorio se inserisci la partita IVA.</p>
            )}
            {/* Codice SDI/PEC (2026-08-19): campi di preparazione per la
                futura fatturazione elettronica, entrambi opzionali e senza
                alcun vincolo incrociato tra loro o con partita IVA/codice
                fiscale — vedi CLAUDE.md, "la vera regola di obbligatorietà
                verrà decisa con l'integrazione Stripe/fatturazione". */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="anagrafica-codice-sdi" className="mb-1 block text-sm font-medium text-gray-700">
                  Codice Destinatario SDI
                </label>
                <input
                  id="anagrafica-codice-sdi"
                  value={fields.codiceSdi}
                  onChange={set('codiceSdi')}
                  placeholder="7 caratteri"
                  className={inputClass()}
                />
              </div>
              <div>
                <label htmlFor="anagrafica-pec" className="mb-1 block text-sm font-medium text-gray-700">
                  PEC
                </label>
                <input
                  id="anagrafica-pec"
                  type="email"
                  value={fields.pec}
                  onChange={set('pec')}
                  placeholder="nome@pec.it"
                  className={inputClass()}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-5">
          <p className="mb-3 text-sm font-medium text-gray-700">Indirizzo</p>
          <CampiIndirizzo
            idPrefix="anagrafica"
            values={{
              indirizzo: fields.via,
              civico: fields.civico,
              cap: fields.cap,
              citta: fields.localita,
              siglaProvincia: fields.provincia,
              nazione: fields.paese,
            }}
            onChange={handleIndirizzoChange}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvataggio in corso…' : 'Salva dati anagrafici'}
        </button>
      </form>

      <div className="border-t border-gray-200 pt-8">
        <CambioEmail emailAttuale={emailAttuale} />
      </div>

      <div className="border-t border-gray-200 pt-8">
        <CambioPassword emailAttuale={emailAttuale} />
      </div>
    </div>
  )
}

// Email — flusso separato (2026-08-19, vedi CLAUDE.md): NON un update
// diretto della colonna, passa da `supabase.auth.updateUser({ email })`
// (client Supabase standard lato browser, non un Server Action — l'API di
// cambio email di Supabase Auth vive sul client) per innescare il flusso
// di conferma nativo — un trigger DB aggiorna poi artigiano.email da solo,
// a conferma avvenuta (vedi migration 0055). Nessun salvataggio immediato
// da mostrare come "riuscito": l'unico esito immediato possibile è
// "richiesta inviata", il cambio vero avviene solo dopo aver cliccato il
// link di conferma ricevuto via email.
function CambioEmail({ emailAttuale }: { emailAttuale: string }) {
  const [nuovaEmail, setNuovaEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [inviata, setInviata] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    setInviata(false)

    if (!nuovaEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuovaEmail)) {
      setLoading(false)
      setErrore('Inserisci un indirizzo email valido')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ email: nuovaEmail.trim() })

    setLoading(false)
    if (error) {
      setErrore(error.message === 'User already registered' ? 'Esiste già un account con questa email' : 'Errore, riprova')
      return
    }
    setInviata(true)
    setNuovaEmail('')
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">Email di accesso</p>
        <p className="text-sm text-gray-500">{emailAttuale}</p>
      </div>
      <div>
        <label htmlFor="anagrafica-nuova-email" className="mb-1 block text-sm font-medium text-gray-700">
          Nuova email
        </label>
        <input
          id="anagrafica-nuova-email"
          type="email"
          value={nuovaEmail}
          onChange={(e) => setNuovaEmail(e.target.value)}
          placeholder="nuovo@indirizzo.it"
          className={inputClass()}
        />
        <p className="mt-1 text-xs text-gray-500">
          Riceverai un&apos;email di conferma sia al vecchio sia al nuovo indirizzo: il cambio diventa effettivo solo
          dopo aver confermato entrambi.
        </p>
      </div>
      {errore && <p className="text-xs text-red-600">{errore}</p>}
      {inviata && <p className="text-xs text-gray-700">Email di conferma inviata, controlla la posta.</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? 'Invio in corso…' : 'Cambia email'}
      </button>
    </form>
  )
}

// Password (2026-08-19, vedi CLAUDE.md — "Codice SDI/PEC + cambio
// password"): a differenza del cambio email, qui l'esito è immediato (nessuna
// conferma via link) ma richiede comunque due chiamate Auth in sequenza —
// vedi il commento in lib/profilo/actions.ts per il perché non è una singola
// updateUser() diretta: signInWithPassword() verifica prima la password
// attuale (nessuna fiducia nella sola sessione già autenticata, richiesto
// esplicitamente), solo se riesce si procede con updateUser({ password }).
// Stessa soglia minima già in uso in registrazione/reimposta-password (8
// caratteri, coerente con minimum_password_length=6 di config.toml — il
// vincolo applicativo è più severo di quello DB, non il contrario).
function CambioPassword({ emailAttuale }: { emailAttuale: string }) {
  const [passwordAttuale, setPasswordAttuale] = useState('')
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [confermaPassword, setConfermaPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvata, setSalvata] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    setSalvata(false)

    if (!passwordAttuale) {
      setLoading(false)
      setErrore('Inserisci la password attuale')
      return
    }
    if (nuovaPassword.length < 8) {
      setLoading(false)
      setErrore('La nuova password deve avere almeno 8 caratteri')
      return
    }
    if (nuovaPassword !== confermaPassword) {
      setLoading(false)
      setErrore('Le nuove password non coincidono')
      return
    }

    const supabase = createClient()

    // Verifica identità: la sola sessione già autenticata non basta (richiesto
    // esplicitamente) — un login riuscito con la password dichiarata "attuale"
    // è la conferma nativa che serve, nessuna gestione custom.
    const { error: verificaError } = await supabase.auth.signInWithPassword({
      email: emailAttuale,
      password: passwordAttuale,
    })
    if (verificaError) {
      setLoading(false)
      setErrore('Password attuale errata')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })

    setLoading(false)
    if (error) {
      setErrore('Errore durante l\'aggiornamento, riprova')
      return
    }
    setSalvata(true)
    setPasswordAttuale('')
    setNuovaPassword('')
    setConfermaPassword('')
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <p className="mb-1 text-sm font-medium text-gray-700">Password</p>

      <div>
        <label htmlFor="password-attuale" className="mb-1 block text-sm font-medium text-gray-700">
          Password attuale
        </label>
        <PasswordInput
          id="password-attuale"
          autoComplete="current-password"
          value={passwordAttuale}
          onChange={(e) => setPasswordAttuale(e.target.value)}
          className={inputClass()}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="password-nuova" className="mb-1 block text-sm font-medium text-gray-700">
            Nuova password
          </label>
          <PasswordInput
            id="password-nuova"
            autoComplete="new-password"
            value={nuovaPassword}
            onChange={(e) => setNuovaPassword(e.target.value)}
            className={inputClass()}
          />
        </div>
        <div>
          <label htmlFor="password-conferma" className="mb-1 block text-sm font-medium text-gray-700">
            Conferma nuova password
          </label>
          <PasswordInput
            id="password-conferma"
            autoComplete="new-password"
            value={confermaPassword}
            onChange={(e) => setConfermaPassword(e.target.value)}
            className={inputClass()}
          />
        </div>
      </div>
      {errore && <p className="text-xs text-red-600">{errore}</p>}
      {salvata && <p className="text-xs text-gray-700">Password aggiornata.</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? 'Aggiornamento…' : 'Cambia password'}
      </button>
    </form>
  )
}
