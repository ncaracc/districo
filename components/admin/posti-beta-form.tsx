'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { impostaPostiBetaTotali } from '@/lib/admin/actions'

// Editor "posti_beta_totali" (2026-08-22, mini-sito beta — vedi
// CLAUDE.md), su /admin/dashboard accanto alla card "Beta tester attivi"
// (posizione più naturale: è la stessa metrica, solo la quota invece del
// conteggio). Nessun form/submit tradizionale — un numero + "Salva",
// stesso stile minimale del resto della pagina.
export function PostiBetaForm({ valoreIniziale }: { valoreIniziale: number }) {
  const router = useRouter()
  const [valore, setValore] = useState(String(valoreIniziale))
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)

  async function handleSalva() {
    const numero = Number(valore)
    if (!Number.isInteger(numero) || numero < 0) {
      setErrore('Inserisci un numero intero non negativo')
      return
    }
    setErrore(null)
    setSalvato(false)
    setLoading(true)
    try {
      await impostaPostiBetaTotali(numero)
      setSalvato(true)
      router.refresh()
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-gray-500">Posti beta totali</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={1}
          value={valore}
          onChange={(e) => {
            setValore(e.target.value)
            setSalvato(false)
          }}
          className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-900 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSalva}
          disabled={loading}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Salvo…' : 'Salva'}
        </button>
      </div>
      {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}
      {salvato && !errore && <p className="mt-2 text-xs text-green-600">Salvato.</p>}
    </div>
  )
}
