'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cercaClienti, creaCliente } from '@/lib/clienti/actions'
import { creaLavoro } from '@/lib/lavori/actions'

function inputClass(hasError = false) {
  return `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
  }`
}

type ClienteSelezionato = { id: string; nome: string }

export function NuovoLavoroStandaloneForm() {
  const router = useRouter()

  const [cliente, setCliente] = useState<ClienteSelezionato | null>(null)
  const [creaClienteAperto, setCreaClienteAperto] = useState(false)

  const [query, setQuery] = useState('')
  const [risultati, setRisultati] = useState<{ id: string; nome: string }[]>([])
  const [cercando, setCercando] = useState(false)

  const [nomeNuovoCliente, setNomeNuovoCliente] = useState('')
  const [erroreNuovoCliente, setErroreNuovoCliente] = useState<string | null>(null)
  const [loadingNuovoCliente, setLoadingNuovoCliente] = useState(false)

  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [erroreLavoro, setErroreLavoro] = useState<string | null>(null)
  const [loadingLavoro, setLoadingLavoro] = useState(false)

  useEffect(() => {
    if (!query.trim()) return

    const timeout = setTimeout(async () => {
      const r = await cercaClienti(query)
      setRisultati(r)
      setCercando(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (!value.trim()) {
      setRisultati([])
      setCercando(false)
    } else {
      setCercando(true)
    }
  }

  async function handleCreaCliente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!nomeNuovoCliente.trim()) {
      setErroreNuovoCliente('Il nome è obbligatorio')
      return
    }

    setLoadingNuovoCliente(true)
    const result = await creaCliente({
      nome: nomeNuovoCliente.trim(),
      telefono: null,
      email: null,
      indirizzo: null,
      note: null,
    })
    setLoadingNuovoCliente(false)

    if (!result.ok) {
      setErroreNuovoCliente(result.error)
      return
    }

    setCliente({ id: result.id, nome: nomeNuovoCliente.trim() })
    setCreaClienteAperto(false)
    setNomeNuovoCliente('')
  }

  async function handleCreaLavoro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!cliente) return
    if (!titolo.trim()) {
      setErroreLavoro('Il titolo è obbligatorio')
      return
    }

    setLoadingLavoro(true)
    const result = await creaLavoro(cliente.id, {
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
    })
    setLoadingLavoro(false)

    if (!result.ok) {
      setErroreLavoro(result.error)
      return
    }

    router.push(`/lavori/${result.id}`)
  }

  if (!cliente) {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 p-4">
        <div>
          <label htmlFor="cerca-cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <input
            id="cerca-cliente"
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Cerca per nome..."
            className={inputClass()}
          />
        </div>

        {query.trim() && (
          <div>
            {cercando ? (
              <p className="text-sm text-gray-500">Ricerca in corso…</p>
            ) : risultati.length > 0 ? (
              <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                {risultati.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCliente({ id: c.id, nome: c.nome })}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      {c.nome}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Nessun cliente trovato.</p>
            )}
          </div>
        )}

        {!creaClienteAperto ? (
          <button
            type="button"
            onClick={() => setCreaClienteAperto(true)}
            className="text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
          >
            + Crea nuovo cliente
          </button>
        ) : (
          <form onSubmit={handleCreaCliente} noValidate className="space-y-3 rounded-lg bg-gray-50 p-3">
            {erroreNuovoCliente && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erroreNuovoCliente}</p>
            )}
            <div>
              <label htmlFor="nome-nuovo-cliente" className="block text-sm font-medium text-gray-700 mb-1">
                Nome / Ragione sociale
              </label>
              <input
                id="nome-nuovo-cliente"
                value={nomeNuovoCliente}
                onChange={(e) => setNomeNuovoCliente(e.target.value)}
                className={inputClass(!!erroreNuovoCliente)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Solo il nome è obbligatorio, il resto puoi completarlo anche in seguito.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loadingNuovoCliente}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loadingNuovoCliente ? 'Creazione…' : 'Crea e continua'}
              </button>
              <button
                type="button"
                onClick={() => setCreaClienteAperto(false)}
                disabled={loadingNuovoCliente}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleCreaLavoro} noValidate className="space-y-4 rounded-lg border border-gray-200 p-4">
      {erroreLavoro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erroreLavoro}</p>}

      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
        <p className="text-sm text-gray-700">
          Cliente: <span className="font-medium text-gray-900">{cliente.nome}</span>
        </p>
        <button
          type="button"
          onClick={() => setCliente(null)}
          className="shrink-0 text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
        >
          Cambia
        </button>
      </div>

      <div>
        <label htmlFor="titolo" className="block text-sm font-medium text-gray-700 mb-1">
          Titolo
        </label>
        <input
          id="titolo"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          className={inputClass(!!erroreLavoro && !titolo.trim())}
        />
      </div>

      <div>
        <label htmlFor="descrizione" className="block text-sm font-medium text-gray-700 mb-1">
          Descrizione <span className="text-gray-400">(opz.)</span>
        </label>
        <textarea
          id="descrizione"
          rows={3}
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          className={inputClass()}
        />
      </div>

      <button
        type="submit"
        disabled={loadingLavoro}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loadingLavoro ? 'Creazione in corso…' : 'Crea lavoro'}
      </button>
    </form>
  )
}
