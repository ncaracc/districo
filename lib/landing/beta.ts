// Flag "programma beta aperto" (2026-08-21, Sezione 8 della landing, vedi
// CLAUDE.md). Nessun meccanismo automatico richiesto per questa sessione
// ("per ora non serve un meccanismo automatico") — un semplice booleano:
// quando `true`, la sezione mostra titolo/testo/elenco/CTA per intero;
// quando `false`, mostra SOLO la nota conclusiva ("I posti sono limitati…"),
// che resta sempre visibile in entrambi i casi. Per chiudere il programma
// (es. posti esauriti), cambiare questo valore a `false` — nessuna
// riscrittura del componente necessaria.
export const BETA_PROGRAMMA_APERTO = true
