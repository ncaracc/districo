'use client'

import { useFormStatus } from 'react-dom'
import { avviaCheckout, type Piano } from '@/lib/stripe/actions'
import { CTA_PRINCIPALE_CLASSI } from '@/lib/landing/cta'

// Bottoni di scelta piano (2026-08-21, integrazione Stripe — vedi
// CLAUDE.md), condivisi da `TrialScaduto` e dal tab "Abbonamento" di
// Impostazioni: stessa Server Action (`avviaCheckout`) per entrambi i punti
// di ingresso, un `<form>` per piano con l'argomento legato via
// `.bind(null, piano)` (pattern standard Next.js per passare un valore a
// una Server Action usata come form action). `useFormStatus` richiede un
// componente figlio del form per leggere `pending` — da qui il bottone
// separato invece di leggerlo nel componente genitore.
const PIANI: { id: Piano; label: string; prezzo: string }[] = [
  { id: 'mensile', label: 'Mensile', prezzo: '€5/mese' },
  { id: 'annuale', label: 'Annuale', prezzo: '€48/anno' },
]

function BottonePiano({ label, prezzo }: { label: string; prezzo: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full ${CTA_PRINCIPALE_CLASSI} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? 'Reindirizzamento a Stripe…' : `${label} — ${prezzo}`}
    </button>
  )
}

export function ScegliPianoAbbonamento() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PIANI.map((p) => (
        <form key={p.id} action={avviaCheckout.bind(null, p.id)}>
          <BottonePiano label={p.label} prezzo={p.prezzo} />
        </form>
      ))}
    </div>
  )
}
