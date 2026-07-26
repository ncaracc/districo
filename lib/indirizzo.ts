// Costruisce l'URL di Google Maps per un indirizzo strutturato (Lavoro,
// Fornitore_Sede — stessa forma di campi su entrambe le tabelle dalla
// migration 0012/0016). Nessuna geocodifica/mappa integrata: solo un link
// diretto che apre l'app/sito di navigazione con l'indirizzo già pronto.
type CampiIndirizzo = {
  indirizzo: string | null
  civico: string | null
  cap: string | null
  citta: string | null
  sigla_provincia: string | null
  nazione: string | null
}

export function urlGoogleMaps(f: CampiIndirizzo): string {
  const parti = [f.indirizzo, f.civico, f.cap, f.citta, f.sigla_provincia, f.nazione].filter(Boolean)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parti.join(' '))}`
}
