import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { caricaDatiLavoroSatelliti } from '@/lib/lavori/dettaglio-lavoro-data'
import { generaSchedaLavoroPdf, nomeFileScheda } from '@/lib/lavori/scheda-lavoro-pdf'

// "Scheda di lavoro" PDF (2026-08-17, vedi CLAUDE.md) — generazione
// on-demand, nessuna persistenza (rigenerato ad ogni download con i dati
// correnti del Lavoro). Stesso pattern di accesso già in uso per
// app/api/allegati/satellite/[id]/route.ts: nessun controllo owner/ospite
// esplicito qui, la RLS su `lavoro` (client autenticato di createClient())
// filtra già l'accesso — caricaDatiLavoroSatelliti() ritorna null per un
// Lavoro non visibile all'utente corrente, indipendentemente dall'id
// richiesto. Visibile a owner E ospite "a quattro mani" (non solo owner):
// nessun dato economico nel PDF, nessuna ragione di restringere oltre
// l'accesso già previsto al Lavoro stesso.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const dati = await caricaDatiLavoroSatelliti(supabase, id)
  if (!dati) {
    return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  }

  const pdfBuffer = await generaSchedaLavoroPdf(dati)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      // "attachment" (non "inline"): forza il download in ogni browser
      // indipendentemente dall'attributo `download` sull'<a> che lo linka
      // (lavoro-documento-bottone.tsx) — coerente con l'uso previsto
      // ("foglio da stampare/scaricare", non da visualizzare in-app).
      'Content-Disposition': `attachment; filename="${nomeFileScheda(dati.lavoro.titolo)}"`,
    },
  })
}
