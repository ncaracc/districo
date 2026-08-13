import { cookies } from 'next/headers'
import { COOKIE_ORIGINE_SEZIONE, parseOrigineSezione, type SezioneOrigine } from '@/lib/nav/origine-sezione'

// Da chiamare solo da un Server Component/layout (richiede `cookies()`, non
// disponibile in un Client Component — vedi origine-sezione.ts per il
// perché questo helper vive in un file separato). Default 'dashboard' se il
// cookie è assente — mai visitate Dashboard/Conclusi in questa sessione
// browser, o cookie scaduto/cancellato — stesso fallback già implicito
// prima di questo fix ("se arriva da Dashboard, resta su Dashboard").
export async function leggiOrigineSezione(): Promise<SezioneOrigine> {
  const store = await cookies()
  return parseOrigineSezione(store.get(COOKIE_ORIGINE_SEZIONE)?.value)
}
