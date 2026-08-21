'use client'

import { useState } from 'react'
import { ProfiloSmtpForm } from '@/components/profilo-smtp-form'
import { ProfiloTestoMailForm } from '@/components/profilo-testo-mail-form'
import { ProfiloTariffeForm } from '@/components/profilo-tariffe-form'
import { ProfiloStatisticheForm } from '@/components/profilo-statistiche-form'
import { ProfiloAbbonamentoForm } from '@/components/profilo-abbonamento-form'

// Impostazioni riorganizzate in sotto-sezioni a tab (2026-08-19, vedi
// CLAUDE.md — riorganizzazione Profilo/Impostazioni): prima un unico form
// lineare con 4 gruppi impilati verticalmente (Credenziali/Testo
// mail/Tariffe/Obiettivi, quest'ultimo poi rimosso). Stile "chip"
// segmentato — stesso pattern già in uso per FiltroLavoriChip (/lavori) e
// per il selettore Tono dentro la modale Acquisto — non un tab bar con
// sottolineatura: coerente con l'unico altro selettore "vista tra
// alternative" già esistente nell'app, invece di introdurne uno nuovo.
// `TABS` era già stato ordinato apposta per reggere facilmente questa
// sezione ("Abbonamento/Fatturazione", integrazione Stripe — 2026-08-21,
// vedi CLAUDE.md): come previsto, è bastato un nuovo elemento qui, nessuna
// ristrutturazione del layout.
type TabId = 'credenziali' | 'testo-mail' | 'tariffe' | 'statistiche' | 'abbonamento'

const TABS: { id: TabId; label: string }[] = [
  { id: 'credenziali', label: 'Credenziali email' },
  { id: 'testo-mail', label: 'Testo mail ordine' },
  { id: 'tariffe', label: 'Tariffe orarie' },
  { id: 'statistiche', label: 'Statistiche' },
  { id: 'abbonamento', label: 'Abbonamento' },
]

type SmtpProps = React.ComponentProps<typeof ProfiloSmtpForm>
type TestoMailProps = React.ComponentProps<typeof ProfiloTestoMailForm>
type TariffeProps = React.ComponentProps<typeof ProfiloTariffeForm>
type StatisticheProps = React.ComponentProps<typeof ProfiloStatisticheForm>
type AbbonamentoProps = React.ComponentProps<typeof ProfiloAbbonamentoForm>

export function ImpostazioniTabs({
  smtpProps,
  testoMailProps,
  tariffeProps,
  statisticheProps,
  abbonamentoProps,
}: {
  smtpProps: SmtpProps
  testoMailProps: TestoMailProps
  tariffeProps: TariffeProps
  statisticheProps: StatisticheProps
  abbonamentoProps: AbbonamentoProps
}) {
  const [tab, setTab] = useState<TabId>('credenziali')

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => {
          const attivo = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={attivo}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                attivo ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'credenziali' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Credenziali email personali, usate per inviare gli ordini ad Acquisti e Lavorazione esterna. Il mittente
            reale sarà questo indirizzo, non un indirizzo di sistema.
          </p>
          <ProfiloSmtpForm {...smtpProps} />
        </div>
      )}

      {tab === 'testo-mail' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Apertura e congedo della mail inviata ai fornitori quando confermi un ordine — il resto del testo (elenco
            referenze, firma) resta invariato. Il tono (Formale/Informale) si sceglie ogni volta al momento
            dell&apos;invio, in base al fornitore.
          </p>
          <ProfiloTestoMailForm {...testoMailProps} />
        </div>
      )}

      {tab === 'tariffe' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Usate per stimare il costo manodopera di Costruzione e Montaggio e per il Margine di Chiusura Lavoro.
          </p>
          <ProfiloTariffeForm {...tariffeProps} />
        </div>
      )}

      {tab === 'statistiche' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Finestra temporale su cui calcolare le medie mostrate in Lavori (Tempo medio preventivo, Tempo medio
            completamento).
          </p>
          <ProfiloStatisticheForm {...statisticheProps} />
        </div>
      )}

      {tab === 'abbonamento' && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Stato del tuo abbonamento Districo (modalità test — nessun addebito reale).
          </p>
          <ProfiloAbbonamentoForm {...abbonamentoProps} />
        </div>
      )}
    </div>
  )
}
