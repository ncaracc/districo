import { AuthCard } from '@/components/auth-card'
import { ScegliPianoAbbonamento } from '@/components/scegli-piano-abbonamento'

// Messaggio "trial scaduto" (creato il 2026-08-21 come componente
// presentazionale non agganciato — vedi CLAUDE.md; AGGANCIATO il
// 2026-08-21 sera, sessione integrazione Stripe). Mostrato da
// `app/(app)/layout.tsx` al posto del contenuto normale quando
// `stato_abbonamento === 'canceled'` oppure il trial è scaduto senza un
// abbonamento attivo (`stato_abbonamento === 'trialing'` con `trial_fine`
// nel passato) — un artigiano con `stato_abbonamento === 'nessuno'` (mai
// avviato un checkout) NON è bloccato qui, vedi il commento di
// `abbonamentoBloccato()` nel layout.
//
// Riusa `AuthCard` (stesso contenitore di Login/Registrazione — è il
// contesto in cui un utente incontrerebbe questo messaggio, l'intera app
// dietro di lui è inaccessibile) e i bottoni piano condivisi
// (`ScegliPianoAbbonamento`, stessa Server Action `avviaCheckout` del tab
// Abbonamento in Impostazioni) — nessuna pagina Pricing separata per un
// utente già loggato, questo componente NE FA LE VECI (il brief la
// menzionava come punto di ingresso alternativo al checkout).
export function TrialScaduto() {
  return (
    <AuthCard className="text-center">
      <h1 className="text-xl font-bold text-gray-900">Il tuo periodo di prova è terminato.</h1>
      <p className="mt-3 text-sm text-gray-600">
        Puoi riattivare Districo in qualsiasi momento scegliendo il piano che preferisci. I tuoi dati sono ancora
        tutti qui, ad aspettarti.
      </p>
      <div className="mt-6">
        <ScegliPianoAbbonamento />
      </div>
    </AuthCard>
  )
}
