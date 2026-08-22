import { createClient } from '@/lib/supabase/server'
import { STATO_ABBONAMENTO_LABEL } from '@/lib/abbonamento/labels'

// Statistiche aggregate admin (2026-08-22, vedi CLAUDE.md) — riempie il
// placeholder "da implementare" presente dal 25/7. Protetta da
// `app/admin/layout.tsx` (stesso guard di `/admin/utenti`), lettura via
// `admin_statistiche_aggregate()` (SECURITY DEFINER, migration 0061) — una
// sola RPC invece di 6 query separate, la funzione verifica `is_admin`
// internamente indipendentemente dal guard di route.
//
// SOLO conteggi aggregati, come richiesto esplicitamente (principio già
// scritto in CLAUDE.md — "Admin RLS: nessun accesso diretto alle tabelle
// operative"): nessun nome, titolo o id di un singolo Cliente/Fornitore/
// Lavoro/artigiano compare in questa pagina.
function CardStat({ label, valore }: { label: string; valore: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{valore}</p>
    </div>
  )
}

// Per "Lavori per stato" e "Abbonamenti": una ripartizione, non un singolo
// numero — stessa card "uno per metrica" richiesta, con un piccolo
// elenco interno invece di più card separate per ogni sotto-valore.
function CardRipartizione({ label, voci }: { label: string; voci: { etichetta: string; valore: number }[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <dl className="mt-2 space-y-1.5">
        {voci.map((v) => (
          <div key={v.etichetta} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-gray-600">{v.etichetta}</dt>
            <dd className="font-semibold text-gray-900">{v.valore}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_statistiche_aggregate')
  const s = data?.[0]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Statistiche</h1>
      <p className="mt-1 text-sm text-gray-500">
        Conteggi aggregati su tutta la piattaforma. Nessun dato su singoli Clienti, Fornitori o Lavori.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">Errore nel caricamento: {error.message}</p>}

      {s && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardStat label="Artigiani registrati" valore={s.artigiani_totali} />
          <CardStat label="Nuove iscrizioni (ultimi 7 giorni)" valore={s.nuove_iscrizioni_7gg} />
          <CardStat label="Beta tester attivi" valore={s.beta_tester_attivi} />
          <CardStat label="Lavori totali creati" valore={s.lavori_totali} />
          <CardRipartizione
            label="Lavori per stato"
            voci={[
              { etichetta: 'In corso', valore: s.lavori_in_corso },
              { etichetta: 'Completati', valore: s.lavori_completati },
              { etichetta: 'Rifiutati', valore: s.lavori_rifiutati },
            ]}
          />
          <CardRipartizione
            label="Abbonamenti per stato"
            voci={[
              { etichetta: STATO_ABBONAMENTO_LABEL.nessuno, valore: s.abbonamento_nessuno },
              { etichetta: STATO_ABBONAMENTO_LABEL.trialing, valore: s.abbonamento_trialing },
              { etichetta: STATO_ABBONAMENTO_LABEL.active, valore: s.abbonamento_active },
              { etichetta: STATO_ABBONAMENTO_LABEL.past_due, valore: s.abbonamento_past_due },
              { etichetta: STATO_ABBONAMENTO_LABEL.canceled, valore: s.abbonamento_canceled },
            ]}
          />
        </div>
      )}
    </div>
  )
}
