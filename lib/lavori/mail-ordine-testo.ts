// Testo mail ordine — Apertura/Congedo personalizzabili (2026-08-17, vedi
// CLAUDE.md). Modulo puro (nessun 'use server'/'use client'), condiviso da
// components/profilo-testo-mail-form.tsx (pre-compilazione Formale/
// Informale in Impostazioni) e lib/lavori/ordini-email.ts (fallback quando
// l'artigiano non ha mai personalizzato + sostituzione placeholder
// all'invio reale).
//
// Struttura del corpo mail (decisa con l'utente in sessione, non
// indovinata): Apertura sostituisce interamente il vecchio saluto fisso
// "Ciao {nome contatto}," e include già il lead-in ("Avrei bisogno di:" o
// equivalente) → elenco referenze (invariato) → Congedo, che include anche
// la firma dell'artigiano (non più una riga "Buon lavoro"/nome separata a
// parte).
//
// Placeholder testuali (sostituiti a runtime con gli stessi dati già letti
// dal codice esistente per contatto/artigiano — nessun nuovo fetch):
// {nome contatto}, {nome artigiano}, {nome e cognome artigiano}.
export const PLACEHOLDER_APERTURA_CONGEDO = ['{nome contatto}', '{nome artigiano}', '{nome e cognome artigiano}'] as const

export const DEFAULT_APERTURA_INFORMALE = 'Ciao {nome contatto},\nAvrei bisogno del seguente materiale\n'
export const DEFAULT_CONGEDO_INFORMALE = 'Buon lavoro\n{nome artigiano}'
export const DEFAULT_APERTURA_FORMALE = 'Buongiorno {nome contatto},\nLe scrivo per ordinare il seguente materiale\n'
export const DEFAULT_CONGEDO_FORMALE =
  'Resto a sua disposizione per ogni chiarimento.\nCordiali saluti.\n{nome e cognome artigiano}'

export type ValoriPlaceholder = {
  nomeContatto: string
  nomeArtigiano: string
  nomeCognomeArtigiano: string
}

export function sostituisciPlaceholder(testo: string, valori: ValoriPlaceholder): string {
  return testo
    .replaceAll('{nome contatto}', valori.nomeContatto)
    .replaceAll('{nome artigiano}', valori.nomeArtigiano)
    .replaceAll('{nome e cognome artigiano}', valori.nomeCognomeArtigiano)
}

// Un `\n` digitato in una <textarea> -> un ritorno a capo visibile anche
// nell'HTML della mail (stesso principio già in uso per l'elenco referenze,
// join('<br>')).
export function testoConABr(testo: string): string {
  return testo.replace(/\n/g, '<br>')
}
