'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { caricaAllegatiSatellite, eliminaAllegatoSatellite } from '@/lib/lavori/allegati'
import type { SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

function formattaDataAllegato(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function SatelliteAllegati({
  satelliteId,
  lavoroId,
  allegati,
  isOwner,
  richiedeEtichetta = false,
}: {
  satelliteId: string
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
  // Solo il flusso Appuntamento (Briefing/Verifica misure/Montaggio) la
  // richiede in questo sprint — Preventivo/Progetto/Campione restano
  // invariati, stesso pattern da replicare nello Sprint C (vedi CLAUDE.md).
  richiedeEtichetta?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [etichetta, setEtichetta] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (richiedeEtichetta && !etichetta.trim()) {
      setErrore("L'etichetta è obbligatoria: descrivi il contenuto del file prima di caricarlo")
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setLoading(true)
    setErrore(null)

    const formData = new FormData()
    for (const f of Array.from(files)) formData.append('file', f)
    if (richiedeEtichetta) formData.append('etichetta', etichetta.trim())

    try {
      const result = await caricaAllegatiSatellite(satelliteId, lavoroId, formData)
      if (!result.ok) {
        setErrore(result.error)
        return
      }
      if (inputRef.current) inputRef.current.value = ''
      setEtichetta('')
      router.refresh()
    } catch (err) {
      // La Server Action può lanciare (non solo restituire ok:false) se supera
      // il limite di dimensione del body o per un errore imprevisto del
      // server — senza questo catch l'errore restava invisibile in UI e il
      // bottone bloccato su "Caricamento…" per sempre (bug scoperto in
      // produzione, vedi CLAUDE.md).
      console.error('Upload allegato fallito', err)
      setErrore('Errore nel caricamento del file. Riprova con un file più piccolo o un formato diverso.')
    } finally {
      setLoading(false)
    }
  }

  async function handleElimina(allegatoId: string) {
    if (!confirm("Eliminare questo allegato? L'operazione non è reversibile.")) return
    setEliminandoId(allegatoId)
    const result = await eliminaAllegatoSatellite(allegatoId, lavoroId)
    setEliminandoId(null)
    if (!result.ok) alert(result.error)
    else router.refresh()
  }

  return (
    <div className="mt-2">
      {allegati.length > 0 && (
        <ul className="space-y-1">
          {allegati.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <a
                href={`/api/allegati/satellite/${a.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-600 underline hover:text-gray-900"
              >
                {a.etichetta}
              </a>
              <span className="text-xs text-gray-400">{formattaDataAllegato(a.data_caricamento)}</span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleElimina(a.id)}
                  disabled={eliminandoId === a.id}
                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {eliminandoId === a.id ? 'Eliminazione…' : 'Elimina'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <div className="mt-1 space-y-1">
          {richiedeEtichetta && (
            <input
              type="text"
              value={etichetta}
              onChange={(e) => setEtichetta(e.target.value)}
              placeholder="Etichetta allegato (es. Foto ingresso cucina) *"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors"
            />
          )}
          <label className="inline-block cursor-pointer text-xs font-medium text-gray-600 hover:text-gray-900">
            {loading ? 'Caricamento…' : '+ Allega file'}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
              disabled={loading}
              onChange={handleUpload}
              className="hidden"
            />
          </label>
          {errore && <p className="mt-1 text-xs text-red-600">{errore}</p>}
        </div>
      )}
    </div>
  )
}
