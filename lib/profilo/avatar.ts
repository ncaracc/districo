// URL dell'immagine profilo (2026-08-19, vedi CLAUDE.md), servita da
// app/api/avatar/[artigianoId]/route.ts (stesso pattern della route già in
// uso per gli allegati satellite — file su disco, non Supabase Storage).
// Cache-buster: la route è keyed sull'id dell'ARTIGIANO (stabile), non sul
// file — senza un parametro che cambi ad ogni upload, il browser
// continuerebbe a mostrare l'immagine precedente dalla cache dopo una
// sostituzione. `immagine_profilo` (lo storage_path) contiene già un UUID
// fresco a ogni upload (stesso schema di naming degli allegati satellite),
// quindi basta derivarne un breve suffisso invece di introdurre un
// contatore di versione a parte.
export function urlAvatar(artigianoId: string, immagineProfilo: string | null): string | null {
  if (!immagineProfilo) return null
  const v = encodeURIComponent(immagineProfilo).slice(-16)
  return `/api/avatar/${artigianoId}?v=${v}`
}
