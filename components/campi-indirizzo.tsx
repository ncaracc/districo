'use client'

import { PAESI, trovaPaese } from '@/lib/paesi'
import { inputClass } from '@/lib/input-class'

// Componente condiviso (sessione 2026-08-13, vedi CLAUDE.md): estratto dopo
// che lo stesso bug — ordine dei campi Città → Nazione → Provincia invece
// di Città → Provincia → Nazione — si è ripresentato due volte in due form
// indipendenti (lavoro-form.tsx, corretto il 2026-08-12; fornitore-sede-form.tsx,
// corretto in questa sessione), entrambi con la stessa identica griglia
// `grid-cols-2` ad auto-placement. Centralizzare l'ordine qui una volta per
// tutte evita un terzo episodio in un futuro form con gli stessi campi
// (es. anagrafica Cliente/Artigiano, se in futuro guadagnassero un
// indirizzo strutturato — oggi Cliente ha solo un campo indirizzo libero,
// nessuna struttura Città/Provincia/Nazione da questo componente).
export type CampiIndirizzoValues = {
  indirizzo: string
  civico: string
  cap: string
  citta: string
  siglaProvincia: string
  nazione: string
}

export function CampiIndirizzo({
  idPrefix,
  values,
  onChange,
}: {
  // Prefisso per gli id DOM (es. "lavoro", "sede") — preserva esattamente
  // gli stessi id già in uso prima dell'estrazione (lavoro-citta,
  // sede-sigla-provincia, ecc.), nessun riferimento esterno da aggiornare.
  idPrefix: string
  values: CampiIndirizzoValues
  onChange: <K extends keyof CampiIndirizzoValues>(campo: K, valore: string) => void
}) {
  const labelProvincia = trovaPaese(values.nazione)?.labelProvincia

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2">
        <label htmlFor={`${idPrefix}-indirizzo`} className="mb-1 block text-sm font-medium text-gray-700">
          Indirizzo
        </label>
        <input
          id={`${idPrefix}-indirizzo`}
          value={values.indirizzo}
          onChange={(e) => onChange('indirizzo', e.target.value)}
          className={inputClass()}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-civico`} className="mb-1 block text-sm font-medium text-gray-700">
          Civico
        </label>
        <input
          id={`${idPrefix}-civico`}
          value={values.civico}
          onChange={(e) => onChange('civico', e.target.value)}
          className={inputClass()}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-cap`} className="mb-1 block text-sm font-medium text-gray-700">
          CAP
        </label>
        <input id={`${idPrefix}-cap`} value={values.cap} onChange={(e) => onChange('cap', e.target.value)} className={inputClass()} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-citta`} className="mb-1 block text-sm font-medium text-gray-700">
          Città
        </label>
        <input
          id={`${idPrefix}-citta`}
          value={values.citta}
          onChange={(e) => onChange('citta', e.target.value)}
          className={inputClass()}
        />
      </div>
      {/* Ordine Città → Provincia → Nazione (bug ricorso due volte — vedi
          CLAUDE.md, 2026-08-12 su lavoro-form.tsx, 2026-08-13 su
          fornitore-sede-form.tsx, centralizzato qui apposta per evitare un
          terzo episodio): l'ordine nel markup è quello che conta per la
          griglia a 2 colonne con auto-placement riga per riga, va
          rispettato anche quando i campi vanno a capo su righe proprie,
          non solo quando sono affiancati. */}
      <div>
        <label htmlFor={`${idPrefix}-sigla-provincia`} className="mb-1 block text-sm font-medium text-gray-700">
          {labelProvincia ?? 'Sigla provincia'}
        </label>
        <input
          id={`${idPrefix}-sigla-provincia`}
          value={values.siglaProvincia}
          onChange={(e) => onChange('siglaProvincia', e.target.value)}
          placeholder="Es. BO"
          className={inputClass()}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-nazione`} className="mb-1 block text-sm font-medium text-gray-700">
          Nazione
        </label>
        <select
          id={`${idPrefix}-nazione`}
          value={values.nazione}
          onChange={(e) => onChange('nazione', e.target.value)}
          className={inputClass()}
        >
          {PAESI.map((p) => (
            <option key={p.nome} value={p.nome}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
