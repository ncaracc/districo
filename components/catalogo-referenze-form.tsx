'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaReferenzaCatalogo, aggiornaReferenzaCatalogo, eliminaReferenzaCatalogo } from '@/lib/acquisti/referenze'
import { formattaValuta } from '@/lib/formato-valuta'
import { InputValuta } from '@/components/input-valuta'
import { inputClass } from '@/lib/input-class'

type Referenza = {
  id: string
  categoriaId: string
  descrizione: string
  coloreFinitura: string | null
  ultimoPrezzo: number | null
  codice: string | null
}
type Categoria = { id: string; nome: string }

type CampiForm = { categoriaId: string; descrizione: string; coloreFinitura: string; prezzo: string; codice: string }
const CAMPI_VUOTI: CampiForm = { categoriaId: '', descrizione: '', coloreFinitura: '', prezzo: '', codice: '' }

// Gestione standalone del catalogo Referenze — nata in Profilo/Impostazioni
// il 2026-08-14, spostata nella sua sezione di menu dedicata "Catalogo" il
// 2026-08-17 (vedi CLAUDE.md), stesso giorno in cui la modale Acquisto ha
// perso la possibilità di creare una Referenza al volo: questa resta quindi
// l'UNICO punto dell'app in cui si può creare/correggere/eliminare una
// Referenza. Stesso pattern di CatalogoCategorieForm (lista + form di
// creazione), ma con modifica inline in più — una Referenza ha 3 campi
// oltre alla categoria, elimina+ricrea per correggere un typo spezzerebbe
// anche il collegamento (referenza_id) delle righe Acquisto esistenti che
// la usano, a differenza del nome libero di una Categoria. "Elimina" è un
// soft delete (colonna `attiva`, migration 0051): la Referenza sparisce da
// questa lista e dalle scelte disponibili per un nuovo Acquisto, ma resta
// a schema — gli Acquisti passati che la usano restano collegati alla
// referenza originale (non solo a una copia congelata di descrizione/
// colore), non solo "invariati" come con il vecchio hard delete.
//
// Campo Codice (2026-08-19, vedi CLAUDE.md — migration 0052): testo libero
// opzionale, non un codice per-fornitore (Districo non li traccia, vedi
// CLAUDE.md 14/8). Sola proprietà del Catalogo — la modale Acquisto lo
// mostra in sola lettura accanto alla Referenza scelta (letto in tempo
// reale dal catalogo via join, non copiato riga per riga come descrizione/
// colore_finitura), la mail d'ordine lo espone come colonna a sé.
export function CatalogoReferenzeForm({ referenze, categorie }: { referenze: Referenza[]; categorie: Categoria[] }) {
  const router = useRouter()

  const [nuova, setNuova] = useState<CampiForm>(CAMPI_VUOTI)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const [modificaId, setModificaId] = useState<string | null>(null)
  const [modificaCampi, setModificaCampi] = useState<CampiForm>(CAMPI_VUOTI)
  const [erroreModifica, setErroreModifica] = useState<string | null>(null)

  // Solo le categorie che hanno almeno una referenza compaiono come
  // sotto-sezione — niente intestazioni vuote.
  const gruppi = categorie
    .map((c) => ({ categoria: c, righe: referenze.filter((r) => r.categoriaId === c.id) }))
    .filter((g) => g.righe.length > 0)

  async function handleAggiungi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrore(null)
    const result = await creaReferenzaCatalogo({
      categoriaId: nuova.categoriaId,
      descrizione: nuova.descrizione,
      coloreFinitura: nuova.coloreFinitura.trim() || null,
      ultimoPrezzo: nuova.prezzo ? Number(nuova.prezzo) : null,
      codice: nuova.codice.trim() || null,
    })
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    setNuova(CAMPI_VUOTI)
    router.refresh()
  }

  function apriModifica(r: Referenza) {
    setModificaId(r.id)
    setModificaCampi({
      categoriaId: r.categoriaId,
      descrizione: r.descrizione,
      coloreFinitura: r.coloreFinitura ?? '',
      prezzo: r.ultimoPrezzo != null ? String(r.ultimoPrezzo) : '',
      codice: r.codice ?? '',
    })
    setErroreModifica(null)
  }

  async function handleSalvaModifica() {
    if (!modificaId) return
    setLoading(true)
    setErroreModifica(null)
    const result = await aggiornaReferenzaCatalogo(modificaId, {
      categoriaId: modificaCampi.categoriaId,
      descrizione: modificaCampi.descrizione,
      coloreFinitura: modificaCampi.coloreFinitura.trim() || null,
      ultimoPrezzo: modificaCampi.prezzo ? Number(modificaCampi.prezzo) : null,
      codice: modificaCampi.codice.trim() || null,
    })
    setLoading(false)
    if (!result.ok) {
      setErroreModifica(result.error)
      return
    }
    setModificaId(null)
    router.refresh()
  }

  async function handleElimina(id: string) {
    if (!confirm('Eliminare questa referenza? Non sarà più selezionabile per nuovi Acquisti, ma resta collegata agli Acquisti che la usano già.')) return
    const result = await eliminaReferenzaCatalogo(id)
    if (!result.ok) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div>
      {gruppi.length === 0 ? (
        <p className="mb-3 text-sm text-gray-500">Nessuna referenza salvata. Aggiungine una dal modulo qui sotto.</p>
      ) : (
        gruppi.map(({ categoria, righe }) => (
          <div key={categoria.id} className="mb-4">
            <h3 className="mb-1 text-sm font-medium text-gray-700">{categoria.nome}</h3>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {righe.map((r) =>
                modificaId === r.id ? (
                  <li key={r.id} className="space-y-2 px-3 py-3">
                    <select
                      value={modificaCampi.categoriaId}
                      onChange={(e) => setModificaCampi((c) => ({ ...c, categoriaId: e.target.value }))}
                      className={inputClass()}
                    >
                      {categorie.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                    <input
                      value={modificaCampi.descrizione}
                      onChange={(e) => setModificaCampi((c) => ({ ...c, descrizione: e.target.value }))}
                      placeholder="Descrizione"
                      className={inputClass()}
                    />
                    <input
                      value={modificaCampi.coloreFinitura}
                      onChange={(e) => setModificaCampi((c) => ({ ...c, coloreFinitura: e.target.value }))}
                      placeholder="Colore / finitura (opz.)"
                      className={inputClass()}
                    />
                    <input
                      value={modificaCampi.codice}
                      onChange={(e) => setModificaCampi((c) => ({ ...c, codice: e.target.value }))}
                      placeholder="Codice (opz.)"
                      className={inputClass()}
                    />
                    <InputValuta
                      value={modificaCampi.prezzo}
                      onChange={(v) => setModificaCampi((c) => ({ ...c, prezzo: v }))}
                      placeholder="Prezzo indicativo (opz.)"
                      className={inputClass()}
                      decimali={1}
                    />
                    {erroreModifica && <p className="text-xs text-red-600">{erroreModifica}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSalvaModifica}
                        disabled={loading || !modificaCampi.descrizione.trim()}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Salvataggio…' : 'Salva'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setModificaId(null)}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Annulla
                      </button>
                    </div>
                  </li>
                ) : (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-900">
                    <div className="min-w-0">
                      <span>{r.descrizione}</span>
                      {r.coloreFinitura && <span className="text-gray-500"> — {r.coloreFinitura}</span>}
                      {r.codice && <span className="ml-2 text-xs text-gray-400">Cod. {r.codice}</span>}
                      {r.ultimoPrezzo != null && <span className="ml-2 text-xs text-gray-500">{formattaValuta(r.ultimoPrezzo, 1)}</span>}
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button type="button" onClick={() => apriModifica(r)} className="text-xs font-medium text-gray-600 hover:text-gray-900">
                        Modifica
                      </button>
                      <button type="button" onClick={() => handleElimina(r.id)} className="text-xs font-medium text-gray-400 hover:text-red-600">
                        Elimina
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))
      )}

      {categorie.length === 0 ? (
        <p className="text-xs text-gray-500">Nessuna categoria configurata: aggiungine una sopra per poter creare referenze.</p>
      ) : (
        <form onSubmit={handleAggiungi} className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
          <select
            value={nuova.categoriaId}
            onChange={(e) => setNuova((n) => ({ ...n, categoriaId: e.target.value }))}
            className={inputClass()}
          >
            <option value="">— Scegli una categoria —</option>
            {categorie.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <input
            value={nuova.descrizione}
            onChange={(e) => setNuova((n) => ({ ...n, descrizione: e.target.value }))}
            placeholder="Descrizione (es. truciolare nobilitato bianco)"
            className={inputClass()}
          />
          <input
            value={nuova.coloreFinitura}
            onChange={(e) => setNuova((n) => ({ ...n, coloreFinitura: e.target.value }))}
            placeholder="Colore / finitura (opz.)"
            className={inputClass()}
          />
          <input
            value={nuova.codice}
            onChange={(e) => setNuova((n) => ({ ...n, codice: e.target.value }))}
            placeholder="Codice (opz.)"
            className={inputClass()}
          />
          <InputValuta
            value={nuova.prezzo}
            onChange={(v) => setNuova((n) => ({ ...n, prezzo: v }))}
            placeholder="Prezzo indicativo (opz.)"
            className={inputClass()}
            decimali={1}
          />
          {errore && <p className="text-xs text-red-600">{errore}</p>}
          <button
            type="submit"
            disabled={loading || !nuova.categoriaId || !nuova.descrizione.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Aggiunta…' : 'Aggiungi referenza'}
          </button>
        </form>
      )}
    </div>
  )
}
