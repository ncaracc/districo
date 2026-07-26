'use client'

import { useState } from 'react'
import { LavoroForm } from '@/components/lavoro-form'
import { PAESE_DEFAULT } from '@/lib/paesi'

type LavoroInfoFields = {
  descrizione: string | null
  data_lavoro: string | null
  indirizzo: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  sigla: string | null
  nazione: string | null
}

function formattaIndirizzo(f: LavoroInfoFields): string | null {
  const via = [f.indirizzo, f.civico].filter(Boolean).join(', ')
  const localita = [f.cap, f.citta].filter(Boolean).join(' ')
  const provinciaSigla = f.sigla ? ` (${f.sigla})` : ''
  const riga2 = `${localita}${provinciaSigla}`.trim()
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
          provincia: fields.provincia ?? '',
          sigla: fields.sigla ?? '',
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
      {indirizzoFormattato && <p className="text-gray-500">{indirizzoFormattato}</p>}
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
