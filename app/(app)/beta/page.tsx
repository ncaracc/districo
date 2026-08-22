import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { risolviNomiAutori } from '@/lib/beta/nomi-autori'
import { STATO_POST_BETA_LABEL, STATO_POST_BETA_COLORE } from '@/lib/beta/stato'
import { MiniSitoBeta } from '@/components/beta/mini-sito-beta'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Punto di ingresso UNICO al programma beta (2026-08-22, esteso lo stesso
// giorno rispetto alla prima versione — vedi CLAUDE.md): raggiungibile da
// TUTTI gli artigiani autenticati, non solo da chi ha già `beta_tester=
// true`. Chi ha accesso vede il forum esistente (invariato); chi non ce
// l'ha ancora vede un mini-sito informativo con lo stato dei posti e,
// quando disponibili, un bottone per richiederne uno. `/beta/[id]` e
// `/beta/nuovo` restano invece riservati (guard in `lib/beta/guard.ts`) —
// solo QUESTA pagina è aperta a chiunque, per poter mostrare il
// mini-sito a chi non ha ancora accesso.
export default async function BetaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('beta_tester, is_admin, richiesta_beta_at')
    .eq('id', user.id)
    .maybeSingle()

  const haAccesso = !!artigiano?.beta_tester || !!artigiano?.is_admin

  if (!haAccesso) {
    const { data: posti } = await supabase.rpc('beta_posti_disponibili')
    const riga = posti?.[0]
    return (
      <MiniSitoBeta
        disponibili={riga?.disponibili ?? 0}
        totali={riga?.totali ?? 0}
        richiestaBetaAt={artigiano?.richiesta_beta_at ?? null}
      />
    )
  }

  return <ForumBetaLista supabase={supabase} isAdmin={!!artigiano?.is_admin} />
}

// Lista post del forum beta — invariata rispetto a prima dell'estensione
// a mini-sito, solo estratta in una funzione a sé per il branching sopra.
// La RLS di post_beta filtra già cosa la query può vedere (non nascosti
// per un beta tester, tutto per l'admin) — nessun filtro aggiuntivo lato
// client necessario per la visibilità, solo per l'ordinamento.
//
// Ordinata per ATTIVITÀ più recente (ultimo messaggio non nascosto), non
// per data di creazione — richiesto esplicitamente. Nessun embed
// PostgREST (mai usato in questo progetto, vedi CLAUDE.md 19/8): query
// separate per post/messaggi/nomi autore, merge lato JS.
async function ForumBetaLista({
  supabase,
  isAdmin,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  isAdmin: boolean
}) {
  const [{ data: posts }, { data: messaggi }] = await Promise.all([
    supabase.from('post_beta').select('id, titolo, stato, created_at, artigiano_id, nascosto'),
    supabase.from('messaggio_beta').select('post_id, created_at, nascosto'),
  ])

  const nomiAutori = await risolviNomiAutori(supabase, (posts ?? []).map((p) => p.artigiano_id))

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
