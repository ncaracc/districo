import { createClient } from '@/lib/supabase/server'
import { ProfiloAvatarUpload } from '@/components/profilo-avatar-upload'
import { ProfiloAnagraficaForm } from '@/components/profilo-anagrafica-form'
import { CONTENITORE_STRETTO } from '@/lib/layout-container'
import { urlAvatar } from '@/lib/profilo/avatar'

// Nuova pagina Profilo (2026-08-19, vedi CLAUDE.md — riorganizzazione
// Profilo/Impostazioni): prima di questa sessione non esisteva alcuna UI
// per vedere/correggere i dati anagrafici dell'artigiano dopo la
// registrazione — nome/cognome/specializzazione/telefono/email/paese
// erano raccolti lì (7 campi, migration 0008 "registrazione minimale"),
// ragione_sociale/partita_iva/codice_fiscale/via/civico/cap/localita/
// provincia erano stati deliberatamente rimandati "al completamento
// profilo" (stessa migration, mai arrivato fino ad ora) — questa pagina è
// quel completamento.
export default async function ProfiloPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: artigiano }, { data: specializzazioniRighe }] = await Promise.all([
    user
      ? supabase
          .from('artigiano')
          .select(
            'nome, cognome, ragione_sociale, partita_iva, codice_fiscale, codice_sdi, pec, specializzazione, telefono, email, via, civico, cap, localita, provincia, paese, immagine_profilo',
          )
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Stessa lista di suggerimenti già usata in registrazione (0001,
    // "lettura pubblica specializzazioni" — auth.uid() is not null basta,
    // nessun bisogno del client admin qui a differenza della pagina di
    // registrazione, che gira senza sessione).
    supabase.from('specializzazione').select('valore').eq('ufficiale', true).order('valore'),
  ])

  if (!artigiano) {
    return (
      <div className={CONTENITORE_STRETTO}>
        <p className="text-sm text-gray-500">Impossibile caricare il profilo.</p>
      </div>
    )
  }

  return (
    <div className={CONTENITORE_STRETTO}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profilo</h1>
        <p className="mt-1 text-sm text-gray-500">
          I tuoi dati anagrafici e la foto profilo. Le preferenze applicative (credenziali email, tariffe, testo
          mail) si trovano in Impostazioni.
        </p>
      </div>

      <div className="mb-10">
        <ProfiloAvatarUpload
          nome={artigiano.nome}
          cognome={artigiano.cognome}
          immagineUrl={urlAvatar(user!.id, artigiano.immagine_profilo)}
        />
      </div>

      <ProfiloAnagraficaForm
        initialValues={{
          nome: artigiano.nome,
          cognome: artigiano.cognome,
          ragioneSociale: artigiano.ragione_sociale,
          partitaIva: artigiano.partita_iva,
          codiceFiscale: artigiano.codice_fiscale,
          codiceSdi: artigiano.codice_sdi,
          pec: artigiano.pec,
          specializzazione: artigiano.specializzazione,
          telefono: artigiano.telefono,
          via: artigiano.via,
          civico: artigiano.civico,
          cap: artigiano.cap,
          localita: artigiano.localita,
          provincia: artigiano.provincia,
          paese: artigiano.paese,
        }}
        specializzazioni={(specializzazioniRighe ?? []).map((s) => s.valore)}
        emailAttuale={artigiano.email}
      />
    </div>
  )
}
