import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LavoroDettaglioSezioni } from '@/components/lavoro-dettaglio-sezioni'
import { caricaDatiLavoroSatelliti } from '@/lib/lavori/dettaglio-lavoro-data'
import { costruisciVociAttivita } from '@/lib/lavori/satelliti-render'
import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { leggiOrigineSezione } from '@/lib/nav/origine-sezione.server'

// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): questa
// pagina non costruisce più il contenuto React di ciascun satellite (niente
// più RigaSatellite.contenutoModifica/contenutoLettura) — si limita a
// costruire il riepilogo della tabella (costruisciVociAttivita) e a passare
// alla tabella solo i metadati necessari a navigare. Il contenuto vero e
// proprio di un'attività vive ora nelle nuove route
// app/(app)/lavori/[id]/@modal/(.)attivita/[attivitaId]/page.tsx
// (overlay, apertura da dentro l'app) e
// app/(app)/lavori/[id]/attivita/[attivitaId]/page.tsx (pagina piena,
// apertura diretta dell'URL) — entrambe usano lo stesso
// caricaDatiLavoroSatelliti()/costruisciContenutoAttivita() di qui, nessuna
// duplicazione della logica di fetch/switch-per-tipo.
export default async function LavoroDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const dati = await caricaDatiLavoroSatelliti(supabase, id)
  if (!dati) notFound()

  const { lavoro } = dati
  const righeTabella = costruisciVociAttivita(dati)
  // Provenienza (vedi CLAUDE.md e lib/nav/origine-sezione.ts): Dashboard o
  // Conclusi, qualunque sia la catena di pagine intermedie attraversata per
  // arrivare qui (es. Cliente → Lavori associati).
  const origineSezione = await leggiOrigineSezione()

  return (
    // Contenitore largo (sessione "coerenza layout desktop", 2026-08-10 —
    // vedi CLAUDE.md e lib/layout-container.ts): prima questa pagina restava
    // sul solo max-w-2xl implicito del layout condiviso, l'unica tra le
    // pagine principali a non condividere la larghezza usata da
    // Dashboard/Clienti/Fornitori/Conclusi.
    <div className={CONTENITORE_LARGO}>
      {/* Sezione 1 (Torna alla dashboard), Sezione 2 (Informazioni
          generali) e Sezioni 3/4 (tabella attività + pillola "Aggiungi
          attività"): wrapper client comune (sessione rifinitura
          2026-08-08, vedi CLAUDE.md) — Sezione 1 e Sezione 3 vengono
          nascoste mentre il form di modifica del Lavoro qui sotto è
          aperto (link "← Dashboard" ridondante coi bottoni Salva/Annulla
          flottanti; tabella attività non pertinente in quel contesto). Il
          contenuto in mezzo (messaggio "opportunità"/"Riapri lavoro",
          nessuno stato coinvolto) passa come children, invariato. */}
      <LavoroDettaglioSezioni
        lavoroId={lavoro.id}
        origineSezione={origineSezione}
        isOwner={dati.isOwner}
        stato={lavoro.stato}
        accettatoAt={lavoro.accettato_at}
        completatoAt={lavoro.completato_at}
        clienteNome={dati.clienteNome}
        fields={{
          titolo: lavoro.titolo,
          descrizione: lavoro.descrizione,
          data_lavoro: lavoro.data_lavoro,
          indirizzo: lavoro.indirizzo,
          civico: lavoro.civico,
          cap: lavoro.cap,
          citta: lavoro.citta,
          sigla_provincia: lavoro.sigla_provincia,
          nazione: lavoro.nazione,
        }}
        completato={dati.completato}
        righe={righeTabella}
        progettoEsiste={dati.progettoEsiste}
        preventivoEsiste={dati.preventivoEsiste}
        chiusuraEsiste={dati.chiusuraEsiste}
        costruzioneEsiste={dati.costruzioneEsiste}
        montaggioEsiste={dati.montaggioEsiste}
      >
        {/* Unificazione bottoni Modifica/Riapri lavoro (2026-08-15, vedi
            CLAUDE.md): il vecchio bottone "Riapri lavoro" qui sotto
            (components/lavoro-riapri.tsx, rimosso) è stato sostituito dal
            bottone in alto (lavoro-info.tsx), che ora cambia etichetta/
            azione da solo quando il Lavoro è concluso — nessun secondo
            bottone da renderizzare qui. */}
        {lavoro.stato === 'opportunita' && dati.preventivoEsiste && !dati.isOwner && (
          <div className="mb-8">
            <p className="text-sm text-gray-500">Lavoro ancora in fase di opportunità.</p>
          </div>
        )}
      </LavoroDettaglioSezioni>
    </div>
  )
}
