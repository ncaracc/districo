'use client'

import { useState } from 'react'
import { Modal } from '@/components/modal'
import { SalvaFlottante } from '@/components/salva-flottante'
import { useDirtyForm } from '@/lib/use-dirty-form'

// Modal di test — ambiente di iterazione rapida sul design, separato dai
// satelliti reali (vedi CLAUDE.md quando aggiornato). Primo passo: solo
// struttura base (header con titolo+semaforo, controllo dimensione font,
// bottone Salva flottante) — nessun campo form vero, nessuna persistenza.
// Componente isolato in components/test/, non referenziato da alcun
// componente satellite/pagina di produzione oltre al singolo trigger nel
// menu (components/app-nav.tsx).

const TITOLO_PLACEHOLDER = 'Titolo della finestra di TEST'

// Range esplorativo, non un limite definitivo: da aggiustare dal vivo.
const FONT_MIN = 14
const FONT_MAX = 28
const FONT_STEP = 2
const FONT_DEFAULT = 18

export function ModalTest({ aperto, onChiudi }: { aperto: boolean; onChiudi: () => void }) {
  const [fontSize, setFontSize] = useState(FONT_DEFAULT)

  // Nessun campo form vero in questo passo: il dirty-state è agganciato
  // direttamente al controllo +/- della dimensione titolo, solo per poter
  // vedere dal vivo come si comporta SalvaFlottante (compare al primo
  // cambiamento, scompare al "salva" senza persistere nulla).
  const { dirty, segnaSalvato } = useDirtyForm({ fontSize })

  function decrementa() {
    setFontSize((s) => Math.max(FONT_MIN, s - FONT_STEP))
  }

  function incrementa() {
    setFontSize((s) => Math.min(FONT_MAX, s + FONT_STEP))
  }

  const titolo = (
    <span className="inline-flex flex-wrap items-center gap-2">
      {/* Semaforo: un solo colore fisso per questo passo (verde), non ancora
          ciclabile — placeholder puramente visivo, nessuno stato reale
          dietro. Stessa forma (pallino pieno) già in uso nell'header dei
          satelliti veri, colore scelto qui direttamente (non importato da
          lib/lavori/satelliti-meta.ts) per restare isolato dal codice di
          produzione. */}
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
      <span className="font-sans font-semibold text-gray-900" style={{ fontSize }}>
        {TITOLO_PLACEHOLDER}
      </span>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={decrementa}
          disabled={fontSize <= FONT_MIN}
          aria-label="Riduci dimensione titolo"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
        >
          −
        </button>
        <span className="w-9 text-center text-[11px] tabular-nums text-gray-400">{fontSize}px</span>
        <button
          type="button"
          onClick={incrementa}
          disabled={fontSize >= FONT_MAX}
          aria-label="Aumenta dimensione titolo"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-300 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
        >
          +
        </button>
      </span>
    </span>
  )

  return (
    <Modal aperto={aperto} onChiudi={onChiudi} titolo={titolo}>
      <p className="text-sm text-gray-500">
        Corpo del modale — i campi veri (testo/data/numero/allegati) arrivano nei prossimi passi. Per ora usa i
        controlli +/− accanto al titolo per far comparire il bottone Salva flottante qui sotto.
      </p>
      <SalvaFlottante visibile={dirty} salvando={false} onSalva={() => segnaSalvato()} variante="pillola" />
    </Modal>
  )
}
