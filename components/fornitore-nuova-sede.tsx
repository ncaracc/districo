'use client'

import { useState } from 'react'
import { FornitoreSedeForm } from '@/components/fornitore-sede-form'

export function FornitoreNuovaSede({ fornitoreId }: { fornitoreId: string }) {
  const [aperto, setAperto] = useState(false)

  if (aperto) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <FornitoreSedeForm fornitoreId={fornitoreId} onSalvato={() => setAperto(false)} onAnnulla={() => setAperto(false)} />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setAperto(true)}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      + Nuova sede
    </button>
  )
}
