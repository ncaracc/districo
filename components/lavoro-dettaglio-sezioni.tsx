'use client'

import { useState } from 'react'
import { LavoroInfo, type LavoroInfoFields } from '@/components/lavoro-info'
import { LavoroSatelliteTabella, type RigaSatellite } from '@/components/lavoro-satelliti-tabella'

// Wrapper client (sessione rifinitura 2026-08-08, vedi CLAUDE.md): Sezione 2
// (LavoroInfo) e Sezioni 3/4 (LavoroSatelliteTabella) erano sibling dentro
// page.tsx (Server Component) — senza un genitore client comune non c'era
// modo di far sapere alla tabella che il form di modifica del Lavoro è
// aperto, per nascondere la pillola "Aggiungi attività" (altrimenti
// visibile dietro al form, sovrapposta al bottone "Annulla"). Questo
// wrapper solleva quello stato condiviso; il contenuto che sta in mezzo
// (messaggio "opportunità"/"Riapri lavoro", entrambi server-side, nessuno
// stato coinvolto) passa come `children`, invariato.
export function LavoroDettaglioSezioni({
  lavoroId,
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
  categorieAcquisto,
  children,
}: {
  lavoroId: string
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
  categorieAcquisto: { id: string; nome: string }[]
  children?: React.ReactNode
}) {
  const [modificaLavoro, setModificaLavoro] = useState(false)

  return (
    <>
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

      <LavoroSatelliteTabella
        righe={righe}
        lavoroId={lavoroId}
        isOwner={isOwner}
        completato={completato}
        progettoEsiste={progettoEsiste}
        preventivoEsiste={preventivoEsiste}
        chiusuraEsiste={chiusuraEsiste}
        categorieAcquisto={categorieAcquisto}
        nascondiPillolaAggiungi={modificaLavoro}
      />
    </>
  )
}
