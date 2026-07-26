import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FornitoreForm } from '@/components/fornitore-form'
import { FornitoreSedeCard } from '@/components/fornitore-sede-card'
import { FornitoreNuovaSede } from '@/components/fornitore-nuova-sede'

export default async function FornitoreDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: fornitore } = await supabase
    .from('fornitore')
    .select('id, ragione_sociale, partita_iva')
    .eq('id', id)
    .maybeSingle()

  if (!fornitore) notFound()

  const { data: sedi } = await supabase
    .from('fornitore_sede')
    .select('id, nome, indirizzo, civico, cap, citta, sigla_provincia, nazione')
    .eq('fornitore_id', id)
    .order('nome')

  const sedeIds = (sedi ?? []).map((s) => s.id)
  const { data: contatti } =
    sedeIds.length > 0
      ? await supabase
          .from('fornitore_sede_contatto')
          .select('id, fornitore_sede_id, nome, cognome, cellulare, email')
          .in('fornitore_sede_id', sedeIds)
      : { data: [] }

  const contattiPerSede = new Map<string, typeof contatti>()
  for (const c of contatti ?? []) {
    const lista = contattiPerSede.get(c.fornitore_sede_id) ?? []
    lista.push(c)
    contattiPerSede.set(c.fornitore_sede_id, lista)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{fornitore.ragione_sociale}</h1>
        <p className="mt-1 text-sm text-gray-500">Modifica i dati del fornitore</p>
      </div>

      <FornitoreForm
        fornitoreId={fornitore.id}
        initialValues={{
          ragioneSociale: fornitore.ragione_sociale,
          partitaIva: fornitore.partita_iva ?? '',
        }}
      />

      <div className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Sedi</h2>

        <div className="space-y-3">
          {(sedi ?? []).map((s) => (
            <FornitoreSedeCard
              key={s.id}
              fornitoreId={fornitore.id}
              sede={s}
              contatti={contattiPerSede.get(s.id) ?? []}
            />
          ))}
        </div>

        <div className="mt-3">
          <FornitoreNuovaSede fornitoreId={fornitore.id} />
        </div>
      </div>
    </div>
  )
}
