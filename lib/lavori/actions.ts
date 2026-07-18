'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type LavoroResult = { ok: true; id: string } | { ok: false; error: string }
type AzioneResult = { ok: true } | { ok: false; error: string }

export async function creaLavoro(
  clienteId: string,
  fields: { titolo: string; descrizione: string | null },
): Promise<LavoroResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { data: lavoro, error: lavoroErr } = await supabase
    .from('lavoro')
    .insert({ cliente_id: clienteId, titolo: fields.titolo, descrizione: fields.descrizione })
    .select('id')
    .single()

  if (lavoroErr || !lavoro) return { ok: false, error: 'Errore nella creazione del lavoro, riprova' }

  const { error: laErr } = await supabase.from('lavoro_artigiani').insert({
    lavoro_id: lavoro.id,
    artigiano_id: user.id,
    email_invitata: user.email!,
    ruolo: 'owner',
    stato: 'accettato',
  })

  if (laErr) {
    // Rollback col client admin: senza la riga owner il lavoro resterebbe orfano e
    // invisibile a chiunque (tutte le policy su lavoro passano da lavoro_artigiani),
    // quindi non cancellabile con un insert/delete autenticato normale.
    const admin = createAdminClient()
    await admin.from('lavoro').delete().eq('id', lavoro.id)
    return { ok: false, error: 'Errore nel collegamento del lavoro, riprova' }
  }

  revalidatePath('/lavori')
  revalidatePath(`/clienti/${clienteId}`)
  return { ok: true, id: lavoro.id }
}

export async function segnaLavoroAccettato(lavoroId: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lavoro')
    .update({ accettato_at: new Date().toISOString(), stato: 'esecuzione' })
    .eq('id', lavoroId)

  if (error) return { ok: false, error: 'Errore, riprova' }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}

type TipoAttivita = 'briefing' | 'progetto' | 'preventivo' | 'sopralluogo' | 'campioni'

export async function creaAttivita(
  lavoroId: string,
  fields: {
    tipo: TipoAttivita
    dataAppuntamento: string | null
    commenti: string | null
    importo: number | null
  },
): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('attivita').insert({
    lavoro_id: lavoroId,
    tipo: fields.tipo,
    data_appuntamento: fields.dataAppuntamento,
    commenti: fields.commenti,
    importo: fields.tipo === 'preventivo' ? fields.importo : null,
  })

  if (error) return { ok: false, error: 'Errore nella creazione dell’attività, riprova' }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}

export async function aggiornaAttivita(
  attivitaId: string,
  lavoroId: string,
  patch: { stato?: 'da_fare' | 'in_corso' | 'bloccata' | 'fatta'; commenti?: string | null },
): Promise<AzioneResult> {
  const supabase = await createClient()
  const update = {
    ...patch,
    ...(patch.stato === 'fatta' ? { data_chiusura: new Date().toISOString() } : {}),
  }

  const { error } = await supabase.from('attivita').update(update).eq('id', attivitaId)

  if (error) return { ok: false, error: 'Errore nel salvataggio, riprova' }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}

export async function nuovaRevisionePreventivo(
  lavoroId: string,
  attivitaPrecedenteId: string,
  fields: { importo: number | null; commenti: string | null },
): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('attivita').insert({
    lavoro_id: lavoroId,
    tipo: 'preventivo',
    revisione_di: attivitaPrecedenteId,
    importo: fields.importo,
    commenti: fields.commenti,
  })

  if (error) return { ok: false, error: 'Errore nella creazione della revisione, riprova' }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}
