import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrialScaduto } from '@/components/trial-scaduto'

// Gate abbonamento (2026-08-21, integrazione Stripe — vedi CLAUDE.md).
// `stato_abbonamento === 'nessuno'` (mai avviato un checkout, default per
// ogni artigiano — inclusi i 3 reali già esistenti prima di questa
// sessione) NON è bloccante: solo 'canceled', o 'trialing' con
// `trial_fine` nel passato (il webhook non ha ancora fatto in tempo ad
// aggiornare lo stato reale, o semplicemente non è ancora arrivato —
// controllo la data invece di fidarmi ciecamente dello stato per un
// margine di sicurezza indipendente dal webhook). 'past_due' NON blocca
// (pratica comune: si lascia un periodo di grazia mentre Stripe ritenta
// l'addebito, non richiesto esplicitamente ma coerente con "past_due" non
// citato tra le condizioni di blocco nel brief).
function abbonamentoBloccato(stato: string, trialFine: string | null) {
  if (stato === 'canceled') return true
  if (stato === 'trialing' && trialFine && new Date(trialFine) < new Date()) return true
  return false
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: artigiano } = await supabase
    .from('artigiano')
    .select('stato_abbonamento, trial_fine')
    .eq('id', user.id)
    .maybeSingle()

  const bloccato = artigiano ? abbonamentoBloccato(artigiano.stato_abbonamento, artigiano.trial_fine) : false

  // w-full + min-w-0: <main> è un flex item nel contenitore flex-col del
  // root layout (app/layout.tsx). Sull'asse cross (larghezza, dato che il
  // genitore è flex-col) l'allineamento stretch di default dovrebbe già
  // riempire la larghezza disponibile, ma senza una `width` esplicita il
  // valore usato resta soggetto al contenuto quando quest'ultimo (qui: la
  // tabella a piena larghezza della Dashboard, il primo contenuto
  // abbastanza largo da farlo emergere) richiede più spazio — min-w-0 da
  // solo non basta. `w-full` forza esplicitamente il 100% del contenitore.
  //
  // Nessun max-width qui (sessione "coerenza layout desktop", 2026-08-10,
  // vedi CLAUDE.md e lib/layout-container.ts): prima `<main>` imponeva
  // `max-w-2xl` di default, costringendo le pagine che volevano più
  // spazio a "scappare" da quel vincolo con un breakout basato su
  // `w-screen` — causa della scrollbar orizzontale indesiderata su
  // schermi ampi (100vw non tiene conto della scrollbar verticale del
  // browser). Ogni pagina sceglie ora esplicitamente il proprio
  // contenitore (`CONTENITORE_LARGO`/`CONTENITORE_STRETTO`), nessuno dei
  // due dipende da `vw`.
  return (
    <main className="w-full min-w-0 px-4 py-6">
      {bloccato ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">
            <TrialScaduto />
          </div>
        </div>
      ) : (
        children
      )}
    </main>
  )
}
