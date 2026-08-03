'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaAppuntamento } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import { IconaGraffetta } from '@/components/icons'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

function aDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Template di riferimento per il restyling dei modali satellite (2026-08-04,
// vedi CLAUDE.md — applicato qui prima, sugli altri tipi in un intervento
// successivo): il pallino di stato si è spostato nell'header del Modal
// generico (insieme al titolo, vedi lavoro-satelliti-tabella.tsx), eliminando
// la riga che qui lo ripeteva. Sotto, una riga a due elementi che cambia
// contenuto con la vista corrente (corretto lo stesso giorno: la prima
// versione teneva "Concluso" fisso lì sempre e infilava un secondo link
// "← Generale" più sotto, nel corpo — una riga a sé stante non richiesta):
// vista Generale → sinistra "Allegati (n)" (switch a vista Allegati), destra
// "Concluso"; vista Allegati → sinistra "Generale" (torna indietro), destra
// "+ Aggiungi allegato" (apre lo stesso flusso di upload a modale di sempre,
// solo spostato qui). "Salva" resta visibile in entrambe le viste: upload/
// eliminazione allegati sono già auto-salvanti, ma "Concluso" — pur non
// visibile mentre si guarda la vista Allegati — resta comunque nello stato
// locale del form, quindi "Salva" da lì lo persiste comunque se cambiato
// prima di passare a quella vista.
export function SatelliteAppuntamento({
  satellite,
  lavoroId,
  allegati,
  isOwner,
}: {
  satellite: Satellite
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
}) {
  const router = useRouter()
  const [vista, setVista] = useState<'generale' | 'allegati'>('generale')
  const [data, setData] = useState(aDatetimeLocal(satellite.data_appuntamento))
  const [descrizione, setDescrizione] = useState(satellite.descrizione ?? '')
  const [concluso, setConcluso] = useState(satellite.concluso)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    const result = await aggiornaAppuntamento(satellite.id, lavoroId, {
      data: data ? new Date(data).toISOString() : null,
      descrizione: descrizione.trim() || null,
      concluso,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setSalvato(true)
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        {vista === 'generale' ? (
          <>
            <button
              type="button"
              onClick={() => setVista('allegati')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <IconaGraffetta className="h-4 w-4" />
              Allegati ({allegati.length})
            </button>
            {isOwner && (
              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={concluso}
                  onChange={(e) => setConcluso(e.target.checked)}
                  className="accent-primary"
                />
                Concluso
              </label>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setVista('generale')}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Generale
            </button>
            {isOwner && (
              <AllegatoTrigger
                satelliteId={satellite.id}
                lavoroId={lavoroId}
                isOwner={isOwner}
                richiedeEtichetta
                iconClassName="h-5 w-5"
                iconaConBadge
              />
            )}
          </>
        )}
      </div>

      {vista === 'allegati' ? (
        <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
      ) : isOwner ? (
        <div className="space-y-3">
          <div>
            <label htmlFor={`app-data-${satellite.id}`} className="mb-1 block text-xs font-medium text-gray-700">
              Data
            </label>
            <input
              id={`app-data-${satellite.id}`}
              type="datetime-local"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={inputClass()}
            />
          </div>

          <div>
            <label htmlFor={`app-descrizione-${satellite.id}`} className="mb-1 block text-xs font-medium text-gray-700">
              Descrizione
            </label>
            <textarea
              id={`app-descrizione-${satellite.id}`}
              rows={8}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-sm text-gray-700">
          {satellite.data_appuntamento && <p>{new Date(satellite.data_appuntamento).toLocaleString('it-IT')}</p>}
          {satellite.descrizione && <p className="whitespace-pre-wrap text-gray-600">{satellite.descrizione}</p>}
        </div>
      )}

      {isOwner && (
        <>
          {errore && <p className="mt-3 text-xs text-red-600">{errore}</p>}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleSalva}
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio…' : 'Salva'}
            </button>
            {salvato && <p className="mt-1 text-xs text-gray-500">Salvato</p>}
          </div>
        </>
      )}
    </div>
  )
}
