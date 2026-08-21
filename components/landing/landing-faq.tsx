import { CONTENITORE_STRETTO } from '@/lib/layout-container'

// Sezione 9 — "FAQ" (2026-08-21, vedi CLAUDE.md). Accordion via `<details>`/
// `<summary>` nativi — nessun JS/Client Component necessario (ogni voce
// gestisce il proprio stato aperto/chiuso da sola, nel browser, ancora
// prima dell'idratazione React): coerente con lo stile minimal del resto
// della pagina e con il principio "niente dipendenze pesanti" già seguito
// altrove nel progetto per componenti semplici. Marcatore di default del
// browser nascosto sia per Chrome/Firefox (`marker:content-none`, pseudo-
// elemento `::marker` di `<summary>`) sia per Safari
// (`[&::-webkit-details-marker]:hidden`) — sostituito da una chevron SVG
// disegnata a mano nello stesso stile stroke-based del resto del progetto,
// ruotata via `group-open:rotate-180` quando la voce è aperta.
const FAQ: { domanda: string; risposta: React.ReactNode }[] = [
  {
    domanda: 'Devo pagare subito per iniziare?',
    risposta:
      "No. Hai 60 giorni di prova gratuita. Registri la carta all'iscrizione, ma non ti addebitiamo nulla finché il trial non finisce, e puoi annullare in qualsiasi momento senza costi.",
  },
  {
    domanda: 'Le mie informazioni sui fornitori sono condivise con altri artigiani?',
    risposta:
      "L'anagrafica base (azienda e sedi) è condivisa, per evitare che ognuno debba censire da zero un fornitore già noto ad altri. I contatti specifici che usi tu, invece, restano solo tuoi — non sono necessariamente gli stessi per tutti.",
  },
  {
    domanda: 'Districo funziona per il mio mestiere?',
    risposta:
      'Districo segue il percorso di qualunque lavoro artigianale, dal primo contatto alla consegna — non è pensato per un mestiere specifico, ma per chiunque gestisca più clienti e più cantieri insieme.',
  },
  {
    domanda: 'Se smetto di pagare, perdo i dati dei lavori già fatti?',
    risposta:
      "No, non subito. Restano archiviati e consultabili per 6 mesi dopo la fine dell'abbonamento — se decidi di tornare, li ritrovi tutti. Dopo quel periodo, se non riattivi, vengono cancellati definitivamente.",
  },
  {
    domanda: 'Quanti clienti o lavori posso gestire?',
    risposta:
      'Il piano include fino a 100 lavori attivi contemporaneamente — pensato per coprire ampiamente il carico di lavoro reale di un artigiano, anche con più cantieri aperti insieme. Se il tuo volume di lavoro dovesse superarlo, ti proponiamo un passaggio gratuito a un piano senza limiti.',
  },
  {
    domanda: "Se chiudo l'account, cosa succede ai dati dei miei clienti?",
    risposta:
      'Prima della cancellazione definitiva puoi esportare ogni lavoro in PDF, con tutti i suoi dettagli — resta tuo e consultabile anche fuori da Districo.',
  },
  {
    domanda: 'Se ho un problema o un dubbio, posso chiedere aiuto?',
    risposta: (
      <>
        Sì, scrivimi direttamente a{' '}
        <a href="mailto:info@districo.it" className="underline hover:text-gray-900">
          info@districo.it
        </a>{' '}
        e ti rispondo personalmente. Con un programma beta a numero chiuso, il supporto è ancora una cosa tra noi
        due, non un ticket anonimo.
      </>
    ),
  },
  {
    domanda: 'Come funziona il programma beta?',
    risposta:
      "È a numero chiuso, pensato per artigiani che vogliono provare Districo per primi e aiutarci a migliorarlo. Chi entra ottiene 6 mesi di accesso gratuito, e se una sua segnalazione porta a una nuova funzionalità, l'accesso resta gratuito per sempre.",
  },
]

function IconaChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LandingFaq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-gray-50 py-16 sm:py-24">
      <div className={`${CONTENITORE_STRETTO} px-4`}>
        <h2 className="text-center text-3xl font-bold text-gray-900 sm:text-4xl">Domande frequenti</h2>

        <div className="mt-10 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {FAQ.map((item) => (
            <details key={item.domanda} className="group px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                <span>{item.domanda}</span>
                <IconaChevron className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-gray-600">{item.risposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
