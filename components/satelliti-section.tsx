'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SatelliteCard } from '@/components/satellite-card'
import { NuovoSatelliteForm } from '@/components/nuovo-satellite-form'
import {
  STATI_PER_TIPO,
  STATO_LABEL,
  TIPO_SATELLITE_LABEL,
  coloreStato,
  type FornitoreOpzione,
  type Satellite,
  type SatelliteArticolo,
  type TipoSatellite,
} from '@/lib/lavori/satelliti-meta'

export function SatellitiSection({
  lavoroId,
  necessarioPreventivo,
  necessarioProgetto,
  satelliti,
  righeArticolo,
  fornitori,
  fornitoreLabelById,
  isOwner,
  pronto,
}: {
  lavoroId: string
  necessarioPreventivo: boolean
  necessarioProgetto: boolean
  satelliti: Satellite[]
  righeArticolo: SatelliteArticolo[]
  fornitori: FornitoreOpzione[]
  fornitoreLabelById: Record<string, string>
  isOwner: boolean
  pronto: boolean
}) {
  const router = useRouter()
  const [formTipo, setFormTipo] = useState<TipoSatellite | null>(null)

  const supersededIds = useMemo(() => {
    const ids = new Set<string>()
    for (const s of satelliti) if (s.revisione_di) ids.add(s.revisione_di)
    return ids
  }, [satelliti])

  const righePerSatellite = useMemo(() => {
    const map = new Map<string, SatelliteArticolo[]>()
    for (const r of righeArticolo) {
      const lista = map.get(r.satellite_id) ?? []
      lista.push(r)
      map.set(r.satellite_id, lista)
    }
    return map
  }, [righeArticolo])

  const appuntamenti = satelliti.filter((s) => s.tipo === 'appuntamento')
  const altri = satelliti.filter((s) => s.tipo !== 'appuntamento')

  const bloccanti = altri.filter(
    (s) => !supersededIds.has(s.id) && coloreStato(s.tipo, s.stato) !== 'green',
  )

  const ordinati = [...altri].sort((a, b) => {
    const aSuperata = supersededIds.has(a.id)
    const bSuperata = supersededIds.has(b.id)
    if (aSuperata !== bSuperata) return aSuperata ? 1 : -1
    const aIdx = STATI_PER_TIPO[a.tipo].indexOf(a.stato)
    const bIdx = STATI_PER_TIPO[b.tipo].indexOf(b.stato)
    return aIdx - bIdx
  })

  const appuntamentiOrdinati = [...appuntamenti].sort((a, b) => {
    if (a.stato !== b.stato) return a.stato === 'fissato' ? -1 : 1
    const aData = a.data_appuntamento ? new Date(a.data_appuntamento).getTime() : Infinity
    const bData = b.data_appuntamento ? new Date(b.data_appuntamento).getTime() : Infinity
    return aData - bData
  })

  const hasPreventivoAttivo = altri.some((s) => s.tipo === 'preventivo' && !supersededIds.has(s.id))
  const hasProgettoAttivo = altri.some((s) => s.tipo === 'progetto' && !supersededIds.has(s.id))

  const revisioniDisponibili = altri
    .filter((s) => (s.tipo === 'preventivo' || s.tipo === 'progetto') && !supersededIds.has(s.id))
    .map((s) => ({
      id: s.id,
      tipo: s.tipo,
      label: `${TIPO_SATELLITE_LABEL[s.tipo]} — ${STATO_LABEL[s.stato]} (${new Date(
        s.data_creazione,
      ).toLocaleDateString('it-IT')})`,
    }))

  function apri(tipo: TipoSatellite) {
    setFormTipo(tipo)
  }

  function onCreato() {
    setFormTipo(null)
    router.refresh()
  }

  return (
    <div>
      <div
        className={`mb-4 rounded-lg border px-4 py-3 ${
          pronto ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <p className={`text-sm font-medium ${pronto ? 'text-green-800' : 'text-gray-800'}`}>
          {pronto ? 'Pronto per il montaggio' : 'Non ancora pronto per il montaggio'}
        </p>
        {!pronto && bloccanti.length > 0 && (
          <p className="mt-1 text-xs text-gray-600">
            In attesa di: {bloccanti.map((s) => TIPO_SATELLITE_LABEL[s.tipo]).join(', ')}
          </p>
        )}
      </div>

      {isOwner && necessarioPreventivo && !hasPreventivoAttivo && (
        <PromemoriaBadge label="Manca ancora il preventivo" onClick={() => apri('preventivo')} />
      )}
      {isOwner && necessarioProgetto && !hasProgettoAttivo && (
        <PromemoriaBadge label="Manca ancora il progetto" onClick={() => apri('progetto')} />
      )}

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Avanzamento lavoro</h2>
        {isOwner && !formTipo && (
          <button
            type="button"
            onClick={() => setFormTipo('appuntamento')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + Aggiungi
          </button>
        )}
      </div>

      {formTipo && (
        <NuovoSatelliteForm
          lavoroId={lavoroId}
          tipoIniziale={formTipo}
          fornitori={fornitori}
          revisioniDisponibili={revisioniDisponibili}
          onCreato={onCreato}
          onAnnulla={() => setFormTipo(null)}
        />
      )}

      {ordinati.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun elemento ancora aggiunto.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {ordinati.map((s) => (
            <SatelliteCard
              key={s.id}
              satellite={s}
              righe={righePerSatellite.get(s.id) ?? []}
              isOwner={isOwner}
              superata={supersededIds.has(s.id)}
              lavoroId={lavoroId}
              fornitoreLabel={s.fornitore_sede_id ? fornitoreLabelById[s.fornitore_sede_id] ?? null : null}
            />
          ))}
        </ul>
      )}

      {appuntamentiOrdinati.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Appuntamenti
          </h3>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {appuntamentiOrdinati.map((s) => (
              <SatelliteCard
                key={s.id}
                satellite={s}
                righe={[]}
                isOwner={isOwner}
                superata={false}
                lavoroId={lavoroId}
                fornitoreLabel={null}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function PromemoriaBadge({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
      <span>{label}</span>
      <button
        type="button"
        onClick={onClick}
        className="shrink-0 rounded-lg border border-yellow-300 bg-white px-3 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-100 transition-colors"
      >
        Aggiungi
      </button>
    </div>
  )
}
