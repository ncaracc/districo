'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { caricaAllegatiSatellite, eliminaAllegatoSatellite } from '@/lib/lavori/allegati'
import { AllegatoModale } from '@/components/allegato-modale'
import { IconaGraffetta } from '@/components/icons'
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
  // richiede per ora — Preventivo/Progetto/Campione restano sul vecchio
  // flusso inline (nessuna etichetta), stesso pattern da estendere nello
  // Sprint C riusando AllegatoModale così com'è (vedi CLAUDE.md).
  richiedeEtichetta?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const [modaleAperta, setModaleAperta] = useState(false)

  // Vecchio flusso inline, invariato: usato solo quando richiedeEtichetta è
  // false (Preventivo/Progetto/Campione, fuori scope in questo sprint).
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

  // Nuovo flusso a modale (Sprint "allegati modale"): un solo file + etichetta
  // per conferma. Ritorna true/false così AllegatoModale sa se chiudersi da
  // sola o restare aperta con l'errore mostrato.
  async function handleCaricaConEtichetta(file: File, etichettaCompilata: string): Promise<boolean> {
    setLoading(true)
    setErrore(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('etichetta', etichettaCompilata)

    try {
      const result = await caricaAllegatiSatellite(satelliteId, lavoroId, formData)
      if (!result.ok) {
        setErrore(result.error)
        return false
      }
      router.refresh()
      return true
    } catch (err) {
      console.error('Upload allegato fallito', err)
      setErrore('Errore nel caricamento del file. Riprova con un file più piccolo o un formato diverso.')
      return false
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

      {isOwner && richiedeEtichetta && (
        <>
          <button
            type="button"
            onClick={() => setModaleAperta(true)}
            aria-label="Allega file"
            title="Allega file"
            className="mt-1.5 inline-flex items-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <IconaGraffetta className="h-4 w-4" />
          </button>
          <AllegatoModale
            aperta={modaleAperta}
            onChiudi={() => {
              setModaleAperta(false)
              setErrore(null)
            }}
            onConferma={handleCaricaConEtichetta}
            loading={loading}
            errore={errore}
          />
        </>
      )}

      {isOwner && !richiedeEtichetta && (
        <div className="mt-1 space-y-1">
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
