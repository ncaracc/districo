import Link from 'next/link'
import { FILTRO_LABEL, type FiltroLavori } from '@/lib/lavori/lista-filtri'

const FILTRI: FiltroLavori[] = ['in-corso', 'completati', 'rifiutati', 'tutti']

// Segmented control per il filtro di stato (unificazione Dashboard/Conclusi,
// 2026-08-16, vedi CLAUDE.md) — stesso pattern Link+searchParams già in uso
// nella vecchia pagina Conclusi (nessun client component necessario, la
// pagina resta un Server Component puro), chip più larghe/thumb-friendly
// (px-4 py-2 text-sm invece di px-3 py-1 text-xs) come richiesto per un
// controllo pensato per il pollice su mobile, senza aprire l'hamburger.
// `cliente` viene preservato nell'href quando presente, per non perdere la
// ricerca in corso passando da un filtro all'altro.
export function FiltroLavoriChip({ filtro, cliente }: { filtro: FiltroLavori; cliente: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {FILTRI.map((f) => {
        const attivo = f === filtro
        const params = new URLSearchParams()
        if (f !== 'in-corso') params.set('filtro', f)
        if (cliente) params.set('cliente', cliente)
        const query = params.toString()
        return (
          <Link
            key={f}
            href={query ? `/lavori?${query}` : '/lavori'}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              attivo ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {FILTRO_LABEL[f]}
          </Link>
        )
      })}
    </div>
  )
}
