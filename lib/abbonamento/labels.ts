// Etichette condivise per stato_abbonamento/piano_abbonamento (Stripe,
// 2026-08-21) — estratte il 2026-08-22 da `ProfiloAbbonamentoForm` (dove
// erano nate come costanti locali) perché la nuova pagina admin
// `/admin/utenti` deve mostrare esattamente le stesse etichette: unica
// fonte di verità, nessuna delle due copie rischia di disallinearsi.
export const STATO_ABBONAMENTO_LABEL: Record<string, string> = {
  nessuno: 'Nessun abbonamento attivo',
  trialing: 'Periodo di prova in corso',
  active: 'Abbonamento attivo',
  past_due: 'Pagamento in ritardo',
  canceled: 'Abbonamento annullato',
}

export const PIANO_ABBONAMENTO_LABEL: Record<string, string> = {
  mensile: 'Mensile (€5/mese)',
  annuale: 'Annuale (€48/anno)',
}
