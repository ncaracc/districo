'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaCredenzialiSmtp, testaCredenzialiSmtp } from '@/lib/profilo/actions'

type Sicurezza = 'ssl' | 'starttls' | 'nessuna'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}
      {salvato && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Credenziali salvate.</p>}

      <p className="text-sm text-gray-500">
        {configurata
          ? 'Le credenziali sono configurate. La password non viene mai mostrata: lasciala vuota per non modificarla.'
          : 'Nessuna credenziale configurata: gli ordini via email non possono ancora essere inviati.'}
      </p>

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
          <option value="nessuna">Nessuna (non consigliato)</option>
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
  )
}
