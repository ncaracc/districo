import { ClienteForm } from '@/components/cliente-form'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

export default function NuovoClientePage() {
  return (
    // Contenitore stretto (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts): form a colonna singola,
    // stesso valore già in uso implicitamente prima di questa sessione (era
    // il max-w-2xl di default di app/(app)/layout.tsx), ora esplicito.
    <div className={CONTENITORE_STRETTO}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nuovo cliente</h1>
        <p className="mt-1 text-sm text-gray-500">
          Solo il nome è obbligatorio, il resto puoi completarlo anche in seguito.
        </p>
      </div>

      <ClienteForm />
    </div>
  )
}
