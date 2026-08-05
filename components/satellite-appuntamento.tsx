'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaAppuntamento } from '@/lib/lavori/satelliti'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import { IconaGraffetta } from '@/components/icons'
import type { Satellite, SatelliteAllegato } from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { SalvaFlottante } from '@/components/salva-flottante'
import { DialogConferma } from '@/components/dialog-conferma'

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

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // snapshot dei soli campi che "Salva" invia davvero — qui coincide con
  // l'intero form (nessun campo di questo satellite si auto-salva).
  const { dirty, segnaSalvato } = useDirtyForm({ data, descrizione, concluso })
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  async function handleSalva() {
    setLoading(true)
    setErrore(null)

    const result = await aggiornaAppuntamento(satellite.id, lavoroId, {
      data: data ? new Date(data).toISOString() : null,
      descrizione: descrizione.trim() || null,
      concluso,
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

  return (
    // Frammento, non un unico div: SalvaFlottante deve essere sibling del
    // div a bordo (non annidato dentro), altrimenti la sua "sticky" resta
    // vincolata all'altezza di QUESTO div (che si dimensiona sul proprio
    // contenuto) invece che all'altezza piena dell'area scrollabile della
    // Modal — scoperto durante la verifica visiva del pilota (Sprint UI-2,
    // vedi CLAUDE.md): su mobile (Modal a h-[92vh] fissa) la barra restava
    // incollata subito sotto l'ultimo campo invece di scendere in fondo allo
    // schermo, per un form corto come questo.
    <>
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
              <label htmlFor={`app-data-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
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
              <label htmlFor={`app-descrizione-${satellite.id}`} className="mb-1 block text-sm font-medium text-gray-700">
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
      </div>

      {isOwner && <SalvaFlottante visibile={dirty} salvando={loading} errore={errore} onSalva={handleSalva} />}

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
