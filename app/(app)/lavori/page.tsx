import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNomeInvitante } from '@/lib/lavoro-artigiani/dettagli'
import { KpiDashboardCards } from '@/components/kpi-dashboard'
import { LavoroEliminaBottone } from '@/components/lavoro-elimina-bottone'
import { IconaCalendario } from '@/components/icons'
import { formattaValuta } from '@/lib/formato-valuta'
import { InvitoPendingCard } from './invito-pending-card'

const STATO_LABEL: Record<string, string> = {
  opportunita: 'Opportunità',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
  completato: 'Completato',
}

const DOT_COLOR = { rosso: 'bg-red-500', giallo: 'bg-yellow-500', verde: 'bg-green-500' } as const

// Sprint E (2026-08-03): il numero va dentro il pallino, non più a fianco.
// h-6 w-6 (era il pallino decorativo h-2 w-2) per restare leggibile anche
// con due cifre — verificato visivamente in fase di test con un lavoro a
// doppia cifra (vedi CLAUDE.md).
function BadgeConteggio({ colore, valore }: { colore: keyof typeof DOT_COLOR; valore: number }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white ${DOT_COLOR[colore]}`}
    >
      {valore}
    </span>
  )
}

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
    return <span className="text-xs text-gray-400">Nessuna attività</span>
  }
  return (
    <div className="flex items-center gap-2">
      {rossi > 0 && <BadgeConteggio colore="rosso" valore={rossi} />}
      {gialli > 0 && <BadgeConteggio colore="giallo" valore={gialli} />}
      {verdi > 0 && <BadgeConteggio colore="verde" valore={verdi} />}
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

  const [{ data: lavori }, { data: kpiGrezzo }] = await Promise.all([
    supabase.rpc('lavori_dashboard'),
    supabase.rpc('kpi_dashboard'),
  ])
  const kpi = kpiGrezzo?.[0] ?? null

  const clienteIds = [...new Set((lavori ?? []).map((l) => l.cliente_id))]

  const { data: clienti } =
    clienteIds.length > 0
      ? await supabase.from('cliente').select('id, nome').in('id', clienteIds)
      : { data: [] }
  const nomeClientePerId = new Map((clienti ?? []).map((c) => [c.id, c.nome]))

  return (
    // "Breakout" dal max-w-2xl del layout condiviso (app/(app)/layout.tsx):
    // questa pagina e /statistiche (Conclusi) usano la larghezza piena su
    // desktop, le altre (Clienti, Fornitori, dettaglio Lavoro, Profilo)
    // restano centrate come oggi — non si tocca il layout comune.
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
            Nuovo Lavoro
          </Link>
        </div>

        <KpiDashboardCards kpi={kpi} />

        {!lavori || lavori.length === 0 ? (
          <p className="text-sm text-gray-500">Non hai ancora nessun lavoro aperto.</p>
        ) : (
          <>
            {/* Sprint E (2026-08-03): card impilate su mobile, stesse 6 info
                della tabella desktop (Cliente/Descrizione/Stato/Avanzamento/
                Valore/Azioni) senza scroll interno/orizzontale — sostituisce
                lo scroll nascosto del contenitore overflow-x-auto sotto md,
                dove la tabella a 6 colonne non ci sta comunque. Il bottone
                elimina resta fuori dal Link (come già in tabella) per non
                annidare un <button> dentro un <a>. */}
            <div className="space-y-3 md:hidden">
              {lavori.map((l) => (
                <div key={l.id} className="rounded-lg border border-gray-200 p-4">
                  <Link href={`/lavori/${l.id}`} className="block">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500">{nomeClientePerId.get(l.cliente_id)}</p>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {STATO_LABEL[l.stato] ?? l.stato}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      {l.titolo}
                      {l.ha_appuntamento_scaduto && (
                        <span title="Appuntamento scaduto" aria-label="Appuntamento scaduto" className="shrink-0">
                          <IconaCalendario className="h-4 w-4 text-red-500" />
                        </span>
                      )}
                    </p>
                    <div className="mt-3">
                      <RiepilogoSatelliti rossi={l.satelliti_rossi} gialli={l.satelliti_gialli} verdi={l.satelliti_verdi} />
                    </div>
                  </Link>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-sm text-gray-700">
                      {l.valore_preventivo_accettato != null ? formattaValuta(l.valore_preventivo_accettato) : '—'}
                    </span>
                    <LavoroEliminaBottone lavoroId={l.id} titolo={l.titolo} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
              <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Descrizione</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Avanzamento</th>
                  <th className="px-4 py-3 text-right">Valore</th>
                  <th className="px-4 py-3" />
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
                      <Link
                        href={`/lavori/${l.id}`}
                        className="flex items-center gap-1.5 px-4 py-3 font-medium text-gray-900 transition-colors group-hover:bg-gray-50"
                      >
                        {l.titolo}
                        {l.ha_appuntamento_scaduto && (
                          <span title="Appuntamento scaduto" aria-label="Appuntamento scaduto" className="shrink-0">
                            <IconaCalendario className="h-4 w-4 text-red-500" />
                          </span>
                        )}
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
                    <td className="p-0">
                      <Link href={`/lavori/${l.id}`} className="block px-4 py-3 text-right text-gray-700 transition-colors group-hover:bg-gray-50">
                        {l.valore_preventivo_accettato != null ? formattaValuta(l.valore_preventivo_accettato) : '—'}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right transition-colors group-hover:bg-gray-50">
                      <LavoroEliminaBottone lavoroId={l.id} titolo={l.titolo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
