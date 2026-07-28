'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaCredenzialiSmtp, testaCredenzialiSmtp } from '@/lib/profilo/actions'

type Sicurezza = 'ssl' | 'starttls' | 'nessuna'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

type Preset = {
  id: string
  label: string
  host: string
  porta: number
  sicurezza: Sicurezza
  nota?: string
}

// Preset dei provider più comuni in Italia: precompilano host/porta/sicurezza,
// l'utente inserisce solo email e password. Gli host con "tuodominio.it" sono
// template da personalizzare (dominio dell'utente), non un server fisso — vale
// per Register.it (server per-dominio, "authsmtp.<dominio>") e per gli hosting
// generici (vhosting incluso), dove il server dipende dal pannello del
// provider.
const PRESET_SMTP: Preset[] = [
  { id: 'aruba', label: 'Aruba', host: 'smtps.aruba.it', porta: 465, sicurezza: 'ssl' },
  {
    id: 'google',
    label: 'Google Workspace / Gmail',
    host: 'smtp.gmail.com',
    porta: 587,
    sicurezza: 'starttls',
    nota: 'Serve una password per le app, non quella normale del tuo account Google — creala da myaccount.google.com → Sicurezza → Password per le app.',
  },
  {
    id: 'register',
    label: 'Register.it',
    host: 'authsmtp.tuodominio.it',
    porta: 587,
    sicurezza: 'starttls',
    nota: 'Sostituisci "tuodominio.it" nell\'host con il tuo dominio reale. Register.it indica ufficialmente la porta 25 (587 come alternativa se la 25 risulta bloccata) senza specificare il tipo di cifratura: 587/STARTTLS è la scelta più affidabile da qui — verifica con "Testa credenziali" dopo il salvataggio.',
  },
  { id: 'microsoft365', label: 'Microsoft 365 / Outlook', host: 'smtp.office365.com', porta: 587, sicurezza: 'starttls' },
  { id: 'libero', label: 'Libero Mail', host: 'smtp.libero.it', porta: 465, sicurezza: 'ssl' },
  {
    id: 'vhosting',
    label: 'vhosting',
    host: 'mail.tuodominio.it',
    porta: 587,
    sicurezza: 'starttls',
    nota: 'Sostituisci "tuodominio.it" nell\'host con il tuo dominio reale (o usa il server SMTP specifico indicato nel pannello vhosting, se diverso). Se la porta 587 non funziona, prova la porta 25 con sicurezza "Nessuna cifratura".',
  },
  {
    id: 'hosting-generico',
    label: 'Hosting generico (cPanel/Plesk)',
    host: 'mail.tuodominio.it',
    porta: 587,
    sicurezza: 'starttls',
    nota: 'Sostituisci "tuodominio.it" nell\'host con il tuo dominio reale. Convenzione comune a molti hosting italiani (OVH, SiteGround, TopHost, Keliweb, Serverplan...) — verifica comunque il nome host esatto nel pannello del tuo provider.',
  },
]

