'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaAttivita, nuovaRevisionePreventivo } from '@/lib/lavori/actions'

const TIPO_LABEL: Record<string, string> = {
  briefing: 'Briefing',
  progetto: 'Progetto',
  preventivo: 'Preventivo',
  sopralluogo: 'Sopralluogo',
  campioni: 'Campioni',
}

const STATO_LABEL: Record<string, string> = {
  da_fare: 'Da fare',
  in_corso: 'In corso',
  bloccata: 'Bloccata',
  fatta: 'Fatta',
}

const STATO_COLOR: Record<string, string> = {
  da_fare: 'bg-gray-100 text-gray-700',
  in_corso: 'bg-yellow-100 text-yellow-800',
  bloccata: 'bg-red-100 text-red-700',
  fatta: 'bg-green-100 text-green-700',
}

type Stato = 'da_fare' | 'in_corso' | 'bloccata' | 'fatta'

export type Attivita = {
  id: string
  tipo: 'briefing' | 'progetto' | 'preventivo' | 'sopralluogo' | 'campioni'
  stato: Stato
  data_appuntamento: string | null
  commenti: string | null
  importo: number | null
  revisione_di: string | null
}

export function AttivitaCard({
  attivita,
  lavoroId,
  isOwner,
}: {
  attivita: Attivita
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [stato, setStato] = useState<Stato>(attivita.stato)
  const [commenti, setCommenti] = useState(attivita.commenti ?? '')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [mostraRevisione, setMostraRevisione] = useState(false)

  const modificato = stato !== attivita.stato || commenti !== (attivita.commenti ?? '')

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaAttivita(attivita.id, lavoroId, {
      stato,
      commenti: commenti.trim() || null,
    })
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-900">
          {TIPO_LABEL[attivita.tipo]}
          {attivita.revisione_di && (
            <span className="ml-2 text-xs font-normal text-gray-400">(revisione)</span>
          )}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATO_COLOR[attivita.stato]}`}>
          {STATO_LABEL[attivita.stato]}
        </span>
      </div>

      {attivita.data_appuntamento && (
        <p className="mt-1 text-xs text-gray-500">
          Appuntamento: {new Date(attivita.data_appuntamento).toLocaleString('it-IT')}
        </p>
      )}

      {attivita.tipo === 'preventivo' && attivita.importo != null && (
        <p className="mt-1 text-sm text-gray-700">€ {attivita.importo.toFixed(2)}</p>
      )}

      {isOwner ? (
        <div className="mt-3 space-y-2">
          <select
            value={stato}
            onChange={(e) => setStato(e.target.value as Stato)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900"
          >
            {Object.entries(STATO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            rows={2}
            value={commenti}
            onChange={(e) => setCommenti(e.target.value)}
            placeholder="Commenti..."
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900"
          />
          {errore && <p className="text-xs text-red-600">{errore}</p>}
          <div className="flex items-center gap-2">
            {modificato && (
              <button
                type="button"
                onClick={handleSalva}
                disabled={loading}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvataggio…' : 'Salva'}
              </button>
            )}
            {attivita.tipo === 'preventivo' && (
              <button
                type="button"
                onClick={() => setMostraRevisione((v) => !v)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {mostraRevisione ? 'Annulla' : 'Nuova revisione'}
              </button>
            )}
          </div>
          {mostraRevisione && (
            <RevisionePreventivoForm
              lavoroId={lavoroId}
              attivitaPrecedenteId={attivita.id}
              importoIniziale={attivita.importo}
              onFatto={() => setMostraRevisione(false)}
            />
          )}
        </div>
      ) : (
        attivita.commenti && <p className="mt-2 text-sm text-gray-600">{attivita.commenti}</p>
      )}
    </li>
  )
}

function RevisionePreventivoForm({
  lavoroId,
  attivitaPrecedenteId,
  importoIniziale,
  onFatto,
}: {
  lavoroId: string
  attivitaPrecedenteId: string
  importoIniziale: number | null
  onFatto: () => void
}) {
  const router = useRouter()
  const [importo, setImporto] = useState(importoIniziale?.toString() ?? '')
  const [commenti, setCommenti] = useState('')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    const result = await nuovaRevisionePreventivo(lavoroId, attivitaPrecedenteId, {
      importo: importo ? Number(importo) : null,
      commenti: commenti.trim() || null,
    })
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
    onFatto()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3">
      {errore && <p className="text-xs text-red-600">{errore}</p>}
      <input
        type="number"
        step="0.01"
        value={importo}
        onChange={(e) => setImporto(e.target.value)}
        placeholder="Nuovo importo"
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900"
      />
      <textarea
        rows={2}
        value={commenti}
        onChange={(e) => setCommenti(e.target.value)}
        placeholder="Cosa è cambiato..."
        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Creazione…' : 'Crea nuova revisione'}
      </button>
    </form>
  )
}
