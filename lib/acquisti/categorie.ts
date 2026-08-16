'use server'

// Categorie acquisto libere per artigiano (tabella categoria_acquisto,
// esistente dalla 0001 ma mai usata fino alla revisione satelliti del 1/8):
// sostituiscono il vecchio enum chiuso materiale/ferramenta di
// lavoro_satellite.acquisto_categoria, ora testo libero. RLS "categoria_
// acquisto: solo proprietario" già esistente, nessuna migrazione necessaria.
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type AzioneResult = { ok: true } | { ok: false; error: string }

export async function creaCategoriaAcquisto(nome: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const nomePulito = nome.trim()
  if (!nomePulito) return { ok: false, error: 'Il nome della categoria è obbligatorio' }

  const { error } = await supabase.from('categoria_acquisto').insert({ artigiano_id: user.id, nome: nomePulito })

  if (error) {
    console.error('creaCategoriaAcquisto: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath('/catalogo')
  return { ok: true }
}

// Nessun vincolo FK su lavoro_satellite.acquisto_categoria (è testo libero,
// non una foreign key): eliminare una categoria non tocca gli ordini
// esistenti che la usano, restano semplicemente col loro testo storico.
export async function eliminaCategoriaAcquisto(id: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('categoria_acquisto').delete().eq('id', id)

  if (error) {
    console.error('eliminaCategoriaAcquisto: delete fallito', error)
    return { ok: false, error: "Errore nell'eliminazione, riprova" }
  }

  revalidatePath('/catalogo')
  return { ok: true }
}
