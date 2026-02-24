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
      contracts: {
        Row: {
          alerta_reajuste_dias: number
          centro_custo: string | null
          client_id: string
          codigo: string
          created_at: string
          data_base_reajuste: string
          data_fim: string
          data_inicio: string
          escopo_operacional: string | null
          gov_sphere: Database["public"]["Enums"]["gov_sphere"] | null
          id: string
          indice_reajuste: string
          modelo_receita: Database["public"]["Enums"]["revenue_model"]
          moeda: string
          nome: string
          objeto: string
          observacoes_financeiras: string | null
          percentual_fixo: number | null
          periodicidade_renovacao: string | null
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
          data_fim?: string
          data_inicio?: string
          escopo_operacional?: string | null
          gov_sphere?: Database["public"]["Enums"]["gov_sphere"] | null
          id?: string
          indice_reajuste?: string
          modelo_receita?: Database["public"]["Enums"]["revenue_model"]
          moeda?: string
          nome?: string
          objeto?: string
          observacoes_financeiras?: string | null
          percentual_fixo?: number | null
          periodicidade_renovacao?: string | null
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
          data_fim?: string
          data_inicio?: string
          escopo_operacional?: string | null
          gov_sphere?: Database["public"]["Enums"]["gov_sphere"] | null
          id?: string
          indice_reajuste?: string
          modelo_receita?: Database["public"]["Enums"]["revenue_model"]
          moeda?: string
          nome?: string
          objeto?: string
          observacoes_financeiras?: string | null
          percentual_fixo?: number | null
          periodicidade_renovacao?: string | null
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
      hr_people: {
        Row: {
          beneficios: number
          cargo_antigo: string | null
          cargo_id: string | null
          celular: string | null
          centro_custo: string | null
          comite_gestor: string | null
          created_at: string
          data_admissao: string
          data_desligamento: string | null
          email: string | null
          id: string
          id_externo: string | null
          local_atuacao: string | null
          motivo_desligamento: string | null
          nivel: string | null
          nome: string
          observacoes: string | null
          observacoes_desligamento: string | null
          projeto: string | null
          remuneracao_ii: number | null
          remuneracao_mensal: number
          situacao: string
          team_id: string | null
          tipo_desligamento: string | null
          tipo_vinculo: string
          trilha: string | null
          updated_at: string
        }
        Insert: {
          beneficios?: number
          cargo_antigo?: string | null
          cargo_id?: string | null
          celular?: string | null
          centro_custo?: string | null
          comite_gestor?: string | null
          created_at?: string
          data_admissao?: string
          data_desligamento?: string | null
          email?: string | null
          id?: string
          id_externo?: string | null
          local_atuacao?: string | null
          motivo_desligamento?: string | null
          nivel?: string | null
          nome?: string
          observacoes?: string | null
          observacoes_desligamento?: string | null
          projeto?: string | null
          remuneracao_ii?: number | null
          remuneracao_mensal?: number
          situacao?: string
          team_id?: string | null
          tipo_desligamento?: string | null
          tipo_vinculo?: string
          trilha?: string | null
          updated_at?: string
        }
        Update: {
          beneficios?: number
          cargo_antigo?: string | null
          cargo_id?: string | null
          celular?: string | null
          centro_custo?: string | null
          comite_gestor?: string | null
          created_at?: string
          data_admissao?: string
          data_desligamento?: string | null
          email?: string | null
          id?: string
          id_externo?: string | null
          local_atuacao?: string | null
          motivo_desligamento?: string | null
          nivel?: string | null
          nome?: string
          observacoes?: string | null
          observacoes_desligamento?: string | null
          projeto?: string | null
          remuneracao_ii?: number | null
          remuneracao_mensal?: number
          situacao?: string
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
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
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
          client_name: string
          complexity_level: Database["public"]["Enums"]["simulation_complexity"]
          consultancy_cost: number | null
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
          client_name?: string
          complexity_level?: Database["public"]["Enums"]["simulation_complexity"]
          consultancy_cost?: number | null
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
          client_name?: string
          complexity_level?: Database["public"]["Enums"]["simulation_complexity"]
          consultancy_cost?: number | null
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
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
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
    }
    Enums: {
      alert_severity: "atencao" | "critico" | "info"
      app_role: "c-level" | "intermediario" | "leitor"
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
      app_role: ["c-level", "intermediario", "leitor"],
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
    },
  },
} as const
