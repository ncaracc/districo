/* eslint-disable jsx-a11y/alt-text -- <Image> qui è quello di
   @react-pdf/renderer (rendering PDF server-side), non il tag <img> del
   DOM: la sua API non ha affatto un prop `alt` (non applicabile a un PDF),
   il linter lo confonde per l'omonimia con l'elemento HTML. */
// "Scheda di lavoro" PDF (2026-08-17, vedi CLAUDE.md) — foglio di lavoro
// stampabile per appunti a mano, generato on-demand dal bottone documento
// (Dashboard/Dettaglio Lavoro, prima un segnaposto senza funzione reale).
//
// Libreria scelta: @react-pdf/renderer (JSX -> PDF, puro Node, nessun
// browser headless) — coerente con lo stack TypeScript/React esistente,
// pagination automatica (wrap={false} su ogni blocco evita di spezzarlo a
// metà pagina, esattamente il comportamento richiesto), nessun font esterno
// da registrare (Helvetica di default, sans-serif — coerente con "serif
// solo nel logo" delle linee guida UI, vedi CLAUDE.md). `qrcode` per il QR:
// pura JS (pngjs), nessun binding nativo — stesso principio già seguito per
// `sharp` rispetto a `cairosvg` nella sessione banner mail del 17/8.
import path from 'node:path'
import { Document, Page, View, Text, Image, Canvas, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import type { DatiLavoroSatelliti } from '@/lib/lavori/dettaglio-lavoro-data'
import { costruisciBlocchiScheda, type BloccoScheda } from '@/lib/lavori/scheda-lavoro-mapping'
import { DOT_COLOR_HEX } from '@/lib/lavori/satelliti-meta'
import { siteUrl } from '@/lib/email/templates'

const LOGO_PATH = path.join(process.cwd(), 'public/email-assets/districo-logo-payoff.png')

// 7cm in punti PDF (1cm = 28.3465pt) — altezza UNIFORME del box appunti per
// ogni blocco, richiesta esplicitamente (non variabile per contenuto).
const GRID_ALTEZZA = 7 * 28.3465
// 0,5cm — passo della griglia a quadretti.
const GRID_PASSO = 0.5 * 28.3465

const styles = StyleSheet.create({
  page: { paddingTop: 24, paddingBottom: 28, paddingHorizontal: 40, fontSize: 9, color: '#111827' },
  headerRidotto: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  logoMini: { width: 20, height: 20 * (503 / 1100) },
  headerRidottoTesto: { fontSize: 8, color: '#9ca3af' },

  headerRigaLogo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  logo: { width: 130, height: 130 * (503 / 1100) },
  paginaLabel: { fontSize: 8, color: '#9ca3af' },
  separatore: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 14 },

  corpoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  corpoHeaderSx: { flex: 1, paddingRight: 20 },
  eyebrow: { fontSize: 8, color: '#9ca3af', letterSpacing: 0.5 },
  clienteNome: { fontSize: 13, fontWeight: 700, marginTop: 2 },
  lavoroTitolo: { fontSize: 15, fontWeight: 700, marginTop: 2 },
  testoGrigio: { fontSize: 9, color: '#6b7280', marginTop: 4, lineHeight: 1.4 },
  corpoHeaderDx: { alignItems: 'center' },
  qr: { width: 72, height: 72 },
  qrLabel: { fontSize: 7, color: '#9ca3af', marginTop: 4 },

  blocco: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  titoloRiga: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotVuoto: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: '#9ca3af', backgroundColor: '#ffffff' },
  titolo: { fontSize: 11, fontWeight: 700 },
  riga: { fontSize: 9, color: '#374151', marginTop: 2, lineHeight: 1.3 },
  griglia: { marginTop: 6 },
})

// Indirizzo su una riga, stesso formato già in uso in lavoro-info.tsx
// (formattaIndirizzo) — replicato qui invece di importato: quel modulo ha
// 'use client' (componente UI del browser), questo genera un Buffer
// server-only, nessun bisogno di accoppiare i due confini.
function formattaIndirizzo(l: DatiLavoroSatelliti['lavoro']): string | null {
  const via = [l.indirizzo, l.civico].filter(Boolean).join(', ')
  const localita = [l.cap, l.citta].filter(Boolean).join(' ')
  const provincia = l.sigla_provincia ? ` (${l.sigla_provincia})` : ''
  const riga2 = `${localita}${provincia}`.trim()
  if (!via && !riga2) return null
  return [via, riga2, l.nazione].filter((p) => p && p.trim()).join(' — ')
}

function fmtDataApertura(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })
}

// Griglia a quadretti da 0,5cm disegnata via Canvas (API PDFKit sottostante
// esposta da @react-pdf/renderer) — più semplice ed efficiente di generare
// decine di <Line> SVG per ogni blocco: un solo elemento, dimensioni note a
// runtime (availableWidth/Height), nessun calcolo di colonne/righe a monte.
// Tipo minimale del painter (PDFKit sottostante, non tipizzato da
// @react-pdf/renderer): solo i metodi usati qui, invece di `any`.
interface CanvasPainter {
  lineWidth(larghezza: number): CanvasPainter
  strokeColor(colore: string): CanvasPainter
  moveTo(x: number, y: number): CanvasPainter
  lineTo(x: number, y: number): CanvasPainter
  stroke(): CanvasPainter
  rect(x: number, y: number, larghezza: number, altezza: number): CanvasPainter
}

