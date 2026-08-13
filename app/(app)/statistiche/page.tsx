import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

const STATO_LABEL: Record<string, string> = {
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

const FILTRI = [
  { valore: undefined, label: 'Tutti' },
  { valore: 'completato', label: 'Completati' },
  { valore: 'rifiutato', label: 'Rifiutati' },
] as const

export default async function StatistichePage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>
}) {
  const { stato } = await searchParams
  const filtroAttivo = stato === 'completato' || stato === 'rifiutato' ? stato : undefined

  const supabase = await createClient()

  // Ordinamento (sessione 2026-08-13, vedi CLAUDE.md): verificato prima di
  // modificare che l'ordinamento in uso oggi era `data_lavoro` decrescente
  // (data di apertura, non di chiusura — mai documentato esplicitamente
  // come scelta deliberata) — sostituito su richiesta esplicita con
  // `chiusura_data` (stesso campo già usato dalla modale Chiusura Lavoro,
  // `lavoro_satellite.chiusura_data`, valorizzato alla prima transizione a
  // "entrambi i flag true"), più recenti in cima. Vive su una tabella
  // diversa da `lavoro` (satellite, non colonna diretta) — recuperato con
  // una seconda query mirata (stesso pattern già in uso poco sotto per i
  // nomi cliente) invece di un embed PostgREST, per gestire in modo
  // esplicito il caso di un Lavoro `rifiutato` privo di Chiusura (rimossa
  // automaticamente quando il Lavoro esce da 'accettato' senza diventare
  // 'completato', vedi CLAUDE.md 2026-08-13 "Attività non preventivate +
  // restyling Chiusura Lavoro") — questi restano in fondo alla lista.
  let query = supabase.from('lavoro').select('id, titolo, stato, cliente_id, data_lavoro')
  query = filtroAttivo ? query.eq('stato', filtroAttivo) : query.in('stato', ['completato', 'rifiutato'])

  const { data: lavori } = await query

  const lavoroIds = (lavori ?? []).map((l) => l.id)
  const { data: chiusure } =
    lavoroIds.length > 0
      ? await supabase.from('lavoro_satellite').select('lavoro_id, chiusura_data').eq('tipo', 'chiusura').in('lavoro_id', lavoroIds)
      : { data: [] }
  const chiusuraDataPerLavoroId = new Map((chiusure ?? []).map((c) => [c.lavoro_id, c.chiusura_data]))

  const lavoriOrdinati = [...(lavori ?? [])].sort((a, b) => {
    const da = chiusuraDataPerLavoroId.get(a.id)
    const db = chiusuraDataPerLavoroId.get(b.id)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return new Date(db).getTime() - new Date(da).getTime()
  })

  const clienteIds = [...new Set(lavoriOrdinati.map((l) => l.cliente_id))]
  const { data: clienti } =
    clienteIds.length > 0 ? await supabase.from('cliente').select('id, nome').in('id', clienteIds) : { data: [] }
  const nomeClientePerId = new Map((clienti ?? []).map((c) => [c.id, c.nome]))

  return (
    // Contenitore largo (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts), stesso usato ora da tutte
    // le pagine principali (Dashboard, Clienti, Fornitori, dettaglio Lavoro).
    <div className={CONTENITORE_LARGO}>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Lavori conclusi</h1>

      {/* Filtro per stato (Sprint E, 2026-08-03): tab via searchParams, pagina
          resta un Server Component puro, nessun client component necessario —
          stesso pattern già in uso per la ricerca di app/(app)/clienti/page.tsx. */}
      <div className="mb-4 flex gap-2">
        {FILTRI.map((f) => {
          const attivo = f.valore === filtroAttivo
          return (
            <Link
              key={f.label}
              href={f.valore ? `/statistiche?stato=${f.valore}` : '/statistiche'}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                attivo ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-700">Lavori chiusi</h2>

      {lavoriOrdinati.length === 0 ? (
        <p className="text-sm text-gray-500">Nessun lavoro trovato per questo filtro.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {lavoriOrdinati.map((l) => (
            <li key={l.id}>
              <Link href={`/lavori/${l.id}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900">{l.titolo}</p>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {STATO_LABEL[l.stato] ?? l.stato}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">{nomeClientePerId.get(l.cliente_id)}</p>
                  {l.data_lavoro && (
                    <p className="text-xs text-gray-500">{new Date(`${l.data_lavoro}T00:00:00`).toLocaleDateString('it-IT')}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
