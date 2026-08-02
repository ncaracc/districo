'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { avanzaStatoOrdine } from '@/lib/lavori/satelliti'
import { contattiPerInvio, inviaOrdineSatellite } from '@/lib/lavori/ordini-email'
import { formattaValuta } from '@/lib/formato-valuta'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import {
  DOT_COLOR,
  azioniPossibiliAcquisti,
  coloreAcquisti,
  labelStatoAcquisti,
  type Satellite,
  type SatelliteAllegato,
  type SatelliteArticolo,
  type StatoAcquisti,
} from '@/lib/lavori/satelliti-meta'

export function SatelliteOrdine({
  satellite,
  righe,
  allegati,
  fornitoreSedeLabel,
  lavoroId,
  isOwner,
}: {
  satellite: Satellite
  righe: SatelliteArticolo[]
  allegati: SatelliteAllegato[]
  fornitoreSedeLabel: string | null
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const [invioAperto, setInvioAperto] = useState(false)
  const [contatti, setContatti] = useState<{ id: string; label: string }[] | null>(null)
  const [contattoScelto, setContattoScelto] = useState('')
  const [richiedeConfigurazione, setRichiedeConfigurazione] = useState(false)

  async function avanza(nuovoStato: StatoAcquisti) {
    setLoading(true)
    setErrore(null)
    const result = await avanzaStatoOrdine(satellite.id, lavoroId, nuovoStato)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  async function apriInvio() {
    setInvioAperto(true)
    setErrore(null)
    if (satellite.fornitore_sede_id) {
      setContatti(await contattiPerInvio(satellite.fornitore_sede_id))
    } else {
      setContatti([])
    }
  }

  async function confermaInvio() {
    if (!contattoScelto) return
    setLoading(true)
    setErrore(null)
    setRichiedeConfigurazione(false)
    const result = await inviaOrdineSatellite(satellite.id, lavoroId, contattoScelto)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      setRichiedeConfigurazione(!!result.richiedeConfigurazione)
      return
    }
    setInvioAperto(false)
    router.refresh()
  }

  const azioni = azioniPossibiliAcquisti(satellite.stato ?? '')

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_COLOR[coloreAcquisti(satellite.stato ?? '', righe.length > 0)]}`} />
          {fornitoreSedeLabel ?? 'Nessun fornitore'}
        </p>
        <span className="shrink-0 text-xs text-gray-600">{labelStatoAcquisti(satellite.stato ?? '')}</span>
      </div>

      <p className="mb-1 text-xs text-gray-500">Creato il {new Date(satellite.data_creazione).toLocaleDateString('it-IT')}</p>

      {satellite.acquisto_categoria && <p className="mb-1 text-xs text-gray-500">{satellite.acquisto_categoria}</p>}

      {righe.length > 0 && (
        <ul className="mb-2 list-disc pl-4 text-sm text-gray-700">
          {righe.map((r) => (
            <li key={r.id}>
              {r.descrizione}
              {r.colore_finitura ? ` — ${r.colore_finitura}` : ''} × {r.quantita}
            </li>
          ))}
        </ul>
      )}

      {satellite.valore_complessivo != null && (
        <p className="mb-2 text-sm text-gray-700">{formattaValuta(satellite.valore_complessivo)}</p>
      )}

      {satellite.data_invio_ordine && (
        <p className="mb-2 text-xs text-gray-500">
          Ordine inviato il {new Date(satellite.data_invio_ordine).toLocaleDateString('it-IT')}
        </p>
      )}

      {isOwner && (
        <div className="mb-2">
          <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} richiedeEtichetta />
        </div>
      )}
      <div className="mb-2">
        <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
      </div>

      {errore && (
        <p className="mb-2 text-xs text-red-600">
          {errore}
          {richiedeConfigurazione && (
            <>
              {' '}
              <Link href="/profilo/impostazioni" className="underline underline-offset-2">
                Vai a Profilo/Impostazioni
              </Link>
            </>
          )}
        </p>
      )}

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2">
          {azioni.map((a) => (
            <button
              key={a.stato}
              type="button"
              onClick={() => avanza(a.stato)}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvataggio…' : a.label}
            </button>
          ))}

          {satellite.fornitore_sede_id && !invioAperto && (
            <button
              type="button"
              onClick={apriInvio}
              disabled={loading}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Invia ordine
            </button>
          )}
        </div>
      )}

      {invioAperto && (
        <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
          {contatti === null ? (
            <p className="text-xs text-gray-500">Caricamento contatti…</p>
          ) : contatti.length === 0 ? (
            <p className="text-xs text-gray-500">Nessun contatto con email per questa sede.</p>
          ) : (
            <>
              <select
                value={contattoScelto}
                onChange={(e) => setContattoScelto(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:border-gray-900 focus:ring-gray-900"
              >
                <option value="">— Scegli il destinatario —</option>
                {contatti.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confermaInvio}
                  disabled={loading || !contattoScelto}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Invio…' : 'Conferma invio'}
                </button>
                <button
                  type="button"
                  onClick={() => setInvioAperto(false)}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
