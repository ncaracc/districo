'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { eliminaSede, eliminaContatto } from '@/lib/fornitori/actions'
import { FornitoreSedeForm } from '@/components/fornitore-sede-form'
import { FornitoreSedeContattoForm } from '@/components/fornitore-sede-contatto-form'

type Sede = {
  id: string
  nome: string
  indirizzo: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  sigla_provincia: string | null
  nazione: string | null
}

type Contatto = {
  id: string
  nome: string
  cognome: string | null
  cellulare: string | null
  email: string | null
}

function formattaIndirizzo(s: Sede): string | null {
  const via = [s.indirizzo, s.civico].filter(Boolean).join(' ')
  const cittaProv = [s.citta, s.sigla_provincia ? `(${s.sigla_provincia})` : null].filter(Boolean).join(' ')
  const capCittaProv = [s.cap, cittaProv].filter(Boolean).join(' ')
  // La nazione da sola (es. default "Italia" impostato già alla creazione della sede,
  // mai il segnale di un indirizzo davvero compilato) non basta per considerare
  // l'indirizzo "specificato" — altrimenti "Indirizzo non specificato" non scatterebbe mai.
  if (!via && !capCittaProv) return null
  const parti = [via, capCittaProv, s.nazione].filter(Boolean)
  return parti.length > 0 ? parti.join(', ') : null
}

export function FornitoreSedeCard({
  fornitoreId,
  sede,
  contatti,
}: {
  fornitoreId: string
  sede: Sede
  contatti: Contatto[]
}) {
  const router = useRouter()
  const [modifica, setModifica] = useState(false)
  const [nuovoContatto, setNuovoContatto] = useState(false)
  const [contattoInModifica, setContattoInModifica] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEliminaSede() {
    if (!confirm(`Eliminare la sede "${sede.nome}"? L'operazione non è reversibile.`)) return
    setLoading(true)
    const result = await eliminaSede(sede.id, fornitoreId)
    setLoading(false)
    if (!result.ok) alert(result.error)
    else router.refresh()
  }

  async function handleEliminaContatto(contattoId: string) {
    if (!confirm('Eliminare questo contatto?')) return
    setLoading(true)
    const result = await eliminaContatto(contattoId, fornitoreId)
    setLoading(false)
    if (!result.ok) alert(result.error)
    else router.refresh()
  }

  if (modifica) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <FornitoreSedeForm
          fornitoreId={fornitoreId}
          sedeId={sede.id}
          initialValues={{
            nome: sede.nome,
            indirizzo: sede.indirizzo ?? '',
            civico: sede.civico ?? '',
            cap: sede.cap ?? '',
            citta: sede.citta ?? '',
            siglaProvincia: sede.sigla_provincia ?? '',
            nazione: sede.nazione ?? 'Italia',
          }}
          onSalvato={() => setModifica(false)}
          onAnnulla={() => setModifica(false)}
        />
      </div>
    )
  }

  const indirizzo = formattaIndirizzo(sede)

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{sede.nome}</p>
          <p className="mt-0.5 text-xs text-gray-500">{indirizzo ?? 'Indirizzo non specificato'}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => setModifica(true)}
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Modifica
          </button>
          <button
            type="button"
            onClick={handleEliminaSede}
            disabled={loading}
            className="text-xs font-medium text-gray-400 hover:text-red-600"
          >
            Elimina
          </button>
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Contatti</p>
        {contatti.length === 0 && !nuovoContatto && <p className="text-xs text-gray-400">Nessun contatto.</p>}
        <ul className="space-y-1">
          {contatti.map((c) =>
            contattoInModifica === c.id ? (
              <li key={c.id}>
                <FornitoreSedeContattoForm
                  sedeId={sede.id}
                  fornitoreId={fornitoreId}
                  contattoId={c.id}
                  initialValues={{
                    nome: c.nome,
                    cognome: c.cognome ?? '',
                    cellulare: c.cellulare ?? '',
                    email: c.email ?? '',
                  }}
                  onSalvato={() => setContattoInModifica(null)}
                  onAnnulla={() => setContattoInModifica(null)}
                />
              </li>
            ) : (
              <li key={c.id} className="flex items-center justify-between gap-3 text-sm text-gray-700">
                <span>
                  {c.nome} {c.cognome}
                  <span className="ml-2 text-xs text-gray-400">
                    {[c.email, c.cellulare].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setContattoInModifica(c.id)}
                    className="font-medium text-gray-600 hover:text-gray-900"
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminaContatto(c.id)}
                    className="font-medium text-gray-400 hover:text-red-600"
                  >
                    Elimina
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>

        {nuovoContatto ? (
          <div className="mt-2">
            <FornitoreSedeContattoForm
              sedeId={sede.id}
              fornitoreId={fornitoreId}
              onSalvato={() => setNuovoContatto(false)}
              onAnnulla={() => setNuovoContatto(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNuovoContatto(true)}
            className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            + Aggiungi contatto
          </button>
        )}
      </div>
    </div>
  )
}
