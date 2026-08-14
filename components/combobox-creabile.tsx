'use client'

import { useEffect, useRef, useState } from 'react'
import { inputClass } from '@/lib/input-class'

export type ComboboxCreabileOption = { id: string; label: string }

// Variante di Combobox (components/combobox.tsx) con la possibilità di
// creare al volo un'opzione nuova quando nessuna esistente corrisponde —
// catalogo Referenze di Acquisto, 2026-08-14 (vedi CLAUDE.md). Duplicata
// invece di generalizzata dentro Combobox stesso: quest'ultimo è già in uso
// per Cliente e Fornitore, nessuno dei due ha mai avuto bisogno di creare
// un'opzione al volo — estenderlo lì avrebbe rischiato di introdurre un
// prop mai esercitato dagli altri due chiamanti, stesso principio già
// seguito per la duplicazione deliberata Costruzione/Montaggio.
export function ComboboxCreabile<T extends ComboboxCreabileOption>({
  id,
  placeholder,
  fetchOptions,
  onSelect,
  onCrea,
}: {
  id?: string
  placeholder?: string
  fetchOptions: (query: string) => Promise<T[]>
  onSelect: (opzione: T) => void
  onCrea: (query: string) => void
}) {
  const [query, setQuery] = useState('')
  const [aperto, setAperto] = useState(false)
  const [opzioni, setOpzioni] = useState<T[]>([])
  const [caricando, setCaricando] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Stessa protezione da race condition già in uso in Combobox (audit
  // 2026-08): un id di richiesta numerato invece di fidarsi dell'ordine di
  // risoluzione delle promise.
  const richiestaIdRef = useRef(0)

  useEffect(() => {
    if (!aperto) return

    const timeout = setTimeout(
      async () => {
        const idRichiesta = ++richiestaIdRef.current
        setCaricando(true)
        const r = await fetchOptions(query)
        if (idRichiesta !== richiestaIdRef.current) return
        setOpzioni(r)
        setCaricando(false)
      },
      query.trim() ? 300 : 0,
    )
    return () => clearTimeout(timeout)
  }, [query, aperto, fetchOptions])

  useEffect(() => {
    function handleClickFuori(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAperto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFuori)
    return () => document.removeEventListener('mousedown', handleClickFuori)
  }, [])

  function handleSelect(opzione: T) {
    onSelect(opzione)
    setQuery('')
    setOpzioni([])
    setAperto(false)
  }

  function handleCrea() {
    const testo = query.trim()
    if (!testo) return
    onCrea(testo)
    setQuery('')
    setOpzioni([])
    setAperto(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setAperto(true)}
        placeholder={placeholder}
        className={inputClass()}
        autoComplete="off"
      />
      {aperto && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {caricando ? (
            <p className="px-3 py-2 text-sm text-gray-500">Ricerca in corso…</p>
          ) : (
            <>
              {opzioni.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {opzioni.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(o)}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                      >
                        {o.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-gray-500">Nessun risultato.</p>
              )}
              {/* Affordance di creazione: sempre visibile quando c'è del testo
                  digitato, indipendentemente dal fatto che ci siano già
                  risultati (l'utente potrebbe comunque voler creare una nuova
                  referenza distinta da quelle trovate). */}
              {query.trim() && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleCrea}
                  className="block w-full border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
                >
                  + Crea nuova referenza: “{query.trim()}”
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
