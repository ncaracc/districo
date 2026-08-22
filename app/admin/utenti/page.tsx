import { createClient } from '@/lib/supabase/server'
import { ToggleAdmin } from '@/components/admin/toggle-admin'
import { impostaBetaTester, impostaAccessoGratuito } from '@/lib/admin/actions'
import { STATO_ABBONAMENTO_LABEL, PIANO_ABBONAMENTO_LABEL } from '@/lib/abbonamento/labels'
import { formattaData, formattaDataOra } from '@/lib/formato-data'

// Pagina admin — anagrafica utenti (2026-08-22, vedi CLAUDE.md). Protetta
// da `app/admin/layout.tsx` (redirect se non loggato o non `is_admin`) —
// qui la lettura passa comunque da `admin_lista_artigiani()` (SECURITY
// DEFINER, migration 0058+0060), non da una `select('*')` diretta: doppia
// protezione, non solo a livello di route.
//
// NESSUN dato su Clienti/Fornitori/Lavori dei singoli artigiani (principio
// già scritto in CLAUDE.md — "Admin RLS: nessun accesso diretto alle
// tabelle operative"): solo anagrafica + stato account. Ordinata per data
// di registrazione decrescente (già l'ordine restituito dalla funzione SQL,
// nessun sort lato client necessario). Nessuna paginazione per ora — lista
// semplice, coerente con "strumento di lavoro" per un solo admin.
//
// "Accesso gratuito" (2026-08-22, stessa sessione di "Beta tester" —
// deroga manuale indipendente da Stripe, vedi CLAUDE.md): stesso
// `ToggleAdmin` generico, Server Action diversa (`impostaAccessoGratuito`)
// legata alla riga via `.bind(null, a.id)`.
//
// Badge "Richiesta" (2026-08-22 sera, mini-sito beta — vedi CLAUDE.md):
// visibile accanto al toggle Beta tester quando l'artigiano ha richiesto
// un posto dal mini-sito (`richiesta_beta_at` valorizzato) ma non è
// ancora beta tester — sparisce da solo appena l'admin attiva il toggle
// (nessuna azione separata per "evadere" la richiesta, il toggle stesso
// la evade).
export default async function AdminUtentiPage() {
  const supabase = await createClient()
  const { data: artigiani, error } = await supabase.rpc('admin_lista_artigiani')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Utenti</h1>
      <p className="mt-1 text-sm text-gray-500">
        Anagrafica e stato abbonamento di tutti gli artigiani registrati. Nessun dato su Clienti, Fornitori o Lavori.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">Errore nel caricamento: {error.message}</p>}

      {artigiani && artigiani.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">Nessun artigiano registrato.</p>
      )}

      {artigiani && artigiani.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-medium">Nome e cognome</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Registrato il</th>
                <th className="py-2 pr-4 font-medium">Abbonamento</th>
                <th className="py-2 pr-4 font-medium">Piano</th>
                <th className="py-2 pr-4 font-medium">Beta tester</th>
                <th className="py-2 pr-4 font-medium">Accesso gratuito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {artigiani.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 pr-4 text-gray-900">
                    {a.nome} {a.cognome}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{a.email}</td>
                  <td className="py-3 pr-4 text-gray-600">
                    {formattaData(a.created_at)}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {STATO_ABBONAMENTO_LABEL[a.stato_abbonamento] ?? a.stato_abbonamento}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {a.piano_abbonamento ? (PIANO_ABBONAMENTO_LABEL[a.piano_abbonamento] ?? a.piano_abbonamento) : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <ToggleAdmin valoreIniziale={a.beta_tester} azione={impostaBetaTester.bind(null, a.id)} />
                      {!a.beta_tester && a.richiesta_beta_at && (
                        <span
                          className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
                          title={`Richiesta inviata il ${formattaDataOra(a.richiesta_beta_at)}`}
                        >
                          Richiesta {formattaData(a.richiesta_beta_at)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <ToggleAdmin
                      valoreIniziale={a.accesso_gratuito}
                      azione={impostaAccessoGratuito.bind(null, a.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
