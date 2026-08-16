'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LavoroEliminaBottone } from '@/components/lavoro-elimina-bottone'
import { LavoroDocumentoBottone } from '@/components/lavoro-documento-bottone'
import { IconaCalendario } from '@/components/icons'
import { inputClass } from '@/lib/input-class'
import { formattaValuta } from '@/lib/formato-valuta'
import { STATO_LAVORO_LABEL, STATO_LAVORO_COLORE } from '@/lib/lavori/stato-lavoro'
import { type FiltroLavori } from '@/lib/lavori/lista-filtri'

export type LavoroRigaLista = {
  id: string
  titolo: string
  stato: 'opportunita' | 'accettato' | 'rifiutato' | 'completato'
  cliente_id: string
  satelliti_rossi: number
  satelliti_gialli: number
  satelliti_verdi: number
  valore_preventivo_accettato: number | null
  ha_appuntamento_scaduto: boolean
  ha_acconto_incassato: boolean
}

const DOT_COLOR = { rosso: 'bg-red-500', giallo: 'bg-yellow-500', verde: 'bg-green-500' } as const

function BadgeConteggio({ colore, valore }: { colore: keyof typeof DOT_COLOR; valore: number }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white ${DOT_COLOR[colore]}`}
    >
      {valore}
    </span>
  )
}

function RiepilogoSatelliti({ rossi, gialli, verdi }: { rossi: number; gialli: number; verdi: number }) {
  if (rossi + gialli + verdi === 0) {
    return <span className="text-xs text-gray-400">Nessuna attività</span>
  }
  return (
    <div className="flex items-center gap-2">
      {rossi > 0 && <BadgeConteggio colore="rosso" valore={rossi} />}
      {gialli > 0 && <BadgeConteggio colore="giallo" valore={gialli} />}
      {verdi > 0 && <BadgeConteggio colore="verde" valore={verdi} />}
    </div>
  )
}

const MESSAGGIO_VUOTO: Record<FiltroLavori, string> = {
  'in-corso': 'Non hai ancora nessun lavoro aperto.',
  conclusi: 'Nessun lavoro concluso o rifiutato.',
  rifiutati: 'Nessun lavoro rifiutato.',
  tutti: 'Non hai ancora nessun lavoro.',
}

// Ricerca cliente + tabella/card Lavori (unificazione Dashboard/Conclusi,
// 2026-08-16, vedi CLAUDE.md). Il filtro di STATO resta un Link/searchParams
// lato server (FiltroLavoriChip, nessun JS necessario) — solo la ricerca per
// nome cliente richiede stato client, per filtrare "mentre digiti" senza un
// giro di rete ad ogni tasto: `lavori`/`nomeClientePerId` arrivano già
// caricati (filtrati per stato) dal Server Component genitore, il nome
// cliente per ciascuna riga è già in memoria — un filtro locale per
// sottostringa (stesso criterio non fuzzy di cercaClienti(), solo eseguito
// in JS invece che via ilike SQL) è quindi istantaneo, nessuna richiesta
// aggiuntiva. Non si riusa il componente Combobox esistente (decisione presa
// con l'utente in sessione): quello è un SELETTORE — al click su un'opzione
// la query si svuota e la tendina si chiude, comportamento sbagliato per un
// filtro che deve restare visibile e continuare a filtrare la lista sotto.
//
// L'URL resta comunque la fonte di verità per la condivisibilità richiesta
// esplicitamente ("ricerca come parametro, es. query string"): il testo
// digitato viene sincronizzato nel param `cliente` con un debounce (500ms,
// via router.replace) — un giro di rete in più solo a input fermo, il
// filtro visibile sotto è sempre istantaneo e non aspetta quel giro.
export function LavoriListaFiltrata({
  lavori,
  nomeClientePerId,
  filtro,
  clienteQueryIniziale,
}: {
  lavori: LavoroRigaLista[]
  nomeClientePerId: Record<string, string>
  filtro: FiltroLavori
  clienteQueryIniziale: string
}) {
  const [query, setQuery] = useState(clienteQueryIniziale)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleQueryChange(valore: string) {
    setQuery(valore)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (valore.trim()) params.set('cliente', valore)
      else params.delete('cliente')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 500)
  }

  const queryNormalizzata = query.trim().toLowerCase()
  const lavoriFiltrati = queryNormalizzata
    ? lavori.filter((l) => (nomeClientePerId[l.cliente_id] ?? '').toLowerCase().includes(queryNormalizzata))
    : lavori

  const mostraNotaAccontoIncassato = lavoriFiltrati.some((l) => l.ha_acconto_incassato)

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Cerca per cliente…"
        aria-label="Cerca per cliente"
        className={`${inputClass()} mb-4`}
        autoComplete="off"
      />

      {lavori.length === 0 ? (
        <p className="text-sm text-gray-500">{MESSAGGIO_VUOTO[filtro]}</p>
      ) : lavoriFiltrati.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun lavoro trovato per &quot;{query.trim()}&quot;.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {lavoriFiltrati.map((l) => (
              <div key={l.id} className="rounded-lg border border-gray-200 p-4">
                <Link href={`/lavori/${l.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">{nomeClientePerId[l.cliente_id]}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATO_LAVORO_COLORE[l.stato] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATO_LAVORO_LABEL[l.stato] ?? l.stato}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-900">
                    {l.titolo}
                    {l.ha_appuntamento_scaduto && (
                      <span title="Appuntamento scaduto" aria-label="Appuntamento scaduto" className="shrink-0">
                        <IconaCalendario className="h-4 w-4 text-red-500" />
                      </span>
                    )}
                  </p>
                  <div className="mt-3">
                    <RiepilogoSatelliti rossi={l.satelliti_rossi} gialli={l.satelliti_gialli} verdi={l.satelliti_verdi} />
                  </div>
                </Link>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-base font-bold text-gray-900">
                    {l.valore_preventivo_accettato != null ? formattaValuta(l.valore_preventivo_accettato) : '—'}
                    {l.ha_acconto_incassato && <sup className="text-red-500">*</sup>}
                  </span>
                  <div className="flex items-center gap-2">
                    <LavoroDocumentoBottone grande />
                    <LavoroEliminaBottone lavoroId={l.id} titolo={l.titolo} grande />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Descrizione</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Avanzamento</th>
                  <th className="px-4 py-3 text-right">Valore</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lavoriFiltrati.map((l) => (
                  <tr key={l.id} className="group">
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 text-gray-500 transition-colors group-hover:bg-gray-50">
                        {nomeClientePerId[l.cliente_id]}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/lavori/${l.id}`}
                        className="flex items-center gap-1.5 px-4 py-3 font-medium text-gray-900 transition-colors group-hover:bg-gray-50"
                      >
                        {l.titolo}
                        {l.ha_appuntamento_scaduto && (
                          <span title="Appuntamento scaduto" aria-label="Appuntamento scaduto" className="shrink-0">
                            <IconaCalendario className="h-4 w-4 text-red-500" />
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 transition-colors group-hover:bg-gray-50">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATO_LAVORO_COLORE[l.stato] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {STATO_LAVORO_LABEL[l.stato] ?? l.stato}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 transition-colors group-hover:bg-gray-50">
                        <RiepilogoSatelliti rossi={l.satelliti_rossi} gialli={l.satelliti_gialli} verdi={l.satelliti_verdi} />
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 text-right text-gray-700 transition-colors group-hover:bg-gray-50">
                        {l.valore_preventivo_accettato != null ? formattaValuta(l.valore_preventivo_accettato) : '—'}
                        {l.ha_acconto_incassato && <sup className="text-red-500">*</sup>}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right transition-colors group-hover:bg-gray-50">
                      <div className="flex items-center justify-end gap-1">
                        <LavoroDocumentoBottone />
                        <LavoroEliminaBottone lavoroId={l.id} titolo={l.titolo} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mostraNotaAccontoIncassato && (
            <p className="mt-2 text-xs text-gray-500">* Il lavoro ha almeno un acconto incassato.</p>
          )}
        </>
      )}
    </>
  )
}
