// Helper condivisi per la conversione data ISO → formato input nativo.
// Centralizza `aDateLocal()`, prima dichiarata identica in due file
// (Sprint UI-1, 5/8, vedi docs/audit-ui.md sezione 6 e CLAUDE.md):
// tronca un timestamp ISO letto dal DB al solo `YYYY-MM-DD` richiesto da
// un `<input type="date">`.

export function aDateLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

// Restyling modale Appuntamento (2026-08-10, vedi CLAUDE.md — Briefing
// diventa il template di riferimento): il controllo data unico
// (`aDatetimeLocal()`, ex-unico consumer di questo file) è stato diviso in
// due controlli separati (data + ora), stesso pattern della Modal di test
// (`components/test/modal-test.tsx`). Le due funzioni sotto sostituiscono
// `aDatetimeLocal()`, spostate qui perché pensate per essere riusate da
// qualunque futuro satellite restylato sullo stesso template (non solo
// Appuntamento).
//
// **Non riusa `aDateLocal()` sopra per la parte data**: quella tronca la
// stringa ISO così com'è (equivalente a leggere l'ora UTC), mentre qui
// serve la data/ora nel fuso orario LOCALE del browser (coerenti tra loro
// — un appuntamento "oggi alle 9" deve restare "oggi" per l'artigiano,
// non per UTC) tramite un oggetto `Date` — stesso approccio già in uso
// dal vecchio `aDatetimeLocal()`, solo diviso in due valori invece di uno.
// Usare `aDateLocal()` (UTC) per la sola data e questo helper (locale) per
// la sola ora introdurrebbe un disallineamento di fuso tra le due metà
// dello stesso appuntamento.
export function aDataOraLocal(iso: string | null): { data: string; ora: string } {
  if (!iso) return { data: '', ora: '' }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    ora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

// Ricombina i due campi in un ISO da inviare al server. Data assente →
// null (nessun appuntamento fissato, invariato dal comportamento del
// vecchio controllo unico). Data presente ma ora non selezionata (l'utente
// può lasciare "--" nel controllo Ora) → mezzanotte di default: scelta
// deliberata per restare permissiva (l'ora resta facoltativa in UI anche
// se il campo `data_appuntamento` a DB è un timestamp completo), non
// blocca il salvataggio della sola data.
export function combinaDataOraLocale(data: string, ora: string): string | null {
  if (!data) return null
  return new Date(`${data}T${ora || '00:00'}`).toISOString()
}

// Slot orari predefiniti per il controllo <select> "Ora" — stesso range/
// passo validati nella Modal di test (07:30-19:30, ogni 15 minuti).
export const SLOT_ORARI: string[] = (() => {
  const slot: string[] = []
  for (let minuti = 7 * 60 + 30; minuti <= 19 * 60 + 30; minuti += 15) {
    const h = String(Math.floor(minuti / 60)).padStart(2, '0')
    const m = String(minuti % 60).padStart(2, '0')
    slot.push(`${h}:${m}`)
  }
  return slot
})()

// Sessione rifinitura 2026-08-12 (vedi CLAUDE.md): classi Tailwind condivise
// per il layout Data+Ora affiancato — prima passava a riga singola solo da
// `sm:` (640px) in su, quindi restava impilato su qualunque smartphone
// (360-412px inclusi, ben sotto quella soglia). Verificato con Playwright a
// 360/390/412px (Samsung S24 e simili) che 340px di larghezza disponibile
// bastino a contenere i due campi affiancati senza troncare/sovrapporre
// nulla — sotto quella soglia (schermi molto stretti, es. iPhone SE 1a
// gen a 320px) resta l'impilamento verticale, l'unico modo di non far
// traboccare i controlli. `min-[340px]:` invece di un breakpoint Tailwind
// nominale (nessuno di quelli standard cade così in basso) — sintassi a
// valore arbitrario supportata nativamente da Tailwind v4. Riusate da tutti
// i controlli Data+Ora dell'app (oggi: Appuntamento, elenco sessioni di
// Costruzione) per restare automaticamente coerenti se un futuro satellite
// (es. Montaggio) ne aggiungesse un altro.
export const RIGA_DATA_ORA_CLASSI = 'flex flex-col min-[340px]:flex-row'
export const CAMPO_DATA_ORA_CLASSI = 'min-w-0 min-[340px]:flex-1'
