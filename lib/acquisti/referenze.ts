'use server'

// Catalogo Referenze per artigiano (2026-08-14, vedi CLAUDE.md) — stesso
// principio di lib/acquisti/categorie.ts: nessuna gestione standalone in UI
// in questa sessione, solo ricerca/creazione al volo dentro la modale
// Acquisto. RLS "referenza: solo proprietario" (migration 0048) filtra già
// per artigiano_id, nessun filtro esplicito necessario qui — stesso motivo
// per cui eliminaCategoriaAcquisto() non lo fa.
import { createClient } from '@/lib/supabase/server'

export type ReferenzaOption = {
  id: string
  label: string
  descrizione: string
  coloreFinitura: string | null
  ultimoPrezzo: number | null
}

// Scoped per categoria (non per fornitore, vedi CLAUDE.md — modello
// corretto): una Referenza appartiene a una Categoria personale, il
// Fornitore nel flusso di Acquisto resta un passo di navigazione
// indipendente che non filtra né vincola le Referenze disponibili.
export async function cercaReferenze(categoriaId: string, query: string): Promise<ReferenzaOption[]> {
  if (!categoriaId) return []

  const supabase = await createClient()
  const q = query.trim().toLowerCase()

  const { data } = await supabase
    .from('referenza')
    .select('id, descrizione, colore_finitura, ultimo_prezzo')
    .eq('categoria_id', categoriaId)
    .order('descrizione')

  return (data ?? [])
    .map((r) => ({
      id: r.id,
      label: r.colore_finitura ? `${r.descrizione} — ${r.colore_finitura}` : r.descrizione,
      descrizione: r.descrizione,
      coloreFinitura: r.colore_finitura,
      ultimoPrezzo: r.ultimo_prezzo,
    }))
    .filter((r) => !q || r.label.toLowerCase().includes(q))
    .slice(0, 20)
}
