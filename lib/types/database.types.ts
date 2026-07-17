// Generato a mano dalla migration; eseguire `supabase gen types typescript` per aggiornare.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      specializzazione: {
        Row: { id: string; valore: string; ufficiale: boolean }
        Insert: { id?: string; valore: string; ufficiale?: boolean }
        Update: { valore?: string; ufficiale?: boolean }
      }
      artigiano: {
        Row: {
          id: string; nome: string; cognome: string
          ragione_sociale: string | null; partita_iva: string | null
          specializzazione: string; telefono: string; email: string
          via: string | null; civico: string | null; cap: string | null
          localita: string; immagine_profilo: string | null
          is_admin: boolean; created_at: string
        }
        Insert: {
          id: string; nome: string; cognome: string
          ragione_sociale?: string | null; partita_iva?: string | null
          specializzazione: string; telefono: string; email: string
          via?: string | null; civico?: string | null; cap?: string | null
          localita: string; immagine_profilo?: string | null
          is_admin?: boolean; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['artigiano']['Insert']>
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
      }
      fornitore: {
        Row: { id: string; ragione_sociale: string; partita_iva: string | null; created_at: string }
        Insert: { id?: string; ragione_sociale: string; partita_iva?: string | null; created_at?: string }
        Update: Partial<Database['public']['Tables']['fornitore']['Insert']>
      }
      fornitore_sede: {
        Row: { id: string; fornitore_id: string; nome: string; citta: string; indirizzo: string | null; created_at: string }
        Insert: { id?: string; fornitore_id: string; nome: string; citta: string; indirizzo?: string | null; created_at?: string }
        Update: Partial<Database['public']['Tables']['fornitore_sede']['Insert']>
      }
      fornitore_sede_contatto: {
        Row: { id: string; fornitore_sede_id: string; nome: string; email: string | null; telefono: string | null; ruolo: string | null; destinatario_ordini: boolean; created_at: string }
        Insert: { id?: string; fornitore_sede_id: string; nome: string; email?: string | null; telefono?: string | null; ruolo?: string | null; destinatario_ordini?: boolean; created_at?: string }
        Update: Partial<Database['public']['Tables']['fornitore_sede_contatto']['Insert']>
      }
      artigiano_fornitore_nota: {
        Row: { artigiano_id: string; fornitore_sede_id: string; nota: string; updated_at: string }
        Insert: { artigiano_id: string; fornitore_sede_id: string; nota: string; updated_at?: string }
        Update: { nota?: string; updated_at?: string }
      }
      categoria_acquisto: {
        Row: { id: string; artigiano_id: string; nome: string; created_at: string }
        Insert: { id?: string; artigiano_id: string; nome: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['categoria_acquisto']['Insert']>
      }
      artigiano_fornitore_categoria: {
        Row: { artigiano_id: string; fornitore_sede_id: string; categoria_id: string }
        Insert: { artigiano_id: string; fornitore_sede_id: string; categoria_id: string }
        Update: never
      }
      lavoro: {
        Row: {
          id: string; cliente_id: string; titolo: string; descrizione: string | null
          stato: 'trattativa' | 'esecuzione' | 'chiuso'
          accettato_at: string | null; created_at: string
        }
        Insert: {
          id?: string; cliente_id: string; titolo: string; descrizione?: string | null
          stato?: 'trattativa' | 'esecuzione' | 'chiuso'
          accettato_at?: string | null; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['lavoro']['Insert']>
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
      }
      attivita: {
        Row: {
          id: string; lavoro_id: string
          tipo: 'briefing' | 'progetto' | 'preventivo' | 'sopralluogo' | 'campioni'
          stato: 'da_fare' | 'in_corso' | 'bloccata' | 'fatta'
          data_appuntamento: string | null; data_apertura: string
          data_chiusura: string | null; commenti: string | null
          revisione_di: string | null; importo: number | null; created_at: string
        }
        Insert: {
          id?: string; lavoro_id: string
          tipo: 'briefing' | 'progetto' | 'preventivo' | 'sopralluogo' | 'campioni'
          stato?: 'da_fare' | 'in_corso' | 'bloccata' | 'fatta'
          data_appuntamento?: string | null; data_apertura?: string
          data_chiusura?: string | null; commenti?: string | null
          revisione_di?: string | null; importo?: number | null; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['attivita']['Insert']>
      }
      sla_attivita: {
        Row: { id: string; artigiano_id: string | null; tipo_attivita: string; giorni_max: number }
        Insert: { id?: string; artigiano_id?: string | null; tipo_attivita: string; giorni_max: number }
        Update: { giorni_max?: number }
      }
      fase_template: {
        Row: { id: string; artigiano_id: string; nome_fase: string; ordine: number; created_at: string }
        Insert: { id?: string; artigiano_id: string; nome_fase: string; ordine: number; created_at?: string }
        Update: Partial<Database['public']['Tables']['fase_template']['Insert']>
      }
      lavoro_fasi: {
        Row: {
          id: string; lavoro_id: string; nome_fase: string; ordine: number
          stato: 'da_fare' | 'in_corso' | 'bloccata' | 'fatta'
          data_inizio: string | null; data_fine: string | null; created_at: string
        }
        Insert: {
          id?: string; lavoro_id: string; nome_fase: string; ordine: number
          stato?: 'da_fare' | 'in_corso' | 'bloccata' | 'fatta'
          data_inizio?: string | null; data_fine?: string | null; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['lavoro_fasi']['Insert']>
      }
      pagamento: {
        Row: { id: string; lavoro_id: string; tipo: 'acconto' | 'saldo'; importo: number; data: string; note: string | null; created_at: string }
        Insert: { id?: string; lavoro_id: string; tipo: 'acconto' | 'saldo'; importo: number; data: string; note?: string | null; created_at?: string }
        Update: Partial<Database['public']['Tables']['pagamento']['Insert']>
      }
      allegato: {
        Row: { id: string; lavoro_id: string; tipo: 'pdf' | 'foto'; nome_file: string; storage_path: string; data_caricamento: string; note: string | null }
        Insert: { id?: string; lavoro_id: string; tipo: 'pdf' | 'foto'; nome_file: string; storage_path: string; data_caricamento?: string; note?: string | null }
        Update: Partial<Database['public']['Tables']['allegato']['Insert']>
      }
      articolo: {
        Row: { id: string; fornitore_sede_id: string; codice: string | null; descrizione: string; colore_finitura: string | null; created_at: string }
        Insert: { id?: string; fornitore_sede_id: string; codice?: string | null; descrizione: string; colore_finitura?: string | null; created_at?: string }
        Update: Partial<Database['public']['Tables']['articolo']['Insert']>
      }
      ordine_acquisto: {
        Row: {
          id: string; lavoro_id: string; fornitore_sede_id: string
          categoria_id: string | null; stato: 'bozza' | 'concluso'
          data_invio: string | null; data_chiusura_manuale: string | null
          totale: number | null; created_at: string
        }
        Insert: {
          id?: string; lavoro_id: string; fornitore_sede_id: string
          categoria_id?: string | null; stato?: 'bozza' | 'concluso'
          data_invio?: string | null; data_chiusura_manuale?: string | null
          totale?: number | null; created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ordine_acquisto']['Insert']>
      }
      ordine_acquisto_riga: {
        Row: { id: string; ordine_id: string; articolo_id: string | null; descrizione: string; colore_finitura: string | null; quantita: number; prezzo_unitario: number; created_at: string }
        Insert: { id?: string; ordine_id: string; articolo_id?: string | null; descrizione: string; colore_finitura?: string | null; quantita: number; prezzo_unitario: number; created_at?: string }
        Update: Partial<Database['public']['Tables']['ordine_acquisto_riga']['Insert']>
      }
    }
    Functions: {
      is_artigiano_del_lavoro: { Args: { p_lavoro_id: string }; Returns: boolean }
      is_owner_del_lavoro: { Args: { p_lavoro_id: string }; Returns: boolean }
      ultimo_prezzo_articolo: { Args: { p_articolo_id: string; p_artigiano_id: string }; Returns: number | null }
    }
  }
}
