'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { caricaAllegatiSatellite, eliminaAllegatoSatellite } from '@/lib/lavori/allegati'
import { AllegatoModale } from '@/components/allegato-modale'
import { IconaCestino, IconaGraffetta } from '@/components/icons'
import type { SatelliteAllegato } from '@/lib/lavori/satelliti-meta'

function formattaDataAllegato(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Lista allegati, indipendente dal trigger di upload (separati per poter
// essere posizionati in punti diversi del form — vedi AllegatoTrigger più
// sotto — fix UX 2026-08-02, restyling form Appuntamento: layout a tre
// colonne (nome/etichetta a sinistra, data al centro, cestino a destra)
// al posto della vecchia riga "Allegato · data · Elimina" con link/testo
// appiccicati, facili da toccare per errore su mobile. Corretto il 2026-08-04:
// la colonna data era `auto` (larga esattamente quanto il testo), quindi
// `text-center` al suo interno non aveva alcun effetto visibile — la data
// finiva semplicemente accostata al cestino, non centrata nella riga.
// `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` con le due colonne esterne
// entrambe uguali centra davvero la colonna data (`auto`, sempre larga solo
// quanto il testo) rispetto alla riga intera, indipendentemente da quanto
// sono lunghi nome e cestino — stesso principio geometrico di un header con
// titolo centrato tra due elementi di larghezza diversa. `minmax(0,1fr)` e
// non il solo `1fr`: la keyword `1fr` in una grid-template-columns equivale
// a `minmax(auto,1fr)`, quindi la colonna del nome non si sarebbe mai
// ristretta sotto la larghezza naturale del testo (nessun troncamento
// effettivo) anche con `min-w-0` sull'elemento — il minimo va forzato a 0
// sulla colonna stessa, non basta sull'elemento al suo interno. **Secondo
// bug distinto scoperto nello stesso giro**: aggiungere `justify-self-start`
// al link del nome (pensando servisse per allinearlo a sinistra) lo fa
// dimensionare al proprio contenuto invece di riempire la cella della
// griglia (il default per un grid item è `stretch`, già allineato a
// sinistra essendo testo) — l'elemento tornava largo quanto il testo intero
// (es. 318px anche dentro una cella da 160px), vanificando `truncate`
// perché non c'era più nulla da tagliare. Rimosso: nessuna classe
// `justify-self-*` necessaria sul nome, solo su data (`text-center`, resta
// dentro una colonna `auto`) e cestino (`justify-self-end`).
export function AllegatoLista({
  allegati,
  lavoroId,
  isOwner,
}: {
  allegati: SatelliteAllegato[]
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  if (allegati.length === 0) return null

  async function handleElimina(allegatoId: string) {
    if (!confirm("Eliminare questo allegato? L'operazione non è reversibile.")) return
    setEliminandoId(allegatoId)
    const result = await eliminaAllegatoSatellite(allegatoId, lavoroId)
    setEliminandoId(null)
    if (!result.ok) alert(result.error)
    else router.refresh()
  }

  return (
    <ul className="space-y-2">
      {allegati.map((a) => (
        <li
          key={a.id}
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50"
        >
          <a
            href={`/api/allegati/satellite/${a.id}`}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate text-xs text-gray-600 underline hover:text-gray-900"
          >
            {a.etichetta}
          </a>
          <span className="whitespace-nowrap text-center text-xs text-gray-400">
            {formattaDataAllegato(a.data_caricamento)}
          </span>
          {isOwner && (
            <button
              type="button"
              onClick={() => handleElimina(a.id)}
              disabled={eliminandoId === a.id}
              aria-label="Elimina allegato"
              title="Elimina allegato"
              className="justify-self-end rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <IconaCestino className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

// Trigger di upload, indipendente dalla lista (vedi AllegatoLista sopra).
// Apre sempre AllegatoModale (file + etichetta obbligatoria) — Sprint UI-3
// (gestione allegati, 2026-08-06, vedi CLAUDE.md): il vecchio flusso inline
// senza etichetta (upload immediato, etichetta = nome file grezzo) è stato
// rimosso insieme alla migrazione di Preventivo/Campionatura, gli ultimi due
// consumer rimasti che non richiedevano ancora l'etichetta — verificato con
// una ricerca mirata su tutti gli usi di AllegatoTrigger/SatelliteAllegati
// prima di eliminarlo: nessun consumer nel progetto lo raggiunge più, il
// prop `richiedeEtichetta` stesso è stato rimosso (sempre vero, non serve
// più distinguere).
export function AllegatoTrigger({
  satelliteId,
  lavoroId,
  isOwner,
  // Icona e padding del bottone configurabili: il restyling del form
  // Appuntamento (2026-08-02) li rende più grandi con più padding
  // verticale, il default resta quello di sempre per gli altri satelliti.
  iconClassName = 'h-4 w-4',
  bottoneClassName = 'p-1.5',
  // Se true, il bottone mostra un badge "+" sovrapposto all'icona fermaglio
  // invece di un testo accanto (riga Generale/Allegati del modale
  // Appuntamento, 2026-08-04). Default assente, nessun cambiamento per gli
  // usi icon-only esistenti.
  iconaConBadge = false,
}: {
  satelliteId: string
  lavoroId: string
  isOwner: boolean
  iconClassName?: string
  bottoneClassName?: string
  iconaConBadge?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [modaleAperta, setModaleAperta] = useState(false)

  if (!isOwner) return null

  // Un solo file + etichetta per conferma. Ritorna true/false così
  // AllegatoModale sa se chiudersi da sola o restare aperta con l'errore
  // mostrato.
  async function handleCaricaConEtichetta(file: File, etichettaCompilata: string): Promise<boolean> {
    setLoading(true)
    setErrore(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('etichetta', etichettaCompilata)

    try {
      const result = await caricaAllegatiSatellite(satelliteId, lavoroId, formData)
      if (!result.ok) {
        setErrore(result.error)
        return false
      }
      router.refresh()
      return true
    } catch (err) {
      console.error('Upload allegato fallito', err)
      setErrore('Errore nel caricamento del file. Riprova con un file più piccolo o un formato diverso.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModaleAperta(true)}
        aria-label={iconaConBadge ? 'Aggiungi allegato' : 'Allega file'}
        title={iconaConBadge ? 'Aggiungi allegato' : 'Allega file'}
        className={`relative inline-flex items-center rounded-lg ${bottoneClassName} text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900`}
      >
        <IconaGraffetta className={iconClassName} />
        {iconaConBadge && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-white"
          >
            +
          </span>
        )}
      </button>
      <AllegatoModale
        aperta={modaleAperta}
        onChiudi={() => {
          setModaleAperta(false)
          setErrore(null)
        }}
        onConferma={handleCaricaConEtichetta}
        loading={loading}
        errore={errore}
      />
    </>
  )
}

// Wrapper di compatibilità: lista + trigger nello stesso ordine/aspetto di
// sempre, usato da Preventivo/Campionatura (gli unici due satelliti rimasti
// che non compongono Lista/Trigger separatamente per posizionarli in punti
// diversi del proprio layout, come fa invece Appuntamento).
export function SatelliteAllegati({
  satelliteId,
  lavoroId,
  allegati,
  isOwner,
}: {
  satelliteId: string
  lavoroId: string
  allegati: SatelliteAllegato[]
  isOwner: boolean
}) {
  return (
    <div className="mt-2">
      <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
      <div className="mt-1.5">
        <AllegatoTrigger satelliteId={satelliteId} lavoroId={lavoroId} isOwner={isOwner} />
      </div>
    </div>
  )
}
