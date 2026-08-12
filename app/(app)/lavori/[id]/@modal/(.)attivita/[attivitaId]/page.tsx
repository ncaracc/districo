import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { caricaDatiLavoroSatelliti } from '@/lib/lavori/dettaglio-lavoro-data'
import { costruisciContenutoAttivita, titoloConPallino } from '@/lib/lavori/satelliti-render'
import { AttivitaModaleRoute } from '@/components/attivita-modale-route'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): route
// intercettata — (.) intercetta la navigazione verso
// /lavori/[id]/attivita/[attivitaId] quando avviene "da dentro l'app" (soft
// navigation via router.push/Link a partire da /lavori/[id], vedi
// lavoro-satelliti-tabella.tsx), mostrandola come overlay sopra la pagina
// Lavoro sottostante (che resta montata invariata nello slot children dello
// stesso layout — questa è la proprietà che rende gratuito il ripristino
// dello scroll, vedi CLAUDE.md punto delicato #2). Un'apertura diretta
// dell'URL (refresh, link condiviso) NON passa da qui: Next.js renderizza
// invece la pagina piena in attivita/[attivitaId]/page.tsx (fallback, stesso
// livello di cartella ma fuori da @modal).
//
// ?vista=modifica (query string, non un secondo segmento di route): stessa
// distinzione sola-lettura/modifica di sempre (click sul nome vs sulla
// matita, vedi lavoro-satelliti-tabella.tsx) — un solo file di route serve
// entrambe le viste, la differenza è solo quale isOwner effettivo viene
// passato al componente satellite già esistente (invariato).
export default async function ModaleAttivitaPage({
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
    <AttivitaModaleRoute titolo={titoloConPallino(risultato.nome, risultato.colore)}>
      {risultato.contenuto}
    </AttivitaModaleRoute>
  )
}
