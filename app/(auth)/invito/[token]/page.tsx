import { createAdminClient } from '@/lib/supabase/admin'
import { getNomeInvitante } from '@/lib/lavoro-artigiani/dettagli'
import { InvitoForm } from './invito-form'

export default async function InvitoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invito } = await admin
    .from('lavoro_artigiani')
    .select('id, lavoro_id, email_invitata, artigiano_id, stato, scadenza_invito')
    .eq('token_invito', token)
    .maybeSingle()

  if (!invito) {
    return <MessaggioInvito titolo="Invito non valido">
      Questo link di invito non esiste o non è più valido.
    </MessaggioInvito>
  }

  if (invito.artigiano_id) {
    return (
      <MessaggioInvito titolo="Registrazione già completata">
        Hai già completato la registrazione con questo invito.{' '}
        <a href="/login" className="underline underline-offset-2">Accedi</a> per continuare.
      </MessaggioInvito>
    )
  }

  if (invito.stato !== 'invitato') {
    return (
      <MessaggioInvito titolo="Invito non più valido">
        Questo invito è già stato {invito.stato === 'accettato' ? 'accettato' : 'rifiutato'}.
      </MessaggioInvito>
    )
  }

  if (invito.scadenza_invito && new Date(invito.scadenza_invito) < new Date()) {
    return (
      <MessaggioInvito titolo="Invito scaduto">
        Questo invito è scaduto. Chiedi a chi ti ha invitato di rimandartelo.
      </MessaggioInvito>
    )
  }

  const [{ data: lavoro }, { data: specializzazioni }] = await Promise.all([
    admin.from('lavoro').select('titolo').eq('id', invito.lavoro_id).single(),
    admin.from('specializzazione').select('valore').eq('ufficiale', true).order('valore'),
  ])

  const nomeInvitante = await getNomeInvitante(admin, invito.lavoro_id)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sei stato invitato</h1>
        <p className="mt-1 text-sm text-gray-500">
          {nomeInvitante} ti ha invitato a collaborare al lavoro
          {lavoro ? <> &ldquo;<strong>{lavoro.titolo}</strong>&rdquo;</> : ''} su Districo.
          Completa la registrazione per accettare.
        </p>
      </div>

      <InvitoForm
        token={token}
        email={invito.email_invitata}
        invitoId={invito.id}
        specializzazioni={(specializzazioni ?? []).map((s) => s.valore)}
      />
    </div>
  )
}

function MessaggioInvito({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{titolo}</h1>
      <p className="text-sm text-gray-600">{children}</p>
    </div>
  )
}
