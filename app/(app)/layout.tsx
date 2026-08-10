import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
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
    <main className="w-full min-w-0 px-4 py-6">
      {children}
    </main>
  )
}
