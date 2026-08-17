'use client'

import { useState } from 'react'
import { CONTENITORE_LARGO } from '@/lib/layout-container'
import { ICONA_ATTIVITA } from '@/components/icone-attivita'
import { ORDINE_ATTIVITA, LABEL_ATTIVITA, DESCRIZIONE_ATTIVITA, ESEMPIO_ATTIVITA_MESTIERE } from '@/lib/landing/funzioni-fase'
import { MESTIERI, type MestiereSlug } from '@/lib/landing/mestieri'
import { useMestiere } from './mestiere-context'

// Sezione 5 — "Funzioni per fase" (2026-08-19, vedi CLAUDE.md): griglia
// delle 12 ChiaveAttivita nell'ordine reale dell'app (ORDINE_ATTIVITA),
// icone/etichette riusate esattamente da icone-attivita.tsx/
// attivita-ordine.ts (nessuna nuova icona).
//
// Doppio stato mestiere (2026-08-19, vedi CLAUDE.md — sessione "selettore
// che artigiano sei"): `mestiereLocale` è lo stato *interno* di sempre
// (pillole di questa sola sezione, invariato — stato di default "come già
// fa ora" per un visitatore che non ha ancora scelto nulla nel selettore
// globale). `mestiereGlobale` arriva dal MestiereContext condiviso,
// scritto dal nuovo selettore in cima alla pagina: quando è valorizzato
// PRENDE IL SOPRAVVENTO su quello locale (le pillole di sezione si
// nascondono, sostituite da una riga "Esempi per X · vedi anche gli altri
// mestieri" che azzera lo stato globale) — evita due selettori
// indipendenti che rivendicano di controllare la stessa cosa.
export function LandingFunzioniFase() {
  const { mestiere: mestiereGlobale, setMestiere: setMestiereGlobale } = useMestiere()
  const [mestiereLocale, setMestiereLocale] = useState<MestiereSlug>('falegname')
  const mestiereEffettivo = mestiereGlobale ?? mestiereLocale

  return (
    <section id="funzioni" className="scroll-mt-24 bg-white py-16 sm:py-24">
      <div className={`${CONTENITORE_LARGO} px-4`}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Funzioni per fase</h2>
          <p className="mt-4 text-gray-600">
            Le stesse 12 Attività per ogni artigiano — gli esempi cambiano in base al mestiere.
          </p>
        </div>

        {mestiereGlobale ? (
          <p className="mt-6 text-center text-sm text-gray-500">
            Esempi per <span className="font-medium text-gray-900">{MESTIERI.find((m) => m.slug === mestiereGlobale)?.label}</span>
            {' · '}
            <button
              type="button"
              onClick={() => setMestiereGlobale(null)}
              className="underline underline-offset-2 hover:text-gray-700"
            >
              vedi anche gli altri mestieri
            </button>
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {MESTIERI.map((m) => {
              const attivo = m.slug === mestiereLocale
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setMestiereLocale(m.slug)}
                  aria-pressed={attivo}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    attivo ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORDINE_ATTIVITA.map((chiave) => {
            const Icona = ICONA_ATTIVITA[chiave]
            return (
              <div key={chiave} className="rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                    <Icona className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold text-gray-900">{LABEL_ATTIVITA[chiave]}</h3>
                </div>
                <p className="mt-3 text-sm text-gray-600">{DESCRIZIONE_ATTIVITA[chiave]}</p>
                <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-500 italic">
                  Es.: {ESEMPIO_ATTIVITA_MESTIERE[chiave][mestiereEffettivo]}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
