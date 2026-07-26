import { createClient } from '@/lib/supabase/server'
import { ProfiloSmtpForm } from '@/components/profilo-smtp-form'

export default async function ProfiloImpostazioniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: artigiano } = user
    ? await supabase
        .from('artigiano')
        .select('smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profilo / Impostazioni</h1>
        <p className="mt-1 text-sm text-gray-500">
          Credenziali email personali, usate per inviare gli ordini ad Acquisti e Lavorazione esterna. Il
          mittente reale sarà questo indirizzo, non un indirizzo di sistema.
        </p>
      </div>

      <ProfiloSmtpForm
        initialValues={{
          host: artigiano?.smtp_host ?? '',
          porta: artigiano?.smtp_porta ? String(artigiano.smtp_porta) : '',
          username: artigiano?.smtp_username ?? '',
          sicurezza: artigiano?.smtp_sicurezza ?? 'starttls',
        }}
        configurata={!!artigiano?.smtp_password_cifrata}
      />
    </div>
  )
}
