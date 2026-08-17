// Dati puri della landing page (2026-08-19, vedi CLAUDE.md) — nessuna
// dipendenza server-only, importabile sia da Server sia da Client Component
// (stesso principio già seguito per lib/lavori/lista-filtri.ts).
//
// I 5 mestieri usati nelle sezioni "Il caos" e "Personaggi illustrati" (asset
// forniti in public/landing/) e come esempi nella sezione "Funzioni per
// fase" — non un elenco esaustivo delle Specializzazioni raccolte in
// registrazione (quell'elenco è libero/aperto, vedi specializzazione a
// schema), solo i 5 per cui esistono illustrazioni dedicate.
export type MestiereSlug = 'falegname' | 'idraulico' | 'vetraio' | 'fabbro' | 'elettricista'

export type Mestiere = {
  slug: MestiereSlug
  label: string
  // Immagine "caos" (public/landing/caos/) — una scena disordinata tipica
  // del mestiere, per la sezione 2.
  immagineCaos: string
  // Didascalia della scena di caos, breve e concreta (non generica).
  didascaliaCaos: string
  // Ritratto "al lavoro" (public/landing/personaggi/) — sezione 6.
  immaginePersonaggio: string
}

export const MESTIERI: Mestiere[] = [
  {
    slug: 'falegname',
    label: 'Falegname',
    immagineCaos: '/landing/caos/caos_falegname_v2.jpg',
    didascaliaCaos: 'Misure su un post-it perso tra la segatura, il preventivo mandato per email e mai più ritrovato.',
    immaginePersonaggio: '/landing/personaggi/falegname.jpg',
  },
  {
    slug: 'idraulico',
    label: 'Idraulico',
    immagineCaos: '/landing/caos/caos_idraulico_v2.jpg',
    didascaliaCaos: "L'appuntamento segnato a penna su un'agenda dimenticata in furgone, il cliente che richiama tre volte.",
    immaginePersonaggio: '/landing/personaggi/idraulico_v2.jpg',
  },
  {
    slug: 'vetraio',
    label: 'Vetraio',
    immagineCaos: '/landing/caos/caos_vetraio_v3.jpg',
    didascaliaCaos: 'La lastra giusta ordinata a memoria, il colore del telaio confuso con quello di un altro cantiere.',
    immaginePersonaggio: '/landing/personaggi/vetraio.jpg',
  },
  {
    slug: 'fabbro',
    label: 'Fabbro',
    immagineCaos: '/landing/caos/caos_fabbro_v2.jpg',
    didascaliaCaos: 'Il preventivo fatto a voce al telefono, il numero del cancello scritto sul retro di uno scontrino.',
    immaginePersonaggio: '/landing/personaggi/fabbro_v2.jpg',
  },
  {
    slug: 'elettricista',
    label: 'Elettricista',
    immagineCaos: '/landing/caos/caos_elettricista.jpg',
    didascaliaCaos: 'Lo schema dell’impianto su un foglio volante, tre cantieri aperti e un solo taccuino per tutti.',
    immaginePersonaggio: '/landing/personaggi/elettricista.jpg',
  },
]
