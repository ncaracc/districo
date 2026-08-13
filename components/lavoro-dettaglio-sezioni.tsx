'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LavoroInfo, type LavoroInfoFields } from '@/components/lavoro-info'
import { LavoroSatelliteTabella, type RigaSatellite } from '@/components/lavoro-satelliti-tabella'
import { ORIGINE_INFO, type SezioneOrigine } from '@/lib/nav/origine-sezione'

// Wrapper client (sessione rifinitura 2026-08-08, vedi CLAUDE.md): Sezione 2
// (LavoroInfo) e Sezioni 3/4 (LavoroSatelliteTabella) erano sibling dentro
// page.tsx (Server Component) — senza un genitore client comune non c'era
// modo di far sapere alla tabella che il form di modifica del Lavoro è
// aperto. Il contenuto che sta in mezzo (messaggio "opportunità"/"Riapri
// lavoro", entrambi server-side, nessuno stato coinvolto, e non toccato da
// questa richiesta) passa come `children`, invariato.
//
// Sessione rifinitura 2026-08-08 (seconda modifica, vedi CLAUDE.md): in
// modalità Modifica del Lavoro, tre cose cambiano rispetto a prima —
// (1) Sezione 1 ("← Dashboard", prima renderizzata da page.tsx) spostata
// qui e nascosta: la sua visibilità dipende dallo stesso stato client
// `modificaLavoro`, l'uscita è già coperta dalle pillole Salva/Annulla
// flottanti del form; (2) Sezione 3 (LavoroSatelliteTabella, tabella
// attività + pillola "Aggiungi attività") non più solo "pillola nascosta"
// ma **non renderizzata affatto** — non pertinente mentre si modifica il
// Lavoro, come richiesto esplicitamente; il vecchio prop
// `nascondiPillolaAggiungi` è stato rimosso da LavoroSatelliteTabella
// (sarebbe rimasto dead code, dato che l'intero componente ora non monta
// proprio in quel caso).
//
// Provenienza (sessione correzione 2026-08-13, vedi CLAUDE.md e
// lib/nav/origine-sezione.ts): il link "← Dashboard" era hardcoded — ora
// "← {label della sezione di origine}" (Dashboard o Conclusi), calcolato
// server-side in page.tsx dal cookie che ricorda l'ultima visita reale a
// una delle due, indipendentemente da quante pagine intermedie (Cliente,
// Fornitore...) sono state attraversate per arrivare qui.
export function LavoroDettaglioSezioni({
  lavoroId,
  origineSezione,
  isOwner,
  stato,
  accettatoAt,
  completatoAt,
  clienteNome,
  fields,
  completato,
  righe,
  progettoEsiste,
  preventivoEsiste,
  chiusuraEsiste,
  costruzioneEsiste,
  montaggioEsiste,
  categorieAcquisto,
  children,
}: {
  lavoroId: string
  origineSezione: SezioneOrigine
  isOwner: boolean
  stato: string
  accettatoAt: string | null
  completatoAt: string | null
  clienteNome: string | null
  fields: LavoroInfoFields
  completato: boolean
  righe: RigaSatellite[]
  progettoEsiste: boolean
  preventivoEsiste: boolean
  chiusuraEsiste: boolean
  costruzioneEsiste: boolean
  montaggioEsiste: boolean
  categorieAcquisto: { id: string; nome: string }[]
  children?: React.ReactNode
}) {
  const [modificaLavoro, setModificaLavoro] = useState(false)
  const origine = ORIGINE_INFO[origineSezione]

  return (
    <>
      {!modificaLavoro && (
        <div className="mb-2">
          <Link href={origine.href} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← {origine.label}
          </Link>
        </div>
      )}

      <div className="mb-6">
        <LavoroInfo
          lavoroId={lavoroId}
          isOwner={isOwner}
          stato={stato}
          accettatoAt={accettatoAt}
          completatoAt={completatoAt}
          clienteNome={clienteNome}
          fields={fields}
          onModificaChange={setModificaLavoro}
        />
      </div>

      {children}

      {!modificaLavoro && (
        <LavoroSatelliteTabella
          righe={righe}
          lavoroId={lavoroId}
          isOwner={isOwner}
          completato={completato}
          progettoEsiste={progettoEsiste}
          preventivoEsiste={preventivoEsiste}
          chiusuraEsiste={chiusuraEsiste}
          costruzioneEsiste={costruzioneEsiste}
          montaggioEsiste={montaggioEsiste}
          categorieAcquisto={categorieAcquisto}
        />
      )}
    </>
  )
}
