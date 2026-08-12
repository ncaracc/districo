'use client'

import { useRouter } from 'next/navigation'
import { ModalContestoStatico } from '@/components/modal'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): usato
// solo dalla pagina piena di fallback (attivita/[attivitaId]/page.tsx,
// Server Component — non può usare useRouter direttamente). onChiudi qui
// naviga verso il Lavoro (stessa destinazione del link "← Torna al Lavoro"
// sopra) — senza, i bottoni "Annulla"/"Salva ed esci"/"Esci senza salvare"
// dei componenti satellite (invariati, chiamano ctx.onChiudi) chiuderebbero
// il dialog di conferma senza però portare l'utente da nessuna parte.
export function ContestoAttivitaPaginaPiena({ lavoroId, children }: { lavoroId: string; children: React.ReactNode }) {
  const router = useRouter()
  return <ModalContestoStatico onChiudi={() => router.push(`/lavori/${lavoroId}`)}>{children}</ModalContestoStatico>
}
