import { ScegliPianoAbbonamento } from '@/components/scegli-piano-abbonamento'
import { STATO_ABBONAMENTO_LABEL, PIANO_ABBONAMENTO_LABEL } from '@/lib/abbonamento/labels'

// Tab "Abbonamento" di Impostazioni (2026-08-21, integrazione Stripe — vedi
// CLAUDE.md). Sola lettura sullo stato corrente + gli stessi bottoni piano
// di `TrialScaduto` (`ScegliPianoAbbonamento`, stessa Server Action) quando
// non c'è un abbonamento in corso — punto di ingresso per chi vuole
// avviare (o riavviare, dopo un annullamento) un abbonamento
// PROATTIVAMENTE, prima che il gate del layout lo blocchi (uno stato
// 'nessuno' non è mai bloccante, vedi app/(app)/layout.tsx — senza questo
// tab un artigiano con stato 'nessuno' non avrebbe alcun modo di
// sottoscrivere un piano dall'app). Nessun link al Customer Portal Stripe
// (gestione/cancellazione autonoma) in questa sessione — fuori scope,
// segnalato in CLAUDE.md come possibile passo successivo.
// Etichette (2026-08-22): estratte in `lib/abbonamento/labels.ts`, riusate
// anche dalla pagina admin /admin/utenti — unica fonte di verità.

export function ProfiloAbbonamentoForm({
  stato,
  piano,
  trialFine,
}: {
  stato: string
  piano: string | null
  trialFine: string | null
}) {
  const mostraScelta = stato === 'nessuno' || stato === 'canceled'

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-900">{STATO_ABBONAMENTO_LABEL[stato] ?? stato}</p>
        {piano && <p className="mt-1 text-sm text-gray-600">Piano: {PIANO_ABBONAMENTO_LABEL[piano] ?? piano}</p>}
        {stato === 'trialing' && trialFine && (
          <p className="mt-1 text-sm text-gray-600">
            Prova gratuita fino al {new Date(trialFine).toLocaleDateString('it-IT')}
          </p>
        )}
      </div>

      {mostraScelta && <ScegliPianoAbbonamento />}
    </div>
  )
}
