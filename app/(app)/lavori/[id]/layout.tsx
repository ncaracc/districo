// Refactor route parallele/intercettate (2026-08-12, vedi CLAUDE.md): nuovo
// layout, prima assente per questo segmento (page.tsx viveva direttamente
// sotto app/(app)/lavori/[id]/ senza layout proprio) — necessario per
// accogliere lo slot parallelo @modal accanto alla pagina normale. `modal`
// è null quando nessuna route in @modal corrisponde (vedi @modal/default.tsx)
// — Modal stessa (components/modal.tsx) è un portal verso document.body,
// quindi non serve alcun wrapper posizionale qui: children e modal restano
// semplicemente fratelli.
export default function LavoroDettaglioLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