export function ProfiloSmtpForm({
  initialValues,
  configurata,
}: {
  initialValues: { host: string; porta: string; username: string; sicurezza: Sicurezza }
  configurata: boolean
}) {
  const router = useRouter()
  const [host, setHost] = useState(initialValues.host)
  const [porta, setPorta] = useState(initialValues.porta)
  const [username, setUsername] = useState(initialValues.username)
  const [password, setPassword] = useState('')
  const [sicurezza, setSicurezza] = useState<Sicurezza>(initialValues.sicurezza)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testando, setTestando] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; messaggio: string } | null>(null)
  const [presetId, setPresetId] = useState('')
  const [presetNota, setPresetNota] = useState<string | null>(null)

  function handlePresetChange(id: string) {
    setPresetId(id)
    if (id === '' || id === 'custom') {
      setPresetNota(null)
      return
    }
    const preset = PRESET_SMTP.find((p) => p.id === id)
    if (!preset) return
    setHost(preset.host)
    setPorta(String(preset.porta))
    setSicurezza(preset.sicurezza)
    setPresetNota(preset.nota ?? null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    const result = await aggiornaCredenzialiSmtp({
      host: host.trim(),
      porta: Number(porta) || 0,
      username: username.trim(),
      password,
      sicurezza,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setPassword('')
    setSalvato(true)
    router.refresh()
  }

  async function handleTest() {
    setTestando(true)
    setTestResult(null)
    const result = await testaCredenzialiSmtp()
    setTestando(false)

    setTestResult(
      result.ok
        ? { ok: true, messaggio: `Email di test inviata a ${result.email}, controlla la tua casella.` }
        : { ok: false, messaggio: result.error },
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}
        {salvato && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Credenziali salvate.</p>}

        <p className="text-sm text-gray-500">
          {configurata
            ? 'Le credenziali sono configurate. La password non viene mai mostrata: lasciala vuota per non modificarla.'
            : 'Nessuna credenziale configurata: gli ordini via email non possono ancora essere inviati.'}
        </p>

        <div>
          <label htmlFor="smtp-preset" className="mb-1 block text-sm font-medium text-gray-700">
            Provider (precompila i campi sotto)
          </label>
          <select
            id="smtp-preset"
            value={presetId}
            onChange={(e) => handlePresetChange(e.target.value)}
            className={inputClass()}
          >
            <option value="">Seleziona un provider…</option>
            {PRESET_SMTP.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Altro / personalizza</option>
          </select>
          {presetNota && <p className="mt-1 text-xs text-gray-500">{presetNota}</p>}
        </div>

        <div>
          <label htmlFor="smtp-host" className="mb-1 block text-sm font-medium text-gray-700">
            Host SMTP
          </label>
          <input id="smtp-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" className={inputClass()} />
        </div>

        <div>
          <label htmlFor="smtp-porta" className="mb-1 block text-sm font-medium text-gray-700">
            Porta
          </label>
          <input
            id="smtp-porta"
            type="number"
            value={porta}
            onChange={(e) => setPorta(e.target.value)}
            placeholder="587"
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="smtp-sicurezza" className="mb-1 block text-sm font-medium text-gray-700">
            Sicurezza
          </label>
          <select
            id="smtp-sicurezza"
            value={sicurezza}
            onChange={(e) => setSicurezza(e.target.value as Sicurezza)}
            className={inputClass()}
          >
            <option value="starttls">STARTTLS (porta tipica 587, consigliata)</option>
            <option value="ssl">SSL/TLS (porta tipica 465 — spesso bloccata in uscita da provider cloud)</option>
            <option value="nessuna">Nessuna cifratura (porta tipica 25 — solo se le altre due non funzionano)</option>
          </select>
        </div>

        <div>
          <label htmlFor="smtp-username" className="mb-1 block text-sm font-medium text-gray-700">
            Indirizzo email / username
          </label>
          <input
            id="smtp-username"
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tuonome@tuodominio.it"
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="smtp-password" className="mb-1 block text-sm font-medium text-gray-700">
            Password {configurata && <span className="text-gray-400">(lascia vuota per non modificarla)</span>}
          </label>
          <input
            id="smtp-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={configurata ? '••••••••' : ''}
            className={inputClass()}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvataggio in corso…' : 'Salva credenziali'}
        </button>

        {configurata && (
          <div className="border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={handleTest}
              disabled={testando}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {testando ? 'Invio in corso…' : 'Testa credenziali'}
            </button>
            {testResult && (
              <p className={`mt-2 text-sm ${testResult.ok ? 'text-gray-700' : 'text-red-600'}`}>
                {testResult.messaggio}
              </p>
            )}
          </div>
        )}
      </form>

      <div className="mt-4 rounded-lg bg-gray-50 px-3 py-3 text-xs text-gray-600">
        <p className="mb-1 font-medium text-gray-700">Quale sicurezza scegliere?</p>
        <p>
          <strong>SSL/TLS</strong>: per la maggior parte dei provider italiani (Aruba, Libero Mail...), tipicamente
          sulla porta 465. <strong>STARTTLS</strong>: per Gmail/Google Workspace, Microsoft 365 e molti hosting
          moderni, tipicamente sulla porta 587 — <strong>preferisci questa quando disponibile</strong>, è l&apos;opzione
          più affidabile. <strong>Nessuna cifratura</strong>: usala solo se il tuo provider non supporta le altre due
          (capita con alcuni hosting solo sulla porta 25, es. vhosting) — meno sicura delle altre due, ma a volte è
          l&apos;unica che funziona davvero.
        </p>
      </div>
    </>
  )
}
