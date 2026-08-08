'use client'

import { IconaDocumento } from '@/components/icons'

// Segnaposto visivo (sessione affinamento UI 2026-08-08, vedi CLAUDE.md):
// nessuna funzionalità reale dietro per ora, solo un no-op loggato — sarà
// collegato in futuro alla generazione di un PDF di sintesi lavoro con QR di
// accesso diretto. Non disabilitato (richiesto esplicitamente): resta
// cliccabile, stesso trattamento hover/focus del cestino accanto.
//
// `grande` (sessione rifinitura 2026-08-08): variante leggermente più
// grande usata solo dalla card mobile della Dashboard — la tabella desktop
// resta alla dimensione originale, fuori scope di quella richiesta.
export function LavoroDocumentoBottone({ grande = false }: { grande?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => console.log('Documento di sintesi lavoro — non ancora implementato')}
      aria-label="Documento di sintesi (non ancora disponibile)"
      title="Documento di sintesi (non ancora disponibile)"
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
    >
      <IconaDocumento className={grande ? 'h-5 w-5' : 'h-4 w-4'} />
    </button>
  )
}
