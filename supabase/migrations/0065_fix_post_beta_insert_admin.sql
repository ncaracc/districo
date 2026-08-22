-- =============================================================
-- 2026-08-22 sera — Fix bug reale in produzione (vedi CLAUDE.md): il
-- primo tentativo di creare un post nel forum beta è fallito con "new
-- row violates row-level security policy for table post_beta" — non
-- legato a "nessun post ancora esistente" come inizialmente sospettato,
-- ma alla policy INSERT di 0062 che controllava SOLO `beta_tester =
-- true`, mai `is_admin`. L'admin reale (Nicola) ha `is_admin=true` ma
-- `beta_tester=false` (non è lui stesso un beta tester) — coerente col
-- resto del design ("l'admin è un partecipante di prima classe della
-- community", già vero per le RISPOSTE su messaggio_beta) ma MAI esteso
-- alla creazione di un nuovo post: un gap reale, non un edge case del
-- "primo post" — sarebbe fallito identicamente anche con post_beta già
-- popolata.
-- =============================================================
drop policy "post_beta: solo beta tester apre un post proprio" on post_beta;

create policy "post_beta: beta tester o admin apre un post proprio"
  on post_beta for insert
  with check (
    artigiano_id = auth.uid()
    and exists (
      select 1 from artigiano a
      where a.id = auth.uid() and (a.beta_tester = true or a.is_admin = true)
    )
  );
