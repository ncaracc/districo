import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { risolviNomiAutori } from '@/lib/beta/nomi-autori'
import { STATO_POST_BETA_LABEL, STATO_POST_BETA_COLORE } from '@/lib/beta/stato'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Lista post del forum beta (2026-08-22, vedi CLAUDE.md). Protetta da
// app/(app)/beta/layout.tsx (beta_tester o admin). La RLS di post_beta
// filtra già cosa la query può vedere (non nascosti per un beta tester,
// tutto per l'admin) — nessun filtro aggiuntivo lato client necessario
// per la visibilità, solo per l'ordinamento.
//
// Ordinata per ATTIVITÀ più recente (ultimo messaggio non nascosto), non
// per data di creazione — richiesto esplicitamente. Nessun embed
// PostgREST (mai usato in questo progetto, vedi CLAUDE.md 19/8): query
// separate per post/messaggi/nomi autore, merge lato JS.
export default async function BetaListaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: artigiano } = user
    ? await supabase.from('artigiano').select('is_admin').eq('id', user.id).maybeSingle()
    : { data: null }
  const isAdmin = !!artigiano?.is_admin

  const [{ data: posts }, { data: messaggi }] = await Promise.all([
    supabase.from('post_beta').select('id, titolo, stato, created_at, artigiano_id, nascosto'),
    supabase.from('messaggio_beta').select('post_id, created_at, nascosto'),
  ])

  const nomiAutori = await risolviNomiAutori(supabase, (posts ?? []).map((p) => p.artigiano_id))

  // Ultima attività = messaggio non nascosto più recente per post — un
  // post nascosto ha comunque i propri messaggi esclusi qui sotto perché
  // `nascosto` sul messaggio è indipendente da quello del post, ma la
  // riga stessa del post nascosto viene comunque filtrata dalla RLS per
  // un beta tester (non arriva nemmeno in `posts`).
  const ultimaAttivitaPerPost = new Map<string, string>()
  for (const m of messaggi ?? []) {
    if (m.nascosto) continue
    const attuale = ultimaAttivitaPerPost.get(m.post_id)
    if (!attuale || m.created_at > attuale) ultimaAttivitaPerPost.set(m.post_id, m.created_at)
  }

  const postiOrdinati = (posts ?? [])
    .map((p) => ({
      ...p,
      ultimaAttivita: ultimaAttivitaPerPost.get(p.id) ?? p.created_at,
      autoreNome: nomiAutori.get(p.artigiano_id) ?? '—',
    }))
    .sort((a, b) => (a.ultimaAttivita < b.ultimaAttivita ? 1 : -1))

  return (
    <div className={CONTENITORE_STRETTO}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Beta Tester</h1>
          <p className="mt-1 text-sm text-gray-500">
            Community beta — domande, segnalazioni, richieste. Visibile a tutti i beta tester.
          </p>
        </div>
        <Link
          href="/beta/nuovo"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Nuovo post
        </Link>
      </div>

      {postiOrdinati.length === 0 && (
        <p className="text-sm text-gray-500">Nessun post ancora — sii il primo a scrivere.</p>
      )}

      {postiOrdinati.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {postiOrdinati.map((p) => (
            <li key={p.id}>
              <Link
                href={`/beta/${p.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {p.titolo}
                    {isAdmin && p.nascosto && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        nascosto
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-gray-500">
                    {p.autoreNome} · {new Date(p.ultimaAttivita).toLocaleString('it-IT')}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATO_POST_BETA_COLORE[p.stato] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATO_POST_BETA_LABEL[p.stato] ?? p.stato}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
