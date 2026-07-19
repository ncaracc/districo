import { NuovoLavoroStandaloneForm } from '@/components/nuovo-lavoro-standalone-form'

export default function NuovoLavoroPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nuovo lavoro</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scegli il cliente per cui è questo lavoro, oppure creane uno al volo.
        </p>
      </div>

      <NuovoLavoroStandaloneForm />
    </div>
  )
}
