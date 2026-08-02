'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { caricaAllegatiSatellite, eliminaAllegatoSatellite } from '@/lib/lavori/allegati'
import { AllegatoModale } from '@/components/allegato-modale'
import { IconaCestino, IconaGraffetta } from '@/components/icons'
import type { SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

function formattaDataAllegato(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Lista allegati, indipendente dal trigger di upload (separati per poter
// essere posizionati in punti diversi del form — vedi AllegatoTrigger più
// sotto — fix UX 2026-08-02, restyling form Appuntamento: layout a tre
// colonne (nome/etichetta a sinistra, data al centro, cestino a destra)
// al posto della vecchia riga "Allegato · data · Elimina" con link/testo
// appiccicati, facili da toccare per errore su mobile. Ogni riga è una
// griglia a colonne fisse (1fr per il nome, auto per data e cestino):
// la data resta sempre centrata nella sua colonna indipendentemente dalla
// lunghezza del nome, a differenza di un semplice flex con justify-between.
export function AllegatoLista({
  allegati,
  lavoroId,
  isOwner,
}: {
  allegati: SatelliteAllegato[]
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  if (allegati.length === 0) return null

  async function handleElimina(allegatoId: string) {
    if (!confirm("Eliminare questo allegato? L'operazione non è reversibile.")) return
    setEliminandoId(allegatoId)
    const result = await eliminaAllegatoSatellite(allegatoId, lavoroId)
    setEliminandoId(null)
    if (!result.ok) alert(result.error)
    else router.refresh()
  }

  return (
    <ul className="space-y-2">
      {allegati.map((a) => (
        <li
          key={a.id}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50"
        >
          <a
            href={`/api/allegati/satellite/${a.id}`}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-gray-600 underline hover:text-gray-900"
          >
            {a.etichetta}
          </a>
          <span className="whitespace-nowrap text-center text-xs text-gray-400">
            {formattaDataAllegato(a.data_caricamento)}
          </span>
          {isOwner && (
            <button
              type="button"
              onClick={() => handleElimina(a.id)}
              disabled={eliminandoId === a.id}
              aria-label="Elimina allegato"
              title="Elimina allegato"
              className="justify-self-end rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <IconaCestino className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

// Trigger di upload, indipendente dalla lista (vedi AllegatoLista sopra).
// Due varianti invariate nel comportamento rispetto a prima della
// separazione: richiedeEtichetta=true apre AllegatoModale (solo
// Appuntamento oggi), false usa il vecchio flusso inline (Preventivo/
// Progetto/Campione, non toccato).
export function AllegatoTrigger({
  satelliteId,
  lavoroId,
  isOwner,
  richiedeEtichetta = false,
  // Icona e padding del bottone configurabili: il restyling del form
  // Appuntamento (2026-08-02) li rende più grandi con più padding
  // verticale, ma il default resta quello di sempre per non alterare
  // l'aspetto negli altri satelliti che in futuro (Sprint C) potrebbero
  // riusare questo stesso trigger con richiedeEtichetta=true.
  iconClassName = 'h-4 w-4',
  bottoneClassName = 'p-1.5',
}: {
  satelliteId: string
  lavoroId: string
  isOwner: boolean
  richiedeEtichetta?: boolean
  iconClassName?: string
  bottoneClassName?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [modaleAperta, setModaleAperta] = useState(false)

  if (!isOwner) return null

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

  if (richiedeEtichetta) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModaleAperta(true)}
          aria-label="Allega file"
          title="Allega file"
          className={`inline-flex items-center rounded-lg ${bottoneClassName} text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900`}
        >
          <IconaGraffetta className={iconClassName} />
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
    )
  }

  return (
    <div className="space-y-1">
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
  )
}

// Wrapper di compatibilità: lista + trigger nello stesso ordine/aspetto di
// sempre, usato da Preventivo/Progetto/Campione (satellite-revisionabile.tsx,
// satellite-preventivo.tsx) — non toccati da questo sprint. Il form
// Appuntamento (satellite-appuntamento.tsx) usa invece AllegatoLista e
// AllegatoTrigger separatamente, per poterli posizionare in punti diversi.
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
  richiedeEtichetta?: boolean
}) {
  return (
    <div className="mt-2">
      <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
      <div className="mt-1.5">
        <AllegatoTrigger
          satelliteId={satelliteId}
          lavoroId={lavoroId}
          isOwner={isOwner}
          richiedeEtichetta={richiedeEtichetta}
        />
      </div>
    </div>
  )
}
