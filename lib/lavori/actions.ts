'use server'

import { randomUUID } from 'crypto'
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

  // L'id viene generato qui invece di farselo restituire dall'insert (RETURNING):
  // finché la riga owner in lavoro_artigiani non esiste (statement successivo), il nuovo
  // lavoro non soddisfa ancora la propria policy SELECT (is_artigiano_del_lavoro) — e
  // Postgres richiede che una INSERT ... RETURNING soddisfi anche quella, non solo il
  // WITH CHECK dell'INSERT. Senza RETURNING quel controllo aggiuntivo non scatta.
  const lavoroId = randomUUID()

  const { error: lavoroErr } = await supabase
    .from('lavoro')
    .insert({ id: lavoroId, cliente_id: clienteId, titolo: fields.titolo, descrizione: fields.descrizione })

  if (lavoroErr) {
    console.error('creaLavoro: insert su lavoro fallito', lavoroErr)
    return {
      ok: false,
      error: `Errore nella creazione del lavoro: ${lavoroErr.message}`,
    }
  }

  const { error: laErr } = await supabase.from('lavoro_artigiani').insert({
    lavoro_id: lavoroId,
    artigiano_id: user.id,
    email_invitata: user.email!,
    ruolo: 'owner',
    stato: 'accettato',
  })

  if (laErr) {
    console.error('creaLavoro: insert owner su lavoro_artigiani fallito', laErr)
    // Rollback col client admin: senza la riga owner il lavoro resterebbe orfano e
    // invisibile a chiunque (tutte le policy su lavoro passano da lavoro_artigiani),
    // quindi non cancellabile con un insert/delete autenticato normale.
    const admin = createAdminClient()
    await admin.from('lavoro').delete().eq('id', lavoroId)
    return {
      ok: false,
      error: `Errore nel collegamento del lavoro: ${laErr.message}`,
    }
  }

  revalidatePath('/lavori')
  revalidatePath(`/clienti/${clienteId}`)
  return { ok: true, id: lavoroId }
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
