import { ClienteForm } from '@/components/cliente-form'

export default function NuovoClientePage() {
  return (
    <div>
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
