// Riquadro segnaposto per gli screenshot reali dell'app, non ancora
// disponibili al momento della costruzione della landing (2026-08-19, vedi
// CLAUDE.md) — bordo tratteggiato, sfondo neutro, etichetta testuale che
// descrive esattamente cosa dovrà mostrare lo screenshot reale una volta
// scattato. Da sostituire con un <img> reale quando gli screenshot saranno
// disponibili — nessuna logica da toccare altrove, solo il contenuto di
// questo riquadro.
export function ScreenshotPlaceholder({ label, aspect = 'aspect-[4/3]' }: { label: string; aspect?: string }) {
  return (
    <div
      className={`flex ${aspect} w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center`}
    >
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
          <rect x="3" y="4" width="18" height="14" rx="1.5" strokeLinejoin="round" />
          <path d="M3 15.5 8 11l3.5 3.5L16 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="8" r="1.3" />
        </svg>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
    </div>
  )
}
