// Generato a mano dalla migration; eseguire `supabase gen types typescript` per aggiornare.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      specializzazione: {
        Row: { id: string; valore: string; ufficiale: boolean }
        Insert: { id?: string; valore: string; ufficiale?: boolean }
        Update: { valore?: string; ufficiale?: boolean }
        Relationships: []
      }
      artigiano: {
        Row: {
          id: string; nome: string; cognome: string
          ragione_sociale: string | null; partita_iva: string | null
          codice_fiscale: string | null
          specializzazione: string; telefono: string; email: string
          via: string | null; civico: string | null; cap: string | null
          localita: string | null; provincia: string | null; paese: string
          immagine_profilo: string | null
          smtp_host: string | null; smtp_porta: number | null; smtp_username: string | null
          smtp_password_cifrata: string | null; smtp_sicurezza: 'ssl' | 'starttls' | 'nessuna' | null
          target_preventivo_giorni: number; target_progetto_giorni: number
          target_produzione_giorni: number; target_montaggio_giorni: number
          kpi_finestra_mesi: number
          is_admin: boolean; created_at: string
        }
        Insert: {
          id: string; nome: string; cognome: string
          ragione_sociale?: string | null; partita_iva?: string | null
          codice_fiscale?: string | null
          specializzazione: string; telefono: string; email: string
          via?: string | null; civico?: string | null; cap?: string | null
          localita?: string | null; provincia?: string | null; paese?: string
          immagine_profilo?: string | null
          smtp_host?: string | null; smtp_porta?: number | null; smtp_username?: string | null
          smtp_password_cifrata?: string | null; smtp_sicurezza?: 'ssl' | 'starttls' | 'nessuna' | null
          target_preventivo_giorni?: number; target_progetto_giorni?: number
          target_produzione_giorni?: number; target_montaggio_giorni?: number
          kpi_finestra_mesi?: number
          is_admin?: boolean; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['artigiano']['Insert']>
        Relationships: []
      }
      cliente: {
        Row: {
          id: string; artigiano_id: string; nome: string
          telefono: string | null; email: string | null
          indirizzo: string | null; note: string | null; created_at: string
        }
        Insert: {
          id?: string; artigiano_id: string; nome: string
          telefono?: string | null; email?: string | null
          indirizzo?: string | null; note?: string | null; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cliente']['Insert']>
        Relationships: []
      }
      fornitore: {
        Row: { id: string; ragione_sociale: string; partita_iva: string | null; created_at: string }
        Insert: { id?: string; ragione_sociale: string; partita_iva?: string | null; created_at?: string }
        Update: Partial<Database['public']['Tables']['fornitore']['Insert']>
        Relationships: []
      }
      fornitore_sede: {
        Row: {
          id: string; fornitore_id: string; nome: string
          citta: string | null; indirizzo: string | null
          civico: string | null; cap: string | null
          sigla_provincia: string | null; nazione: string | null
          sede_preferita: boolean
          created_at: string
        }
        Insert: {
          id?: string; fornitore_id: string; nome: string
          citta?: string | null; indirizzo?: string | null
          civico?: string | null; cap?: string | null
          sigla_provincia?: string | null; nazione?: string | null
          sede_preferita?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['fornitore_sede']['Insert']>
        Relationships: []
      }
      fornitore_sede_contatto: {
        Row: {
          id: string; fornitore_sede_id: string; nome: string; cognome: string | null
          email: string | null; cellulare: string | null; created_at: string
        }
        Insert: {
          id?: string; fornitore_sede_id: string; nome: string; cognome?: string | null
          email?: string | null; cellulare?: string | null; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['fornitore_sede_contatto']['Insert']>
        Relationships: []
      }
      // Categorie acquisto libere per artigiano (dalla 0001, mai usata fino
      // alla revisione satelliti del 1/8: ora popola il select "Categoria"
      // in Acquisti, sostituendo il vecchio enum chiuso materiale/ferramenta.
      categoria_acquisto: {
        Row: { id: string; artigiano_id: string; nome: string; created_at: string }
        Insert: { id?: string; artigiano_id: string; nome: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['categoria_acquisto']['Insert']>
        Relationships: []
      }
      lavoro: {
        Row: {
          id: string; cliente_id: string; titolo: string; descrizione: string | null
          stato: 'opportunita' | 'accettato' | 'rifiutato' | 'completato'
          indirizzo: string | null; civico: string | null; cap: string | null
          citta: string | null; sigla_provincia: string | null; nazione: string | null
          tracking: boolean
          data_lavoro: string | null
          accettato_at: string | null
          prima_accettazione_at: string | null; completato_at: string | null
          created_at: string
        }
        Insert: {
          id?: string; cliente_id: string; titolo: string; descrizione?: string | null
          stato?: 'opportunita' | 'accettato' | 'rifiutato' | 'completato'
          indirizzo?: string | null; civico?: string | null; cap?: string | null
          citta?: string | null; sigla_provincia?: string | null; nazione?: string | null
          tracking?: boolean
          data_lavoro?: string | null
          accettato_at?: string | null
          prima_accettazione_at?: string | null; completato_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['lavoro']['Insert']>
        Relationships: []
      }
      lavoro_artigiani: {
        Row: {
          id: string; lavoro_id: string; artigiano_id: string | null
          email_invitata: string; ruolo: 'owner' | 'ospite'
          stato: 'invitato' | 'accettato' | 'rifiutato'
          token_invito: string | null; scadenza_invito: string | null; created_at: string
        }
        Insert: {
          id?: string; lavoro_id: string; artigiano_id?: string | null
          email_invitata: string; ruolo: 'owner' | 'ospite'
          stato?: 'invitato' | 'accettato' | 'rifiutato'
          token_invito?: string | null; scadenza_invito?: string | null; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['lavoro_artigiani']['Insert']>
        Relationships: []
      }
      lavoro_satellite: {
        Row: {
          id: string; lavoro_id: string
          tipo: 'appuntamento' | 'preventivo' | 'progetto' | 'acquisti' | 'campione' | 'costruzione' | 'noleggio' | 'chiusura' | 'acconto' | 'montaggio' | 'spesa_non_preventivata'
          // Per tipo='preventivo' (dal 1/8) e tipo='progetto' (dal 2/8) questa
          // colonna è legacy: non più letta/scritta dall'app, sostituita da
          // preventivo_accettato/preventivo_rifiutato e progetto_accettato.
          // Resta nello schema perché condivisa con campione/acquisti/costruzione.
          stato: null
            | 'in_preparazione' | 'presentato' | 'necessaria_revisione' | 'accettato' | 'non_necessario'
            | 'consegnato' | 'necessario_nuovo_campione' | 'approvato'
            | 'da_acquistare' | 'acquistato' | 'ricevuto'
            | 'da_iniziare' | 'in_corso' | 'completata'
          descrizione: string | null; tipo_appuntamento: 'briefing' | 'verifica_misure' | null
          concluso: boolean
          data_appuntamento: string | null
          revisione_di: string | null; valore_complessivo: number | null
          serie: string | null
          fornitore_sede_id: string | null; descrizione_libera: string | null
          // Testo libero (nome di una categoria_acquisto dell'artigiano), non più
          // un enum chiuso a materiale/ferramenta dalla revisione satelliti del 1/8.
          acquisto_categoria: string | null
          data_invio_ordine: string | null; contatto_invio_id: string | null
          data_inizio: string | null; data_fine: string | null
          prenotazione_effettuata: boolean; data_da: string | null; data_a: string | null; costo: number | null
          data_presentazione: string | null
          preventivo_accettato: boolean; preventivo_rifiutato: boolean
          progetto_accettato: boolean
          campione_consegnato: boolean; campione_data_consegna: string | null
          // Sostituisce lo stato testuale (da_acquistare/acquistato/ricevuto) per
          // tipo='acquisti' dalla revisione 2026-08-03 (vedi CLAUDE.md): commit
          // definitivo impostato manualmente, mai reversibile via app.
          ordinato: boolean
          // Chiusura Lavoro (2026-08-03, vedi CLAUDE.md): chiusura_conclusa=true è
          // il nuovo (e unico) meccanismo che porta lavoro.stato a 'completato'.
          // chiusura_acconti: righe libere non normalizzate (nessuna tabella
          // Pagamento separata), etichetta/data/importo per riga — non più
          // letta/scritta dal 2026-08-13 (restyling calcoli economici, vedi
          // CLAUDE.md), colonna non droppata. chiusura_incassata (2026-08-13):
          // secondo flag indipendente, ENTRAMBI richiesti per 'completato'.
          chiusura_conclusa: boolean; chiusura_data: string | null
          chiusura_acconti: { etichetta: string; data: string | null; importo: number }[]
          chiusura_incassata: boolean
          // Acconto (2026-08-11, vedi CLAUDE.md): intenzionalmente indipendente
          // da chiusura_acconti sopra (due meccanismi distinti, vedi nota nel
          // file CLAUDE.md). Importo riusa valore_complessivo, Note riusa
          // descrizione_libera — nessuna colonna dedicata per quei due.
          acconto_data: string | null; acconto_incassato: boolean
          // Costruzione (2026-08-12, vedi CLAUDE.md): sostituisce
          // stato/data_inizio/data_fine per questo tipo (colonne legacy,
          // non droppate) — array di {inizio, fine} (fine nullable, sessione
          // ancora aperta). Nome generico: verrà riusata identica da
          // Montaggio in una sessione futura dedicata. `concluso` sopra
          // riusato come flag "conclusa".
          sessioni_lavoro: { inizio: string; fine: string | null }[]
          // Attività non preventivate (2026-08-13, vedi CLAUDE.md): stesso
          // schema di Acconto — Importo riusa valore_complessivo, Descrizione
          // riusa descrizione_libera, Data e il flag "accettata" dedicati.
          spesa_data: string | null; spesa_accettata: boolean
          data_creazione: string; data_ultimo_cambio_stato: string
        }
        Insert: {
          id?: string; lavoro_id: string
          tipo: 'appuntamento' | 'preventivo' | 'progetto' | 'acquisti' | 'campione' | 'costruzione' | 'noleggio' | 'chiusura' | 'acconto' | 'montaggio' | 'spesa_non_preventivata'
          stato?: null
            | 'in_preparazione' | 'presentato' | 'necessaria_revisione' | 'accettato' | 'non_necessario'
            | 'consegnato' | 'necessario_nuovo_campione' | 'approvato'
            | 'da_acquistare' | 'acquistato' | 'ricevuto'
            | 'da_iniziare' | 'in_corso' | 'completata'
          descrizione?: string | null; tipo_appuntamento?: 'briefing' | 'verifica_misure' | null
          concluso?: boolean
          data_appuntamento?: string | null
          revisione_di?: string | null; valore_complessivo?: number | null
          serie?: string | null
          fornitore_sede_id?: string | null; descrizione_libera?: string | null
          acquisto_categoria?: string | null
          data_invio_ordine?: string | null; contatto_invio_id?: string | null
          data_inizio?: string | null; data_fine?: string | null
          prenotazione_effettuata?: boolean; data_da?: string | null; data_a?: string | null; costo?: number | null
          data_presentazione?: string | null
          preventivo_accettato?: boolean; preventivo_rifiutato?: boolean
          progetto_accettato?: boolean
          campione_consegnato?: boolean; campione_data_consegna?: string | null
          ordinato?: boolean
          chiusura_conclusa?: boolean; chiusura_data?: string | null
          chiusura_acconti?: { etichetta: string; data: string | null; importo: number }[]
          chiusura_incassata?: boolean
          acconto_data?: string | null; acconto_incassato?: boolean
          sessioni_lavoro?: { inizio: string; fine: string | null }[]
          spesa_data?: string | null; spesa_accettata?: boolean
          data_creazione?: string; data_ultimo_cambio_stato?: string
        }
        Update: Partial<Database['public']['Tables']['lavoro_satellite']['Insert']>
        Relationships: []
      }
      lavoro_satellite_articolo: {
        Row: { id: string; satellite_id: string; descrizione: string; colore_finitura: string | null; quantita: number; created_at: string }
        Insert: { id?: string; satellite_id: string; descrizione: string; colore_finitura?: string | null; quantita: number; created_at?: string }
        Update: Partial<Database['public']['Tables']['lavoro_satellite_articolo']['Insert']>
        Relationships: []
      }
      lavoro_satellite_allegato: {
        Row: { id: string; satellite_id: string; nome_file: string; storage_path: string; etichetta: string; data_caricamento: string }
        Insert: { id?: string; satellite_id: string; nome_file: string; storage_path: string; etichetta: string; data_caricamento?: string }
        Update: Partial<Database['public']['Tables']['lavoro_satellite_allegato']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_artigiano_del_lavoro: { Args: { p_lavoro_id: string }; Returns: boolean }
      is_owner_del_lavoro: { Args: { p_lavoro_id: string }; Returns: boolean }
      possiede_cliente_del_lavoro: { Args: { p_lavoro_id: string }; Returns: boolean }
      appuntamenti_scaduti_count: { Args: Record<string, never>; Returns: number }
      lavori_dashboard: {
        Args: Record<string, never>
        Returns: {
          id: string; titolo: string
          stato: 'opportunita' | 'accettato' | 'rifiutato' | 'completato'
          cliente_id: string; created_at: string
          punteggio_urgenza: number
          satelliti_rossi: number; satelliti_gialli: number; satelliti_verdi: number
          valore_preventivo_accettato: number | null
          ha_appuntamento_scaduto: boolean
          ha_acconto_incassato: boolean
        }[]
      }
      kpi_dashboard: {
        Args: Record<string, never>
        Returns: {
          lavori_in_corso: number
          importo_lavori_accettati: number
          tempo_preventivo_giorni: number | null; tempo_preventivo_campione: number
          tempo_completamento_giorni: number | null; tempo_completamento_campione: number
        }[]
      }
      imposta_sede_preferita: { Args: { p_fornitore_id: string; p_sede_id: string }; Returns: undefined }
    }
  }
}
