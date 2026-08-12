'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cercaFornitoreSedi } from '@/lib/fornitori/actions'
import { creaOrdine } from '@/lib/lavori/satelliti'
import { Combobox } from '@/components/combobox'
import { InputValuta } from '@/components/input-valuta'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { DialogConferma } from '@/components/dialog-conferma'

type RigaBozza = { articolo: string }
const RIGA_VUOTA: RigaBozza = { articolo: '' }

type SedeSelezionata = { id: string; label: string }

// Lavorazione_esterna eliminata come tipo satellite a sé dalla revisione
// satelliti del 1/8: esiste solo Acquisti, con la categoria (facoltativa)
// scelta tra quelle libere definite dall'artigiano in Profilo/Impostazioni
// (categorie prop, popolata server-side — vedi app/(app)/lavori/[id]/page.tsx).
//
// Unico caso, tra le 9 attività, in cui "Aggiungi attività" (Sprint
// "fondamenta" 2026-08-02, vedi CLAUDE.md) non crea con stato di default e poi
// apre il dettaglio: il dettaglio di un Acquisto (SatelliteOrdine) non
// permette di impostare fornitore/categoria/righe/valore dopo la creazione,
// quindi questo form resta il solo punto di compilazione, mostrato sempre
// "aperto" (nessun toggle collassato: chi arriva qui da "Aggiungi attività"
// ha già scelto "Acquisto").
export function SatelliteNuovoOrdine({
  lavoroId,
  categorie,
  onSuccesso,
  onAnnulla,
}: {
  lavoroId: string
  categorie: { id: string; nome: string }[]
  onSuccesso: () => void
  onAnnulla: () => void
}) {
  const router = useRouter()

  const [sede, setSede] = useState<SedeSelezionata | null>(null)

  const [categoria, setCategoria] = useState('')
  const [valore, setValore] = useState('')
  const [righe, setRighe] = useState<RigaBozza[]>([{ ...RIGA_VUOTA }])
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sprint UI-2 (vedi CLAUDE.md): questo è l'unico form con coppia Crea/
  // Annulla in tutto il progetto (verificato esplicitamente prima di
  // procedere) — non riceve il pattern floating-save+dirty-state completo
  // (nessun "salvataggio in background" da segnalare, il salvataggio vero è
  // il submit "Crea"), solo la conferma su Annulla/chiusura se il form ha
  // già dati compilati, riusando useDirtyForm contro una baseline vuota e lo
  // stesso DialogConferma degli altri satelliti ma a 2 sole opzioni.
  const dirty = useDirtyForm({
    fornitoreSedeId: sede?.id ?? null,
    acquistoCategoria: categoria || null,
    valoreComplessivo: valore || null,
    righe: righe.filter((r) => r.articolo.trim()).map((r) => r.articolo.trim()),
  }).dirty
  const [confermaChiusuraAperta, setConfermaChiusuraAperta] = useState(false)
  // Il valore di ritorno (il "vero" onChiudi del Modal ospitante) non serve
  // qui: la chiusura reale resta sempre onAnnulla, l'unica via affidabile
  // indipendentemente dal contesto in cui questo componente viene montato —
  // l'hook serve solo per il suo effetto collaterale, registrare la guardia
  // su X/backdrop/Esc della Modal "Aggiungi attività" che lo ospita.
  useProteggiChiusuraModal(dirty, () => setConfermaChiusuraAperta(true))

  function handleAnnullaClick() {
    if (dirty) setConfermaChiusuraAperta(true)
    else onAnnulla()
  }

  function aggiornaRiga(i: number, patch: Partial<RigaBozza>) {
    setRighe((r) => r.map((riga, idx) => (idx === i ? { ...riga, ...patch } : riga)))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)

    const result = await creaOrdine(lavoroId, {
      fornitoreSedeId: sede?.id ?? null,
      acquistoCategoria: categoria || null,
      valoreComplessivo: valore ? Number(valore) : null,
      righe: righe.filter((r) => r.articolo.trim()).map((r) => ({ descrizione: r.articolo.trim() })),
    })

    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
    onSuccesso()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 p-4">
      {errore && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errore}</p>}

      <div>
        <label htmlFor="ordine-fornitore" className="mb-1 block text-sm font-medium text-gray-700">
          Fornitore
        </label>
        {sede ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-sm text-gray-700">{sede.label}</p>
            <button type="button" onClick={() => setSede(null)} className="shrink-0 text-xs font-medium text-gray-600 underline">
              Cambia
            </button>
          </div>
        ) : (
          <Combobox
            id="ordine-fornitore"
            placeholder="Cerca per ragione sociale o sede..."
            fetchOptions={cercaFornitoreSedi}
            onSelect={setSede}
          />
        )}
      </div>

      <div>
        <label htmlFor="ordine-categoria" className="mb-1 block text-sm font-medium text-gray-700">
          Categoria
        </label>
        <select id="ordine-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass()}>
          <option value="">— Nessuna —</option>
          {categorie.map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>
        {categorie.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Nessuna categoria configurata: aggiungine in Profilo/Impostazioni per poterle scegliere qui.
          </p>
        )}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-gray-700">Righe</span>
        <div className="space-y-2">
          {righe.map((riga, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={riga.articolo}
                onChange={(e) => aggiornaRiga(i, { articolo: e.target.value })}
                placeholder="Es. truciolare nobilitato bianco W10100 sp. 25 – 2 pannelli"
                className={`${inputClass()} min-w-0 flex-1`}
              />
              {righe.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRighe((r) => r.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRighe((r) => [...r, { ...RIGA_VUOTA }])}
          className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
        >
          + Aggiungi riga
        </button>
      </div>

      <div>
        <label htmlFor="ordine-valore" className="mb-1 block text-sm font-medium text-gray-700">
          Valore complessivo
        </label>
        <InputValuta id="ordine-valore" value={valore} onChange={setValore} className={inputClass()} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creazione…' : 'Crea'}
        </button>
        <button
          type="button"
          onClick={handleAnnullaClick}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
      </div>

      <DialogConferma
        aperto={confermaChiusuraAperta}
        titolo="Dati non salvati"
        messaggio="Chiudendo ora perderai i dati inseriti in questo Acquisto. Vuoi continuare la modifica o scartarli?"
        opzioni={[
          { label: 'Continua modifica', variante: 'primaria', onClick: () => setConfermaChiusuraAperta(false) },
          { label: 'Scarta e chiudi', variante: 'secondaria', onClick: onAnnulla },
        ]}
      />
    </form>
  )
}
