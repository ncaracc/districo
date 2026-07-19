'use client'

import { useState } from 'react'
import { creaSatellite } from '@/lib/lavori/satelliti'
import {
  TIPI_SATELLITE,
  TIPI_CON_ARTICOLI,
  TIPI_CON_FORNITORE,
  TIPI_CON_REVISIONE,
  TIPI_CON_VALORE,
  TIPO_SATELLITE_LABEL,
  type FornitoreOpzione,
  type TipoSatellite,
} from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

type RigaBozza = { descrizione: string; coloreFinitura: string; quantita: string }

const RIGA_VUOTA: RigaBozza = { descrizione: '', coloreFinitura: '', quantita: '1' }

export function NuovoSatelliteForm({
  lavoroId,
  tipoIniziale,
  fornitori,
  revisioniDisponibili,
  onCreato,
  onAnnulla,
}: {
  lavoroId: string
  tipoIniziale: TipoSatellite
  fornitori: FornitoreOpzione[]
  revisioniDisponibili: { id: string; tipo: TipoSatellite; label: string }[]
  onCreato: () => void
  onAnnulla: () => void
}) {
  const [tipo, setTipo] = useState<TipoSatellite>(tipoIniziale)
  const [tipoAppuntamento, setTipoAppuntamento] = useState('')
  const [dataAppuntamento, setDataAppuntamento] = useState('')
  const [revisioneDi, setRevisioneDi] = useState('')
  const [valoreComplessivo, setValoreComplessivo] = useState('')
  const [fornitoreSedeId, setFornitoreSedeId] = useState('')
  const [descrizioneLibera, setDescrizioneLibera] = useState('')
  const [righe, setRighe] = useState<RigaBozza[]>([{ ...RIGA_VUOTA }])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const haArticoli = TIPI_CON_ARTICOLI.includes(tipo)
  const haFornitore = TIPI_CON_FORNITORE.includes(tipo)
  const haRevisione = TIPI_CON_REVISIONE.includes(tipo)
  const haValore = TIPI_CON_VALORE.includes(tipo)
  const isLavorazioneEsterna = tipo === 'lavorazione_esterna'
  const revisioniPerTipo = revisioniDisponibili.filter((r) => r.tipo === tipo)

  function aggiornaRiga(i: number, patch: Partial<RigaBozza>) {
    setRighe((r) => r.map((riga, idx) => (idx === i ? { ...riga, ...patch } : riga)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)

    const result = await creaSatellite(lavoroId, {
      tipo,
      tipoAppuntamento: tipoAppuntamento.trim() || null,
      dataAppuntamento: dataAppuntamento ? new Date(dataAppuntamento).toISOString() : null,
      revisioneDi: revisioneDi || null,
      valoreComplessivo: valoreComplessivo ? Number(valoreComplessivo) : null,
      fornitoreSedeId: fornitoreSedeId || null,
      descrizioneLibera: descrizioneLibera.trim() || null,
      righe: haArticoli
        ? righe
            .filter((r) => r.descrizione.trim())
            .map((r) => ({
              descrizione: r.descrizione.trim(),
              coloreFinitura: r.coloreFinitura.trim() || null,
              quantita: Number(r.quantita) || 0,
            }))
        : undefined,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    onCreato()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-lg border border-gray-200 p-4">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="satellite-tipo" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo
        </label>
        <select
          id="satellite-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoSatellite)}
          className={inputClass()}
        >
          {TIPI_SATELLITE.map((t) => (
            <option key={t} value={t}>
              {TIPO_SATELLITE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {tipo === 'appuntamento' && (
        <>
          <div>
            <label htmlFor="tipoAppuntamento" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo di appuntamento
            </label>
            <input
              id="tipoAppuntamento"
              value={tipoAppuntamento}
              onChange={(e) => setTipoAppuntamento(e.target.value)}
              placeholder="Briefing, rilievo, presentazione..."
              className={inputClass()}
            />
          </div>
          <div>
            <label htmlFor="dataAppuntamento" className="block text-sm font-medium text-gray-700 mb-1">
              Data <span className="text-gray-400">(opz.)</span>
            </label>
            <input
              id="dataAppuntamento"
              type="datetime-local"
              value={dataAppuntamento}
              onChange={(e) => setDataAppuntamento(e.target.value)}
              className={inputClass()}
            />
          </div>
        </>
      )}

      {haRevisione && revisioniPerTipo.length > 0 && (
        <div>
          <label htmlFor="revisioneDi" className="block text-sm font-medium text-gray-700 mb-1">
            Nuova versione di <span className="text-gray-400">(opz.)</span>
          </label>
          <select
            id="revisioneDi"
            value={revisioneDi}
            onChange={(e) => setRevisioneDi(e.target.value)}
            className={inputClass()}
          >
            <option value="">— Nessuna, è una nuova —</option>
            {revisioniPerTipo.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {haFornitore && (
        <div>
          <label htmlFor="fornitoreSedeId" className="block text-sm font-medium text-gray-700 mb-1">
            Fornitore <span className="text-gray-400">(opz.)</span>
          </label>
          <select
            id="fornitoreSedeId"
            value={fornitoreSedeId}
            onChange={(e) => setFornitoreSedeId(e.target.value)}
            className={inputClass()}
          >
            <option value="">— Nessuno —</option>
            {fornitori.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLavorazioneEsterna && (
        <div>
          <label htmlFor="descrizioneLibera" className="block text-sm font-medium text-gray-700 mb-1">
            Descrizione
          </label>
          <textarea
            id="descrizioneLibera"
            rows={2}
            value={descrizioneLibera}
            onChange={(e) => setDescrizioneLibera(e.target.value)}
            className={inputClass()}
          />
        </div>
      )}

      {haValore && (
        <div>
          <label htmlFor="valoreComplessivo" className="block text-sm font-medium text-gray-700 mb-1">
            Valore complessivo <span className="text-gray-400">(opz.)</span>
          </label>
          <input
            id="valoreComplessivo"
            type="number"
            step="0.01"
            value={valoreComplessivo}
            onChange={(e) => setValoreComplessivo(e.target.value)}
            className={inputClass()}
          />
        </div>
      )}

      {haArticoli && (
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1">Articoli</span>
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
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creazione…' : 'Aggiungi'}
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
