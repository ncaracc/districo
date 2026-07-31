'use client'

import { useState } from 'react'
import { LavoroForm } from '@/components/lavoro-form'
import { IconaCalendario, IconaMatita, IconaPin } from '@/components/icons'
import { PAESE_DEFAULT } from '@/lib/paesi'
import { urlGoogleMaps } from '@/lib/indirizzo'

type LavoroInfoFields = {
  titolo: string
  descrizione: string | null
  data_lavoro: string | null
  indirizzo: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  sigla_provincia: string | null
  nazione: string | null
}

const STATO_LAVORO_LABEL: Record<string, string> = {
  opportunita: 'Opportunità',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

// Unifica in un'unica stringa "Stato · data della transizione" (es. "Accettato
// · 27/07/2026"), invece delle due frasi separate mostrate in precedenza
// (badge di stato in alto + "Lavoro accettato il ..." più sotto, ridondanti).
// Solo accettato/completato hanno una data di transizione tracciata in
// schema (accettato_at/completato_at) — rifiutato e opportunità mostrano
// solo l'etichetta.
function formattaBadgeStato(stato: string, accettatoAt: string | null, completatoAt: string | null): string {
  const label = STATO_LAVORO_LABEL[stato] ?? stato
  const data = stato === 'accettato' ? accettatoAt : stato === 'completato' ? completatoAt : null
  if (!data) return label
  return `${label} · ${new Date(data).toLocaleDateString('it-IT')}`
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
  stato,
  accettatoAt,
  completatoAt,
  fields,
}: {
  lavoroId: string
  isOwner: boolean
  stato: string
  accettatoAt: string | null
  completatoAt: string | null
  fields: LavoroInfoFields
}) {
  const [modifica, setModifica] = useState(false)

  const indirizzoFormattato = formattaIndirizzo(fields)
  const dataFormattata = fields.data_lavoro
    ? new Date(`${fields.data_lavoro}T00:00:00`).toLocaleDateString('it-IT')
    : null

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{fields.titolo}</h1>
        {isOwner && !modifica && (
          <button
            type="button"
            onClick={() => setModifica(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <IconaMatita className="h-4 w-4" />
            Modifica
          </button>
        )}
      </div>

      {modifica ? (
        <div className="mt-3">
          <LavoroForm
            lavoroId={lavoroId}
            initialValues={{
              titolo: fields.titolo,
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
        </div>
      ) : (
        <>
          <div className="mt-2">
            <span className="inline-block rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
              {formattaBadgeStato(stato, accettatoAt, completatoAt)}
            </span>
          </div>

          {fields.descrizione && (
            <div className="mt-3 border-b border-gray-200 pb-3">
              <p className="whitespace-pre-wrap text-sm text-gray-700">{fields.descrizione}</p>
            </div>
          )}

          <div className="mt-3 space-y-1.5 text-sm text-gray-600">
            {dataFormattata && (
              <p className="flex items-center gap-1.5">
                <IconaCalendario className="h-4 w-4 shrink-0 text-gray-400" />
                Aperto il {dataFormattata}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <IconaPin className="h-4 w-4 shrink-0 text-gray-400" />
              {indirizzoFormattato ? (
                <a
                  href={urlGoogleMaps(fields)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-gray-900"
                >
                  {indirizzoFormattato}
                </a>
              ) : (
                <span className="text-red-600">Indirizzo non specificato</span>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
