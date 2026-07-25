'use server'

import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type AzioneResult = { ok: true } | { ok: false; error: string }

// Cartella base: /app/uploads in produzione (volume montato su
// /srv/apps/districo/uploads, vedi Dockerfile/CLAUDE.md), ./uploads in locale.
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

export async function caricaAllegatiSatellite(
  satelliteId: string,
  lavoroId: string,
  formData: FormData,
): Promise<AzioneResult> {
  const supabase = await createClient()
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

    const buffer = Buffer.from(await f.arrayBuffer())
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
  }

  revalidatePath(`/lavori/${lavoroId}`)
  return { ok: true }
}