function GrigliaAppunti() {
  return (
    <Canvas
      style={{ width: '100%', height: GRID_ALTEZZA }}
      paint={(painter: CanvasPainter, availableWidth: number, availableHeight: number) => {
        painter.lineWidth(0.5).strokeColor('#e5e7eb')
        for (let x = GRID_PASSO; x < availableWidth; x += GRID_PASSO) {
          painter.moveTo(x, 0).lineTo(x, availableHeight).stroke()
        }
        for (let y = GRID_PASSO; y < availableHeight; y += GRID_PASSO) {
          painter.moveTo(0, y).lineTo(availableWidth, y).stroke()
        }
        painter.lineWidth(1).strokeColor('#d1d5db')
        painter.rect(0, 0, availableWidth, availableHeight).stroke()
        return null
      }}
    />
  )
}

function BloccoView({ blocco }: { blocco: BloccoScheda }) {
  return (
    <View style={styles.blocco} wrap={false}>
      <View style={styles.titoloRiga}>
        <View style={blocco.colore ? [styles.dot, { backgroundColor: DOT_COLOR_HEX[blocco.colore] }] : styles.dotVuoto} />
        <Text style={styles.titolo}>{blocco.titolo}</Text>
      </View>
      {blocco.righe.map((riga, i) => (
        <Text key={i} style={styles.riga}>
          {riga}
        </Text>
      ))}
      <View style={styles.griglia}>
        <GrigliaAppunti />
      </View>
    </View>
  )
}

function SchedaLavoroDocument({
  dati,
  blocchi,
  qrBuffer,
  dataAperturaLabel,
}: {
  dati: DatiLavoroSatelliti
  blocchi: BloccoScheda[]
  qrBuffer: Buffer
  dataAperturaLabel: string
}) {
  const indirizzo = formattaIndirizzo(dati.lavoro)

  return (
    <Document title={`Scheda di lavoro — ${dati.lavoro.titolo}`} author="Districo">
      <Page size="A4" style={styles.page} wrap>
        {/* Header ridotto: fisso su ogni pagina, ma visibile solo dalla
            seconda in poi (pageNumber > 1) — la prima pagina mostra invece
            l'header completo qui sotto, nel flusso normale. Un View `fixed`
            senza contenuto (render -> null) non occupa spazio in pagina 1,
            nessun accorgimento aggiuntivo necessario. */}
        <View
          fixed
          render={({ pageNumber }: { pageNumber: number }) =>
            pageNumber > 1 ? (
              <View style={styles.headerRidotto}>
                <Image src={LOGO_PATH} style={styles.logoMini} />
                <Text style={styles.headerRidottoTesto}>Scheda di lavoro — pagina {pageNumber}</Text>
              </View>
            ) : null
          }
        />

        {/* Header pagina 1 — solo flusso normale, non ripetuto. */}
        <View wrap={false}>
          <View style={styles.headerRigaLogo}>
            <Image src={LOGO_PATH} style={styles.logo} />
            <Text style={styles.paginaLabel}>Scheda di lavoro — pagina 1</Text>
          </View>
          <View style={styles.separatore} />

          <View style={styles.corpoHeaderRow}>
            <View style={styles.corpoHeaderSx}>
              <Text style={styles.eyebrow}>CLIENTE</Text>
              <Text style={styles.clienteNome}>{dati.clienteNome ?? '—'}</Text>
              <Text style={[styles.eyebrow, { marginTop: 10 }]}>LAVORO</Text>
              <Text style={styles.lavoroTitolo}>{dati.lavoro.titolo}</Text>
              {dati.lavoro.descrizione && <Text style={styles.testoGrigio}>{dati.lavoro.descrizione}</Text>}
              {indirizzo && <Text style={styles.testoGrigio}>{indirizzo}</Text>}
              <Text style={styles.testoGrigio}>Aperto: {dataAperturaLabel}</Text>
            </View>
            <View style={styles.corpoHeaderDx}>
              <Image src={{ data: qrBuffer, format: 'png' }} style={styles.qr} />
              <Text style={styles.qrLabel}>Apri online</Text>
            </View>
          </View>
        </View>

        {blocchi.map((blocco, i) => (
          <BloccoView key={`${blocco.chiave}-${i}`} blocco={blocco} />
        ))}
      </Page>
    </Document>
  )
}

export async function generaSchedaLavoroPdf(dati: DatiLavoroSatelliti): Promise<Buffer> {
  const blocchi = costruisciBlocchiScheda(dati)
  const url = `${siteUrl()}/lavori/${dati.lavoro.id}`
  const qrBuffer = await QRCode.toBuffer(url, { margin: 1, width: 300, errorCorrectionLevel: 'M' })

  return renderToBuffer(
    <SchedaLavoroDocument
      dati={dati}
      blocchi={blocchi}
      qrBuffer={qrBuffer}
      dataAperturaLabel={fmtDataApertura(dati.lavoro.created_at)}
    />,
  )
}

// Nome file scaricato — ASCII, nessun accento/carattere speciale (alcuni
// client/OS gestiscono male Content-Disposition con UTF-8 non codificato).
export function nomeFileScheda(titolo: string): string {
  const slug = titolo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `scheda-lavoro-${slug || 'senza-titolo'}.pdf`
}
