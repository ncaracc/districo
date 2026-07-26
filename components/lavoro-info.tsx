'use client'

import { useState } from 'react'
import { LavoroForm } from '@/components/lavoro-form'
import { PAESE_DEFAULT } from '@/lib/paesi'
import { urlGoogleMaps } from '@/lib/indirizzo'

type LavoroInfoFields = {
  descrizione: string | null
  data_lavoro: string | null
  indirizzo: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  sigla_provincia: string | null
  nazione: string | null
}

function formattaIndirizzo(f: LavoroInfoFields): string | null {
  const via = [f.indirizzo, f.civico].filter(Boolean).join(', ')
  const localita = [f.cap, f.citta].filter(Boolean).join(' ')
  const siglaProvincia = f.sigla_provincia ? ` (${f.sigla_provincia})` : ''
  const riga2 = `${localita}${siglaProvincia}`.trim()
  // La nazione da sola (es. default "Italia" mai toccato dall'utente) non conta come
  // "indirizzo specificato": senza almeno via o città/CAP resterebbe un indirizzo
  // fasullo mostrato al posto di "Indirizzo non specificato".
  if (!via && !riga2) return null
  const parti = [via, riga2, f.nazione].filter((p) => p && p.trim())
  return parti.length > 0 ? parti.join(' — ') : null
}

export function LavoroInfo({
  lavoroId,
  isOwner,
  fields,
}: {
  lavoroId: string
  isOwner: boolean
  fields: LavoroInfoFields
}) {
  const [modifica, setModifica] = useState(false)

  if (modifica) {
    return (
      <LavoroForm
        lavoroId={lavoroId}
        initialValues={{
          descrizione: fields.descrizione ?? '',
          dataLavoro: fields.data_lavoro ?? '',
          indirizzo: fields.indirizzo ?? '',
          civico: fields.civico ?? '',
          cap: fields.cap ?? '',
          citta: fields.citta ?? '',
          siglaProvincia: fields.sigla_provincia ?? '',
          nazione: fields.nazione ?? PAESE_DEFAULT,
        }}
        onAnnulla={() => setModifica(false)}
      />
    )
  }

  const indirizzoFormattato = formattaIndirizzo(fields)
  const dataFormattata = fields.data_lavoro
    ? new Date(`${fields.data_lavoro}T00:00:00`).toLocaleDateString('it-IT')
    : null

  return (
    <div className="space-y-1 text-sm text-gray-600">
      {fields.descrizione && <p className="whitespace-pre-wrap">{fields.descrizione}</p>}
      {dataFormattata && <p className="text-gray-500">Aperto il {dataFormattata}</p>}
      {indirizzoFormattato ? (
        <p>
          <a
            href={urlGoogleMaps(fields)}
            target="_blank"
            rel="noreferrer"
            className="text-gray-500 underline underline-offset-2 hover:text-gray-700"
          >
            {indirizzoFormattato}
          </a>
        </p>
      ) : (
        <p className="text-red-600">Indirizzo non specificato</p>
      )}
      {isOwner && (
        <button
          type="button"
          onClick={() => setModifica(true)}
          className="text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
        >
          Modifica
        </button>
      )}
    </div>
  )
}
