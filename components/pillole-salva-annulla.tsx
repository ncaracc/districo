'use client'

import { PILLOLA_CLASSI_PRIMARIA, PILLOLA_CLASSI_SECONDARIA } from '@/components/pillola-flottante'

// Coppia di pillole flottanti Salva/Annulla per l'interno di una Modal
// satellite — nuovo standard di comportamento per tutte le modali satellite
// (restyling Appuntamento/Briefing, 2026-08-10, vedi CLAUDE.md): nessun
// salvataggio implicito, i bottoni compaiono solo con modifiche non
// salvate (`visibile`), "Salva" salva senza chiudere, "Annulla" scarta e
// chiude direttamente (nessuna conferma: è già un'azione esplicita di
// scarto — la conferma resta solo sui tentativi di chiusura indiretti,
// X/backdrop/Esc, gestiti da useProteggiChiusuraModal/DialogConferma).
//
// Stesso stile "pillola" già definito in components/pillola-flottante.tsx
// (riusato as-is, nessuna nuova variante di colore) e già in uso in coppia
// in components/lavoro-form.tsx — ma posizionamento diverso:
// `position: absolute` ancorato al box della Modal, non `fixed` sul
// viewport. Un gruppo `fixed left-1/2 -translate-x-1/2` (come in
// lavoro-form.tsx, pensato per una pagina intera) si disallineerebbe dal
// box quando il contenuto è più corto dell'altezza della Modal — la Modal
// è centrata sullo schermo ma non necessariamente alta quanto lo schermo,
// quindi "bottom" rispetto al viewport non coincide con "bottom" rispetto
// al box. Stesso identico principio già scoperto e risolto nella Modal di
// test (`components/test/modal-test.tsx`, passo 8: il bottone Salva lì è
// passato da `fixed` ad `absolute` per lo stesso motivo).
//
// Nessuna modifica necessaria a components/modal.tsx: il box del Modal
// condiviso ha già `position: relative` incondizionato (non solo da `sm:`
// in su come nella Modal di test) — un discendente `absolute` risale al
// primo antenato posizionato, che è già quel box, indipendentemente da
// quanto è annidato nel DOM (stesso principio di
// AllegatoLista/scroll-clipping, non influenzato dall'overflow-y-auto del
// contenitore scrollabile intermedio). L'unico vincolo per chi usa questo
// componente: nessun wrapper intermedio deve introdurre un proprio
// `position: relative/absolute/fixed`, o diventerebbe lui il contenitore.
export function PilloleSalvaAnnulla({
  visibile,
  salvando,
  errore,
  onSalva,
  onAnnulla,
}: {
  visibile: boolean
  salvando: boolean
  errore?: string | null
  onSalva: () => void
  onAnnulla: () => void
}) {
  if (!visibile) return null

  return (
    <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-2 px-4">
      {errore && (
        <p className="max-w-full truncate rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 shadow">{errore}</p>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onSalva} disabled={salvando} className={PILLOLA_CLASSI_PRIMARIA}>
          {salvando ? 'Salvataggio…' : 'Salva'}
        </button>
        <button type="button" onClick={onAnnulla} disabled={salvando} className={PILLOLA_CLASSI_SECONDARIA}>
          Annulla
        </button>
      </div>
    </div>
  )
}
