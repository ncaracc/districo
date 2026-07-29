'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type AzioneResult = { ok: true } | { ok: false; error: string }
type CreazioneResult = { ok: true; id: string } | { ok: false; error: string }

type FornitoreFields = { ragione_sociale: string; partita_iva: string | null }

type SedeFields = {
  nome: string
  indirizzo: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  sigla_provincia: string | null
  nazione: string | null
}

type ContattoFields = {
  nome: string
  cognome: string | null
  cellulare: string | null
  email: string | null
}

// fornitore/fornitore_sede/fornitore_sede_contatto sono condivisi tra tutti gli
// artigiani (RLS "for all using auth.uid() is not null", nessuna colonna
// artigiano_id): qualunque artigiano autenticato può censire/modificare, coerente
// col brief del 16/7. Nessun controllo di proprietà da fare qui.

export async function creaFornitore(fields: FornitoreFields): Promise<CreazioneResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.from('fornitore').insert(fields).select('id').single()

  if (error || !data) {
    console.error('creaFornitore: insert fallito', error)
    if (error?.code === '23505') {
      return { ok: false, error: 'Esiste già un fornitore con questa Partita IVA' }
    }
    return { ok: false, error: 'Errore nella creazione del fornitore, riprova' }
  }

  revalidatePath('/fornitori')
  return { ok: true, id: data.id }
}

export async function aggiornaFornitore(id: string, fields: FornitoreFields): Promise<CreazioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('fornitore').update(fields).eq('id', id)

  if (error) {
    console.error('aggiornaFornitore: update fallito', error)
    if (error.code === '23505') {
      return { ok: false, error: 'Esiste già un fornitore con questa Partita IVA' }
    }
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/fornitori')
  revalidatePath(`/fornitori/${id}`)
  return { ok: true, id }
}

export async function cercaFornitori(query: string): Promise<{ id: string; ragione_sociale: string; partita_iva: string | null }[]> {
  const q = query.trim()
  const supabase = await createClient()

  let sel = supabase.from('fornitore').select('id, ragione_sociale, partita_iva').order('ragione_sociale')
  if (q) sel = sel.ilike('ragione_sociale', `%${q}%`)

  const { data } = await sel
  return data ?? []
}

export async function creaSede(fornitoreId: string, fields: SedeFields): Promise<CreazioneResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fornitore_sede')
    .insert({ fornitore_id: fornitoreId, ...fields })
    .select('id')
    .single()

  if (error || !data) {
    console.error('creaSede: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione della sede, riprova' }
  }

  revalidatePath(`/fornitori/${fornitoreId}`)
  return { ok: true, id: data.id }
}

export async function aggiornaSede(sedeId: string, fornitoreId: string, fields: SedeFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('fornitore_sede').update(fields).eq('id', sedeId)

  if (error) {
    console.error('aggiornaSede: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/fornitori/${fornitoreId}`)
  return { ok: true }
}

// Smarca l'eventuale sede preferita precedente e marca la nuova in un'unica
// chiamata RPC (funzione `imposta_sede_preferita`, 0020) — non due update
// separati dal client, per non passare mai da uno stato intermedio con due
// sedi preferite o nessuna (il vincolo DB comunque lo impedirebbe).
export async function impostaSedePreferita(fornitoreId: string, sedeId: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('imposta_sede_preferita', {
    p_fornitore_id: fornitoreId,
    p_sede_id: sedeId,
  })

  if (error) {
    console.error('impostaSedePreferita: rpc fallita', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/fornitori/${fornitoreId}`)
  return { ok: true }
}

export async function eliminaSede(sedeId: string, fornitoreId: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('fornitore_sede').delete().eq('id', sedeId)

  if (error) {
    console.error('eliminaSede: delete fallito', error)
    return { ok: false, error: 'Errore nell\'eliminazione, riprova' }
  }

  revalidatePath(`/fornitori/${fornitoreId}`)
  return { ok: true }
}

export async function creaContatto(sedeId: string, fornitoreId: string, fields: ContattoFields): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('fornitore_sede_contatto').insert({ fornitore_sede_id: sedeId, ...fields })

  if (error) {
    console.error('creaContatto: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione del contatto, riprova' }
  }

  revalidatePath(`/fornitori/${fornitoreId}`)
  return { ok: true }
}

export async function aggiornaContatto(
  contattoId: string,
  fornitoreId: string,
  fields: ContattoFields,
): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('fornitore_sede_contatto').update(fields).eq('id', contattoId)

  if (error) {
    console.error('aggiornaContatto: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath(`/fornitori/${fornitoreId}`)
  return { ok: true }
}

export async function eliminaContatto(contattoId: string, fornitoreId: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('fornitore_sede_contatto').delete().eq('id', contattoId)

  if (error) {
    console.error('eliminaContatto: delete fallito', error)
    return { ok: false, error: 'Errore nell\'eliminazione, riprova' }
  }

  revalidatePath(`/fornitori/${fornitoreId}`)
  return { ok: true }
}

// Ricerca sedi fornitore per il form "aggiungi acquisto/lavorazione esterna" nel
// dettaglio Lavoro — join manuale in JS (niente embed PostgREST, coerente col resto
// del progetto: vedi database.types.ts, Relationships: []). Il catalogo condiviso
// resta di dimensioni contenute (fornitori censiti da tutti gli artigiani insieme,
// non per singolo artigiano), quindi si carica per intero e si filtra lato JS sia
// sulla ragione sociale del fornitore sia sul nome della sede.
export async function cercaFornitoreSedi(query: string): Promise<{ id: string; label: string }[]> {
  const q = query.trim().toLowerCase()
  const supabase = await createClient()

  const [{ data: fornitori }, { data: sedi }] = await Promise.all([
    supabase.from('fornitore').select('id, ragione_sociale'),
    supabase.from('fornitore_sede').select('id, fornitore_id, nome, citta').order('nome'),
  ])

  const ragioneSocialePerId = new Map((fornitori ?? []).map((f) => [f.id, f.ragione_sociale]))

  return (sedi ?? [])
    .map((s) => ({
      id: s.id,
      label: `${ragioneSocialePerId.get(s.fornitore_id) ?? '—'} — ${s.nome}${s.citta ? ` (${s.citta})` : ''}`,
    }))
    .filter((s) => !q || s.label.toLowerCase().includes(q))
    .slice(0, 20)
}
