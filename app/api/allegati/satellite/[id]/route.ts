import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

const MIME_PER_ESTENSIONE: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // La RLS su lavoro_satellite_allegato (lettura chi è nel lavoro) filtra già
  // l'accesso: un artigiano non coinvolto nel Lavoro riceve semplicemente
  // nessuna riga, indipendentemente dall'id richiesto.
  const { data: allegato } = await supabase
    .from('lavoro_satellite_allegato')
    .select('nome_file, storage_path')
    .eq('id', id)
    .maybeSingle()

  if (!allegato) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  let contenuto: Buffer
  try {
    contenuto = await fs.readFile(path.join(UPLOADS_DIR, allegato.storage_path))
  } catch {
    return NextResponse.json({ error: 'File non trovato' }, { status: 404 })
  }

  const estensione = allegato.nome_file.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME_PER_ESTENSIONE[estensione] ?? 'application/octet-stream'

  return new NextResponse(new Uint8Array(contenuto), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(allegato.nome_file)}"`,
    },
  })
}
