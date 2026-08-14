'use server'

// Catalogo Referenze per artigiano (2026-08-14, vedi CLAUDE.md).
// `cercaReferenze()` (sotto) è nata insieme al restyling di Acquisto per la
// creazione al volo dentro la modale. Le azioni CRUD sotto sono per la
// gestione standalone in Profilo/Impostazioni (stessa sessione, seconda
// parte) — stesso principio di lib/acquisti/categorie.ts. RLS "referenza:
// solo proprietario" (migration 0048) filtra già per artigiano_id, nessun
// filtro esplicito necessario in select/update/delete — stesso motivo per
// cui eliminaCategoriaAcquisto() non lo fa.
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type AzioneResult = { ok: true } | { ok: false; error: string }

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

type CampiReferenza = {
  categoriaId: string
  descrizione: string
  coloreFinitura: string | null
  ultimoPrezzo: number | null
}

export async function creaReferenzaCatalogo(fields: CampiReferenza): Promise<AzioneResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const descrizionePulita = fields.descrizione.trim()
  if (!descrizionePulita) return { ok: false, error: 'La descrizione è obbligatoria' }
  if (!fields.categoriaId) return { ok: false, error: 'Seleziona una categoria' }

  const { error } = await supabase.from('referenza').insert({
    artigiano_id: user.id,
    categoria_id: fields.categoriaId,
    descrizione: descrizionePulita,
    colore_finitura: fields.coloreFinitura,
    ultimo_prezzo: fields.ultimoPrezzo,
  })

  if (error) {
    console.error('creaReferenzaCatalogo: insert fallito', error)
    return { ok: false, error: 'Errore nella creazione, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}

// Modifica piena (categoria inclusa, non solo descrizione/colore/prezzo) —
// nessun vincolo a mantenere la categoria d'origine, `referenza_id` sulle
// righe Acquisto che la usano resta lo stesso id, invariate.
export async function aggiornaReferenzaCatalogo(id: string, fields: CampiReferenza): Promise<AzioneResult> {
  const supabase = await createClient()

  const descrizionePulita = fields.descrizione.trim()
  if (!descrizionePulita) return { ok: false, error: 'La descrizione è obbligatoria' }
  if (!fields.categoriaId) return { ok: false, error: 'Seleziona una categoria' }

  const { error } = await supabase
    .from('referenza')
    .update({
      categoria_id: fields.categoriaId,
      descrizione: descrizionePulita,
      colore_finitura: fields.coloreFinitura,
      ultimo_prezzo: fields.ultimoPrezzo,
    })
    .eq('id', id)

  if (error) {
    console.error('aggiornaReferenzaCatalogo: update fallito', error)
    return { ok: false, error: 'Errore nel salvataggio, riprova' }
  }

  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}

// `referenza_id` su lavoro_satellite_articolo è `on delete set null`
// (migration 0048): le righe Acquisto che usano questa referenza restano
// invariate, perdono solo il collegamento al catalogo (tornano "ad hoc").
export async function eliminaReferenzaCatalogo(id: string): Promise<AzioneResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('referenza').delete().eq('id', id)

  if (error) {
    console.error('eliminaReferenzaCatalogo: delete fallito', error)
    return { ok: false, error: "Errore nell'eliminazione, riprova" }
  }

  revalidatePath('/profilo/impostazioni')
  return { ok: true }
}
