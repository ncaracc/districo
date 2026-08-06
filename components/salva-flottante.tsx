'use client'

// Bottone Salva flottante sticky in basso, sostituisce i bottoni Salva
// sparsi (dimensione/stile/posizione incoerenti tra i form, vedi
// docs/audit-ui.md sezione 2/3) con un pattern unico — Sprint UI-2, vedi
// CLAUDE.md. Visibile solo quando `visibile` (dirty-state) è vero.
//
// `sticky bottom-0`, non `fixed`: resta ancorato alla larghezza del suo
// contenitore scrollabile più vicino (il body di una Modal, o la card/
// pagina che ospita Cliente/Fornitore) invece che all'intera finestra —
// soddisfa "su desktop resta ancorata alla larghezza del form/modale" senza
// bisogno di media query dedicate, e su mobile la larghezza del contenitore
// coincide comunque con lo schermo intero (Modal è w-full sotto sm:, le
// pagine Cliente/Fornitore non hanno margini laterali oltre al padding
// standard di `<main>`).
//
// `-mx-4 -mb-4`: fa "sanguinare" la barra fino al bordo del contenitore
// immediato, cancellando esattamente il suo stesso padding — funziona senza
// calibrazione per-chiamante perché ogni contenitore toccato da questo
// sprint (il body scrollabile di Modal, la card `p-4` di Cliente/Fornitore
// in modifica, `<main>` px-4 per Cliente/Fornitore in creazione) usa la
// stessa unità di padding (`4` = 1rem) in tutto il progetto.
//
// **Il margine negativo vive su un wrapper normale, non sull'elemento
// sticky stesso** (fix 2026-08-06, vedi CLAUDE.md): un `margin-bottom`
// negativo su un elemento `position: sticky` non cancella il padding
// dell'antenato scrollabile allo stesso modo di un elemento normale —
// verificato empiricamente forzando `position: static` sull'elemento in
// devtools: il gap di 16px sotto la barra spariva. Bug sottile, non
// documentato in modo ovvio nelle specifiche CSS correnti: separare
// margine (wrapper esterno, `position` di default) e sticky (elemento
// interno, senza margini propri) lo risolve, indipendentemente dal
// meccanismo esatto del browser.
export function SalvaFlottante({
  visibile,
  salvando,
  errore,
  onSalva,
  testoSalva = 'Salva',
  testoSalvando = 'Salvataggio…',
  arrotondamento = 'sm:rounded-b-2xl',
  variante = 'barra',
}: {
  visibile: boolean
  salvando: boolean
  errore?: string | null
  // Assente per i form Cliente/Fornitore: il bottone diventa type="submit" e
  // affida il salvataggio al <form onSubmit> che lo contiene, stesso
  // percorso (validazione inclusa) del vecchio bottone in fondo al form.
  onSalva?: () => void
  testoSalva?: string
  testoSalvando?: string
  arrotondamento?: string
  // 'barra' (default, invariato): fascia sticky a piena larghezza, in uso su
  // tutti i satelliti/Cliente/Fornitore. 'pillola' (Modal di test, vedi
  // components/test/modal-test.tsx): bottone flottante staccato dai bordi
  // con margine, più generoso di un FAB standard, colore acceso — stile in
  // esplorazione, non ancora adottato altrove (aggiornare qui il commento
  // in CLAUDE.md se/quando lo diventa).
  variante?: 'barra' | 'pillola'
}) {
  if (!visibile) return null

  if (variante === 'pillola') {
    return (
      <button
        type={onSalva ? 'button' : 'submit'}
        onClick={onSalva}
        disabled={salvando}
        // Centrato orizzontalmente (left-1/2 + -translate-x-1/2), 50px dal
        // basso — non più ancorato all'angolo destro (passo 2, Modal di
        // test, vedi CLAUDE.md).
        className="fixed bottom-[50px] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-sky-500 px-7 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition-colors hover:bg-sky-600 disabled:opacity-50"
      >
        {salvando ? testoSalvando : testoSalva}
      </button>
    )
  }

  return (
    <div className="-mx-4 -mb-4 mt-4">
      <div className={`sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3 ${arrotondamento}`}>
        {errore && <p className="mb-2 text-xs text-red-600">{errore}</p>}
        <button
          type={onSalva ? 'button' : 'submit'}
          onClick={onSalva}
          disabled={salvando}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {salvando ? testoSalvando : testoSalva}
        </button>
      </div>
    </div>
  )
}
