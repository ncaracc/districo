import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Stesso pattern di app/api/allegati/satellite/[id]/route.ts (file su
// disco, non Supabase Storage) — vedi CLAUDE.md 2026-08-19. La RLS su
// `artigiano` ("artigiano vede solo se stesso") blocca però la lettura
// dell'avatar di un ALTRO artigiano — a differenza degli allegati, qui non
// c'è una tabella satellite/lavoro condivisa da cui RLS possa derivare
// l'accesso. L'avatar è pensato visibile a chiunque sia autenticato in
// Districo (es. un futuro collaboratore "a quattro mani"), non solo al
// proprietario — nessun dato sensibile in un'immagine profilo — quindi il
// client autenticato serve solo a VERIFICARE l'accesso (bloccare gli
// anonimi), la lettura vera e propria usa il client admin (stesso
// principio già in uso per la lista specializzazioni in registrazione/
// invito) per bypassare volutamente lo scoping "solo sé stesso".
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

const MIME_PER_ESTENSIONE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ artigianoId: string }> }) {
  const { artigianoId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: artigiano } = await admin
    .from('artigiano')
    .select('immagine_profilo')
    .eq('id', artigianoId)
    .maybeSingle()

  if (!artigiano?.immagine_profilo) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  let contenuto: Buffer
  try {
    contenuto = await fs.readFile(path.join(UPLOADS_DIR, artigiano.immagine_profilo))
  } catch {
    return NextResponse.json({ error: 'File non trovato' }, { status: 404 })
  }

  const estensione = artigiano.immagine_profilo.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME_PER_ESTENSIONE[estensione] ?? 'application/octet-stream'

  return new NextResponse(new Uint8Array(contenuto), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  })
}
