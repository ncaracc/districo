'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aggiornaObiettiviKpi } from '@/lib/profilo/actions'
import { inputClass } from '@/lib/input-class'

type Fields = {
  targetPreventivoGiorni: string
  targetProgettoGiorni: string
  targetProduzioneGiorni: string
  targetMontaggioGiorni: string
  kpiFinestraMesi: string
}

export function ProfiloObiettiviForm({ initialValues }: { initialValues: Fields }) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(initialValues)
  const [errore, setErrore] = useState<string | null>(null)
  const [salvato, setSalvato] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    setSalvato(false)

    const result = await aggiornaObiettiviKpi({
      targetPreventivoGiorni: Number(fields.targetPreventivoGiorni) || 0,
      targetProgettoGiorni: Number(fields.targetProgettoGiorni) || 0,
      targetProduzioneGiorni: Number(fields.targetProduzioneGiorni) || 0,
      targetMontaggioGiorni: Number(fields.targetMontaggioGiorni) || 0,
      kpiFinestraMesi: Number(fields.kpiFinestraMesi) || 0,
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setSalvato(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}
      {salvato && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">Obiettivi salvati.</p>}

      {/* Sprint E (2026-08-03): i 4 KPI di Dashboard sono stati sostituiti e
          nessuno dei nuovi confronta più una media con un obiettivo — questi
          4 campi non hanno quindi più alcun effetto, ma restano visibili
          (invece di essere rimossi) su richiesta esplicita dell'utente,
          segnalata come "sezione in fase di revisione". Le colonne DB
          restano invariate e continuano a salvarsi normalmente. */}
      <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
        Sezione in fase di revisione: questi 4 obiettivi non influenzano più i KPI attuali di Dashboard/Lavori
        conclusi. Restano salvabili ma senza alcun effetto visibile, in attesa di essere ricollegati o rimossi.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="target-preventivo" className="mb-1 block text-sm font-medium text-gray-700">
            Tempo di preventivazione (giorni)
          </label>
          <input
            id="target-preventivo"
            type="number"
            min="1"
            value={fields.targetPreventivoGiorni}
            onChange={set('targetPreventivoGiorni')}
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="target-progetto" className="mb-1 block text-sm font-medium text-gray-700">
            Tempo di progetto (giorni)
          </label>
          <input
            id="target-progetto"
            type="number"
            min="1"
            value={fields.targetProgettoGiorni}
            onChange={set('targetProgettoGiorni')}
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="target-produzione" className="mb-1 block text-sm font-medium text-gray-700">
            Accettazione → produzione (giorni)
          </label>
          <input
            id="target-produzione"
            type="number"
            min="1"
            value={fields.targetProduzioneGiorni}
            onChange={set('targetProduzioneGiorni')}
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="target-montaggio" className="mb-1 block text-sm font-medium text-gray-700">
            Durata montaggio (giorni)
          </label>
          <input
            id="target-montaggio"
            type="number"
            min="1"
            value={fields.targetMontaggioGiorni}
            onChange={set('targetMontaggioGiorni')}
            className={inputClass()}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-5">
        <label htmlFor="kpi-finestra" className="mb-1 block text-sm font-medium text-gray-700">
          Finestra temporale per le medie (mesi)
        </label>
        <p className="mb-1 text-xs text-gray-500">
          Usata dai KPI &quot;Tempo medio preventivo&quot; e &quot;Tempo medio completamento&quot; in Dashboard — questo campo resta
          attivo.
        </p>
        <input
          id="kpi-finestra"
          type="number"
          min="1"
          value={fields.kpiFinestraMesi}
          onChange={set('kpiFinestraMesi')}
          className={inputClass()}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvataggio in corso…' : 'Salva obiettivi'}
      </button>
    </form>
  )
}
