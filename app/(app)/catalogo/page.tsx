import { createClient } from '@/lib/supabase/server'
import { CatalogoCategorieForm } from '@/components/catalogo-categorie-form'
import { CatalogoReferenzeForm } from '@/components/catalogo-referenze-form'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Sezione di menu dedicata "Catalogo" (2026-08-17, vedi CLAUDE.md) —
// Categorie e Referenze spostate qui da Profilo/Impostazioni: non erano
// preferenze personali come SMTP/Obiettivi, ma dati operativi usati nel
// flusso Acquisto, che meritavano una propria sezione invece di restare
// annegati in Impostazioni o dentro Fornitori (le Referenze sono legate a
// una Categoria, non a un Fornitore — vedi CLAUDE.md 14/8, "modello
// corretto"). Categorie: nessun cambio di comportamento, solo spostate.
// Referenze: CRUD completo (già esisteva), ora con soft delete (`attiva`,
// migration 0051) al posto dell'hard delete precedente.
export default async function CatalogoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: categorieAcquisto }, { data: referenzeGrezze }] = await Promise.all([
    user
      ? supabase.from('categoria_acquisto').select('id, nome').order('nome')
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    // Solo le referenze attive (2026-08-17, soft delete): una referenza
    // eliminata sparisce anche da questa lista, non solo dalle scelte
    // disponibili in un nuovo Acquisto — stesso comportamento percepito di
    // un'eliminazione vera, pur restando a schema.
    user
      ? supabase.from('referenza').select('id, categoria_id, descrizione, colore_finitura, ultimo_prezzo').eq('attiva', true).order('descrizione')
      : Promise.resolve({ data: [] as { id: string; categoria_id: string; descrizione: string; colore_finitura: string | null; ultimo_prezzo: number | null }[] }),
  ])

  const referenze = (referenzeGrezze ?? []).map((r) => ({
    id: r.id,
    categoriaId: r.categoria_id,
    descrizione: r.descrizione,
    coloreFinitura: r.colore_finitura,
    ultimoPrezzo: r.ultimo_prezzo,
  }))

  return (
    // Contenitore stretto (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts), stesso usato da Profilo/
    // Impostazioni: form a colonna singola.
    <div className={CONTENITORE_STRETTO}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Catalogo</h1>
        <p className="mt-1 text-sm text-gray-500">Categorie e Referenze personali, riusate quando compili un Acquisto.</p>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Categorie acquisto</h2>
        <p className="mb-4 text-sm text-gray-500">
          Etichette libere da scegliere quando crei un ordine Acquisti (es. Materiale, Ferramenta, Lavorazioni esterne).
        </p>
        <CatalogoCategorieForm categorie={categorieAcquisto ?? []} />
      </div>

      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Referenze</h2>
        <p className="mb-4 text-sm text-gray-500">
          Catalogo personale di materiali/prodotti, raggruppato per categoria, con un prezzo indicativo proposto come
          default quando li scegli in un Acquisto (resta comunque modificabile per ogni singolo Acquisto, senza
          aggiornare questo catalogo).
        </p>
        <CatalogoReferenzeForm referenze={referenze} categorie={categorieAcquisto ?? []} />
      </div>
    </div>
  )
}
