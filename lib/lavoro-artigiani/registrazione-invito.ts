'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type Anagrafica = {
  nome: string
  cognome: string
  ragioneSociale: string
  partitaIva: string
  specializzazione: string
  telefono: string
  via: string
  civico: string
  cap: string
  localita: string
  password: string
}

type RegistraResult =
  | { ok: true; invitoId: string }
  | { ok: false; error: string }

export async function registraDaInvito(token: string, fields: Anagrafica): Promise<RegistraResult> {
  const admin = createAdminClient()

  const { data: invito } = await admin
    .from('lavoro_artigiani')
    .select('id, artigiano_id, stato, scadenza_invito, email_invitata')
    .eq('token_invito', token)
    .single()

  if (!invito) return { ok: false, error: 'Invito non valido' }
  if (invito.artigiano_id) {
    return { ok: false, error: 'Hai già completato la registrazione, effettua il login' }
  }
  if (invito.stato !== 'invitato') return { ok: false, error: 'Invito non più valido' }
  if (invito.scadenza_invito && new Date(invito.scadenza_invito) < new Date()) {
    return { ok: false, error: 'Questo invito è scaduto' }
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invito.email_invitata,
    password: fields.password,
    email_confirm: true,
    user_metadata: {
      nome: fields.nome,
      cognome: fields.cognome,
      ragione_sociale: fields.ragioneSociale || null,
      partita_iva: fields.partitaIva || null,
      specializzazione: fields.specializzazione,
      telefono: fields.telefono,
      via: fields.via,
      civico: fields.civico,
      cap: fields.cap,
      localita: fields.localita,
    },
  })

  if (createErr || !created.user) {
    return {
      ok: false,
      error:
        createErr?.message === 'A user with this email address has already been registered'
          ? 'Esiste già un account con questa email'
          : 'Errore nella registrazione, riprova',
    }
  }

  const { error: linkErr } = await admin
    .from('lavoro_artigiani')
    .update({ artigiano_id: created.user.id })
    .eq('id', invito.id)

  if (linkErr) {
    const { error: deleteErr } = await admin.auth.admin.deleteUser(created.user.id)
    if (deleteErr) {
      console.error('Rollback utente orfano fallito dopo errore di collegamento invito:', deleteErr)
      return {
        ok: false,
        error: 'Errore nella registrazione. Contatta l’assistenza per completare l’invito.',
      }
    }
    return { ok: false, error: 'Errore nel collegamento al lavoro, riprova' }
  }

  return { ok: true, invitoId: invito.id }
}
