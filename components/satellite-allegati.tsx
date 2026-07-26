'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { caricaAllegatiSatellite, eliminaAllegatoSatellite } from '@/lib/lavori/allegati'
import type { SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

export function SatelliteAllegati({
  satelliteId,
  lavoroId,
  allegati,
  isOwner,
}: {
  satelliteId: string
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    setErrore(null)

    const formData = new FormData()
    for (const f of Array.from(files)) formData.append('file', f)

    try {
      const result = await caricaAllegatiSatellite(satelliteId, lavoroId, formData)
      if (!result.ok) {
        setErrore(result.error)
        return
      }
      if (inputRef.current) inputRef.current.value = ''
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
                {a.nome_file}
              </a>
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
        <div className="mt-1">
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
