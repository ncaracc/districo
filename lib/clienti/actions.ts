'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ClienteFields = {
  nome: string
  telefono: string | null
  email: string | null
  indirizzo: string | null
  note: string | null
}

type ClienteResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function creaCliente(fields: ClienteFields): Promise<ClienteResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { data, error } = await supabase
    .from('cliente')
    .insert({ artigiano_id: user.id, ...fields })
    .select('id')
    .single()

  if (error || !data) return { ok: false, error: 'Errore nella creazione del cliente, riprova' }

  revalidatePath('/clienti')
  return { ok: true, id: data.id }
}

export async function cercaClienti(query: string): Promise<{ id: string; nome: string }[]> {
  const q = query.trim()
  if (!q) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('cliente')
    .select('id, nome')
    .ilike('nome', `%${q}%`)
    .order('nome')
    .limit(10)

  return data ?? []
}

export async function aggiornaCliente(id: string, fields: ClienteFields): Promise<ClienteResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { error } = await supabase.from('cliente').update(fields).eq('id', id)

  if (error) return { ok: false, error: 'Errore nel salvataggio, riprova' }

  revalidatePath('/clienti')
  revalidatePath(`/clienti/${id}`)
  return { ok: true, id }
}
