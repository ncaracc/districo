import { createClient } from '@/lib/supabase/server'
import { ProfiloSmtpForm } from '@/components/profilo-smtp-form'
import { ProfiloObiettiviForm } from '@/components/profilo-obiettivi-form'
import { ProfiloCategorieAcquistoForm } from '@/components/profilo-categorie-acquisto-form'
import { ProfiloReferenzeForm } from '@/components/profilo-referenze-form'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

export default async function ProfiloImpostazioniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: artigiano }, { data: categorieAcquisto }, { data: referenzeGrezze }] = await Promise.all([
    user
      ? supabase
          .from('artigiano')
          .select(
            'smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza, target_preventivo_giorni, target_progetto_giorni, target_produzione_giorni, target_montaggio_giorni, kpi_finestra_mesi',
          )
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('categoria_acquisto').select('id, nome').order('nome')
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    // Referenze (2026-08-14, vedi CLAUDE.md): stesso fetch diretto in
    // page.tsx già in uso per categorieAcquisto sopra, per coerenza — nessun
    // filtro esplicito per artigiano necessario, RLS "solo proprietario"
    // (migration 0048) lo applica già.
    user
      ? supabase.from('referenza').select('id, categoria_id, descrizione, colore_finitura, ultimo_prezzo').order('descrizione')
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
    // vedi CLAUDE.md e lib/layout-container.ts): form a colonna singola,
    // stesso valore già in uso implicitamente prima di questa sessione (era
    // il max-w-2xl di default di app/(app)/layout.tsx), ora esplicito.
    <div className={CONTENITORE_STRETTO}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profilo / Impostazioni</h1>
        <p className="mt-1 text-sm text-gray-500">
          Credenziali email personali, usate per inviare gli ordini ad Acquisti e Lavorazione esterna. Il
          mittente reale sarà questo indirizzo, non un indirizzo di sistema.
        </p>
      </div>

      <ProfiloSmtpForm
        initialValues={{
          host: artigiano?.smtp_host ?? '',
          porta: artigiano?.smtp_porta ? String(artigiano.smtp_porta) : '',
          username: artigiano?.smtp_username ?? '',
          sicurezza: artigiano?.smtp_sicurezza ?? 'starttls',
        }}
        configurata={!!artigiano?.smtp_password_cifrata}
      />

      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Obiettivi</h2>
        <ProfiloObiettiviForm
          initialValues={{
            targetPreventivoGiorni: String(artigiano?.target_preventivo_giorni ?? 10),
            targetProgettoGiorni: String(artigiano?.target_progetto_giorni ?? 7),
            targetProduzioneGiorni: String(artigiano?.target_produzione_giorni ?? 60),
            targetMontaggioGiorni: String(artigiano?.target_montaggio_giorni ?? 7),
            kpiFinestraMesi: String(artigiano?.kpi_finestra_mesi ?? 12),
          }}
        />
      </div>

      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Categorie acquisto</h2>
        <p className="mb-4 text-sm text-gray-500">
          Etichette libere da scegliere quando crei un ordine Acquisti (es. Materiale, Ferramenta, Lavorazioni esterne).
        </p>
        <ProfiloCategorieAcquistoForm categorie={categorieAcquisto ?? []} />
      </div>

      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Referenze</h2>
        <p className="mb-4 text-sm text-gray-500">
          Catalogo personale di materiali/prodotti, raggruppato per categoria, con un prezzo indicativo
          riusato come proposta quando li scegli in un Acquisto.
        </p>
        <ProfiloReferenzeForm referenze={referenze} categorie={categorieAcquisto ?? []} />
      </div>
    </div>
  )
}
