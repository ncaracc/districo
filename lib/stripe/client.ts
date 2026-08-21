import Stripe from 'stripe'

// Integrazione Stripe — abbonamenti trial + ricorrenti (2026-08-21, modalità
// test/sandbox, vedi CLAUDE.md). Client server-side condiviso, costruito
// lazy alla prima chiamata (non a import-time): le chiavi vivono solo in
// .env sul server, mai committate — costruirlo a import-time avrebbe fatto
// fallire qualunque build/script che importa transitivamente questo modulo
// senza quella variabile impostata (es. `tsc --noEmit` in locale).
//
// Solo la chiave segreta: nessun uso di Stripe.js/Elements lato client in
// questa integrazione — Checkout Sessions hosted da Stripe, il browser
// viene semplicemente reindirizzato all'URL restituito da
// `stripe.checkout.sessions.create()`. STRIPE_PUBLISHABLE_KEY resta
// configurata in .env per un eventuale uso futuro (es. Customer Portal
// embedded), non ancora usata da questo codice.
let client: Stripe | null = null

export function stripeClient(): Stripe {
  if (!client) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY non configurata')
    }
    client = new Stripe(secretKey)
  }
  return client
}
