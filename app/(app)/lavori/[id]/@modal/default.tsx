// Slot di default dello slot parallelo @modal (vedi layout.tsx e CLAUDE.md):
// nessuna modale quando l'URL non corrisponde a
// (.)attivita/[attivitaId] — richiesto da Next.js per ogni slot parallelo
// che non abbia un segmento attivo corrispondente all'URL corrente
// (altrimenti un refresh/navigazione diretta su una route che non tocca
// @modal risulterebbe in un 404 sullo slot).
export default function ModalDefault() {
  return null
}
