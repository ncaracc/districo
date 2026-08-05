'use client'

import { useEffect, useRef, useState } from 'react'
import { inputClass } from '@/lib/input-class'

export type ComboboxOption = { id: string; label: string }

// Combobox generico riusato da selezione Cliente (creazione Lavoro) e
// selezione Fornitore (Acquisti): al focus con campo vuoto mostra subito
// l'elenco completo (tendina), digitando filtra in tempo reale. `fetchOptions`
// riceve la query corrente (stringa vuota per l'elenco completo) — stessa
// funzione server usata oggi per la ricerca filtrata, nessuna funzione
// separata per i due casi.
export function Combobox<T extends ComboboxOption>({
  id,
  placeholder,
  fetchOptions,
  onSelect,
}: {
  id?: string
  placeholder?: string
  fetchOptions: (query: string) => Promise<T[]>
  onSelect: (opzione: T) => void
}) {
  const [query, setQuery] = useState('')
  const [aperto, setAperto] = useState(false)
  const [opzioni, setOpzioni] = useState<T[]>([])
  const [caricando, setCaricando] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aperto) return

    const timeout = setTimeout(
      async () => {
        setCaricando(true)
        const r = await fetchOptions(query)
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
          ) : opzioni.length > 0 ? (
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
        </div>
      )}
    </div>
  )
}
