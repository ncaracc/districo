'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaValorePreventivo, impostaPreventivoDecisione } from '@/lib/lavori/satelliti'
import { SatelliteAllegati } from '@/components/satellite-allegati'
import { labelStatoPreventivo, type Satellite, type SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { formattaValuta } from '@/lib/formato-valuta'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { SalvaFlottante } from '@/components/salva-flottante'
import { DialogConferma } from '@/components/dialog-conferma'

// Preventivo non fa più parte del gruppo "revisionabile" (progetto/campione)
// dalla revisione satelliti del 1/8: usa un modello a due flag booleani
// indipendenti (preventivo_accettato/preventivo_rifiutato) invece del vecchio
// stato a 5 valori — vedi CLAUDE.md. Componente dedicato invece di riusare
// RevisionabileChain: le interazioni (due checkbox mutuamente esclusive che
// pilotano il gate su lavoro.stato) non hanno più nulla in comune con
// azioniPossibiliRevisionabile.
export function SatellitePreventivo({
  catena, // ordinata dalla più recente (corrente) alla più vecchia
  allegatiById,
  isOwner,
  lavoroId,
}: {
  catena: Satellite[]
  allegatiById: Record<string, SatelliteAllegato[]>
  isOwner: boolean
  lavoroId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // corrente può essere undefined se catena è vuota (mai realisticamente da
  // quando il Preventivo è auto-creato dal 3/8, ma il tipo resta un array):
  // calcolato prima degli hook, che devono restare incondizionati — il
  // return anticipato per catena vuota resta più sotto, dopo tutti gli hook.
  const corrente = catena[0] as Satellite | undefined
  // Controlled (non più defaultValue+onChange separati): serviva per
  // inizializzare correttamente la baseline del dirty-state sotto — con
  // defaultValue, `valore` sarebbe partito sempre da stringa vuota anche a
  // fronte di un valore già presente, segnalando "dirty" al primo render.
  const [valore, setValore] = useState<string>(corrente ? String(corrente.valore_complessivo ?? '') : '')

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // snapshot del solo campo Valore, l'unico salvato manualmente qui —
  // Accettato/Rifiutato restano auto-salvanti con conferma nativa,
  // invariati, fuori da questo tracking (il click è già il salvataggio).
  const { dirty, segnaSalvato } = useDirtyForm({ valore })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  if (!corrente) return null

  const storico = catena.slice(1)
  const label = labelStatoPreventivo(corrente.preventivo_accettato, corrente.preventivo_rifiutato, corrente.valore_complessivo)

  async function salvaValore() {
    setLoading(true)
    setErrore(null)
    const numero = valore.trim() ? Number(valore) : null
    const result = await aggiornaValorePreventivo(corrente!.id, lavoroId, numero)
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
    if (await salvaValore()) {
      setConfermaUscitaAperta(false)
      chiudiReale()
    }
  }

  function handleEsciSenzaSalvare() {
    setConfermaUscitaAperta(false)
    chiudiReale()
  }

  async function setDecisione(checked: boolean, decisione: 'accettato' | 'rifiutato', conferma: string, confermaAnnulla: string) {
    if (!window.confirm(checked ? conferma : confermaAnnulla)) return
    setLoading(true)
    setErrore(null)
    const result = await impostaPreventivoDecisione(corrente!.id, lavoroId, checked ? decisione : null)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  return (
    // Frammento, non un unico div: SalvaFlottante sibling del div a bordo,
    // non annidato dentro — stesso motivo già documentato in
    // satellite-appuntamento.tsx (Sprint UI-2, vedi CLAUDE.md).
    <>
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Corrente</span>
            <span className="text-xs text-gray-600">{label}</span>
          </div>

          {isOwner ? (
            <div className="mb-2">
              <label htmlFor="valore-preventivo" className="mb-1 block text-sm font-medium text-gray-700">
                Valore
              </label>
              <input
                id="valore-preventivo"
                type="number"
                step="0.01"
                value={valore}
                onChange={(e) => setValore(e.target.value)}
                className={inputClass()}
              />
            </div>
          ) : (
            corrente.valore_complessivo != null && <p className="mb-2 text-sm text-gray-700">{formattaValuta(corrente.valore_complessivo)}</p>
          )}

          <SatelliteAllegati satelliteId={corrente.id} lavoroId={lavoroId} allegati={allegatiById[corrente.id] ?? []} isOwner={isOwner} />

          {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}

          {isOwner && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={corrente.preventivo_accettato}
                  disabled={loading}
                  onChange={(e) =>
                    setDecisione(
                      e.target.checked,
                      'accettato',
                      'Segnare il preventivo come accettato? Il lavoro passerà allo stato "Accettato".',
                      "Annullare l'accettazione del preventivo?",
                    )
                  }
                  className="accent-primary"
                />
                Accettato
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={corrente.preventivo_rifiutato}
                  disabled={loading}
                  onChange={(e) =>
                    setDecisione(
                      e.target.checked,
                      'rifiutato',
                      'Segnare il preventivo come rifiutato? Il lavoro passerà allo stato "Rifiutato".',
                      'Annullare il rifiuto del preventivo?',
                    )
                  }
                  className="accent-primary"
                />
                Rifiutato
              </label>
            </div>
          )}
        </div>

        {storico.length > 0 && (
          <ul className="mt-2 space-y-1 border-l border-gray-200 pl-3">
            {storico.map((s) => (
              <li key={s.id} className="text-xs text-gray-500">
                Revisione precedente — {new Date(s.data_creazione).toLocaleDateString('it-IT')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Nessun errore={errore} qui: la stessa variabile è già mostrata
          sopra (riga condivisa con gli errori di Accettato/Rifiutato) —
          passarla anche qui la duplicherebbe quando dirty è vero. */}
      {isOwner && <SalvaFlottante visibile={dirty} salvando={loading} onSalva={salvaValore} />}

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
