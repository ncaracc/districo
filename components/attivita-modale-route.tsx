'use client'

import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): unico
// scopo di questo wrapper client è fornire router.back() come onChiudi e
// attivare bloccaBackConModifiche — la route intercettata stessa
// (@modal/(.)attivita/[attivitaId]/page.tsx) è un Server Component (fa il
// fetch dati), non può usare useRouter direttamente. `aperto` è sempre vero:
// questa route esiste solo quando l'URL corrisponde, cioè solo quando la
// modale deve essere mostrata (a differenza di "Aggiungi attività", ancora
// gestita con uno stato locale aperto/chiuso in LavoroSatelliteTabella).
export function AttivitaModaleRoute({ titolo, children }: { titolo: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <Modal aperto onChiudi={() => router.back()} titolo={titolo} bloccaBackConModifiche>
      {children}
    </Modal>
  )
}
