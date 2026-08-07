'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { aggiornaOrdine, impostaOrdinatoAcquisto } from '@/lib/lavori/satelliti'
import { cercaFornitoreSedi } from '@/lib/fornitori/actions'
import { contattiPerInvio, inviaOrdineSatellite } from '@/lib/lavori/ordini-email'
import { formattaValuta } from '@/lib/formato-valuta'
import { Combobox } from '@/components/combobox'
import { AllegatoLista, AllegatoTrigger } from '@/components/satellite-allegati'
import type { Satellite, SatelliteAllegato, SatelliteArticolo } from '@/lib/lavori/satelliti-meta'
import { inputClass } from '@/lib/input-class'
import { useDirtyForm } from '@/lib/use-dirty-form'
import { useProteggiChiusuraModal } from '@/components/modal'
import { SalvaFlottante } from '@/components/salva-flottante'
import { DialogConferma } from '@/components/dialog-conferma'

type SedeSelezionata = { id: string; label: string }
type RigaBozza = { descrizione: string }

// Revisione 2026-08-03 (vedi CLAUDE.md): il vecchio stato a 3 valori
// testuali con transizioni manuali è sostituito da un solo flag booleano
// `ordinato`. Finché ordinato=false l'intero Acquisto è modificabile qui
// (fornitore/categoria/referenze/valore, prima possibile solo al momento
// della creazione). `ordinato` è rappresentato come checkbox (non bottoni
// d'azione, corretto lo stesso giorno: uno stato reversibile non dovrebbe
// somigliare a un'azione che "accade") — nessuna conferma nativa finché
// l'ordine non è stato inviato via mail, l'unico commit definitivo.
export function SatelliteOrdine({
  satellite,
  righe,
  allegati,
  fornitoreSedeLabel,
  categorie,
  lavoroId,
  isOwner,
}: {
  satellite: Satellite
  righe: SatelliteArticolo[]
  allegati: SatelliteAllegato[]
  fornitoreSedeLabel: string | null
  categorie: { id: string; nome: string }[]
  lavoroId: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const [sede, setSede] = useState<SedeSelezionata | null>(
    satellite.fornitore_sede_id && fornitoreSedeLabel ? { id: satellite.fornitore_sede_id, label: fornitoreSedeLabel } : null,
  )
  const [categoria, setCategoria] = useState(satellite.acquisto_categoria ?? '')
  const [valore, setValore] = useState(satellite.valore_complessivo != null ? String(satellite.valore_complessivo) : '')
  const [righeBozza, setRigheBozza] = useState<RigaBozza[]>(
    righe.length > 0 ? righe.map((r) => ({ descrizione: r.descrizione })) : [{ descrizione: '' }],
  )

  const [invioAperto, setInvioAperto] = useState(false)
  const [contatti, setContatti] = useState<{ id: string; label: string }[] | null>(null)
  const [contattoScelto, setContattoScelto] = useState('')
  const [richiedeConfigurazione, setRichiedeConfigurazione] = useState(false)

  function aggiornaRiga(i: number, descrizione: string) {
    setRigheBozza((r) => r.map((riga, idx) => (idx === i ? { descrizione } : riga)))
  }

  function campiCorrenti() {
    return {
      fornitoreSedeId: sede?.id ?? null,
      acquistoCategoria: categoria || null,
      valoreComplessivo: valore ? Number(valore) : null,
      righe: righeBozza.filter((r) => r.descrizione.trim()).map((r) => ({ descrizione: r.descrizione.trim() })),
    }
  }

  // Sprint UI-2 (bottone Salva flottante + dirty-state, vedi CLAUDE.md):
  // stesso snapshot già inviato al server da campiCorrenti() — "Ordinato"
  // resta auto-salvante (fuori da questo tracking) ma persiste anche lui
  // questi campi come effetto collaterale quando si attiva (vedi
  // handleToggleOrdinato sotto): richiama segnaSalvato() anche lì.
  const { dirty, segnaSalvato } = useDirtyForm(campiCorrenti())
  const [confermaUscitaAperta, setConfermaUscitaAperta] = useState(false)
  const chiudiReale = useProteggiChiusuraModal(dirty, () => setConfermaUscitaAperta(true))

  async function handleSalva() {
    setLoading(true)
    setErrore(null)
    const result = await aggiornaOrdine(satellite.id, lavoroId, campiCorrenti())
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return false
    }
    segnaSalvato(campiCorrenti())
    router.refresh()
    return true
  }

  async function handleSalvaEEsci() {
    if (await handleSalva()) {
      setConfermaUscitaAperta(false)
      chiudiReale()
    }
  }

  function handleEsciSenzaSalvare() {
    setConfermaUscitaAperta(false)
    chiudiReale()
  }

  // Toggle reversibile finché l'ordine non è stato inviato via mail (vedi
  // CLAUDE.md) — nessuna conferma nativa, non è un'azione distruttiva.
  // Attivare salva prima i campi correnti (il form è ancora "sporco" a
  // questo punto), disattivare no: a ordinato=true il form non è renderizzato,
  // non c'è nulla da salvare.
  async function handleToggleOrdinato(checked: boolean) {
    setLoading(true)
    setErrore(null)
    if (checked) {
      const salvato = await aggiornaOrdine(satellite.id, lavoroId, campiCorrenti())
      if (!salvato.ok) {
        setLoading(false)
        setErrore(salvato.error)
        return
      }
      segnaSalvato(campiCorrenti())
    }
    const result = await impostaOrdinatoAcquisto(satellite.id, lavoroId, checked)
    setLoading(false)
    if (!result.ok) setErrore(result.error)
    else router.refresh()
  }

  async function apriInvio() {
    setInvioAperto(true)
    setErrore(null)
    if (satellite.fornitore_sede_id) {
      setContatti(await contattiPerInvio(satellite.fornitore_sede_id))
    } else {
      setContatti([])
    }
  }

  async function confermaInvio() {
    if (!contattoScelto) return
    setLoading(true)
    setErrore(null)
    setRichiedeConfigurazione(false)
    const result = await inviaOrdineSatellite(satellite.id, lavoroId, contattoScelto)
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      setRichiedeConfigurazione(!!result.richiedeConfigurazione)
      return
    }
    setInvioAperto(false)
    router.refresh()
  }

  const editabile = isOwner && !satellite.ordinato

  return (
    // Frammento, non un unico div: SalvaFlottante sibling del div a bordo,
    // non annidato dentro — stesso motivo già documentato in
    // satellite-appuntamento.tsx (Sprint UI-2, vedi CLAUDE.md).
    <>
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-2 text-xs text-gray-500">Creato il {new Date(satellite.data_creazione).toLocaleDateString('it-IT')}</p>

        {editabile ? (
          <div className="mb-3 space-y-3">
            <div>
              <label htmlFor="ordine-fornitore" className="mb-1 block text-sm font-medium text-gray-700">
                Fornitore
              </label>
              {sede ? (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm text-gray-700">{sede.label}</p>
                  <button type="button" onClick={() => setSede(null)} className="shrink-0 text-xs font-medium text-gray-600 underline">
                    Cambia
                  </button>
                </div>
              ) : (
                <Combobox
                  id="ordine-fornitore"
                  placeholder="Cerca per ragione sociale o sede..."
                  fetchOptions={cercaFornitoreSedi}
                  onSelect={setSede}
                />
              )}
            </div>

            <div>
              <label htmlFor="ordine-categoria" className="mb-1 block text-sm font-medium text-gray-700">
                Categoria
              </label>
              <select id="ordine-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass()}>
                <option value="">— Nessuna —</option>
                {categorie.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Referenze</span>
              <div className="space-y-2">
                {righeBozza.map((riga, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={riga.descrizione}
                      onChange={(e) => aggiornaRiga(i, e.target.value)}
                      placeholder="Es. truciolare nobilitato bianco W10100 sp. 25 – 2 pannelli"
                      className={`${inputClass()} min-w-0 flex-1`}
                    />
                    {righeBozza.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRigheBozza((r) => r.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRigheBozza((r) => [...r, { descrizione: '' }])}
                className="mt-2 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                + Aggiungi referenza
              </button>
            </div>

            <div>
              <label htmlFor="ordine-valore" className="mb-1 block text-sm font-medium text-gray-700">
                Valore complessivo
              </label>
              <input
                id="ordine-valore"
                type="number"
                step="0.01"
                value={valore}
                onChange={(e) => setValore(e.target.value)}
                className={inputClass()}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Una volta ordinato, il campo Fornitore (con la sua Combobox)
                non è più renderizzato — questa riga evita che il nome del
                fornitore diventi altrimenti irrecuperabile dalla Modal
                (prima era l'unico posto in cui appariva ancora, come
                sostituto del nome nel pallino+nome ora spostato in header). */}
            <p className="mb-1 text-sm text-gray-700">{fornitoreSedeLabel ?? 'Nessun fornitore'}</p>
            {satellite.acquisto_categoria && <p className="mb-1 text-xs text-gray-500">{satellite.acquisto_categoria}</p>}
            {righe.length > 0 && (
              <ul className="mb-2 list-disc pl-4 text-sm text-gray-700">
                {righe.map((r) => (
                  <li key={r.id}>{r.descrizione}</li>
                ))}
              </ul>
            )}
            {satellite.valore_complessivo != null && (
              <p className="mb-2 text-sm text-gray-700">{formattaValuta(satellite.valore_complessivo)}</p>
            )}
          </>
        )}

        {satellite.data_invio_ordine && (
          <p className="mb-2 text-xs text-gray-500">
            Ordine inviato il {new Date(satellite.data_invio_ordine).toLocaleDateString('it-IT')}
          </p>
        )}

        {isOwner && (
          <div className="mb-2">
            <AllegatoTrigger satelliteId={satellite.id} lavoroId={lavoroId} isOwner={isOwner} />
          </div>
        )}
        <div className="mb-2">
          <AllegatoLista allegati={allegati} lavoroId={lavoroId} isOwner={isOwner} />
        </div>

        {errore && (
          <p className="mb-2 text-xs text-red-600">
            {errore}
            {richiedeConfigurazione && (
              <>
                {' '}
                <Link href="/profilo/impostazioni" className="underline underline-offset-2">
                  Vai a Profilo/Impostazioni
                </Link>
              </>
            )}
          </p>
        )}

        {isOwner && !satellite.data_invio_ordine && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={satellite.ordinato}
                disabled={loading || (!satellite.ordinato && (!sede || campiCorrenti().righe.length === 0))}
                onChange={(e) => handleToggleOrdinato(e.target.checked)}
                className="accent-primary"
              />
              Ordinato
            </label>
            {satellite.ordinato && !invioAperto && (
              <button
                type="button"
                onClick={apriInvio}
                disabled={loading}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Invia ordine
              </button>
            )}
          </div>
        )}

        {invioAperto && (
          <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
            {contatti === null ? (
              <p className="text-xs text-gray-500">Caricamento contatti…</p>
            ) : contatti.length === 0 ? (
              <p className="text-xs text-gray-500">Nessun contatto con email per questa sede.</p>
            ) : (
              <>
                <select
                  value={contattoScelto}
                  onChange={(e) => setContattoScelto(e.target.value)}
                  className={inputClass()}
                >
                  <option value="">— Scegli il destinatario —</option>
                  {contatti.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confermaInvio}
                    disabled={loading || !contattoScelto}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Invio…' : 'Conferma invio'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvioAperto(false)}
                    disabled={loading}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Nessun errore={errore} qui: è già mostrato sopra, condiviso anche
          con handleToggleOrdinato/confermaInvio — duplicherebbe altrimenti. */}
      {editabile && <SalvaFlottante visibile={dirty} salvando={loading} onSalva={handleSalva} />}

      <DialogConferma
        aperto={confermaUscitaAperta}
        titolo="Modifiche non salvate"
        messaggio="Vuoi salvare le modifiche prima di uscire?"
        opzioni={[
          { label: 'Salva ed esci', variante: 'primaria', onClick: handleSalvaEEsci, disabled: loading },
          { label: 'Esci senza salvare', variante: 'secondaria', onClick: handleEsciSenzaSalvare, disabled: loading },
          { label: 'Annulla', variante: 'testuale', onClick: () => setConfermaUscitaAperta(false) },
        ]}
      />
    </>
  )
}
