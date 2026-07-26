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
    // solo non basta. `w-full` forza esplicitamente il 100% del contenitore,
    // poi `max-w-2xl` continua a limitarlo come prima quando c'è spazio in
    // eccedenza. Nessun effetto visivo su nessuna pagina esistente.
    <main className="w-full min-w-0 max-w-2xl mx-auto px-4 py-6">
      {children}
    </main>
  )
}
