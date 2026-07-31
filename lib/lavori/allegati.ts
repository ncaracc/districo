'use server'

import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { assertSatelliteModificabile } from '@/lib/lavori/lavoro-modificabile'

type AzioneResult = { ok: true } | { ok: false; error: string }

// Cartella base: /app/uploads in produzione (volume montato su
// /srv/apps/districo/uploads, vedi Dockerfile/CLAUDE.md), ./uploads in locale.
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// Lato più lungo a cui ridimensionare le foto (le altre tipologie di file, es.
// PDF, non vengono toccate). 1920px è già oltre la risoluzione a cui verrebbe
// mai visualizzata in UI, ma lascia margine per zoomare su un dettaglio (es.
// una misura, una crepa) — riduce comunque drasticamente una foto da
// smartphone tipica (spesso 3000-4000px, diversi MB) senza perdita percepibile.
const LATO_MASSIMO_IMMAGINE = 1920
const QUALITA_COMPRESSIONE = 82

// Ridimensiona solo le immagini (mai i PDF o altri tipi): fallisce in modo
// silenzioso verso il file originale se sharp non riesce a decodificarlo (es.
// formato inatteso), per non bloccare mai l'upload a causa di un problema di
// ottimizzazione secondaria.
async function ridimensionaSeImmagine(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!mimeType.startsWith('image/')) return buffer

  try {
    // { animated: true } preserva i frame di GIF/WEBP animati invece di
    // ridurli al solo primo fotogramma. .rotate() applica l'orientamento EXIF
    // (comune nelle foto da smartphone) e lo rimuove dai metadati risultanti.
    const immagine = sharp(buffer, { animated: true }).rotate().resize({
      width: LATO_MASSIMO_IMMAGINE,
      height: LATO_MASSIMO_IMMAGINE,
      fit: 'inside',
      withoutEnlargement: true,
    })

    if (mimeType === 'image/jpeg') return await immagine.jpeg({ quality: QUALITA_COMPRESSIONE }).toBuffer()
    if (mimeType === 'image/webp') return await immagine.webp({ quality: QUALITA_COMPRESSIONE }).toBuffer()
    return await immagine.toBuffer()
  } catch (err) {
    console.error('ridimensionaSeImmagine: fallito, salvo il file originale', err)
    return buffer
  }
}

export async function caricaAllegatiSatellite(
  satelliteId: string,
  lavoroId: string,
  formData: FormData,
): Promise<AzioneResult> {
  const supabase = await createClient()

  const bloccato = await assertSatelliteModificabile(supabase, satelliteId)
  if (bloccato) return bloccato

  const file = formData.getAll('file').filter((f): f is File => f instanceof File && f.size > 0)

  if (file.length === 0) {
    return { ok: false, error: 'Nessun file selezionato' }
  }

  const cartella = path.join(UPLOADS_DIR, 'lavori', lavoroId, satelliteId)
  await fs.mkdir(cartella, { recursive: true })

  for (const f of file) {
    const nomeSicuro = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nomeFile = `${randomUUID()}-${nomeSicuro}`
    const percorsoAssoluto = path.join(cartella, nomeFile)

    try {
      const bufferOriginale = Buffer.from(await f.arrayBuffer())
      const buffer = await ridimensionaSeImmagine(bufferOriginale, f.type)
      await fs.writeFile(percorsoAssoluto, buffer)

      const storagePath = path.posix.join('lavori', lavoroId, satelliteId, nomeFile)
      const { error } = await supabase.from('lavoro_satellite_allegato').insert({
        satellite_id: satelliteId,
        nome_file: f.name,
        storage_path: storagePath,
      })

      if (error) {
        console.error('caricaAllegatiSatellite: insert fallito', error)
        await fs.unlink(percorsoAssoluto).catch(() => {})
        return { ok: false, error: "Errore nel salvataggio dell'allegato, riprova" }
      }
    } catch (err) {
      console.error(
        `caricaAllegatiSatellite: ECCEZIONE su file="${f.name}" type="${f.type}" size=${f.size}:`,
        err,
      )
      await fs.unlink(percorsoAssoluto).catch(() => {})
      return { ok: false, error: `Errore imprevisto sul file "${f.name}": ${err instanceof Error ? err.message : String(err)}` }
    }
  }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}

export async function eliminaAllegatoSatellite(allegatoId: string, lavoroId: string): Promise<AzioneResult> {
  const supabase = await createClient()

  const { data: allegato } = await supabase
    .from('lavoro_satellite_allegato')
    .select('storage_path, satellite_id')
    .eq('id', allegatoId)
    .maybeSingle()

  if (!allegato) {
    return { ok: false, error: 'Allegato non trovato' }
  }

  const bloccato = await assertSatelliteModificabile(supabase, allegato.satellite_id)
  if (bloccato) return bloccato

  // RLS ("allegato satellite: eliminazione solo owner") garantisce che solo
  // l'owner del lavoro possa eliminare — nessun controllo aggiuntivo qui.
  const { error } = await supabase.from('lavoro_satellite_allegato').delete().eq('id', allegatoId)

  if (error) {
    console.error('eliminaAllegatoSatellite: delete fallito', error)
    return { ok: false, error: "Errore nell'eliminazione, riprova" }
  }

  await fs.unlink(path.join(UPLOADS_DIR, allegato.storage_path)).catch(() => {})

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}
