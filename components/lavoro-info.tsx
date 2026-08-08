'use client'

import { useState } from 'react'
import { LavoroForm } from '@/components/lavoro-form'
import { IconaMatita, IconaPin } from '@/components/icons'
import { PAESE_DEFAULT } from '@/lib/paesi'
import { urlGoogleMaps } from '@/lib/indirizzo'
import { STATO_LAVORO_LABEL, STATO_LAVORO_COLORE } from '@/lib/lavori/stato-lavoro'

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

// Solo accettato/completato hanno una data di transizione tracciata in
// schema (accettato_at/completato_at) — rifiutato e opportunità mostrano
// solo l'etichetta, invariato dal comportamento precedente.
function formattaBadgeStato(stato: string, accettatoAt: string | null, completatoAt: string | null): string {
  const label = STATO_LAVORO_LABEL[stato] ?? stato
  const data = stato === 'accettato' ? accettatoAt : stato === 'completato' ? completatoAt : null
  if (!data) return label
  return `${label}: ${new Date(data).toLocaleDateString('it-IT')}`
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
  clienteNome,
  fields,
}: {
  lavoroId: string
  isOwner: boolean
  stato: string
  accettatoAt: string | null
  completatoAt: string | null
  // Sessione affinamento UI 2026-08-08: prima non mostrato affatto in questa
  // pagina — riga dedicata, sopra il titolo, informazione secondaria
  // (carattere più piccolo). null se il cliente è stato nel frattempo
  // eliminato (dato orfano, caso limite non gestito diversamente da prima).
  clienteNome: string | null
  fields: LavoroInfoFields
}) {
  const [modifica, setModifica] = useState(false)

  const indirizzoFormattato = formattaIndirizzo(fields)
  const dataFormattata = fields.data_lavoro
    ? new Date(`${fields.data_lavoro}T00:00:00`).toLocaleDateString('it-IT')
    : null

  return (
    <div>
      {/* Sessione rifinitura 2026-08-08 (vedi CLAUDE.md): nome cliente
          spostato sulla stessa riga del bottone Modifica, con lo stesso
          peso visivo (contrasto) del link "← Dashboard" — non più un
          text-gray-500 troppo tenue accanto al titolo in grassetto. */}
      <div className="flex items-center justify-between gap-3">
        {clienteNome && <p className="text-sm font-medium text-gray-600">{clienteNome}</p>}
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

      <h1 className="mt-1 text-2xl font-bold text-gray-900">{fields.titolo}</h1>

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
          {/* Riga badge doppia — 50%/50% se lo spazio lo consente
              (sm: in su), impilata sotto: data apertura + stato colorato. */}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {dataFormattata && (
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                Aperto: {dataFormattata}
              </span>
            )}
            <span
              className={`inline-block rounded-full px-3 py-1.5 text-xs font-medium ${STATO_LAVORO_COLORE[stato] ?? 'bg-gray-200 text-gray-700'} ${dataFormattata ? '' : 'sm:col-span-2'}`}
            >
              {formattaBadgeStato(stato, accettatoAt, completatoAt)}
            </span>
          </div>

          {fields.descrizione && (
            <div className="mt-3">
              <p className="whitespace-pre-wrap text-sm text-gray-700">{fields.descrizione}</p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-sm">
            <IconaPin className="h-4 w-4 shrink-0 text-gray-400" />
            {indirizzoFormattato ? (
              // Stile "link accento" (sessione affinamento UI 2026-08-08,
              // vedi CLAUDE.md): sky-600, nessuna sottolineatura a riposo
              // (solo on-hover, desktop) — stesso accento sky introdotto
              // dalla pillola Salva validata (7/8), riusato qui come unico
              // colore "accento" del progetto oltre al nero primario e alla
              // palette a LED. `active:` copre il feedback touch su mobile
              // (scurimento breve, transition-colors = 150ms di default in
              // Tailwind, ripristinato automaticamente al rilascio del tap).
              <a
                href={urlGoogleMaps(fields)}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 underline-offset-2 transition-colors duration-150 hover:underline active:text-sky-800"
              >
                {indirizzoFormattato}
              </a>
            ) : (
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                Indirizzo non specificato
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
