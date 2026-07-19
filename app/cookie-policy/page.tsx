import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CookiePolicyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Cookie Policy</h1>
      <p className="mt-3 text-sm text-gray-500">Contenuto in arrivo.</p>

      {!user && (
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary/90 transition-colors"
        >
          Home
        </Link>
      )}
    </div>
  )
}
