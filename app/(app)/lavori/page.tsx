import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNomeInvitante } from '@/lib/lavoro-artigiani/dettagli'
import { InvitoPendingCard } from './invito-pending-card'

const STATO_LABEL: Record<string, string> = {
  opportunita: 'Opportunità',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

const DOT_COLOR = { rosso: 'bg-red-500', giallo: 'bg-yellow-500', verde: 'bg-green-500' } as const

function RiepilogoSatelliti({
  rossi,
  gialli,
  verdi,
}: {
  rossi: number
  gialli: number
  verdi: number
}) {
  if (rossi + gialli + verdi === 0) {
    return <span className="text-xs text-gray-400">Nessun satellite</span>
  }
  return (
    <div className="flex items-center gap-3 text-xs text-gray-600">
      {rossi > 0 && (
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${DOT_COLOR.rosso}`} />
          {rossi}
        </span>
      )}
      {gialli > 0 && (
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${DOT_COLOR.giallo}`} />
          {gialli}
        </span>
      )}
      {verdi > 0 && (
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${DOT_COLOR.verde}`} />
          {verdi}
        </span>
      )}
    </div>
  )
}

export default async function LavoriPage() {
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

  const { data: lavori } = await supabase.rpc('lavori_dashboard')

  const clienteIds = [...new Set((lavori ?? []).map((l) => l.cliente_id))]

  const { data: clienti } =
    clienteIds.length > 0
      ? await supabase.from('cliente').select('id, nome').in('id', clienteIds)
      : { data: [] }
  const nomeClientePerId = new Map((clienti ?? []).map((c) => [c.id, c.nome]))

  return (
    // "Breakout" dal max-w-2xl del layout condiviso (app/(app)/layout.tsx):
    // solo questa pagina deve usare la larghezza piena su desktop, le altre
    // (Clienti, Fornitori, dettaglio Lavoro, Profilo, Statistiche/Lavori
    // conclusi) restano centrate come oggi — non si tocca il layout comune.
    // Attivo solo da lg: in su (non solo per lo scope della richiesta, che
    // riguarda esplicitamente "schermi desktop ampi": <main> vive dentro un
    // contenitore flex-col nel root layout, quindi con overflow:visible il
    // suo min-width automatico segue il min-content dei figli — sotto lg,
    // dove il vincolo max-w-2xl non è comunque mai il fattore stringente,
    // attivare il breakout costringerebbe <main> oltre la viewport reale.
    <div className="lg:relative lg:left-1/2 lg:w-screen lg:-translate-x-1/2">
      <div className="lg:px-12">
        {invitiConDettagli.length > 0 && (
          <div className="mb-6 space-y-3">
            {invitiConDettagli.map((invito) => (
              <InvitoPendingCard key={invito.id} {...invito} />
            ))}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Link
            href="/lavori/nuovo"
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            + Nuovo Lavoro
          </Link>
        </div>

        {!lavori || lavori.length === 0 ? (
          <p className="text-sm text-gray-500">Non hai ancora nessun lavoro aperto.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Descrizione</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Semafori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lavori.map((l) => (
                  <tr key={l.id} className="group">
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 text-gray-500 transition-colors group-hover:bg-gray-50">
                        {nomeClientePerId.get(l.cliente_id)}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 font-medium text-gray-900 transition-colors group-hover:bg-gray-50">
                        {l.titolo}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 transition-colors group-hover:bg-gray-50">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {STATO_LABEL[l.stato] ?? l.stato}
                        </span>
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 transition-colors group-hover:bg-gray-50">
                        <RiepilogoSatelliti
                          rossi={l.satelliti_rossi}
                          gialli={l.satelliti_gialli}
                          verdi={l.satelliti_verdi}
                        />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
