// Avatar condiviso (2026-08-19, vedi CLAUDE.md — riorganizzazione
// Profilo/Impostazioni): usato sia nella navigazione (piccolo, header) sia
// nella pagina Profilo (grande, upload). Iniziali generate da nome+cognome
// come fallback quando `immagineUrl` è assente — "come da decisione
// originale mai implementata" (richiesto esplicitamente): la colonna
// `immagine_profilo` esiste a schema fin dal 2026-07 ma non è mai stata né
// letta né scritta da nessun punto del codice prima di questa sessione.
// Componente puro, nessuna dipendenza da dati/fetch: il chiamante calcola
// già l'URL completo (incluso il cache-buster, vedi lib/profilo/avatar.ts).
function iniziali(nome: string, cognome: string): string {
  const n = nome.trim().charAt(0).toUpperCase()
  const c = cognome.trim().charAt(0).toUpperCase()
  return `${n}${c}` || '?'
}

const TAGLIE = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-14 w-14 text-lg',
  lg: 'h-28 w-28 text-3xl',
} as const

export function Avatar({
  nome,
  cognome,
  immagineUrl,
  taglia = 'md',
  className = '',
}: {
  nome: string
  cognome: string
  immagineUrl: string | null
  taglia?: keyof typeof TAGLIE
  className?: string
}) {
  const classiBase = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${TAGLIE[taglia]} ${className}`

  if (immagineUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={immagineUrl} alt={`${nome} ${cognome}`} className={`${classiBase} object-cover`} />
    )
  }

  return (
    <span className={`${classiBase} bg-gray-900 font-semibold text-white`} aria-label={`${nome} ${cognome}`}>
      {iniziali(nome, cognome)}
    </span>
  )
}
