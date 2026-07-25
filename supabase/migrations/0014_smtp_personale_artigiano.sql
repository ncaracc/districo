-- =============================================================
-- Correzione Sprint C: l'invio email degli ordini (Acquisti/Lavorazione
-- esterna) deve usare le credenziali SMTP PERSONALI dell'artigiano
-- (mittente reale = la sua email), non lo SMTP di sistema Aruba usato
-- per gli inviti "a quattro mani". Aggiunti direttamente su `artigiano`
-- (relazione 1:1, stesso stile di ragione_sociale/partita_iva — non
-- giustifica una tabella dedicata).
--
-- La password non è mai salvata in chiaro: `smtp_password_cifrata`
-- contiene il ciphertext prodotto da lib/crypto/credenziali-smtp.ts
-- (AES-256-GCM, chiave da env SMTP_CREDENZIALI_KEY, mai nel DB). Nessuna
-- nuova RLS necessaria: le policy "artigiano vede/aggiorna solo se
-- stesso" (0001) coprono già queste colonne.
-- =============================================================
alter table artigiano
  add column smtp_host             text,
  add column smtp_porta            integer,
  add column smtp_username         text,
  add column smtp_password_cifrata text,
  add column smtp_sicurezza        text check (smtp_sicurezza in ('ssl', 'starttls', 'nessuna'));
