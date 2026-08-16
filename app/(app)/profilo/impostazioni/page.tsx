import { createClient } from '@/lib/supabase/server'
import { ProfiloSmtpForm } from '@/components/profilo-smtp-form'
import { ProfiloObiettiviForm } from '@/components/profilo-obiettivi-form'
import { ProfiloTestoMailForm } from '@/components/profilo-testo-mail-form'
import { ProfiloTariffeForm } from '@/components/profilo-tariffe-form'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Categorie acquisto/Referenze spostate nella nuova sezione di menu
// "Catalogo" (2026-08-17, vedi CLAUDE.md) — non erano preferenze personali
// come SMTP/Obiettivi/testo mail, ma dati operativi del flusso Acquisto.
export default async function ProfiloImpostazioniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: artigiano } = user
    ? await supabase
        .from('artigiano')
        .select(
          'smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza, target_preventivo_giorni, target_progetto_giorni, target_produzione_giorni, target_montaggio_giorni, kpi_finestra_mesi, mail_ordine_apertura_formale, mail_ordine_congedo_formale, mail_ordine_apertura_informale, mail_ordine_congedo_informale, tariffa_oraria_costruzione, tariffa_oraria_montaggio',
        )
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

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
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Testo mail ordine</h2>
        <p className="mb-4 text-sm text-gray-500">
          Apertura e congedo della mail inviata ai fornitori quando confermi un ordine — il resto del testo (elenco
          referenze, firma) resta invariato. Il tono (Formale/Informale) si sceglie ogni volta al momento
          dell&apos;invio, in base al fornitore.
        </p>
        <ProfiloTestoMailForm
          initialValues={{
            aperturaFormale: artigiano?.mail_ordine_apertura_formale ?? '',
            congedoFormale: artigiano?.mail_ordine_congedo_formale ?? '',
            aperturaInformale: artigiano?.mail_ordine_apertura_informale ?? '',
            congedoInformale: artigiano?.mail_ordine_congedo_informale ?? '',
          }}
        />
      </div>

      <div className="mt-10 border-t border-gray-200 pt-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Tariffe orarie</h2>
        <p className="mb-4 text-sm text-gray-500">
          Usate per stimare il costo manodopera di Costruzione e Montaggio e per il Margine di Chiusura Lavoro.
        </p>
        <ProfiloTariffeForm
          initialValues={{
            tariffaCostruzione: String(artigiano?.tariffa_oraria_costruzione ?? 50),
            tariffaMontaggio: String(artigiano?.tariffa_oraria_montaggio ?? 30),
          }}
        />
      </div>

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
    </div>
  )
}
