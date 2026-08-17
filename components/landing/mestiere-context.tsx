'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { MestiereSlug } from '@/lib/landing/mestieri'

// Stato condiviso "che artigiano sei" (2026-08-19, vedi CLAUDE.md —
// personalizzazione landing): un solo Context invece di uno stato locale
// per sezione, così il selettore in cima alla pagina (landing-selettore-
// mestiere.tsx) e le 3 sezioni che si personalizzano in base ad esso (Il
// caos, Funzioni per fase, Personaggi illustrati) restano sempre coerenti
// tra loro — selezionare un mestiere in un punto della pagina si riflette
// ovunque, un solo link "vedi anche gli altri mestieri" in ciascuna
// sezione resetta lo stato per tutte insieme (`setMestiere(null)`), non
// solo per la sezione in cui si clicca.
//
// Stato puramente client-side (`useState`, nessuna query string/URL
// sync): la richiesta lasciava esplicitamente la scelta tra query param e
// stato React ("non serve persistenza lato server/database") — uno stato
// in memoria è la via più semplice, nessun bisogno di condividere/
// bookmarkare una vista filtrata.
type MestiereContextValue = {
  mestiere: MestiereSlug | null
  setMestiere: (mestiere: MestiereSlug | null) => void
}

const MestiereContext = createContext<MestiereContextValue | null>(null)

export function MestiereProvider({ children }: { children: ReactNode }) {
  const [mestiere, setMestiere] = useState<MestiereSlug | null>(null)
  return <MestiereContext.Provider value={{ mestiere, setMestiere }}>{children}</MestiereContext.Provider>
}

export function useMestiere(): MestiereContextValue {
  const ctx = useContext(MestiereContext)
  if (!ctx) throw new Error('useMestiere va usato dentro <MestiereProvider>')
  return ctx
}
