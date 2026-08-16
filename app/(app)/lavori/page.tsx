import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNomeInvitante } from '@/lib/lavoro-artigiani/dettagli'
import { KpiDashboardCards } from '@/components/kpi-dashboard'
import { PillolaFlottante } from '@/components/pillola-flottante'
import { FiltroLavoriChip } from '@/components/filtro-lavori-chip'
import { LavoriListaFiltrata } from '@/components/lavori-lista-filtrata'
import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { InvitoPendingCard } from './invito-pending-card'
import { parseFiltro, pFiltroSql, ordinaLavori } from '@/lib/lavori/lista-filtri'

// Unificazione Dashboard + Conclusi (2026-08-16, vedi CLAUDE.md): questa
// pagina sostituisce sia la vecchia /lavori (Dashboard, sempre e solo
// stato in opportunita/accettato) sia /statistiche (Conclusi, rimossa —
// vedi middleware.ts per il redirect dei vecchi bookmark). Un solo filtro
// di stato alla volta via searchParams (`filtro`), passato a
// lavori_dashboard(p_filtro) — RPC parametrizzata invece di due query
// separate quasi identiche (verificato in fase di analisi preliminare:
// era la vera duplicazione da consolidare). La ricerca cliente
// (`cliente`) filtra la lista lato client (LavoriListaFiltrata) sul
// risultato già caricato per questo filtro — non altera l'ordinamento né
// i KPI, che restano scoped al solo filtro di stato come richiesto.
export default async function LavoriPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; cliente?: string }>
}) {
  const { filtro: filtroParam, cliente: clienteParam } = await searchParams
  const filtro = parseFiltro(filtroParam)
  const clienteQuery = clienteParam ?? ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: inviti } = await supabase
    .from('lavoro_artigiani')
    .select('id, lavoro_id')
    .eq('artigiano_id', user.id)
    .eq('stato', 'invitato')

  const admin = createAdminClient()
  const invitiConDettagli = await Promise.all(
    (inviti ?? []).map(async (invito) => {
      const [{ data: lavoro }, nomeInvitante] = await Promise.all([
        admin.from('lavoro').select('titolo').eq('id', invito.lavoro_id).single(),
        getNomeInvitante(admin, invito.lavoro_id),
      ])
      return { id: invito.id, lavoroTitolo: lavoro?.titolo ?? 'Lavoro', nomeInvitante }
    }),
  )

  const [{ data: lavoriGrezzi }, { data: kpiGrezzo }] = await Promise.all([
    supabase.rpc('lavori_dashboard', { p_filtro: pFiltroSql(filtro) }),
    supabase.rpc('kpi_dashboard'),
  ])
  const kpi = kpiGrezzo?.[0] ?? null
  const lavoriNonOrdinati = lavoriGrezzi ?? []

  // Ordinamento — dipende dal filtro attivo (deciso con l'utente in
  // sessione, vedi CLAUDE.md e lib/lavori/lista-filtri.ts). Il filtro
  // "conclusi" richiede chiusura_data (vive su lavoro_satellite, non su
  // una colonna diretta di lavoro) — stessa query mirata già in uso nella
  // vecchia pagina Conclusi, eseguita solo quando serve davvero.
  let chiusuraDataPerLavoroId = new Map<string, string | null>()
  if (filtro === 'conclusi') {
    const lavoroIds = lavoriNonOrdinati.map((l) => l.id)
    const { data: chiusure } =
      lavoroIds.length > 0
        ? await supabase.from('lavoro_satellite').select('lavoro_id, chiusura_data').eq('tipo', 'chiusura').in('lavoro_id', lavoroIds)
        : { data: [] }
    chiusuraDataPerLavoroId = new Map((chiusure ?? []).map((c) => [c.lavoro_id, c.chiusura_data]))
  }
  const lavori = ordinaLavori(lavoriNonOrdinati, filtro, chiusuraDataPerLavoroId)

  const clienteIds = [...new Set(lavori.map((l) => l.cliente_id))]
  const { data: clienti } =
    clienteIds.length > 0
      ? await supabase.from('cliente').select('id, nome').in('id', clienteIds)
      : { data: [] }
  const nomeClientePerId: Record<string, string> = {}
  for (const c of clienti ?? []) nomeClientePerId[c.id] = c.nome

  return (
    // Contenitore largo (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts).
    <div className={CONTENITORE_LARGO}>
      {/* pb-24: spazio riservato in fondo alla pagina perché la pillola
          "Nuovo lavoro" (fixed, sempre visibile) non copra mai l'ultima
          riga/card della lista durante lo scroll. */}
      <div className="pb-24">
        {invitiConDettagli.length > 0 && (
          <div className="mb-6 space-y-3">
            {invitiConDettagli.map((invito) => (
              <InvitoPendingCard key={invito.id} {...invito} />
            ))}
          </div>
        )}

        <h1 className="mb-6 text-2xl font-bold text-gray-900">Lavori</h1>

        <PillolaFlottante href="/lavori/nuovo">Nuovo lavoro</PillolaFlottante>

        <FiltroLavoriChip filtro={filtro} cliente={clienteQuery} />

        <KpiDashboardCards kpi={kpi} filtro={filtro} conteggio={lavori.length} />

        <LavoriListaFiltrata
          lavori={lavori}
          nomeClientePerId={nomeClientePerId}
          filtro={filtro}
          clienteQueryIniziale={clienteQuery}
        />
      </div>
    </div>
  )
}
