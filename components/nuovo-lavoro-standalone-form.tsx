'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cercaClienti, creaCliente } from '@/lib/clienti/actions'
import { creaLavoro } from '@/lib/lavori/actions'
import { Combobox } from '@/components/combobox'
import { inputClass } from '@/lib/input-class'

type ClienteSelezionato = { id: string; nome: string }

export function NuovoLavoroStandaloneForm({
  clienteIniziale,
}: {
  clienteIniziale?: ClienteSelezionato
}) {
  const router = useRouter()

  // Se il cliente arriva già valorizzato (link "Nuovo lavoro" dalla pagina
  // Cliente), lo step di ricerca/scelta viene saltato del tutto e il
  // cliente resta bloccato (nessun bottone "Cambia"): coerente col fatto che
  // l'utente è già sulla pagina di quel cliente specifico.
  const [cliente, setCliente] = useState<ClienteSelezionato | null>(clienteIniziale ?? null)
  const clienteBloccato = !!clienteIniziale
  const [creaClienteAperto, setCreaClienteAperto] = useState(false)

  const [nomeNuovoCliente, setNomeNuovoCliente] = useState('')
  const [erroreNuovoCliente, setErroreNuovoCliente] = useState<string | null>(null)
  const [loadingNuovoCliente, setLoadingNuovoCliente] = useState(false)

  const [titolo, setTitolo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [erroreLavoro, setErroreLavoro] = useState<string | null>(null)
  const [loadingLavoro, setLoadingLavoro] = useState(false)

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
          <Combobox
            id="cerca-cliente"
            placeholder="Cerca per nome..."
            fetchOptions={async (q) => (await cercaClienti(q)).map((c) => ({ id: c.id, label: c.nome }))}
            onSelect={(o) => setCliente({ id: o.id, nome: o.label })}
          />
        </div>

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
                Nome / Ragione sociale <span className="text-red-500">*</span>
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
        {!clienteBloccato && (
          <button
            type="button"
            onClick={() => setCliente(null)}
            className="shrink-0 text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
          >
            Cambia
          </button>
        )}
      </div>

      <div>
        <label htmlFor="titolo" className="block text-sm font-medium text-gray-700 mb-1">
          Titolo <span className="text-red-500">*</span>
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
          Descrizione
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
