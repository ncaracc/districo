'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { IconaCestino, IconaMatita } from '@/components/icons'
import { eliminaSatellite } from '@/lib/lavori/satelliti'
import { DOT_COLOR, type ColoreSemaforo } from '@/lib/lavori/satelliti-meta'

export type RigaSatellite = {
  key: string
  // Id del satellite da passare a eliminaSatellite: per i tipi revisionabili
  // (preventivo/progetto/campione) è sempre la revisione corrente/leaf della
  // catena, mai una revisione storica.
  satelliteId: string
  nome: string
  colore: ColoreSemaforo
  statoLabel: string
  contenuto: React.ReactNode
}

// Tabella riepilogativa dei satelliti nel dettaglio Lavoro, al posto del
// vecchio box discorsivo "Satelliti ancora da completare: ...". Il click sul
// nome (unico target che apre la vista) e la matita montano nella stessa
// modale lo stesso componente satellite già esistente, così com'è oggi — non
// esiste una modalità "sola lettura" dedicata, resta quella implicita già
// gestita da ciascun componente in base al ruolo (isOwner).
export function LavoroSatelliteTabella({
  righe,
  lavoroId,
  isOwner,
  completato,
  aggiungi,
}: {
  righe: RigaSatellite[]
  lavoroId: string
  isOwner: boolean
  // Lavoro con stato 'completato': sola lettura su tutti i satelliti (modifica
  // ed eliminazione disabilitate, "+ Aggiungi satellite" nascosto) — sblocco
  // solo tramite "Riapri lavoro" (vedi CLAUDE.md). Il nome resta cliccabile:
  // apre comunque la modale, ma in sola lettura (vedi isOwner effettivo passato
  // al contenuto da app/(app)/lavori/[id]/page.tsx).
  completato: boolean
  aggiungi?: React.ReactNode
}) {
  const router = useRouter()
  const [apertoKey, setApertoKey] = useState<string | null>(null)
  const [eliminandoKey, setEliminandoKey] = useState<string | null>(null)
  const [mostraAggiungi, setMostraAggiungi] = useState(false)

  const rigaAperta = righe.find((r) => r.key === apertoKey) ?? null

  async function handleElimina(riga: RigaSatellite) {
    if (!confirm('Eliminare definitivamente questo satellite? L\'azione non è reversibile.')) return
    setEliminandoKey(riga.key)
    const result = await eliminaSatellite(riga.satelliteId, lavoroId)
    setEliminandoKey(null)
    if (!result.ok) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div>
      {righe.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2">Satellite</th>
                <th className="px-4 py-2">Stato</th>
                {isOwner && <th className="px-4 py-2 text-right">Azioni</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {righe.map((riga) => (
                <tr key={riga.key}>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setApertoKey(riga.key)}
                      className="text-left font-medium text-gray-900 underline-offset-2 hover:underline"
                    >
                      {riga.nome}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 whitespace-nowrap text-gray-700">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[riga.colore]}`} />
                      {riga.statoLabel}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setApertoKey(riga.key)}
                          disabled={completato}
                          aria-label="Modifica"
                          title={completato ? 'Riapri il lavoro per modificare' : 'Modifica'}
                          className={`rounded-lg p-1.5 transition-colors ${
                            completato
                              ? 'cursor-not-allowed text-gray-300 opacity-50'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <IconaMatita className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleElimina(riga)}
                          disabled={completato || eliminandoKey === riga.key}
                          aria-label="Elimina"
                          title={completato ? 'Riapri il lavoro per modificare' : 'Elimina'}
                          className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                            completato ? 'cursor-not-allowed text-gray-300' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <IconaCestino className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOwner && !completato && aggiungi && (
        <div className="mt-3">
          {mostraAggiungi ? (
            <div className="space-y-3 rounded-lg border border-gray-200 p-4">{aggiungi}</div>
          ) : (
            <button
              type="button"
              onClick={() => setMostraAggiungi(true)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              + Aggiungi satellite
            </button>
          )}
        </div>
      )}

      <Modal aperto={!!rigaAperta} onChiudi={() => setApertoKey(null)} titolo={rigaAperta?.nome}>
        {rigaAperta?.contenuto}
      </Modal>
    </div>
  )
}
