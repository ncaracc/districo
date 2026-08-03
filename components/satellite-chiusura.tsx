'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaChiusura, impostaChiusuraConclusa } from '@/lib/lavori/satelliti'
import { formattaValuta } from '@/lib/formato-valuta'
import { DOT_COLOR, labelStatoChiusura, type Acconto, type Satellite } from '@/lib/lavori/satelliti-meta'

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

// Senza `w-full`: le due classi di larghezza (`w-full` di inputClass() e un
// `w-32`/`w-24` aggiunto in coda) hanno la stessa specificità CSS — quale
// vince dipende dall'ordine con cui Tailwind le genera nel foglio di stile
// compilato, non dall'ordine nella stringa className, quindi non è
// affidabile combinarle (bug scoperto in fase di verifica: il campo
// etichetta risultava largo pochi pixel perché `w-full` vinceva su tutti e
// tre i campi della riga acconto, non solo sul suo). Usata solo per i campi
// a larghezza fissa della riga acconto (data/importo).
function inputClassFisso() {
  return 'rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900 transition-colors'
}

function aDateLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

const ACCONTO_VUOTO: Acconto = { etichetta: '', data: null, importo: 0 }

// Nuova attività "Chiusura Lavoro" (2026-08-03, vedi CLAUDE.md): auto-creata
// come Briefing/Preventivo, non ripetibile, sempre ultima nell'ordine. Il
// suo semaforo verde (chiusura_conclusa) è il nuovo e unico meccanismo che
// porta lavoro.stato a 'completato' — sostituisce il vecchio bottone
// manuale "Segna lavoro completato". Nessuna tabella Pagamento separata: gli
// acconti sono righe libere (chiusura_acconti, jsonb) dentro questo stesso
// satellite, non un'entità normalizzata a sé — resta un'area dati semplice,
// come richiesto esplicitamente.
export function SatelliteChiusura({
  satellite,
  lavoroId,
  isOwner,
  valorePreventivo,
  costiSostenuti,
}: {
  satellite: Satellite
  lavoroId: string
  isOwner: boolean
  valorePreventivo: number | null
  costiSostenuti: number
}) {
  const router = useRouter()
  const [data, setData] = useState(aDateLocal(satellite.chiusura_data))
  const [acconti, setAcconti] = useState<Acconto[]>(satellite.chiusura_acconti.length > 0 ? satellite.chiusura_acconti : [])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const sommaAcconti = acconti.reduce((somma, a) => somma + (Number(a.importo) || 0), 0)
  const valoreMenoAcconti = valorePreventivo != null ? valorePreventivo - sommaAcconti : null

  function aggiornaRiga(i: number, patch: Partial<Acconto>) {
    setAcconti((r) => r.map((riga, idx) => (idx === i ? { ...riga, ...patch } : riga)))
  }

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaChiusura(satellite.id, lavoroId, {
      data: data || null,
      acconti: acconti.filter((a) => a.etichetta.trim() || a.importo),
    })
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  // Salva prima i campi correnti (il form può essere ancora "sporco" quando
  // si spunta), poi imposta il flag — stesso pattern già in uso per il
  // toggle "Ordinato" di Acquisto.
  async function handleToggleConcluso(checked: boolean) {
    setLoading(true)
    setErrore(null)
    const salvato = await aggiornaChiusura(satellite.id, lavoroId, {
      data: data || null,
      acconti: acconti.filter((a) => a.etichetta.trim() || a.importo),
    })
    if (!salvato.ok) {
      setLoading(false)
      setErrore(salvato.error)
      return
    }
    const result = await impostaChiusuraConclusa(satellite.id, lavoroId, checked)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[satellite.chiusura_conclusa ? 'green' : 'red']}`} />
          Chiusura Lavoro
        </p>
        <span className="shrink-0 text-xs text-gray-600">{labelStatoChiusura(satellite.chiusura_conclusa)}</span>
      </div>

      <div className="mb-3 space-y-1 text-sm text-gray-700">
        <p>
          Valore (preventivo): <span className="font-medium text-gray-900">{valorePreventivo != null ? formattaValuta(valorePreventivo) : '—'}</span>
        </p>
        <p>Riepilogo costi sostenuti: <span className="font-medium text-gray-900">{formattaValuta(costiSostenuti)}</span></p>
        <p>
          Valore - Acconti: <span className="font-medium text-gray-900">{valoreMenoAcconti != null ? formattaValuta(valoreMenoAcconti) : '—'}</span>
        </p>
      </div>

      {isOwner ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="chiusura-data" className="mb-1 block text-xs font-medium text-gray-700">
              Data
            </label>
            <input id="chiusura-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass()} />
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-gray-700">Acconti ricevuti</span>
            <div className="space-y-2">
              {acconti.map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={a.etichetta}
                    onChange={(e) => aggiornaRiga(i, { etichetta: e.target.value })}
                    placeholder="Es. Acconto alla firma"
                    className={`${inputClass()} min-w-0 basis-full sm:flex-1 sm:basis-0`}
                  />
                  <input
                    type="date"
                    value={aDateLocal(a.data)}
                    onChange={(e) => aggiornaRiga(i, { data: e.target.value || null })}
                    className={`${inputClassFisso()} w-32`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={a.importo || ''}
                    onChange={(e) => aggiornaRiga(i, { importo: e.target.value ? Number(e.target.value) : 0 })}
                    placeholder="Importo"
                    className={`${inputClassFisso()} w-24`}
                  />
                  <button
                    type="button"
                    onClick={() => setAcconti((r) => r.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAcconti((r) => [...r, { ...ACCONTO_VUOTO }])}
              className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              + Aggiungi acconto
            </button>
          </div>

          {errore && <p className="text-xs text-red-600">{errore}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSalva}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio…' : 'Salva'}
            </button>
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={satellite.chiusura_conclusa}
                disabled={loading}
                onChange={(e) => handleToggleConcluso(e.target.checked)}
                className="accent-primary"
              />
              Concluso
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-gray-700">
          {satellite.chiusura_data && <p>Data: {new Date(satellite.chiusura_data).toLocaleDateString('it-IT')}</p>}

          {acconti.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Acconti ricevuti</p>
              <div className="space-y-1">
                {acconti.map((a, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <span className="text-left">{a.etichetta || '—'}</span>
                    <span className="text-center text-gray-600">{a.data ? new Date(a.data).toLocaleDateString('it-IT') : '—'}</span>
                    <span className="text-right">{formattaValuta(a.importo)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
