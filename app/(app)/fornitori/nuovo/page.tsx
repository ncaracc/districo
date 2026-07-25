import { FornitoreForm } from '@/components/fornitore-form'

export default function NuovoFornitorePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nuovo fornitore</h1>
        <p className="mt-1 text-sm text-gray-500">
          Anagrafica condivisa con tutti gli artigiani. Sedi e contatti si aggiungono dopo la creazione.
        </p>
      </div>

      <FornitoreForm />
    </div>
  )
}
