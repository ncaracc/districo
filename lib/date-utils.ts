// Helper condivisi per la conversione data ISO → formato input nativo.
// Centralizza `aDateLocal()`, prima dichiarata identica in due file
// (Sprint UI-1, 5/8, vedi docs/audit-ui.md sezione 6 e CLAUDE.md):
// tronca un timestamp ISO letto dal DB al solo `YYYY-MM-DD` richiesto da
// un `<input type="date">`. Non copre `aDatetimeLocal()`
// (`satellite-appuntamento.tsx`, unico consumer: serve anche l'ora, non
// solo la data — helper diverso, non una duplicazione da assorbire qui).

export function aDateLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}
