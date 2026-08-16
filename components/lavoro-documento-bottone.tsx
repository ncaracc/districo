import { IconaDocumento } from '@/components/icons'

// "Scheda di lavoro" PDF (2026-08-17, vedi CLAUDE.md): il segnaposto
// introdotto l'8/8 (nessuna azione reale, solo un console.log) diventa un
// link di download verso la nuova route app/api/lavori/[id]/scheda-lavoro —
// un semplice <a> con Content-Disposition: attachment lato server basta a
// far scaricare il PDF in ogni browser, nessun fetch/blob lato client
// necessario. Non più 'use client': nessun hook/handler resta qui, un
// semplice link.
//
// `grande` (sessione rifinitura 2026-08-08, invariato): variante leggermente
// più grande usata solo dalla card mobile della Dashboard.
export function LavoroDocumentoBottone({ lavoroId, grande = false }: { lavoroId: string; grande?: boolean }) {
  return (
    <a
      href={`/api/lavori/${lavoroId}/scheda-lavoro`}
      aria-label="Scarica scheda di lavoro (PDF)"
      title="Scarica scheda di lavoro (PDF)"
      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
    >
      <IconaDocumento className={grande ? 'h-5 w-5' : 'h-4 w-4'} />
    </a>
  )
}
