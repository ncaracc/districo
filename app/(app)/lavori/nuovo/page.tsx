import { createClient } from '@/lib/supabase/server'
import { NuovoLavoroStandaloneForm } from '@/components/nuovo-lavoro-standalone-form'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

export default async function NuovoLavoroPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>
}) {
  const { clienteId } = await searchParams

  let clienteIniziale: { id: string; nome: string } | undefined
  if (clienteId) {
    const supabase = await createClient()
    const { data: cliente } = await supabase.from('cliente').select('id, nome').eq('id', clienteId).maybeSingle()
    if (cliente) clienteIniziale = cliente
  }

  return (
    // Contenitore stretto (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts): form a colonna singola,
    // stesso valore già in uso implicitamente prima di questa sessione (era
    // il max-w-2xl di default di app/(app)/layout.tsx), ora esplicito.
    <div className={CONTENITORE_STRETTO}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nuovo lavoro</h1>
        <p className="mt-1 text-sm text-gray-500">
          {clienteIniziale
            ? `Nuovo lavoro per ${clienteIniziale.nome}.`
            : 'Scegli il cliente per cui è questo lavoro, oppure creane uno al volo.'}
        </p>
      </div>

      <NuovoLavoroStandaloneForm clienteIniziale={clienteIniziale} />
    </div>
  )
}
