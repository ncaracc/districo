import { createAdminClient } from '@/lib/supabase/admin'
import { RegistrazioneForm } from './registrazione-form'

export default async function RegistrazionePage() {
  const admin = createAdminClient()
  const { data: specializzazioni } = await admin
    .from('specializzazione')
    .select('valore')
    .eq('ufficiale', true)
    .order('valore')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Registrati</h1>
        <p className="mt-1 text-sm text-gray-500">Crea il tuo account artigiano su Districo</p>
      </div>

      <RegistrazioneForm specializzazioni={(specializzazioni ?? []).map((s) => s.valore)} />

      <p className="mt-6 text-center text-sm text-gray-500">
        Hai già un account?{' '}
        <a href="/login" className="font-medium text-gray-900 underline underline-offset-2">
          Accedi
        </a>
      </p>
    </div>
  )
}
