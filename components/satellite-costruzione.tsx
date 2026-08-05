'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaDescrizioneCostruzione, avanzaStatoCostruzione } from '@/lib/lavori/satelliti'
import {
  azioniPossibiliCostruzione,
  type Satellite,
  type SatelliteAllegato,
} from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { SalvaFlottante } from '@/components/salva-flottante'
import { DialogConferma } from '@/components/dialog-conferma'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'

function formattaDurata(inizio: string, fine: string | null): string {
  const ms = (fine ? new Date(fine).getTime() : Date.now()) - new Date(inizio).getTime()
  const giorni = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (giorni >= 1) return `${giorni} giorn${giorni === 1 ? 'o' : 'i'}`
  const ore = Math.max(1, Math.floor(ms / (1000 * 60 * 60)))
  return `${ore} or${ore === 1 ? 'a' : 'e'}`
}

export function SatelliteCostruzione({
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
  const [descrizione, setDescrizione] = useState(satellite.descrizione_libera ?? '')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // snapshot del solo campo Note — le azioni "avanza stato" sono bottoni
  // d'azione a sé (transizioni one-way), non campi di un form da segnalare
  // come non salvati.
  const { dirty, segnaSalvato } = useDirtyForm({ descrizione })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  const stato = satellite.stato ?? 'da_iniziare'
  const azioni = azioniPossibiliCostruzione(stato)

  async function salvaDescrizione() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaDescrizioneCostruzione(satellite.id, lavoroId, descrizione.trim() || null)
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
    if (await salvaDescrizione()) {
      setConfermaUscitaAperta(false)
      chiudiReale()
    }
  }

  function handleEsciSenzaSalvare() {
    setConfermaUscitaAperta(false)
    chiudiReale()
  }

  async function avanza(nuovoStato: string) {
    setLoading(true)
    setErrore(null)
    const result = await avanzaStatoCostruzione(satellite.id, lavoroId, nuovoStato as 'in_corso' | 'completata')
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
        {satellite.data_inizio && (
          <p className="mb-2 text-xs text-gray-500">
            In corso da {formattaDurata(satellite.data_inizio, satellite.data_fine)}
            {satellite.data_fine && ' (completata)'}
          </p>
        )}

        {isOwner ? (
          <textarea
            rows={3}
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            placeholder="Note"
            className={inputClass()}
          />
        ) : (
          satellite.descrizione_libera && <p className="text-sm text-gray-600">{satellite.descrizione_libera}</p>
        )}

        {isOwner && (
          <div className="mb-2">
            <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} />
          </div>
        )}
        <div className="mb-2">
          <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
        </div>

        {errore && <p className="mt-2 text-xs text-red-600">{errore}</p>}

        {isOwner && azioni.length > 0 && (
          <div className="mt-3 flex gap-2">
            {azioni.map((a) => (
              <button
                key={a.stato}
                type="button"
                onClick={() => avanza(a.stato)}
                disabled={loading}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvataggio…' : a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isOwner && <SalvaFlottante visibile={dirty} salvando={loading} onSalva={salvaDescrizione} />}

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
