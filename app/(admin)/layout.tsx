import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('is_admin')
    .eq('id', user.id)
    .single<{ is_admin: boolean }>()

  if (!artigiano?.is_admin) redirect('/lavori')

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
