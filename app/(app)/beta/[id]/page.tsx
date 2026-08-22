import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { risolviNomiAutori } from '@/lib/beta/nomi-autori'
import { STATO_POST_BETA_LABEL, STATO_POST_BETA_COLORE } from '@/lib/beta/stato'
import { MessaggioForm } from '@/components/beta/messaggio-form'
import { ModerazionePost } from '@/components/beta/moderazione-post'
import { NascondiMessaggioButton } from '@/components/beta/nascondi-messaggio-button'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Dettaglio thread beta (2026-08-22, vedi CLAUDE.md). La RLS di
// post_beta/messaggio_beta (migration 0062) fa già rispettare la
// visibilità (un beta tester non riesce a leggere un post/messaggio
// nascosto — la query restituisce semplicemente niente, da qui il
// `notFound()`, coerente col principio "nessun errore che riveli
// l'esistenza" già in uso per /admin).
//
// Chi può scrivere ORA: l'autore originale del post (follow-up sul
// proprio post) o l'admin (risponde a qualunque post), e solo se il post
// è ancora 'aperto' — stessa condizione già imposta dalla RLS
// sull'INSERT, ricalcolata qui solo per decidere se mostrare il form,
// non per l'autorizzazione vera e propria (quella resta sempre la RLS).
//
// Firma admin: nessuna logica speciale — il nome mostrato è sempre
// `nomiAutori.get(autore_id)`, che per l'admin risolve al suo nome reale
// (via beta_nomi_autori()), mai un'etichetta generica "Admin"/"Districo".
export default async function BetaThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  const isAdmin = !!artigiano?.is_admin

  const { data: post } = await supabase
    .from('post_beta')
    .select('id, titolo, stato, artigiano_id, created_at, nascosto')
    .eq('id', id)
    .maybeSingle()

  if (!post) notFound()

  const { data: messaggi } = await supabase
    .from('messaggio_beta')
    .select('id, autore_id, testo, created_at, nascosto')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const nomiAutori = await risolviNomiAutori(supabase, [
    post.artigiano_id,
    ...(messaggi ?? []).map((m) => m.autore_id),
  ])

  const puoScrivere = post.stato === 'aperto' && (post.artigiano_id === user.id || isAdmin)

  return (
    <div className={CONTENITORE_STRETTO}>
      <Link href="/beta" className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-900">
        ← Beta Tester
      </Link>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{post.titolo}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {nomiAutori.get(post.artigiano_id) ?? '—'} · {new Date(post.created_at).toLocaleString('it-IT')}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            STATO_POST_BETA_COLORE[post.stato] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {STATO_POST_BETA_LABEL[post.stato] ?? post.stato}
        </span>
      </div>

      {isAdmin && (
        <div className="mb-6">
          <ModerazionePost postId={post.id} stato={post.stato} nascosto={post.nascosto} />
        </div>
      )}

      <ul className="space-y-4">
        {(messaggi ?? []).map((m) => (
          <li
            key={m.id}
            className={`rounded-lg border p-4 ${
              m.nascosto ? 'border-dashed border-gray-300 bg-gray-50 opacity-60' : 'border-gray-200'
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900">{nomiAutori.get(m.autore_id) ?? '—'}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleString('it-IT')}</span>
                {isAdmin && (
                  <NascondiMessaggioButton messaggioId={m.id} postId={post.id} nascosto={m.nascosto} />
                )}
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{m.testo}</p>
          </li>
        ))}
      </ul>

      {puoScrivere && (
        <div className="mt-6">
          <MessaggioForm postId={post.id} isAdmin={isAdmin} />
        </div>
      )}

      {!puoScrivere && post.stato === 'chiuso' && (
        <p className="mt-6 text-sm text-gray-500">Questo post è chiuso.</p>
      )}
    </div>
  )
}
