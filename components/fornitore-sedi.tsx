'use client'

import { useEffect, useRef, useState } from 'react'
import { impostaSedePreferita } from '@/lib/fornitori/actions'
import { FornitoreSedeCard } from '@/components/fornitore-sede-card'
import { FornitoreNuovaSede } from '@/components/fornitore-nuova-sede'

type Contatto = {
  id: string
  nome: string
  cognome: string | null
  cellulare: string | null
  email: string | null
}

type Sede = {
  id: string
  nome: string
  indirizzo: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  sigla_provincia: string | null
  nazione: string | null
  sede_preferita: boolean
  contatti: Contatto[]
}

function IconaStella({ piena }: { piena: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0"
      fill={piena ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76z" />
    </svg>
  )
}

export function FornitoreSedi({ fornitoreId, sedi }: { fornitoreId: string; sedi: Sede[] }) {
  const [selezionataId, setSelezionataId] = useState<string | null>(null)
  const [preferitaOptimistic, setPreferitaOptimistic] = useState<string | null>(null)
  const [erroreStella, setErroreStella] = useState<string | null>(null)

  // Calcolati sempre (anche nei casi 0/1 sede, dove restano inutilizzati):
  // il numero di hook chiamati da un componente non può dipendere da un
  // return anticipato, altrimenti passare da 1 a più sedi (es. aggiungendone
  // una nuova) romperebbe React ("Rendered more hooks than during the
  // previous render").
  const preferitaId = preferitaOptimistic ?? sedi.find((s) => s.sede_preferita)?.id ?? sedi[0]?.id ?? null
  const attivaId = selezionataId ?? preferitaId
  const sedeAttiva = sedi.find((s) => s.id === attivaId) ?? sedi[0]

  // La chip attiva può non essere la prima in ordine alfabetico (dipende da
  // quale sede è preferita): senza scroll esplicito resterebbe fuori dalla
  // porzione visibile della riga scorrevole al caricamento della pagina.
  const chipAttivaRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    chipAttivaRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [attivaId])

  async function handlePreferita(sedeId: string) {
    setErroreStella(null)
    const precedente = preferitaId
    setPreferitaOptimistic(sedeId)
    const result = await impostaSedePreferita(fornitoreId, sedeId)
    if (!result.ok) {
      setPreferitaOptimistic(precedente)
      setErroreStella(result.error)
    }
  }

  if (sedi.length === 0) {
    return (
      <div>
        <FornitoreNuovaSede fornitoreId={fornitoreId} />
      </div>
    )
  }

  // Caso A — una sola sede: nessun selettore, dettaglio diretto.
  if (sedi.length === 1) {
    return (
      <div className="space-y-3">
        <FornitoreSedeCard fornitoreId={fornitoreId} sede={sedi[0]} contatti={sedi[0].contatti} />
        <FornitoreNuovaSede fornitoreId={fornitoreId} />
      </div>
    )
  }

  // Caso B — più sedi: la preferita (o la prima, in mancanza) è selezionata
  // di default; un click su una sede diversa cambia solo la vista, un click
  // sulla stellina cambia invece la preferita salvata nel DB.
  return (
    <div className="space-y-3">
      {erroreStella && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erroreStella}</p>}

      {/* Desktop: elenco sedi a sinistra, dettaglio della selezionata a destra */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[280px_1fr]">
        <ul className="space-y-1">
          {sedi.map((s) => {
            const attiva = s.id === attivaId
            const preferita = s.id === preferitaId
            return (
              <li key={s.id}>
                <div
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                    attiva ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelezionataId(s.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">{s.nome}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      {s.citta && <span className="truncate">{s.citta}</span>}
                      <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                        {s.contatti.length} {s.contatti.length === 1 ? 'contatto' : 'contatti'}
                      </span>
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreferita(s.id)}
                    title={preferita ? 'Sede preferita' : 'Segna come sede preferita'}
                    aria-label={preferita ? 'Sede preferita' : 'Segna come sede preferita'}
                    className={`shrink-0 p-1 transition-colors ${
                      preferita ? 'text-gray-900' : 'text-gray-300 hover:text-gray-500'
                    }`}
                  >
                    <IconaStella piena={preferita} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <div>
          <FornitoreSedeCard fornitoreId={fornitoreId} sede={sedeAttiva} contatti={sedeAttiva.contatti} />
        </div>
      </div>

      {/* Mobile: chip orizzontalmente scorrevoli, dettaglio sotto */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sedi.map((s) => {
            const attiva = s.id === attivaId
            const preferita = s.id === preferitaId
            return (
              <div
                key={s.id}
                ref={attiva ? chipAttivaRef : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  attiva ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'
                }`}
              >
                <button type="button" onClick={() => setSelezionataId(s.id)} className="max-w-[10rem] truncate">
                  {s.nome}
                </button>
                <button
                  type="button"
                  onClick={() => handlePreferita(s.id)}
                  aria-label={preferita ? 'Sede preferita' : 'Segna come sede preferita'}
                  className={attiva ? 'text-white' : preferita ? 'text-gray-900' : 'text-gray-300'}
                >
                  <IconaStella piena={preferita} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-3">
          <FornitoreSedeCard fornitoreId={fornitoreId} sede={sedeAttiva} contatti={sedeAttiva.contatti} />
        </div>
      </div>

      <FornitoreNuovaSede fornitoreId={fornitoreId} />
    </div>
  )
}
