import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { caricaDatiLavoroSatelliti } from '@/lib/lavori/dettaglio-lavoro-data'
import { costruisciContenutoAttivita, titoloConPallino } from '@/lib/lavori/satelliti-render'
import { ContestoAttivitaPaginaPiena } from '@/components/attivita-pagina-piena-contesto'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): pagina
// piena di fallback — stesso identico contenuto della route intercettata
// (@modal/(.)attivita/[attivitaId]/page.tsx), ma raggiunta quando l'URL
// viene caricato direttamente (refresh della pagina, link condiviso,
// apertura in una nuova scheda): Next.js non applica l'intercettazione in
// questi casi, la naviga come pagina vera a piena larghezza, non overlay.
// Nessun Modal/portal/backdrop qui — solo un contenitore con lo stesso
// header (pallino+nome) e bordo della modale, per continuità visiva, più un
// link "← Torna al Lavoro" (nessuna history da cui tornare indietro con
// Back se l'apertura è stata diretta). ContestoAttivitaPaginaPiena (wrapper
// client su ModalContestoStatico, vedi components/modal.tsx) fornisce
// comunque il Context che i componenti satellite esistenti si aspettano
// per "Annulla"/"Salva ed esci"/"Esci senza salvare" — senza, quei bottoni
// chiuderebbero solo il dialog interno senza portare l'utente da nessuna
// parte (ctx null → no-op).
export default async function AttivitaPaginaPiena({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; attivitaId: string }>
  searchParams: Promise<{ vista?: string }>
}) {
  const { id, attivitaId } = await params
  const { vista } = await searchParams
  const supabase = await createClient()

  const dati = await caricaDatiLavoroSatelliti(supabase, id)
  if (!dati) notFound()

  const isOwnerModale = dati.isOwnerEffettivo && vista === 'modifica'
  const risultato = costruisciContenutoAttivita(dati, attivitaId, isOwnerModale)
  if (!risultato) notFound()

  return (
    <div className={CONTENITORE_LARGO}>
      <div className="mb-4">
        <Link href={`/lavori/${id}`} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← Torna al Lavoro
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{titoloConPallino(risultato.nome, risultato.colore)}</p>
        </div>
        <div className="px-4 py-4">
          <ContestoAttivitaPaginaPiena lavoroId={id}>{risultato.contenuto}</ContestoAttivitaPaginaPiena>
        </div>
      </div>
    </div>
  )
}
