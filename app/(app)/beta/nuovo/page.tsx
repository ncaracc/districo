import Link from 'next/link'
import { NuovoPostForm } from '@/components/beta/nuovo-post-form'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

export default function BetaNuovoPostPage() {
  return (
    <div className={CONTENITORE_STRETTO}>
      <Link href="/beta" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-900">
        ← Beta Tester
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Nuovo post</h1>
      <NuovoPostForm />
    </div>
  )
}
