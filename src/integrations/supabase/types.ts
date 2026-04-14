export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_log_sessions: {
        Row: {
          ended_at: string | null
          id: string
          ip_address: string
          last_activity_at: string | null
          modules_accessed: string[]
          routes_accessed: string[]
          started_at: string
          user_agent: string
          user_id: string
          user_name_snapshot: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          ip_address?: string
          last_activity_at?: string | null
          modules_accessed?: string[]
          routes_accessed?: string[]
          started_at?: string
          user_agent?: string
          user_id: string
          user_name_snapshot?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          ip_address?: string
          last_activity_at?: string | null
          modules_accessed?: string[]
          routes_accessed?: string[]
          started_at?: string
          user_agent?: string
          user_id?: string
          user_name_snapshot?: string
        }
        Relationships: []
      }
      ai_external_search_logs: {
        Row: {
          id: string
          query: string
          run_id: string | null
          searched_at: string
          sources: Json | null
        }
        Insert: {
          id?: string
          query?: string
          run_id?: string | null
          searched_at?: string
          sources?: Json | null
        }
        Update: {
          id?: string
          query?: string
          run_id?: string | null
          searched_at?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_external_search_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_run_exports: {
        Row: {
          created_at: string
          file_type: string
          id: string
          run_id: string
          storage_key: string
        }
        Insert: {
          created_at?: string
          file_type?: string
          id?: string
          run_id: string
          storage_key: string
        }
        Update: {
          created_at?: string
          file_type?: string
          id?: string
          run_id?: string
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_run_exports_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_reason: string | null
          approved_status: string
          created_at: string
          error_message: string | null
          external_sources_used: Json | null
          id: string
          input_json: Json
          internal_docs_used: Json | null
          model: string | null
          output_structured: Json | null
          output_text: string | null
          prompt_hash: string | null
          redaction_level: string
          replay_of_run_id: string | null
          run_type: string
          status: string
          template_type: string | null
          template_version: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_reason?: string | null
          approved_status?: string
          created_at?: string
          error_message?: string | null
          external_sources_used?: Json | null
          id?: string
          input_json?: Json
          internal_docs_used?: Json | null
          model?: string | null
          output_structured?: Json | null
          output_text?: string | null
          prompt_hash?: string | null
          redaction_level?: string
          replay_of_run_id?: string | null
          run_type?: string
          status?: string
          template_type?: string | null
          template_version?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_reason?: string | null
          approved_status?: string
          created_at?: string
          error_message?: string | null
          external_sources_used?: Json | null
          id?: string
          input_json?: Json
          internal_docs_used?: Json | null
          model?: string | null
          output_structured?: Json | null
          output_text?: string | null
          prompt_hash?: string | null
          redaction_level?: string
          replay_of_run_id?: string | null
          run_type?: string
          status?: string
          template_type?: string | null
          template_version?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_replay_of_run_id_fkey"
            columns: ["replay_of_run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_category: string | null
          contract_id: string
          created_at: string
          description: string
          id: string
          recommendation: string
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          type: string
        }
        Insert: {
          alert_category?: string | null
          contract_id: string
          created_at?: string
          description?: string
          id?: string
          recommendation?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          type?: string
        }
        Update: {
          alert_category?: string | null
          contract_id?: string
          created_at?: string
          description?: string
          id?: string
          recommendation?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment_description_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          contato_principal: string
          created_at: string
          email: string
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string
          segmento: Database["public"]["Enums"]["contract_segment"]
          site: string | null
          tags: string[]
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          contato_principal?: string
          created_at?: string
          email?: string
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social: string
          segmento?: Database["public"]["Enums"]["contract_segment"]
          site?: string | null
          tags?: string[]
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          contato_principal?: string
          created_at?: string
          email?: string
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string
          segmento?: Database["public"]["Enums"]["contract_segment"]
          site?: string | null
          tags?: string[]
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_subprojects: {
        Row: {
          contract_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["subproject_status"]
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["subproject_status"]
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["subproject_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_subprojects_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          alerta_reajuste_dias: number
          centro_custo: string | null
          client_id: string
          codigo: string
          created_at: string
          data_base_reajuste: string
          data_fim: string | null
          data_inicio: string
          escopo_operacional: string | null
          gov_sphere: Database["public"]["Enums"]["gov_sphere"] | null
          has_subprojects: boolean
          id: string
          indice_reajuste: string
          modelo_receita: Database["public"]["Enums"]["revenue_model"]
          moeda: string
          nome: string
          objeto: string
          observacoes_financeiras: string | null
          percentual_fixo: number | null
          percentual_impostos_faturamento: number | null
          periodicidade_renovacao: string | null
          receivables_last_payment_at: string | null
          receivables_last_sync_at: string | null
          receivables_open_amount: number | null
          receivables_overdue_amount: number | null
          receivables_status: string | null
          renewal_base_date: string | null
          renewal_term_months: number | null
          renovacao_automatica: boolean
          responsavel_cliente: string | null
          responsavel_cliente_email: string | null
          responsavel_cliente_telefone: string | null
          responsavel_comercial: string | null
          responsavel_cs: string | null
          responsavel_interno: string
          riscos_pendencias: string | null
          segmento: Database["public"]["Enums"]["contract_segment"]
          slas: string | null
          status: Database["public"]["Enums"]["contract_status"]
          status_renovacao: Database["public"]["Enums"]["renewal_status"]
          superlogica_customer_cnpj: string | null
          superlogica_match_hint: string | null
          superlogica_subscription_id: string | null
          superlogica_subscription_label: string | null
          tags: string[]
          tipo: Database["public"]["Enums"]["contract_type"]
          ultima_atualizacao_recursos: string | null
          unidade: string | null
          updated_at: string
          valor_mensal_referencia: number | null
          valor_total_contrato: number | null
        }
        Insert: {
          alerta_reajuste_dias?: number
          centro_custo?: string | null
          client_id: string
          codigo?: string
          created_at?: string
          data_base_reajuste?: string
          data_fim?: string | null
          data_inicio?: string
          escopo_operacional?: string | null
          gov_sphere?: Database["public"]["Enums"]["gov_sphere"] | null
          has_subprojects?: boolean
          id?: string
          indice_reajuste?: string
          modelo_receita?: Database["public"]["Enums"]["revenue_model"]
          moeda?: string
          nome?: string
          objeto?: string
          observacoes_financeiras?: string | null
          percentual_fixo?: number | null
          percentual_impostos_faturamento?: number | null
          periodicidade_renovacao?: string | null
          receivables_last_payment_at?: string | null
          receivables_last_sync_at?: string | null
          receivables_open_amount?: number | null
          receivables_overdue_amount?: number | null
          receivables_status?: string | null
          renewal_base_date?: string | null
          renewal_term_months?: number | null
          renovacao_automatica?: boolean
          responsavel_cliente?: string | null
          responsavel_cliente_email?: string | null
          responsavel_cliente_telefone?: string | null
          responsavel_comercial?: string | null
          responsavel_cs?: string | null
          responsavel_interno?: string
          riscos_pendencias?: string | null
          segmento?: Database["public"]["Enums"]["contract_segment"]
          slas?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          status_renovacao?: Database["public"]["Enums"]["renewal_status"]
          superlogica_customer_cnpj?: string | null
          superlogica_match_hint?: string | null
          superlogica_subscription_id?: string | null
          superlogica_subscription_label?: string | null
          tags?: string[]
          tipo?: Database["public"]["Enums"]["contract_type"]
          ultima_atualizacao_recursos?: string | null
          unidade?: string | null
          updated_at?: string
          valor_mensal_referencia?: number | null
          valor_total_contrato?: number | null
        }
        Update: {
          alerta_reajuste_dias?: number
          centro_custo?: string | null
          client_id?: string
          codigo?: string
          created_at?: string
          data_base_reajuste?: string
          data_fim?: string | null
          data_inicio?: string
          escopo_operacional?: string | null
          gov_sphere?: Database["public"]["Enums"]["gov_sphere"] | null
          has_subprojects?: boolean
          id?: string
          indice_reajuste?: string
          modelo_receita?: Database["public"]["Enums"]["revenue_model"]
          moeda?: string
          nome?: string
          objeto?: string
          observacoes_financeiras?: string | null
          percentual_fixo?: number | null
          percentual_impostos_faturamento?: number | null
          periodicidade_renovacao?: string | null
          receivables_last_payment_at?: string | null
          receivables_last_sync_at?: string | null
          receivables_open_amount?: number | null
          receivables_overdue_amount?: number | null
          receivables_status?: string | null
          renewal_base_date?: string | null
          renewal_term_months?: number | null
          renovacao_automatica?: boolean
          responsavel_cliente?: string | null
          responsavel_cliente_email?: string | null
          responsavel_cliente_telefone?: string | null
          responsavel_comercial?: string | null
          responsavel_cs?: string | null
          responsavel_interno?: string
          riscos_pendencias?: string | null
          segmento?: Database["public"]["Enums"]["contract_segment"]
          slas?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          status_renovacao?: Database["public"]["Enums"]["renewal_status"]
          superlogica_customer_cnpj?: string | null
          superlogica_match_hint?: string | null
          superlogica_subscription_id?: string | null
          superlogica_subscription_label?: string | null
          tags?: string[]
          tipo?: Database["public"]["Enums"]["contract_type"]
          ultima_atualizacao_recursos?: string | null
          unidade?: string | null
          updated_at?: string
          valor_mensal_referencia?: number | null
          valor_total_contrato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_chunk_embeddings: {
        Row: {
          chunk_id: string
          created_at: string
          id: string
          model: string
        }
        Insert: {
          chunk_id: string
          created_at?: string
          id?: string
          model?: string
        }
        Update: {
          chunk_id?: string
          created_at?: string
          id?: string
          model?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_chunk_embeddings_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "doc_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_chunks: {
        Row: {
          chunk_hash: string | null
          chunk_index: number
          chunk_text: string
          created_at: string
          document_id: string
          id: string
          page_end: number | null
          page_start: number | null
          token_count_est: number | null
          tsv: unknown
        }
        Insert: {
          chunk_hash?: string | null
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          token_count_est?: number | null
          tsv?: unknown
        }
        Update: {
          chunk_hash?: string | null
          chunk_index?: number
          chunk_text?: string
          created_at?: string
          document_id?: string
          id?: string
          page_end?: number | null
          page_start?: number | null
          token_count_est?: number | null
          tsv?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "doc_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_templates: {
        Row: {
          body_markdown: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          schema_json: Json
          template_key: string
          title: string
          version: string
        }
        Insert: {
          body_markdown: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          schema_json?: Json
          template_key: string
          title: string
          version?: string
        }
        Update: {
          body_markdown?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          schema_json?: Json
          template_key?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      doc_text_extractions: {
        Row: {
          created_at: string
          document_id: string
          error_message: string | null
          extracted_at: string | null
          extracted_text: string | null
          id: string
          owner_id: string | null
          owner_type: string
          status: string
        }
        Insert: {
          created_at?: string
          document_id: string
          error_message?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          id?: string
          owner_id?: string | null
          owner_type?: string
          status?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          error_message?: string | null
          extracted_at?: string | null
          extracted_text?: string | null
          id?: string
          owner_id?: string | null
          owner_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_text_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_attachments: {
        Row: {
          contract_id: string
          description_text: string | null
          description_type: string
          file_extension: string
          file_name: string
          file_size_bytes: number
          file_type_mime: string
          id: string
          notes: string | null
          storage_key: string
          uploaded_at: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          contract_id: string
          description_text?: string | null
          description_type?: string
          file_extension?: string
          file_name?: string
          file_size_bytes?: number
          file_type_mime?: string
          id?: string
          notes?: string | null
          storage_key?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          contract_id?: string
          description_text?: string | null
          description_type?: string
          file_extension?: string
          file_name?: string
          file_size_bytes?: number
          file_type_mime?: string
          id?: string
          notes?: string | null
          storage_key?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      feedz_alias_mappings: {
        Row: {
          alias_type: string
          created_at: string
          feedz_value: string
          id: string
          internal_id: string | null
          internal_label: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          alias_type?: string
          created_at?: string
          feedz_value: string
          id?: string
          internal_id?: string | null
          internal_label?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          alias_type?: string
          created_at?: string
          feedz_value?: string
          id?: string
          internal_id?: string | null
          internal_label?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feedz_pending_matches: {
        Row: {
          created_at: string | null
          external_id: string
          feedz_admission_date: string | null
          feedz_department: string | null
          feedz_email: string | null
          feedz_job_title: string | null
          feedz_name: string
          feedz_remuneration: number | null
          feedz_status: string | null
          id: string
          match_type: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_person_id: string | null
          suggested_person_ids: string[] | null
          suggested_scores: number[] | null
          sync_run_id: string
        }
        Insert: {
          created_at?: string | null
          external_id: string
          feedz_admission_date?: string | null
          feedz_department?: string | null
          feedz_email?: string | null
          feedz_job_title?: string | null
          feedz_name: string
          feedz_remuneration?: number | null
          feedz_status?: string | null
          id?: string
          match_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_person_id?: string | null
          suggested_person_ids?: string[] | null
          suggested_scores?: number[] | null
          sync_run_id: string
        }
        Update: {
          created_at?: string | null
          external_id?: string
          feedz_admission_date?: string | null
          feedz_department?: string | null
          feedz_email?: string | null
          feedz_job_title?: string | null
          feedz_name?: string
          feedz_remuneration?: number | null
          feedz_status?: string | null
          id?: string
          match_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_person_id?: string | null
          suggested_person_ids?: string[] | null
          suggested_scores?: number[] | null
          sync_run_id?: string
        }
        Relationships: []
      }
      feedz_sync_change: {
        Row: {
          action: string
          after_snapshot: Json | null
          before_snapshot: Json | null
          changed_fields: Json | null
          created_at: string
          hr_people_id: string | null
          id: string
          matricula: string | null
          payload_hash: string | null
          reverted_at: string | null
          reverted_by: string | null
          run_id: string
          synced_at: string
        }
        Insert: {
          action?: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          changed_fields?: Json | null
          created_at?: string
          hr_people_id?: string | null
          id?: string
          matricula?: string | null
          payload_hash?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          run_id: string
          synced_at?: string
        }
        Update: {
          action?: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          changed_fields?: Json | null
          created_at?: string
          hr_people_id?: string | null
          id?: string
          matricula?: string | null
          payload_hash?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          run_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedz_sync_change_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "feedz_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedz_sync_events: {
        Row: {
          created_at: string
          event_type: string
          external_id: string | null
          fields_changed: string[]
          id: string
          summary: string | null
          sync_run_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          external_id?: string | null
          fields_changed?: string[]
          id?: string
          summary?: string | null
          sync_run_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          external_id?: string | null
          fields_changed?: string[]
          id?: string
          summary?: string | null
          sync_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedz_sync_events_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "feedz_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedz_sync_inconsistency: {
        Row: {
          created_at: string
          feedz_payload: Json
          id: string
          matricula: string | null
          reason_code: string
          reason_detail: string
          run_id: string
        }
        Insert: {
          created_at?: string
          feedz_payload?: Json
          id?: string
          matricula?: string | null
          reason_code: string
          reason_detail?: string
          run_id: string
        }
        Update: {
          created_at?: string
          feedz_payload?: Json
          id?: string
          matricula?: string | null
          reason_code?: string
          reason_detail?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedz_sync_inconsistency_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "feedz_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedz_sync_items: {
        Row: {
          action: string
          created_at: string
          feedz_email: string | null
          feedz_id: string | null
          feedz_name: string | null
          fields_changed_json: Json | null
          id: string
          match_strategy: string
          matched_hr_person_id: string | null
          payload_hash: string | null
          reason_code: string | null
          reverted_at: string | null
          reverted_by: string | null
          snapshot_before: Json | null
          sync_run_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          feedz_email?: string | null
          feedz_id?: string | null
          feedz_name?: string | null
          fields_changed_json?: Json | null
          id?: string
          match_strategy?: string
          matched_hr_person_id?: string | null
          payload_hash?: string | null
          reason_code?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          snapshot_before?: Json | null
          sync_run_id: string
        }
        Update: {
          action?: string
          created_at?: string
          feedz_email?: string | null
          feedz_id?: string | null
          feedz_name?: string | null
          fields_changed_json?: Json | null
          id?: string
          match_strategy?: string
          matched_hr_person_id?: string | null
          payload_hash?: string | null
          reason_code?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          snapshot_before?: Json | null
          sync_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedz_sync_items_sync_run_id_fkey"
            columns: ["sync_run_id"]
            isOneToOne: false
            referencedRelation: "feedz_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedz_sync_runs: {
        Row: {
          created_at: string
          ended_at: string | null
          error_message: string | null
          id: string
          inconsistency_count: number
          initiated_by: string | null
          matched_by_email: number
          matched_by_feedz_id: number
          matched_by_name_score: number
          matched_by_phone: number
          records_conflicts: number | null
          records_created: number
          records_pending: number | null
          records_processed: number
          records_terminated: number
          records_updated: number
          started_at: string
          status: string
          sync_mode: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          id?: string
          inconsistency_count?: number
          initiated_by?: string | null
          matched_by_email?: number
          matched_by_feedz_id?: number
          matched_by_name_score?: number
          matched_by_phone?: number
          records_conflicts?: number | null
          records_created?: number
          records_pending?: number | null
          records_processed?: number
          records_terminated?: number
          records_updated?: number
          started_at?: string
          status?: string
          sync_mode?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          error_message?: string | null
          id?: string
          inconsistency_count?: number
          initiated_by?: string | null
          matched_by_email?: number
          matched_by_feedz_id?: number
          matched_by_name_score?: number
          matched_by_phone?: number
          records_conflicts?: number | null
          records_created?: number
          records_pending?: number | null
          records_processed?: number
          records_terminated?: number
          records_updated?: number
          started_at?: string
          status?: string
          sync_mode?: string
        }
        Relationships: []
      }
      history_events: {
        Row: {
          contract_id: string
          created_at: string
          created_by_user_id: string | null
          description: string
          event_date: string
          event_type: Database["public"]["Enums"]["history_event_type"]
          id: string
          impact_area: Database["public"]["Enums"]["history_impact_area"]
          related_clause: string | null
          related_value: number | null
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["history_event_type"]
          id?: string
          impact_area?: Database["public"]["Enums"]["history_impact_area"]
          related_clause?: string | null
          related_value?: number | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          created_by_user_id?: string | null
          description?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["history_event_type"]
          id?: string
          impact_area?: Database["public"]["Enums"]["history_impact_area"]
          related_clause?: string | null
          related_value?: number | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "history_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_correction_items: {
        Row: {
          created_at: string
          fields_changed: Json
          id: string
          person_id: string
          person_name: string
          run_id: string
          snapshot_before: Json
        }
        Insert: {
          created_at?: string
          fields_changed?: Json
          id?: string
          person_id: string
          person_name?: string
          run_id: string
          snapshot_before?: Json
        }
        Update: {
          created_at?: string
          fields_changed?: Json
          id?: string
          person_id?: string
          person_name?: string
          run_id?: string
          snapshot_before?: Json
        }
        Relationships: [
          {
            foreignKeyName: "hr_correction_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "hr_correction_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_correction_runs: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          initiated_by: string | null
          started_at: string
          status: string
          total_changed: number
          total_no_diff: number
          total_not_found: number
          total_processed: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          started_at?: string
          status?: string
          total_changed?: number
          total_no_diff?: number
          total_not_found?: number
          total_processed?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          initiated_by?: string | null
          started_at?: string
          status?: string
          total_changed?: number
          total_no_diff?: number
          total_not_found?: number
          total_processed?: number
        }
        Relationships: []
      }
      hr_people: {
        Row: {
          beneficio_nome: string | null
          beneficio_soma_remuneracao: boolean | null
          beneficios: number
          beneficios_lista: Json | null
          cargo_antigo: string | null
          cargo_id: string | null
          celular: string | null
          centro_custo: string | null
          comite_gestor: string | null
          created_at: string
          data_admissao: string
          data_desligamento: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_municipio: string | null
          endereco_numero: string | null
          endereco_sem_numero: boolean | null
          endereco_uf: string | null
          id: string
          id_externo: string | null
          is_em_avaliacao: boolean
          is_guardiao: boolean
          is_talento: boolean
          last_synced_at: string | null
          local_atuacao: string | null
          matricula: string | null
          motivo_desligamento: string | null
          nivel: string | null
          nome: string
          nome_normalizado: string | null
          observacoes: string | null
          observacoes_desligamento: string | null
          phone_norm: string | null
          projeto: string | null
          remuneracao_ii: number | null
          remuneracao_mensal: number
          situacao: string
          source: string | null
          sync_status: string | null
          team_id: string | null
          tipo_desligamento: string | null
          tipo_vinculo: string
          trilha: string | null
          updated_at: string
        }
        Insert: {
          beneficio_nome?: string | null
          beneficio_soma_remuneracao?: boolean | null
          beneficios?: number
          beneficios_lista?: Json | null
          cargo_antigo?: string | null
          cargo_id?: string | null
          celular?: string | null
          centro_custo?: string | null
          comite_gestor?: string | null
          created_at?: string
          data_admissao?: string
          data_desligamento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_sem_numero?: boolean | null
          endereco_uf?: string | null
          id?: string
          id_externo?: string | null
          is_em_avaliacao?: boolean
          is_guardiao?: boolean
          is_talento?: boolean
          last_synced_at?: string | null
          local_atuacao?: string | null
          matricula?: string | null
          motivo_desligamento?: string | null
          nivel?: string | null
          nome?: string
          nome_normalizado?: string | null
          observacoes?: string | null
          observacoes_desligamento?: string | null
          phone_norm?: string | null
          projeto?: string | null
          remuneracao_ii?: number | null
          remuneracao_mensal?: number
          situacao?: string
          source?: string | null
          sync_status?: string | null
          team_id?: string | null
          tipo_desligamento?: string | null
          tipo_vinculo?: string
          trilha?: string | null
          updated_at?: string
        }
        Update: {
          beneficio_nome?: string | null
          beneficio_soma_remuneracao?: boolean | null
          beneficios?: number
          beneficios_lista?: Json | null
          cargo_antigo?: string | null
          cargo_id?: string | null
          celular?: string | null
          centro_custo?: string | null
          comite_gestor?: string | null
          created_at?: string
          data_admissao?: string
          data_desligamento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_municipio?: string | null
          endereco_numero?: string | null
          endereco_sem_numero?: boolean | null
          endereco_uf?: string | null
          id?: string
          id_externo?: string | null
          is_em_avaliacao?: boolean
          is_guardiao?: boolean
          is_talento?: boolean
          last_synced_at?: string | null
          local_atuacao?: string | null
          matricula?: string | null
          motivo_desligamento?: string | null
          nivel?: string | null
          nome?: string
          nome_normalizado?: string | null
          observacoes?: string | null
          observacoes_desligamento?: string | null
          phone_norm?: string | null
          projeto?: string | null
          remuneracao_ii?: number | null
          remuneracao_mensal?: number
          situacao?: string
          source?: string | null
          sync_status?: string | null
          team_id?: string | null
          tipo_desligamento?: string | null
          tipo_vinculo?: string
          trilha?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_people_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "job_titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_people_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_timeline: {
        Row: {
          atualizar_remuneracao: boolean
          beneficios_apos: number | null
          created_at: string
          descricao: string
          event_date: string
          id: string
          ocorrencia: string
          person_id: string
          remuneracao_apos: number | null
          source: string | null
          sync_run_id: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          atualizar_remuneracao?: boolean
          beneficios_apos?: number | null
          created_at?: string
          descricao?: string
          event_date?: string
          id?: string
          ocorrencia?: string
          person_id: string
          remuneracao_apos?: number | null
          source?: string | null
          sync_run_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          atualizar_remuneracao?: boolean
          beneficios_apos?: number | null
          created_at?: string
          descricao?: string
          event_date?: string
          id?: string
          ocorrencia?: string
          person_id?: string
          remuneracao_apos?: number | null
          source?: string | null
          sync_run_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_timeline_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "hr_people"
            referencedColumns: ["id"]
          },
        ]
      }
      job_titles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          origin: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          origin?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          origin?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_titles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      overhead_items: {
        Row: {
          categoria: Database["public"]["Enums"]["overhead_category"]
          contract_id: string
          created_at: string
          id: string
          modo: Database["public"]["Enums"]["overhead_mode"]
          nome: string
          percentual: number | null
          updated_at: string
          valor_fixo_mensal: number | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["overhead_category"]
          contract_id: string
          created_at?: string
          id?: string
          modo?: Database["public"]["Enums"]["overhead_mode"]
          nome?: string
          percentual?: number | null
          updated_at?: string
          valor_fixo_mensal?: number | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["overhead_category"]
          contract_id?: string
          created_at?: string
          id?: string
          modo?: Database["public"]["Enums"]["overhead_mode"]
          nome?: string
          percentual?: number | null
          updated_at?: string
          valor_fixo_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "overhead_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      receivables_invoices: {
        Row: {
          amount: number
          competence: string | null
          contract_id: string
          days_overdue: number
          due_date: string | null
          external_invoice_id: string | null
          id: string
          paid_amount: number
          paid_at: string | null
          raw_payload: Json
          status: string
          superlogica_subscription_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          competence?: string | null
          contract_id: string
          days_overdue?: number
          due_date?: string | null
          external_invoice_id?: string | null
          id?: string
          paid_amount?: number
          paid_at?: string | null
          raw_payload?: Json
          status?: string
          superlogica_subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          competence?: string | null
          contract_id?: string
          days_overdue?: number
          due_date?: string | null
          external_invoice_id?: string | null
          id?: string
          paid_amount?: number
          paid_at?: string | null
          raw_payload?: Json
          status?: string
          superlogica_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables_subscriptions: {
        Row: {
          amount: number | null
          customer_cnpj: string | null
          customer_name: string | null
          id: string
          label: string | null
          periodicity: string | null
          status: string | null
          superlogica_subscription_id: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          customer_cnpj?: string | null
          customer_name?: string | null
          id?: string
          label?: string | null
          periodicity?: string | null
          status?: string | null
          superlogica_subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          customer_cnpj?: string | null
          customer_name?: string | null
          id?: string
          label?: string | null
          periodicity?: string | null
          status?: string | null
          superlogica_subscription_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          cargo: string | null
          categoria: Database["public"]["Enums"]["other_cost_category"] | null
          contract_id: string
          created_at: string
          custo_base: number
          data_fim: string | null
          data_inicio: string
          duracao_meses: number | null
          encargos_override: number | null
          hr_person_id: string | null
          id: string
          impostos_override: number | null
          nome: string
          observacoes: string | null
          percentual_dedicacao: number
          rateio_meses: number | null
          recorrencia: string | null
          senioridade: Database["public"]["Enums"]["seniority"] | null
          tipo: Database["public"]["Enums"]["resource_type"]
          tipo_valor: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          categoria?: Database["public"]["Enums"]["other_cost_category"] | null
          contract_id: string
          created_at?: string
          custo_base?: number
          data_fim?: string | null
          data_inicio?: string
          duracao_meses?: number | null
          encargos_override?: number | null
          hr_person_id?: string | null
          id?: string
          impostos_override?: number | null
          nome?: string
          observacoes?: string | null
          percentual_dedicacao?: number
          rateio_meses?: number | null
          recorrencia?: string | null
          senioridade?: Database["public"]["Enums"]["seniority"] | null
          tipo?: Database["public"]["Enums"]["resource_type"]
          tipo_valor?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          categoria?: Database["public"]["Enums"]["other_cost_category"] | null
          contract_id?: string
          created_at?: string
          custo_base?: number
          data_fim?: string | null
          data_inicio?: string
          duracao_meses?: number | null
          encargos_override?: number | null
          hr_person_id?: string | null
          id?: string
          impostos_override?: number | null
          nome?: string
          observacoes?: string | null
          percentual_dedicacao?: number
          rateio_meses?: number | null
          recorrencia?: string | null
          senioridade?: Database["public"]["Enums"]["seniority"] | null
          tipo?: Database["public"]["Enums"]["resource_type"]
          tipo_valor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_hr_person_id_fkey"
            columns: ["hr_person_id"]
            isOneToOne: false
            referencedRelation: "hr_people"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          dias_alerta_desatualizacao: number
          dias_alerta_reajuste: number
          dias_alerta_vigencia: number
          id: string
          limiar_atencao: number
          limiar_saudavel: number
          percentual_encargos_clt: number
          percentual_impostos_faturamento: number
          percentual_impostos_pj: number
          updated_at: string
          valor_dolar: number
        }
        Insert: {
          created_at?: string
          dias_alerta_desatualizacao?: number
          dias_alerta_reajuste?: number
          dias_alerta_vigencia?: number
          id?: string
          limiar_atencao?: number
          limiar_saudavel?: number
          percentual_encargos_clt?: number
          percentual_impostos_faturamento?: number
          percentual_impostos_pj?: number
          updated_at?: string
          valor_dolar?: number
        }
        Update: {
          created_at?: string
          dias_alerta_desatualizacao?: number
          dias_alerta_reajuste?: number
          dias_alerta_vigencia?: number
          id?: string
          limiar_atencao?: number
          limiar_saudavel?: number
          percentual_encargos_clt?: number
          percentual_impostos_faturamento?: number
          percentual_impostos_pj?: number
          updated_at?: string
          valor_dolar?: number
        }
        Relationships: []
      }
      simulation_hr_items: {
        Row: {
          charges_percent: number
          created_at: string
          gross_monthly: number
          hiring_type: string
          id: string
          is_suggested: boolean
          quantity: number
          role: string
          simulation_id: string
          updated_at: string
        }
        Insert: {
          charges_percent?: number
          created_at?: string
          gross_monthly?: number
          hiring_type?: string
          id?: string
          is_suggested?: boolean
          quantity?: number
          role?: string
          simulation_id: string
          updated_at?: string
        }
        Update: {
          charges_percent?: number
          created_at?: string
          gross_monthly?: number
          hiring_type?: string
          id?: string
          is_suggested?: boolean
          quantity?: number
          role?: string
          simulation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_hr_items_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_other_costs: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_suggested: boolean
          simulation_id: string
          updated_at: string
          value_monthly: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_suggested?: boolean
          simulation_id: string
          updated_at?: string
          value_monthly?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_suggested?: boolean
          simulation_id?: string
          updated_at?: string
          value_monthly?: number
        }
        Relationships: [
          {
            foreignKeyName: "simulation_other_costs_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          ai_complexity_justification: string | null
          ai_confidence: Json | null
          ai_coverage: Json | null
          ai_notes: string | null
          client_name: string
          complexity_level: Database["public"]["Enums"]["simulation_complexity"]
          consultancy_cost: number | null
          consultant_analysis: string | null
          contract_type: Database["public"]["Enums"]["simulation_contract_type"]
          created_at: string
          created_by_user_id: string | null
          custom_overhead: Json
          description: string
          expected_start_date: string | null
          gov_sphere: Database["public"]["Enums"]["gov_sphere"] | null
          id: string
          name: string
          pricing_model:
            | Database["public"]["Enums"]["simulation_pricing_model"]
            | null
          proposed_monthly_value: number | null
          proposed_total_value: number | null
          questionnaire: Json
          responsavel_cliente: string | null
          responsavel_cliente_email: string | null
          responsavel_cliente_telefone: string | null
          status: Database["public"]["Enums"]["simulation_status"]
          suggested_overhead: Json
          term_months: number
          updated_at: string
          using_suggested: boolean
        }
        Insert: {
          ai_complexity_justification?: string | null
          ai_confidence?: Json | null
          ai_coverage?: Json | null
          ai_notes?: string | null
          client_name?: string
          complexity_level?: Database["public"]["Enums"]["simulation_complexity"]
          consultancy_cost?: number | null
          consultant_analysis?: string | null
          contract_type?: Database["public"]["Enums"]["simulation_contract_type"]
          created_at?: string
          created_by_user_id?: string | null
          custom_overhead?: Json
          description?: string
          expected_start_date?: string | null
          gov_sphere?: Database["public"]["Enums"]["gov_sphere"] | null
          id?: string
          name?: string
          pricing_model?:
            | Database["public"]["Enums"]["simulation_pricing_model"]
            | null
          proposed_monthly_value?: number | null
          proposed_total_value?: number | null
          questionnaire?: Json
          responsavel_cliente?: string | null
          responsavel_cliente_email?: string | null
          responsavel_cliente_telefone?: string | null
          status?: Database["public"]["Enums"]["simulation_status"]
          suggested_overhead?: Json
          term_months?: number
          updated_at?: string
          using_suggested?: boolean
        }
        Update: {
          ai_complexity_justification?: string | null
          ai_confidence?: Json | null
          ai_coverage?: Json | null
          ai_notes?: string | null
          client_name?: string
          complexity_level?: Database["public"]["Enums"]["simulation_complexity"]
          consultancy_cost?: number | null
          consultant_analysis?: string | null
          contract_type?: Database["public"]["Enums"]["simulation_contract_type"]
          created_at?: string
          created_by_user_id?: string | null
          custom_overhead?: Json
          description?: string
          expected_start_date?: string | null
          gov_sphere?: Database["public"]["Enums"]["gov_sphere"] | null
          id?: string
          name?: string
          pricing_model?:
            | Database["public"]["Enums"]["simulation_pricing_model"]
            | null
          proposed_monthly_value?: number | null
          proposed_total_value?: number | null
          questionnaire?: Json
          responsavel_cliente?: string | null
          responsavel_cliente_email?: string | null
          responsavel_cliente_telefone?: string | null
          status?: Database["public"]["Enums"]["simulation_status"]
          suggested_overhead?: Json
          term_months?: number
          updated_at?: string
          using_suggested?: boolean
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          contract_id: string
          created_at: string
          custo_mensal: number
          health_status: Database["public"]["Enums"]["health_status"]
          id: string
          margem_mensal: number
          margem_percentual: number
          receita_mensal: number
          user_id: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          custo_mensal?: number
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          margem_mensal?: number
          margem_percentual?: number
          receita_mensal?: number
          user_id?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          custo_mensal?: number
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          margem_mensal?: number
          margem_percentual?: number
          receita_mensal?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      subproject_allocations: {
        Row: {
          cost_value: number | null
          created_at: string
          dedication_percent: number
          hr_person_id: string | null
          id: string
          notes: string | null
          overhead_item_id: string | null
          resource_id: string | null
          subproject_id: string
          updated_at: string
        }
        Insert: {
          cost_value?: number | null
          created_at?: string
          dedication_percent?: number
          hr_person_id?: string | null
          id?: string
          notes?: string | null
          overhead_item_id?: string | null
          resource_id?: string | null
          subproject_id: string
          updated_at?: string
        }
        Update: {
          cost_value?: number | null
          created_at?: string
          dedication_percent?: number
          hr_person_id?: string | null
          id?: string
          notes?: string | null
          overhead_item_id?: string | null
          resource_id?: string | null
          subproject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subproject_allocations_hr_person_id_fkey"
            columns: ["hr_person_id"]
            isOneToOne: false
            referencedRelation: "hr_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subproject_allocations_overhead_item_id_fkey"
            columns: ["overhead_item_id"]
            isOneToOne: false
            referencedRelation: "overhead_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subproject_allocations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subproject_allocations_subproject_id_fkey"
            columns: ["subproject_id"]
            isOneToOne: false
            referencedRelation: "contract_subprojects"
            referencedColumns: ["id"]
          },
        ]
      }
      superlogica_sync_run: {
        Row: {
          error_summary: string | null
          errors_count: number
          fetched_subscriptions: number
          finished_at: string | null
          id: string
          invoices_upserted: number
          started_at: string
          status: string
          updated_contracts: number
        }
        Insert: {
          error_summary?: string | null
          errors_count?: number
          fetched_subscriptions?: number
          finished_at?: string | null
          id?: string
          invoices_upserted?: number
          started_at?: string
          status?: string
          updated_contracts?: number
        }
        Update: {
          error_summary?: string | null
          errors_count?: number
          fetched_subscriptions?: number
          finished_at?: string | null
          id?: string
          invoices_upserted?: number
          started_at?: string
          status?: string
          updated_contracts?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          origin: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          origin?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          origin?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean
          module_key: Database["public"]["Enums"]["module_key"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          module_key: Database["public"]["Enums"]["module_key"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          module_key?: Database["public"]["Enums"]["module_key"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_doc_extractions_status: {
        Args: never
        Returns: {
          document_id: string
          error_message: string
          extracted_at: string
          id: string
          owner_id: string
          owner_type: string
          status: string
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_clevel: { Args: never; Returns: boolean }
      match_chunks_fts: {
        Args: { doc_ids: string[]; match_count?: number; query_text: string }
        Returns: {
          chunk_index: number
          chunk_text: string
          document_id: string
          id: string
          page_end: number
          page_start: number
          rank: number
        }[]
      }
    }
    Enums: {
      alert_severity: "atencao" | "critico" | "info"
      app_role:
        | "c-level"
        | "intermediario"
        | "leitor"
        | "comercial"
        | "lider_tribo"
        | "juridico"
        | "rh"
        | "administrativo"
      contract_segment: "govtech" | "privado"
      contract_status: "implantacao" | "operacao" | "suspenso" | "encerrado"
      contract_type: "sistema" | "infraestrutura" | "hibrido"
      gov_sphere: "municipal" | "estadual" | "federal"
      health_status: "saudavel" | "atencao" | "critico"
      history_event_type:
        | "assinatura"
        | "inicio-vigencia"
        | "aditivo"
        | "reajuste-aplicado"
        | "notificacao-recebida"
        | "notificacao-enviada"
        | "multa-penalidade"
        | "marco-operacional"
        | "reuniao-ata"
        | "ocorrencia"
        | "renegociacao"
        | "renovacao"
        | "encerramento"
        | "outro"
      history_impact_area:
        | "financeiro"
        | "prazo"
        | "reajuste"
        | "juridico"
        | "operacional"
        | "governanca"
      module_key:
        | "DASHBOARD"
        | "CLIENTS"
        | "CONTRACTS"
        | "CONTRACT_DETAIL"
        | "RESOURCES"
        | "HISTORY"
        | "DOCUMENTS"
        | "ALERTS"
        | "SQUADS"
        | "CALCULATOR"
        | "USERS_ADMIN"
        | "ACCESS_LOGS"
        | "SETTINGS"
        | "IMPORT_EXPORT"
        | "HR"
        | "AI"
        | "AI_LOGS"
        | "RECEIVABLES"
      other_cost_category:
        | "cloud"
        | "licenca"
        | "equipamento"
        | "terceiros"
        | "outros"
        | "consultoria"
        | "ia"
        | "acessibilidade"
      overhead_category: "infraestrutura" | "administrativo" | "governanca"
      overhead_mode: "percentual" | "fixo"
      renewal_status: "negociacao" | "renovado" | "sem-tratativa"
      resource_type: "clt" | "pj" | "outro"
      revenue_model: "mrr" | "media-mensal"
      seniority: "junior" | "pleno" | "senior" | "especialista"
      simulation_complexity: "baixa" | "media" | "alta"
      simulation_contract_type: "gov" | "private"
      simulation_pricing_model: "mensal" | "total"
      simulation_status: "draft" | "archived"
      subproject_status: "ativo" | "suspenso" | "encerrado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["atencao", "critico", "info"],
      app_role: [
        "c-level",
        "intermediario",
        "leitor",
        "comercial",
        "lider_tribo",
        "juridico",
        "rh",
        "administrativo",
      ],
      contract_segment: ["govtech", "privado"],
      contract_status: ["implantacao", "operacao", "suspenso", "encerrado"],
      contract_type: ["sistema", "infraestrutura", "hibrido"],
      gov_sphere: ["municipal", "estadual", "federal"],
      health_status: ["saudavel", "atencao", "critico"],
      history_event_type: [
        "assinatura",
        "inicio-vigencia",
        "aditivo",
        "reajuste-aplicado",
        "notificacao-recebida",
        "notificacao-enviada",
        "multa-penalidade",
        "marco-operacional",
        "reuniao-ata",
        "ocorrencia",
        "renegociacao",
        "renovacao",
        "encerramento",
        "outro",
      ],
      history_impact_area: [
        "financeiro",
        "prazo",
        "reajuste",
        "juridico",
        "operacional",
        "governanca",
      ],
      module_key: [
        "DASHBOARD",
        "CLIENTS",
        "CONTRACTS",
        "CONTRACT_DETAIL",
        "RESOURCES",
        "HISTORY",
        "DOCUMENTS",
        "ALERTS",
        "SQUADS",
        "CALCULATOR",
        "USERS_ADMIN",
        "ACCESS_LOGS",
        "SETTINGS",
        "IMPORT_EXPORT",
        "HR",
        "AI",
        "AI_LOGS",
        "RECEIVABLES",
      ],
      other_cost_category: [
        "cloud",
        "licenca",
        "equipamento",
        "terceiros",
        "outros",
        "consultoria",
        "ia",
        "acessibilidade",
      ],
      overhead_category: ["infraestrutura", "administrativo", "governanca"],
      overhead_mode: ["percentual", "fixo"],
      renewal_status: ["negociacao", "renovado", "sem-tratativa"],
      resource_type: ["clt", "pj", "outro"],
      revenue_model: ["mrr", "media-mensal"],
      seniority: ["junior", "pleno", "senior", "especialista"],
      simulation_complexity: ["baixa", "media", "alta"],
      simulation_contract_type: ["gov", "private"],
      simulation_pricing_model: ["mensal", "total"],
      simulation_status: ["draft", "archived"],
      subproject_status: ["ativo", "suspenso", "encerrado"],
    },
  },
} as const
