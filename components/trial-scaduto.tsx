import Link from 'next/link'
import { AuthCard } from '@/components/auth-card'
import { CTA_PRINCIPALE_CLASSI } from '@/lib/landing/cta'

// Messaggio "trial scaduto" (2026-08-21, vedi CLAUDE.md — "Futuro: app a
// pagamento con Stripe"). Componente puro, NON ancora agganciato a nessun
// controllo reale: nessuna colonna DB per lo stato trial/abbonamento,
// nessun redirect da login/middleware verso questo componente. Esiste solo
// come presentazione pronta all'uso — il collegamento vero (verificare lo
// stato trial/abbonamento dell'artigiano e reindirizzare qui quando scaduto,
// presumibilmente dal login) resta da fare quando la logica trial/
// abbonamento e l'integrazione Stripe saranno implementate.
//
// Stile: riusa `AuthCard` (stesso contenitore di Login/Registrazione — è il
// contesto in cui un utente incontrerebbe questo messaggio) e la CTA
// azzurra già in uso nella landing (`CTA_PRINCIPALE_CLASSI`), verso
// `/registrazione`/pricing come unico flusso di scelta piano esistente oggi
// (nessuna pagina di gestione abbonamento dedicata, non ancora costruita).
export function TrialScaduto() {
  return (
    <AuthCard className="text-center">
      <h1 className="text-xl font-bold text-gray-900">Il tuo periodo di prova è terminato.</h1>
      <p className="mt-3 text-sm text-gray-600">
        Puoi riattivare Districo in qualsiasi momento scegliendo il piano che preferisci. I tuoi dati sono ancora
        tutti qui, ad aspettarti.
      </p>
      <Link href="/#prezzi" className={`mt-6 inline-flex ${CTA_PRINCIPALE_CLASSI}`}>
        Scegli il tuo piano
      </Link>
    </AuthCard>
  )
}
