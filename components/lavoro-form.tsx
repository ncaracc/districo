'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaLavoro } from '@/lib/lavori/actions'
import { inputClass } from '@/lib/input-class'
import { PILLOLA_CLASSI_PRIMARIA, PILLOLA_CLASSI_SECONDARIA } from '@/components/pillola-flottante'
import { CampiIndirizzo } from '@/components/campi-indirizzo'

type Fields = {
  titolo: string
  descrizione: string
  dataLavoro: string
  indirizzo: string
  civico: string
  cap: string
  citta: string
  siglaProvincia: string
  nazione: string
}

export function LavoroForm({
  lavoroId,
  initialValues,
  onAnnulla,
}: {
  lavoroId: string
  initialValues: Fields
  onAnnulla: () => void
}) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialValues)
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set<K extends keyof Fields>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!fields.titolo.trim()) {
      setErrore('Il titolo è obbligatorio')
      return
    }

    if (!fields.dataLavoro) {
      setErrore('La data è obbligatoria')
      return
    }

    setLoading(true)
    setErrore(null)

    const result = await aggiornaLavoro(lavoroId, {
      titolo: fields.titolo.trim(),
      descrizione: fields.descrizione.trim() || null,
      dataLavoro: fields.dataLavoro,
      indirizzo: fields.indirizzo.trim() || null,
      civico: fields.civico.trim() || null,
      cap: fields.cap.trim() || null,
      citta: fields.citta.trim() || null,
      siglaProvincia: fields.siglaProvincia.trim() || null,
      nazione: fields.nazione || null,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }

    router.refresh()
    onAnnulla()
  }

  return (
    // pb-24 (sessione rifinitura 2026-08-08, vedi CLAUDE.md): riserva lo
    // spazio perché le pillole Salva/Annulla flottanti (fixed, sotto) non
    // coprano mai l'ultimo campo del form durante lo scroll — stesso
    // principio già in uso per le altre pillole flottanti della pagina.
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 pb-24">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="lavoro-titolo" className="mb-1 block text-sm font-medium text-gray-700">
          Titolo <span className="text-red-500">*</span>
        </label>
        <input id="lavoro-titolo" value={fields.titolo} onChange={set('titolo')} className={inputClass()} />
      </div>

      <div>
        <label htmlFor="lavoro-descrizione" className="mb-1 block text-sm font-medium text-gray-700">
          Descrizione
        </label>
        <textarea
          id="lavoro-descrizione"
          rows={3}
          value={fields.descrizione}
          onChange={set('descrizione')}
          className={inputClass()}
        />
      </div>

      <div>
        <label htmlFor="lavoro-data" className="mb-1 block text-sm font-medium text-gray-700">
          Data <span className="text-red-500">*</span>
        </label>
        <input
          id="lavoro-data"
          type="date"
          value={fields.dataLavoro}
          onChange={set('dataLavoro')}
          className={inputClass()}
        />
      </div>

      {/* Campi indirizzo (Città → Provincia → Nazione): componente
          condiviso components/campi-indirizzo.tsx, vedi CLAUDE.md
          2026-08-13 — centralizza l'ordine dopo che lo stesso bug si era
          ripresentato una seconda volta in un form diverso. */}
      <CampiIndirizzo
        idPrefix="lavoro"
        values={{
          indirizzo: fields.indirizzo,
          civico: fields.civico,
          cap: fields.cap,
          citta: fields.citta,
          siglaProvincia: fields.siglaProvincia,
          nazione: fields.nazione,
        }}
        onChange={(campo, valore) => setFields((f) => ({ ...f, [campo]: valore }))}
      />

      {/* Salva/Annulla flottanti, affiancate (sessione rifinitura
          2026-08-08, vedi CLAUDE.md): sostituiscono i due bottoni inline in
          fondo al form, stesso stile "pillola" già in uso per le altre
          azioni flottanti della pagina (Nuovo lavoro/Aggiungi attività) —
          qui però in coppia, quindi il posizionamento fixed/centrato vive
          sul contenitore del gruppo (PillolaFlottante da solo centrerebbe
          ciascuna pillola individualmente, sovrapponendole). Restano
          dentro <form>: la posizione fixed non le stacca dal DOM, il
          submit nativo funziona invariato. */}
      <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 gap-3">
        <button type="submit" disabled={loading} className={PILLOLA_CLASSI_PRIMARIA}>
          {loading ? 'Salvataggio…' : 'Salva'}
        </button>
        <button type="button" onClick={onAnnulla} disabled={loading} className={PILLOLA_CLASSI_SECONDARIA}>
          Annulla
        </button>
      </div>
    </form>
  )
}
