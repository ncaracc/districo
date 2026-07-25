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

// Transizione manuale opportunità -> accettato/rifiutato. Nessun vincolo sullo stato
// dei satelliti di trattativa (coerente con "transizioni sempre manuali" della
// revisione 2026-07-25 e con la filosofia già in uso per il vecchio gate "lavoro
// accettato": l'artigiano decide, il sistema non blocca in base a condizioni
// automatiche). `accettato_at` continua a essere popolato per continuità con la UI
// esistente, pur essendo ora ridondante con stato='accettato'.
export async function segnaLavoroStato(
  lavoroId: string,
  nuovoStato: 'accettato' | 'rifiutato',
): Promise<AzioneResult> {
  const supabase = await createClient()

  const update: { stato: 'accettato' | 'rifiutato'; accettato_at?: string } = { stato: nuovoStato }
  if (nuovoStato === 'accettato') update.accettato_at = new Date().toISOString()

  const { error } = await supabase.from('lavoro').update(update).eq('id', lavoroId)

  if (error) {
    console.error('segnaLavoroStato: update fallito', error)
    return { ok: false, error: 'Errore, riprova' }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  revalidatePath('/lavori')
  return { ok: true }
}
