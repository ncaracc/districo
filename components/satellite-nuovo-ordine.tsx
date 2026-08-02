'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cercaFornitoreSedi } from '@/lib/fornitori/actions'
import { creaOrdine } from '@/lib/lavori/satelliti'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

type RigaBozza = { descrizione: string; coloreFinitura: string; quantita: string }
const RIGA_VUOTA: RigaBozza = { descrizione: '', coloreFinitura: '', quantita: '1' }

type SedeSelezionata = { id: string; label: string }

// Lavorazione_esterna eliminata come tipo satellite a sé dalla revisione
// satelliti del 1/8: esiste solo Acquisti, con la categoria (facoltativa)
// scelta tra quelle libere definite dall'artigiano in Profilo/Impostazioni
// (categorie prop, popolata server-side — vedi app/(app)/lavori/[id]/page.tsx).
//
// Unico caso, tra le 9 attività, in cui "Aggiungi attività" (Sprint
// "fondamenta" 2026-08-02, vedi CLAUDE.md) non crea con stato di default e poi
// apre il dettaglio: il dettaglio di un Acquisto (SatelliteOrdine) non
// permette di impostare fornitore/categoria/righe/valore dopo la creazione,
// quindi questo form resta il solo punto di compilazione, mostrato sempre
// "aperto" (nessun toggle collassato: chi arriva qui da "Aggiungi attività"
// ha già scelto "Acquisto").
export function SatelliteNuovoOrdine({
  lavoroId,
  categorie,
  onSuccesso,
  onAnnulla,
}: {
  lavoroId: string
  categorie: { id: string; nome: string }[]
  onSuccesso: () => void
  onAnnulla: () => void
}) {
  const router = useRouter()

  const [sede, setSede] = useState<SedeSelezionata | null>(null)
  const [query, setQuery] = useState('')
  const [risultati, setRisultati] = useState<SedeSelezionata[]>([])

  const [categoria, setCategoria] = useState('')
  const [valore, setValore] = useState('')
  const [righe, setRighe] = useState<RigaBozza[]>([{ ...RIGA_VUOTA }])
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) return
    const timeout = setTimeout(async () => {
      setRisultati(await cercaFornitoreSedi(query))
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (!value.trim()) setRisultati([])
  }

  function aggiornaRiga(i: number, patch: Partial<RigaBozza>) {
    setRighe((r) => r.map((riga, idx) => (idx === i ? { ...riga, ...patch } : riga)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)

    const result = await creaOrdine(lavoroId, {
      fornitoreSedeId: sede?.id ?? null,
      acquistoCategoria: categoria || null,
      valoreComplessivo: valore ? Number(valore) : null,
      righe: righe
        .filter((r) => r.descrizione.trim())
        .map((r) => ({
          descrizione: r.descrizione.trim(),
          coloreFinitura: r.coloreFinitura.trim() || null,
          quantita: Number(r.quantita) || 0,
        })),
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
    onSuccesso()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 p-4">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="ordine-fornitore" className="mb-1 block text-sm font-medium text-gray-700">
          Fornitore
        </label>
        {sede ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-sm text-gray-700">{sede.label}</p>
            <button type="button" onClick={() => setSede(null)} className="shrink-0 text-xs font-medium text-gray-600 underline">
              Cambia
            </button>
          </div>
        ) : (
          <>
            <input
              id="ordine-fornitore"
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Cerca per ragione sociale o sede..."
              className={inputClass()}
            />
            {risultati.length > 0 && (
              <ul className="mt-1 divide-y divide-gray-200 rounded-lg border border-gray-200">
                {risultati.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSede(r)
                        setQuery('')
                        setRisultati([])
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor="ordine-categoria" className="mb-1 block text-sm font-medium text-gray-700">
          Categoria
        </label>
        <select id="ordine-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass()}>
          <option value="">— Nessuna —</option>
          {categorie.map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>
        {categorie.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Nessuna categoria configurata: aggiungine in Profilo/Impostazioni per poterle scegliere qui.
          </p>
        )}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Righe</span>
        <div className="space-y-2">
          {righe.map((riga, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={riga.descrizione}
                onChange={(e) => aggiornaRiga(i, { descrizione: e.target.value })}
                placeholder="Descrizione"
                className={inputClass()}
              />
              <input
                value={riga.coloreFinitura}
                onChange={(e) => aggiornaRiga(i, { coloreFinitura: e.target.value })}
                placeholder="Colore/finitura"
                className={`${inputClass()} w-32 shrink-0`}
              />
              <input
                type="number"
                step="0.001"
                value={riga.quantita}
                onChange={(e) => aggiornaRiga(i, { quantita: e.target.value })}
                className={`${inputClass()} w-20 shrink-0`}
              />
              {righe.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRighe((r) => r.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRighe((r) => [...r, { ...RIGA_VUOTA }])}
          className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          + Aggiungi riga
        </button>
      </div>

      <div>
        <label htmlFor="ordine-valore" className="mb-1 block text-sm font-medium text-gray-700">
          Valore complessivo
        </label>
        <input
          id="ordine-valore"
          type="number"
          step="0.01"
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          className={inputClass()}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creazione…' : 'Crea'}
        </button>
        <button
          type="button"
          onClick={onAnnulla}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}
