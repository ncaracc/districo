'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaChiusura, impostaChiusuraConclusa } from '@/lib/lavori/satelliti'
import { formattaValuta } from '@/lib/formato-valuta'
import { DOT_COLOR, labelStatoChiusura, type Acconto, type Satellite, type SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { inputClass, inputClassFisso } from '@/lib/input-class'
import { aDateLocal } from '@/lib/date-utils'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { SalvaFlottante } from '@/components/salva-flottante'
import { DialogConferma } from '@/components/dialog-conferma'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'

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
  allegati,
  isOwner,
  valorePreventivo,
  costiSostenuti,
}: {
  satellite: Satellite
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
  valorePreventivo: number | null
  costiSostenuti: number
}) {
  const router = useRouter()
  const [data, setData] = useState(aDateLocal(satellite.chiusura_data))
  const [acconti, setAcconti] = useState<Acconto[]>(satellite.chiusura_acconti.length > 0 ? satellite.chiusura_acconti : [])
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // snapshot di Data+Acconti, i due campi salvati da "Salva" — "Concluso"
  // resta auto-salvante (fuori da questo tracking, il click è già il
  // salvataggio) ma persiste anche lui Data/Acconti come effetto
  // collaterale (vedi handleToggleConcluso sotto): richiama segnaSalvato()
  // anche lì, altrimenti la barra resterebbe visibile con dati in realtà
  // già persistiti.
  const { dirty, segnaSalvato } = useDirtyForm({ data, acconti })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

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
    if (!result.ok) {
      setErrore(result.error)
      return false
    }
    segnaSalvato()
    router.refresh()
    return true
  }

  async function handleSalvaEEsci() {
    if (await handleSalva()) {
      setConfermaUscitaAperta(false)
      chiudiReale()
    }
  }

  function handleEsciSenzaSalvare() {
    setConfermaUscitaAperta(false)
    chiudiReale()
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
    segnaSalvato()
    const result = await impostaChiusuraConclusa(satellite.id, lavoroId, checked)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  return (
    // Frammento, non un unico div: SalvaFlottante sibling del div a bordo,
    // non annidato dentro — stesso motivo già documentato in
    // satellite-appuntamento.tsx (Sprint UI-2, vedi CLAUDE.md).
    <>
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
              <label htmlFor="chiusura-data" className="mb-1 block text-sm font-medium text-gray-700">
                Data
              </label>
              <input id="chiusura-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass()} />
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Acconti ricevuti</span>
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

        {isOwner && (
          <div className="mb-2">
            <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} />
          </div>
        )}
        <div className="mb-2">
          <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
        </div>
      </div>

      {/* Nessun errore={errore} qui: è già mostrato sopra, dentro il div
          (condiviso anche col toggle Concluso) — duplicherebbe altrimenti. */}
      {isOwner && <SalvaFlottante visibile={dirty} salvando={loading} onSalva={handleSalva} />}

      <DialogConferma
        aperto={confermaUscitaAperta}
        titolo="Modifiche non salvate"
        messaggio="Vuoi salvare le modifiche prima di uscire?"
        opzioni={[
          { label: 'Salva ed esci', variante: 'primaria', onClick: handleSalvaEEsci, disabled: loading },
          { label: 'Esci senza salvare', variante: 'secondaria', onClick: handleEsciSenzaSalvare, disabled: loading },
          { label: 'Annulla', variante: 'testuale', onClick: () => setConfermaUscitaAperta(false) },
        ]}
      />
    </>
  )
}
