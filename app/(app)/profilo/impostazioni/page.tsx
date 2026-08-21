import { createClient } from '@/lib/supabase/server'
import { ImpostazioniTabs } from '@/components/impostazioni-tabs'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Riorganizzazione Profilo/Impostazioni (2026-08-19, vedi CLAUDE.md): due
// punti di accesso distinti in navigazione da questa sessione — l'avatar
// (in alto) porta a /profilo (dati anagrafici, nuova pagina), l'ingranaggio
// (invariato) resta su questa pagina, ora SOLO preferenze applicative
// (Credenziali email, Testo mail ordine, Tariffe orarie, Statistiche),
// organizzate a tab invece di un unico form lineare — struttura pensata
// per reggere facilmente una futura sezione "Abbonamento/Fatturazione"
// (integrazione Stripe, non pianificata in questa sessione, vedi CLAUDE.md
// "Prossimi passi aperti"). Obiettivi (4 campi "giorni") RIMOSSA — confermati
// inerti, migration 0055 droppa le colonne. Categorie acquisto/Referenze
// restano nella sezione di menu "Catalogo" (2026-08-17) — non erano
// preferenze personali ma dati operativi del flusso Acquisto.
export default async function ProfiloImpostazioniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: artigiano } = user
    ? await supabase
        .from('artigiano')
        .select(
          'smtp_host, smtp_porta, smtp_username, smtp_password_cifrata, smtp_sicurezza, kpi_finestra_mesi, mail_ordine_apertura_formale, mail_ordine_congedo_formale, mail_ordine_apertura_informale, mail_ordine_congedo_informale, tariffa_oraria_costruzione, tariffa_oraria_montaggio, stato_abbonamento, piano_abbonamento, trial_fine',
        )
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  return (
    <div className={CONTENITORE_STRETTO}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="mt-1 text-sm text-gray-500">
          Preferenze applicative e configurazioni tecniche. I tuoi dati anagrafici (nome, contatti, indirizzo, dati
          fiscali) e l&apos;immagine profilo si trovano in Profilo.
        </p>
      </div>

      <ImpostazioniTabs
        smtpProps={{
          initialValues: {
            host: artigiano?.smtp_host ?? '',
            porta: artigiano?.smtp_porta ? String(artigiano.smtp_porta) : '',
            username: artigiano?.smtp_username ?? '',
            sicurezza: artigiano?.smtp_sicurezza ?? 'starttls',
          },
          configurata: !!artigiano?.smtp_password_cifrata,
        }}
        testoMailProps={{
          initialValues: {
            aperturaFormale: artigiano?.mail_ordine_apertura_formale ?? '',
            congedoFormale: artigiano?.mail_ordine_congedo_formale ?? '',
            aperturaInformale: artigiano?.mail_ordine_apertura_informale ?? '',
            congedoInformale: artigiano?.mail_ordine_congedo_informale ?? '',
          },
        }}
        tariffeProps={{
          initialValues: {
            tariffaCostruzione: String(artigiano?.tariffa_oraria_costruzione ?? 50),
            tariffaMontaggio: String(artigiano?.tariffa_oraria_montaggio ?? 30),
          },
        }}
        statisticheProps={{
          initialValues: {
            kpiFinestraMesi: String(artigiano?.kpi_finestra_mesi ?? 12),
          },
        }}
        abbonamentoProps={{
          stato: artigiano?.stato_abbonamento ?? 'nessuno',
          piano: artigiano?.piano_abbonamento ?? null,
          trialFine: artigiano?.trial_fine ?? null,
        }}
      />
    </div>
  )
}
