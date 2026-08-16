'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cropper, { type Area } from 'react-easy-crop'
import { caricaImmagineProfilo, rimuoviImmagineProfilo } from '@/lib/profilo/actions'
import { Avatar } from '@/components/avatar'

// Upload + crop immagine profilo (2026-08-19, vedi CLAUDE.md). Crop
// quadrato/circolare a rapporto fisso — "standard da avatar" — con
// `react-easy-crop` (unica dipendenza nuova aggiunta in questa sessione,
// vedi package.json: nessuna libreria di crop già presente nello stack,
// e un crop interattivo drag/zoom vero non è replicabile con poche righe
// come le maschere numeriche già in uso altrove nel progetto — a
// differenza di quei casi, qui la scelta di introdurre una dipendenza
// mirata è motivata). Il crop avviene per intero nel browser (canvas),
// solo il quadrato già ritagliato viene caricato — il server (vedi
// caricaImmagineProfilo) applica comunque un resize/crop 512×512
// difensivo, non si fida ciecamente del client.
function leggiFileComeImmagine(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function estraiRitaglio(immagine: HTMLImageElement, area: Area): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const lato = 800
  canvas.width = lato
  canvas.height = lato
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas non disponibile')

  ctx.drawImage(immagine, area.x, area.y, area.width, area.height, 0, 0, lato, lato)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Ritaglio fallito'))), 'image/jpeg', 0.9)
  })
}

export function ProfiloAvatarUpload({
  nome,
  cognome,
  immagineUrl,
}: {
  nome: string
  cognome: string
  immagineUrl: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [immagineDaRitagliare, setImmagineDaRitagliare] = useState<{ el: HTMLImageElement; file: File } | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaRitaglio, setAreaRitaglio] = useState<Area | null>(null)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const onCropComplete = useCallback((_areaPercentuale: Area, areaPixel: Area) => {
    setAreaRitaglio(areaPixel)
  }, [])

  async function handleFileSelezionato(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permette di riselezionare subito lo stesso file
    if (!file) return
    setErrore(null)
    try {
      const el = await leggiFileComeImmagine(file)
      setImmagineDaRitagliare({ el, file })
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setAreaRitaglio(null)
    } catch {
      setErrore("Impossibile leggere l'immagine, riprova con un altro file")
    }
  }

  function handleAnnullaRitaglio() {
    setImmagineDaRitagliare(null)
  }

  async function handleConfermaRitaglio() {
    if (!immagineDaRitagliare || !areaRitaglio) return
    setLoading(true)
    setErrore(null)

    try {
      const blob = await estraiRitaglio(immagineDaRitagliare.el, areaRitaglio)
      const formData = new FormData()
      formData.set('file', blob, 'avatar.jpg')
      const result = await caricaImmagineProfilo(formData)
      if (!result.ok) {
        setErrore(result.error)
        return
      }
      setImmagineDaRitagliare(null)
      router.refresh()
    } catch {
      setErrore("Errore nell'elaborazione dell'immagine, riprova")
    } finally {
      setLoading(false)
    }
  }

  async function handleRimuovi() {
    if (!confirm("Rimuovere l'immagine profilo? Tornerai ad avere l'avatar con le iniziali.")) return
    setLoading(true)
    setErrore(null)
    const result = await rimuoviImmagineProfilo()
    setLoading(false)
    if (!result.ok) {
      setErrore(result.error)
      return
    }
    router.refresh()
  }

  if (immagineDaRitagliare) {
    return (
      <div className="space-y-3">
        {/* Contenitore a posizione relativa/altezza fissa: requisito di
            react-easy-crop, che posiziona il proprio canvas in absolute
            inset-0 al suo interno. */}
        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-gray-900">
          <Cropper
            image={immagineDaRitagliare.el.src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div>
          <label htmlFor="avatar-zoom" className="mb-1 block text-xs font-medium text-gray-700">
            Zoom
          </label>
          <input
            id="avatar-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>
        {errore && <p className="text-xs text-red-600">{errore}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfermaRitaglio}
            disabled={loading || !areaRitaglio}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Caricamento…' : 'Conferma'}
          </button>
          <button
            type="button"
            onClick={handleAnnullaRitaglio}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar nome={nome} cognome={cognome} immagineUrl={immagineUrl} taglia="lg" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {immagineUrl ? 'Cambia foto' : 'Carica foto'}
          </button>
          {immagineUrl && (
            <button
              type="button"
              onClick={handleRimuovi}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              Rimuovi
            </button>
          )}
        </div>
        {errore && <p className="text-xs text-red-600">{errore}</p>}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileSelezionato} className="hidden" />
      </div>
    </div>
  )
}
