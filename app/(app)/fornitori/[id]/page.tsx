import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FornitoreForm } from '@/components/fornitore-form'
import { FornitoreSedi } from '@/components/fornitore-sedi'
import { CONTENITORE_LARGO } from '@/lib/layout-container'

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
    .select('id, nome, indirizzo, civico, cap, citta, sigla_provincia, nazione, sede_preferita')
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

  const sediConContatti = (sedi ?? []).map((s) => ({
    ...s,
    contatti: contattiPerSede.get(s.id) ?? [],
  }))

  return (
    // Contenitore largo (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts), stesso usato ora da tutte
    // le pagine principali (Dashboard, Clienti, dettaglio Lavoro, Conclusi).
    <div className={CONTENITORE_LARGO}>
      <div className="mb-2">
        <Link href="/fornitori" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          ← Fornitori
        </Link>
      </div>

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

        <FornitoreSedi fornitoreId={fornitore.id} sedi={sediConContatti} />
      </div>
    </div>
  )
}
