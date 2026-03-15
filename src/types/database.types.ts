export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accessories: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string | null
          price: number | null
          stock_quantity: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string | null
          price?: number | null
          stock_quantity?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string | null
          price?: number | null
          stock_quantity?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      account_balance_snapshots: {
        Row: {
          id: string
          account_id: string
          snapshot_date: string
          balance: number
          currency: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          account_id: string
          snapshot_date: string
          balance: number
          currency?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          snapshot_date?: string
          balance?: number
          currency?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      account_transfers: {
        Row: {
          id: string
          from_account_id: string
          to_account_id: string
          amount: number
          transfer_date: string
          description: string | null
          reference_number: string | null
          status: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          from_account_id: string
          to_account_id: string
          amount: number
          transfer_date: string
          description?: string | null
          reference_number?: string | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          from_account_id?: string
          to_account_id?: string
          amount?: number
          transfer_date?: string
          description?: string | null
          reference_number?: string | null
          status?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      accounting_locales: {
        Row: {
          id: string
          code: string
          name: string
          currency_symbol: string | null
          currency_code: string | null
          decimal_separator: string | null
          thousands_separator: string | null
          date_format: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          currency_symbol?: string | null
          currency_code?: string | null
          decimal_separator?: string | null
          thousands_separator?: string | null
          date_format?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          currency_symbol?: string | null
          currency_code?: string | null
          decimal_separator?: string | null
          thousands_separator?: string | null
          date_format?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      asset_assignments: {
        Row: {
          id: string
          asset_id: string
          employee_id: string
          assigned_date: string
          return_date: string | null
          notes: string | null
          assigned_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          employee_id: string
          assigned_date: string
          return_date?: string | null
          notes?: string | null
          assigned_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          employee_id?: string
          assigned_date?: string
          return_date?: string | null
          notes?: string | null
          assigned_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      asset_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          depreciation_method: string | null
          useful_life_years: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          depreciation_method?: string | null
          useful_life_years?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          depreciation_method?: string | null
          useful_life_years?: number | null
          created_at?: string | null
        }
      }
      asset_depreciation: {
        Row: {
          id: string
          asset_id: string
          depreciation_date: string
          amount: number
          accumulated_depreciation: number | null
          book_value: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          depreciation_date: string
          amount: number
          accumulated_depreciation?: number | null
          book_value?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          depreciation_date?: string
          amount?: number
          accumulated_depreciation?: number | null
          book_value?: number | null
          notes?: string | null
          created_at?: string | null
        }
      }
      asset_maintenance: {
        Row: {
          id: string
          asset_id: string
          maintenance_date: string
          maintenance_type: string | null
          description: string | null
          cost: number | null
          performed_by: string | null
          next_maintenance_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          maintenance_date: string
          maintenance_type?: string | null
          description?: string | null
          cost?: number | null
          performed_by?: string | null
          next_maintenance_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          maintenance_date?: string
          maintenance_type?: string | null
          description?: string | null
          cost?: number | null
          performed_by?: string | null
          next_maintenance_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      assets: {
        Row: {
          id: string
          name: string
          asset_tag: string | null
          category_id: string | null
          serial_number: string | null
          purchase_date: string | null
          purchase_cost: number | null
          current_value: number | null
          location: string | null
          status: string | null
          assigned_to: string | null
          description: string | null
          warranty_expiry: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          asset_tag?: string | null
          category_id?: string | null
          serial_number?: string | null
          purchase_date?: string | null
          purchase_cost?: number | null
          current_value?: number | null
          location?: string | null
          status?: string | null
          assigned_to?: string | null
          description?: string | null
          warranty_expiry?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          asset_tag?: string | null
          category_id?: string | null
          serial_number?: string | null
          purchase_date?: string | null
          purchase_cost?: number | null
          current_value?: number | null
          location?: string | null
          status?: string | null
          assigned_to?: string | null
          description?: string | null
          warranty_expiry?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      attendance_records: {
        Row: {
          id: string
          employee_id: string
          date: string
          check_in: string | null
          check_out: string | null
          hours_worked: number | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          date: string
          check_in?: string | null
          check_out?: string | null
          hours_worked?: number | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          date?: string
          check_in?: string | null
          check_out?: string | null
          hours_worked?: number | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      audit_trails: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_values: Json | null
          new_values: Json | null
          changed_by: string | null
          changed_at: string | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      bank_accounts: {
        Row: {
          id: string
          account_name: string
          account_number: string | null
          bank_name: string | null
          branch: string | null
          swift_code: string | null
          iban: string | null
          currency: string | null
          current_balance: number | null
          is_active: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          account_name: string
          account_number?: string | null
          bank_name?: string | null
          branch?: string | null
          swift_code?: string | null
          iban?: string | null
          currency?: string | null
          current_balance?: number | null
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          account_name?: string
          account_number?: string | null
          bank_name?: string | null
          branch?: string | null
          swift_code?: string | null
          iban?: string | null
          currency?: string | null
          current_balance?: number | null
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bank_reconciliation_sessions: {
        Row: {
          id: string
          bank_account_id: string
          period_start: string
          period_end: string
          opening_balance: number | null
          closing_balance: number | null
          status: string | null
          reconciled_by: string | null
          reconciled_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          bank_account_id: string
          period_start: string
          period_end: string
          opening_balance?: number | null
          closing_balance?: number | null
          status?: string | null
          reconciled_by?: string | null
          reconciled_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          bank_account_id?: string
          period_start?: string
          period_end?: string
          opening_balance?: number | null
          closing_balance?: number | null
          status?: string | null
          reconciled_by?: string | null
          reconciled_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      bank_transactions: {
        Row: {
          id: string
          bank_account_id: string
          transaction_date: string
          description: string | null
          amount: number
          transaction_type: string | null
          reference: string | null
          is_reconciled: boolean | null
          reconciliation_session_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          bank_account_id: string
          transaction_date: string
          description?: string | null
          amount: number
          transaction_type?: string | null
          reference?: string | null
          is_reconciled?: boolean | null
          reconciliation_session_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          bank_account_id?: string
          transaction_date?: string
          description?: string | null
          amount?: number
          transaction_type?: string | null
          reference?: string | null
          is_reconciled?: boolean | null
          reconciliation_session_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      branches: {
        Row: {
          id: string
          name: string
          code: string | null
          address: string | null
          city: string | null
          country: string | null
          phone: string | null
          email: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      brands: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      capacities: {
        Row: {
          id: string
          name: string
          value: string | null
          unit: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          value?: string | null
          unit?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          value?: string | null
          unit?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      case_attachments: {
        Row: {
          id: string
          case_id: string
          file_name: string
          file_url: string
          file_type: string | null
          file_size: number | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          file_name: string
          file_url: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          file_name?: string
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      case_communications: {
        Row: {
          id: string
          case_id: string
          communication_type: string | null
          direction: string | null
          subject: string | null
          body: string | null
          sender: string | null
          recipient: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          communication_type?: string | null
          direction?: string | null
          subject?: string | null
          body?: string | null
          sender?: string | null
          recipient?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          communication_type?: string | null
          direction?: string | null
          subject?: string | null
          body?: string | null
          sender?: string | null
          recipient?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      case_devices: {
        Row: {
          id: string
          case_id: string
          device_type_id: string | null
          brand_id: string | null
          model: string | null
          serial_number: string | null
          capacity_id: string | null
          condition_id: string | null
          interface_id: string | null
          form_factor_id: string | null
          fault_description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          device_type_id?: string | null
          brand_id?: string | null
          model?: string | null
          serial_number?: string | null
          capacity_id?: string | null
          condition_id?: string | null
          interface_id?: string | null
          form_factor_id?: string | null
          fault_description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          device_type_id?: string | null
          brand_id?: string | null
          model?: string | null
          serial_number?: string | null
          capacity_id?: string | null
          condition_id?: string | null
          interface_id?: string | null
          form_factor_id?: string | null
          fault_description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_diagnostics: {
        Row: {
          id: string
          case_id: string
          diagnostic_type: string | null
          result: string | null
          notes: string | null
          performed_by: string | null
          performed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          diagnostic_type?: string | null
          result?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          diagnostic_type?: string | null
          result?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
      }
      case_engineers: {
        Row: {
          id: string
          case_id: string
          engineer_id: string
          role: string | null
          assigned_at: string | null
          unassigned_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          engineer_id: string
          role?: string | null
          assigned_at?: string | null
          unassigned_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          engineer_id?: string
          role?: string | null
          assigned_at?: string | null
          unassigned_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      case_follow_ups: {
        Row: {
          id: string
          case_id: string
          follow_up_date: string | null
          notes: string | null
          created_by: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          follow_up_date?: string | null
          notes?: string | null
          created_by?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          follow_up_date?: string | null
          notes?: string | null
          created_by?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_internal_notes: {
        Row: {
          id: string
          case_id: string
          note: string
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          note: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          note?: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_job_history: {
        Row: {
          id: string
          case_id: string
          action: string
          description: string | null
          performed_by: string | null
          performed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          action: string
          description?: string | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          action?: string
          description?: string | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
      }
      case_milestones: {
        Row: {
          id: string
          case_id: string
          milestone_name: string
          target_date: string | null
          completed_date: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          milestone_name: string
          target_date?: string | null
          completed_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          milestone_name?: string
          target_date?: string | null
          completed_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_portal_visibility: {
        Row: {
          id: string
          case_id: string
          section: string
          is_visible: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          section: string
          is_visible?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          section?: string
          is_visible?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_priorities: {
        Row: {
          id: string
          name: string
          color: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      case_qa_checklists: {
        Row: {
          id: string
          case_id: string
          checklist_item: string
          is_completed: boolean | null
          completed_by: string | null
          completed_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          checklist_item: string
          is_completed?: boolean | null
          completed_by?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          checklist_item?: string
          is_completed?: boolean | null
          completed_by?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      case_quote_items: {
        Row: {
          id: string
          case_quote_id: string
          description: string
          quantity: number | null
          unit_price: number | null
          total_price: number | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_quote_id: string
          description: string
          quantity?: number | null
          unit_price?: number | null
          total_price?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_quote_id?: string
          description?: string
          quantity?: number | null
          unit_price?: number | null
          total_price?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      case_quotes: {
        Row: {
          id: string
          case_id: string
          quote_number: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          notes: string | null
          created_by: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          quote_number?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          quote_number?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_recovery_attempts: {
        Row: {
          id: string
          case_id: string
          attempt_number: number | null
          attempt_date: string | null
          method_used: string | null
          result: string | null
          data_recovered_percentage: number | null
          notes: string | null
          performed_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          attempt_number?: number | null
          attempt_date?: string | null
          method_used?: string | null
          result?: string | null
          data_recovered_percentage?: number | null
          notes?: string | null
          performed_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          attempt_number?: number | null
          attempt_date?: string | null
          method_used?: string | null
          result?: string | null
          data_recovered_percentage?: number | null
          notes?: string | null
          performed_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_report_sections: {
        Row: {
          id: string
          report_id: string
          section_type: string | null
          title: string | null
          content: string | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          report_id: string
          section_type?: string | null
          title?: string | null
          content?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          section_type?: string | null
          title?: string | null
          content?: string | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_report_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          template_content: Json | null
          is_active: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          template_content?: Json | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          template_content?: Json | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_reports: {
        Row: {
          id: string
          case_id: string
          template_id: string | null
          report_type: string | null
          status: string | null
          content: Json | null
          generated_by: string | null
          generated_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          template_id?: string | null
          report_type?: string | null
          status?: string | null
          content?: Json | null
          generated_by?: string | null
          generated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          template_id?: string | null
          report_type?: string | null
          status?: string | null
          content?: Json | null
          generated_by?: string | null
          generated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      case_statuses: {
        Row: {
          id: string
          name: string
          color: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      cases: {
        Row: {
          id: string
          case_number: string | null
          customer_id: string | null
          status_id: string | null
          priority_id: string | null
          assigned_to: string | null
          title: string | null
          description: string | null
          intake_date: string | null
          due_date: string | null
          closed_date: string | null
          service_type_id: string | null
          branch_id: string | null
          source: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_number?: string | null
          customer_id?: string | null
          status_id?: string | null
          priority_id?: string | null
          assigned_to?: string | null
          title?: string | null
          description?: string | null
          intake_date?: string | null
          due_date?: string | null
          closed_date?: string | null
          service_type_id?: string | null
          branch_id?: string | null
          source?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_number?: string | null
          customer_id?: string | null
          status_id?: string | null
          priority_id?: string | null
          assigned_to?: string | null
          title?: string | null
          description?: string | null
          intake_date?: string | null
          due_date?: string | null
          closed_date?: string | null
          service_type_id?: string | null
          branch_id?: string | null
          source?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      chain_of_custody: {
        Row: {
          id: string
          case_id: string | null
          action: string
          actor_id: string | null
          actor_name: string | null
          actor_ip_address: string | null
          description: string | null
          metadata: Json | null
          action_category: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id?: string | null
          action: string
          actor_id?: string | null
          actor_name?: string | null
          actor_ip_address?: string | null
          description?: string | null
          metadata?: Json | null
          action_category?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string | null
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          actor_ip_address?: string | null
          description?: string | null
          metadata?: Json | null
          action_category?: string | null
          status?: string | null
          created_at?: string | null
        }
      }
      chain_of_custody_access_log: {
        Row: {
          id: string
          custody_id: string | null
          accessed_by: string | null
          access_type: string | null
          ip_address: string | null
          user_agent: string | null
          accessed_at: string | null
        }
        Insert: {
          id?: string
          custody_id?: string | null
          accessed_by?: string | null
          access_type?: string | null
          ip_address?: string | null
          user_agent?: string | null
          accessed_at?: string | null
        }
        Update: {
          id?: string
          custody_id?: string | null
          accessed_by?: string | null
          access_type?: string | null
          ip_address?: string | null
          user_agent?: string | null
          accessed_at?: string | null
        }
      }
      chain_of_custody_integrity_checks: {
        Row: {
          id: string
          custody_id: string | null
          check_type: string | null
          result: string | null
          checked_by: string | null
          checked_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          custody_id?: string | null
          check_type?: string | null
          result?: string | null
          checked_by?: string | null
          checked_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          custody_id?: string | null
          check_type?: string | null
          result?: string | null
          checked_by?: string | null
          checked_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      chain_of_custody_transfers: {
        Row: {
          id: string
          custody_id: string | null
          from_holder: string | null
          to_holder: string | null
          transfer_date: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          custody_id?: string | null
          from_holder?: string | null
          to_holder?: string | null
          transfer_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          custody_id?: string | null
          from_holder?: string | null
          to_holder?: string | null
          transfer_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      cities: {
        Row: {
          id: string
          name: string
          country_id: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          country_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          country_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      clone_drives: {
        Row: {
          id: string
          case_id: string | null
          drive_label: string | null
          drive_serial: string | null
          capacity: string | null
          status: string | null
          cloned_at: string | null
          cloned_by: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_id?: string | null
          drive_label?: string | null
          drive_serial?: string | null
          capacity?: string | null
          status?: string | null
          cloned_at?: string | null
          cloned_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string | null
          drive_label?: string | null
          drive_serial?: string | null
          capacity?: string | null
          status?: string | null
          cloned_at?: string | null
          cloned_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          registration_number: string | null
          vat_number: string | null
          address: string | null
          city: string | null
          country: string | null
          phone: string | null
          email: string | null
          website: string | null
          logo_url: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          registration_number?: string | null
          vat_number?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          registration_number?: string | null
          vat_number?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      company_documents: {
        Row: {
          id: string
          company_id: string | null
          document_type: string | null
          file_name: string
          file_url: string
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          document_type?: string | null
          file_name: string
          file_url: string
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          document_type?: string | null
          file_name?: string
          file_url?: string
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      company_settings: {
        Row: {
          id: number
          company_name: string | null
          address: string | null
          phone: string | null
          email: string | null
          website: string | null
          logo_url: string | null
          currency: string | null
          tax_rate: number | null
          invoice_prefix: string | null
          quote_prefix: string | null
          case_prefix: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          company_name?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          currency?: string | null
          tax_rate?: number | null
          invoice_prefix?: string | null
          quote_prefix?: string | null
          case_prefix?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          company_name?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          logo_url?: string | null
          currency?: string | null
          tax_rate?: number | null
          invoice_prefix?: string | null
          quote_prefix?: string | null
          case_prefix?: string | null
          updated_at?: string | null
        }
      }
      countries: {
        Row: {
          id: string
          name: string
          code: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      currency_codes: {
        Row: {
          id: string
          code: string
          name: string
          symbol: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          symbol?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          symbol?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      customer_communications: {
        Row: {
          id: string
          customer_id: string
          type: string | null
          subject: string | null
          body: string | null
          direction: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          type?: string | null
          subject?: string | null
          body?: string | null
          direction?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          type?: string | null
          subject?: string | null
          body?: string | null
          direction?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      customer_company_relationships: {
        Row: {
          id: string
          customer_id: string
          company_id: string
          relationship_type: string | null
          is_primary: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          company_id: string
          relationship_type?: string | null
          is_primary?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          company_id?: string
          relationship_type?: string | null
          is_primary?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      customer_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          discount_percentage: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          discount_percentage?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          discount_percentage?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      customers_enhanced: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          mobile: string | null
          address: string | null
          city: string | null
          country: string | null
          company_name: string | null
          customer_type: string | null
          group_id: string | null
          portal_access: boolean | null
          portal_password_hash: string | null
          notes: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          mobile?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          company_name?: string | null
          customer_type?: string | null
          group_id?: string | null
          portal_access?: boolean | null
          portal_password_hash?: string | null
          notes?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          mobile?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          company_name?: string | null
          customer_type?: string | null
          group_id?: string | null
          portal_access?: boolean | null
          portal_password_hash?: string | null
          notes?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      database_backups: {
        Row: {
          id: string
          backup_name: string | null
          backup_type: string | null
          status: string | null
          size_bytes: number | null
          storage_path: string | null
          created_by: string | null
          created_at: string | null
          completed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          backup_name?: string | null
          backup_type?: string | null
          status?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string | null
          completed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          backup_name?: string | null
          backup_type?: string | null
          status?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          created_by?: string | null
          created_at?: string | null
          completed_at?: string | null
          notes?: string | null
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          manager_id: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          manager_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          manager_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      device_component_statuses: {
        Row: {
          id: number
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_conditions: {
        Row: {
          id: number
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_diagnostics: {
        Row: {
          id: string
          case_device_id: string | null
          diagnostic_tool: string | null
          result: string | null
          details: Json | null
          performed_by: string | null
          performed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_device_id?: string | null
          diagnostic_tool?: string | null
          result?: string | null
          details?: Json | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_device_id?: string | null
          diagnostic_tool?: string | null
          result?: string | null
          details?: Json | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
      }
      device_encryption: {
        Row: {
          id: string
          case_device_id: string | null
          encryption_type: string | null
          is_encrypted: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          case_device_id?: string | null
          encryption_type?: string | null
          is_encrypted?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          case_device_id?: string | null
          encryption_type?: string | null
          is_encrypted?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      device_form_factors: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_head_no: {
        Row: {
          id: string
          name: string
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_interfaces: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_made_in: {
        Row: {
          id: string
          name: string
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_platter_no: {
        Row: {
          id: string
          name: string
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_roles: {
        Row: {
          id: number
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      device_types: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      document_templates: {
        Row: {
          id: string
          name: string
          type: string | null
          content: string | null
          is_active: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type?: string | null
          content?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string | null
          content?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      donor_compatibility_matrix: {
        Row: {
          id: string
          device_model: string | null
          donor_model: string | null
          compatibility_notes: string | null
          is_compatible: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          device_model?: string | null
          donor_model?: string | null
          compatibility_notes?: string | null
          is_compatible?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          device_model?: string | null
          donor_model?: string | null
          compatibility_notes?: string | null
          is_compatible?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      employee_documents: {
        Row: {
          id: string
          employee_id: string
          document_type: string | null
          file_name: string
          file_url: string
          expiry_date: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          document_type?: string | null
          file_name: string
          file_url: string
          expiry_date?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          document_type?: string | null
          file_name?: string
          file_url?: string
          expiry_date?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      employee_salary_components: {
        Row: {
          id: string
          employee_id: string
          component_id: string
          amount: number
          effective_date: string
          end_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          component_id: string
          amount: number
          effective_date: string
          end_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          component_id?: string
          amount?: number
          effective_date?: string
          end_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      employee_salary_config: {
        Row: {
          id: string
          employee_id: string
          base_salary: number
          currency: string | null
          payment_frequency: string | null
          effective_date: string
          end_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          base_salary: number
          currency?: string | null
          payment_frequency?: string | null
          effective_date: string
          end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          base_salary?: number
          currency?: string | null
          payment_frequency?: string | null
          effective_date?: string
          end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      employees: {
        Row: {
          id: string
          employee_number: string
          department_id: string | null
          position_id: string | null
          employment_type: string | null
          employment_status: string | null
          hire_date: string
          termination_date: string | null
          date_of_birth: string | null
          national_id: string | null
          passport_number: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          emergency_contact_name: string | null
          emergency_contact_relationship: string | null
          emergency_contact_phone: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_sort_code: string | null
          tax_code: string | null
          national_insurance_number: string | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string | null
          first_name: string
          last_name: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          employee_number: string
          department_id?: string | null
          position_id?: string | null
          employment_type?: string | null
          employment_status?: string | null
          hire_date: string
          termination_date?: string | null
          date_of_birth?: string | null
          national_id?: string | null
          passport_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          tax_code?: string | null
          national_insurance_number?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
          first_name?: string
          last_name?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          employee_number?: string
          department_id?: string | null
          position_id?: string | null
          employment_type?: string | null
          employment_status?: string | null
          hire_date?: string
          termination_date?: string | null
          date_of_birth?: string | null
          national_id?: string | null
          passport_number?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          tax_code?: string | null
          national_insurance_number?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
          first_name?: string
          last_name?: string
          deleted_at?: string | null
        }
      }
      expense_attachments: {
        Row: {
          id: string
          expense_id: string
          file_name: string
          file_url: string
          file_type: string | null
          file_size: number | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          expense_id: string
          file_name: string
          file_url: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          expense_id?: string
          file_name?: string
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      expense_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          expense_number: string | null
          category_id: string | null
          amount: number
          currency: string | null
          expense_date: string
          description: string | null
          vendor: string | null
          payment_method: string | null
          status: string | null
          approved_by: string | null
          approved_at: string | null
          submitted_by: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          expense_number?: string | null
          category_id?: string | null
          amount: number
          currency?: string | null
          expense_date: string
          description?: string | null
          vendor?: string | null
          payment_method?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          submitted_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          expense_number?: string | null
          category_id?: string | null
          amount?: number
          currency?: string | null
          expense_date?: string
          description?: string | null
          vendor?: string | null
          payment_method?: string | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          submitted_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      financial_audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_values: Json | null
          new_values: Json | null
          changed_by: string | null
          changed_at: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string | null
        }
      }
      financial_transactions: {
        Row: {
          id: string
          transaction_type: string
          reference_id: string | null
          reference_table: string | null
          amount: number
          currency: string | null
          description: string | null
          transaction_date: string
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          transaction_type: string
          reference_id?: string | null
          reference_table?: string | null
          amount: number
          currency?: string | null
          description?: string | null
          transaction_date: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          transaction_type?: string
          reference_id?: string | null
          reference_table?: string | null
          amount?: number
          currency?: string | null
          description?: string | null
          transaction_date?: string
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      import_export_jobs: {
        Row: {
          id: string
          job_type: string
          entity_type: string | null
          status: string | null
          file_name: string | null
          file_url: string | null
          total_records: number | null
          processed_records: number | null
          failed_records: number | null
          error_log: Json | null
          created_by: string | null
          created_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          job_type: string
          entity_type?: string | null
          status?: string | null
          file_name?: string | null
          file_url?: string | null
          total_records?: number | null
          processed_records?: number | null
          failed_records?: number | null
          error_log?: Json | null
          created_by?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          job_type?: string
          entity_type?: string | null
          status?: string | null
          file_name?: string | null
          file_url?: string | null
          total_records?: number | null
          processed_records?: number | null
          failed_records?: number | null
          error_log?: Json | null
          created_by?: string | null
          created_at?: string | null
          completed_at?: string | null
        }
      }
      import_export_logs: {
        Row: {
          id: string
          job_id: string | null
          row_number: number | null
          status: string | null
          message: string | null
          data: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          row_number?: number | null
          status?: string | null
          message?: string | null
          data?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          row_number?: number | null
          status?: string | null
          message?: string | null
          data?: Json | null
          created_at?: string | null
        }
      }
      import_export_templates: {
        Row: {
          id: string
          name: string
          entity_type: string
          template_type: string | null
          columns: Json | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          entity_type: string
          template_type?: string | null
          columns?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          entity_type?: string
          template_type?: string | null
          columns?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      import_field_mappings: {
        Row: {
          id: string
          template_id: string | null
          source_field: string
          target_field: string
          transform_function: string | null
          is_required: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          template_id?: string | null
          source_field: string
          target_field: string
          transform_function?: string | null
          is_required?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string | null
          source_field?: string
          target_field?: string
          transform_function?: string | null
          is_required?: boolean | null
          created_at?: string | null
        }
      }
      industries: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      interfaces: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      inventory_assignments: {
        Row: {
          id: string
          item_id: string
          assigned_to: string | null
          assigned_by: string | null
          assignment_date: string | null
          return_date: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          assigned_to?: string | null
          assigned_by?: string | null
          assignment_date?: string | null
          return_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          assigned_to?: string | null
          assigned_by?: string | null
          assignment_date?: string | null
          return_date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inventory_case_assignments: {
        Row: {
          id: string
          item_id: string
          case_id: string
          quantity: number | null
          assigned_at: string | null
          returned_at: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          case_id: string
          quantity?: number | null
          assigned_at?: string | null
          returned_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          case_id?: string
          quantity?: number | null
          assigned_at?: string | null
          returned_at?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      inventory_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inventory_condition_types: {
        Row: {
          id: number
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      inventory_item_categories: {
        Row: {
          id: number
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      inventory_items: {
        Row: {
          id: string
          sku: string | null
          name: string
          description: string | null
          category_id: string | null
          condition_id: number | null
          quantity: number | null
          unit: string | null
          unit_cost: number | null
          location_id: string | null
          status: string | null
          is_serialized: boolean | null
          serial_number: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          sku?: string | null
          name: string
          description?: string | null
          category_id?: string | null
          condition_id?: number | null
          quantity?: number | null
          unit?: string | null
          unit_cost?: number | null
          location_id?: string | null
          status?: string | null
          is_serialized?: boolean | null
          serial_number?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          sku?: string | null
          name?: string
          description?: string | null
          category_id?: string | null
          condition_id?: number | null
          quantity?: number | null
          unit?: string | null
          unit_cost?: number | null
          location_id?: string | null
          status?: string | null
          is_serialized?: boolean | null
          serial_number?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inventory_locations: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inventory_parts_usage: {
        Row: {
          id: string
          case_id: string | null
          item_id: string
          quantity: number
          used_at: string | null
          used_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id?: string | null
          item_id: string
          quantity: number
          used_at?: string | null
          used_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string | null
          item_id?: string
          quantity?: number
          used_at?: string | null
          used_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      inventory_photos: {
        Row: {
          id: string
          item_id: string
          file_name: string
          file_url: string
          is_primary: boolean | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          file_name: string
          file_url: string
          is_primary?: boolean | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          file_name?: string
          file_url?: string
          is_primary?: boolean | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      inventory_reservations: {
        Row: {
          id: string
          item_id: string
          reserved_for: string | null
          quantity: number
          reserved_at: string | null
          expires_at: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          reserved_for?: string | null
          quantity: number
          reserved_at?: string | null
          expires_at?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          reserved_for?: string | null
          quantity?: number
          reserved_at?: string | null
          expires_at?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inventory_search_templates: {
        Row: {
          id: string
          name: string
          filters: Json | null
          created_by: string | null
          is_shared: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          filters?: Json | null
          created_by?: string | null
          is_shared?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          filters?: Json | null
          created_by?: string | null
          is_shared?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inventory_status_history: {
        Row: {
          id: string
          item_id: string
          old_status: string | null
          new_status: string | null
          changed_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          old_status?: string | null
          new_status?: string | null
          changed_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          old_status?: string | null
          new_status?: string | null
          changed_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      inventory_status_types: {
        Row: {
          id: number
          name: string
          description: string | null
          color: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      inventory_transactions: {
        Row: {
          id: string
          item_id: string
          transaction_type: string
          quantity: number
          reference_id: string | null
          reference_table: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          transaction_type: string
          quantity: number
          reference_id?: string | null
          reference_table?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          transaction_type?: string
          quantity?: number
          reference_id?: string | null
          reference_table?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number | null
          unit_price: number | null
          discount_percentage: number | null
          tax_rate: number | null
          total_price: number | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number | null
          unit_price?: number | null
          discount_percentage?: number | null
          tax_rate?: number | null
          total_price?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number | null
          unit_price?: number | null
          discount_percentage?: number | null
          tax_rate?: number | null
          total_price?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      invoice_statuses: {
        Row: {
          id: string
          name: string
          color: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string | null
          case_id: string | null
          customer_id: string | null
          status_id: string | null
          issue_date: string | null
          due_date: string | null
          subtotal: number | null
          tax_amount: number | null
          discount_amount: number | null
          total_amount: number | null
          amount_paid: number | null
          currency: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          invoice_number?: string | null
          case_id?: string | null
          customer_id?: string | null
          status_id?: string | null
          issue_date?: string | null
          due_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          amount_paid?: number | null
          currency?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          invoice_number?: string | null
          case_id?: string | null
          customer_id?: string | null
          status_id?: string | null
          issue_date?: string | null
          due_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          amount_paid?: number | null
          currency?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      kb_article_tags: {
        Row: {
          article_id: string
          tag_id: string
          tenant_id: string | null
        }
        Insert: {
          article_id: string
          tag_id: string
          tenant_id?: string | null
        }
        Update: {
          article_id?: string
          tag_id?: string
          tenant_id?: string | null
        }
      }
      kb_article_versions: {
        Row: {
          id: string
          article_id: string
          version_number: number
          title: string
          content: string
          changed_by: string | null
          change_notes: string | null
          created_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          article_id: string
          version_number: number
          title: string
          content: string
          changed_by?: string | null
          change_notes?: string | null
          created_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          id?: string
          article_id?: string
          version_number?: number
          title?: string
          content?: string
          changed_by?: string | null
          change_notes?: string | null
          created_at?: string | null
          tenant_id?: string | null
        }
      }
      kb_articles: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          category_id: string | null
          author_id: string | null
          status: string | null
          view_count: number | null
          is_featured: boolean | null
          version: number | null
          published_at: string | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          category_id?: string | null
          author_id?: string | null
          status?: string | null
          view_count?: number | null
          is_featured?: boolean | null
          version?: number | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          category_id?: string | null
          author_id?: string | null
          status?: string | null
          view_count?: number | null
          is_featured?: boolean | null
          version?: number | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
      }
      kb_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_category_id: string | null
          icon: string | null
          color: string | null
          ordering: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_category_id?: string | null
          icon?: string | null
          color?: string | null
          ordering?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_category_id?: string | null
          icon?: string | null
          color?: string | null
          ordering?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
      }
      kb_tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string | null
          tenant_id?: string | null
        }
      }
      leave_balances: {
        Row: {
          id: string
          employee_id: string
          leave_type_id: string
          year: number
          allocated_days: number | null
          used_days: number | null
          remaining_days: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type_id: string
          year: number
          allocated_days?: number | null
          used_days?: number | null
          remaining_days?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type_id?: string
          year?: number
          allocated_days?: number | null
          used_days?: number | null
          remaining_days?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          total_days: number
          reason: string | null
          status: string | null
          applied_date: string
          reviewed_by: string | null
          reviewed_date: string | null
          review_notes: string | null
          created_at: string | null
          updated_at: string | null
          tenant_id: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          total_days: number
          reason?: string | null
          status?: string | null
          applied_date?: string
          reviewed_by?: string | null
          reviewed_date?: string | null
          review_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type_id?: string
          start_date?: string
          end_date?: string
          total_days?: number
          reason?: string | null
          status?: string | null
          applied_date?: string
          reviewed_by?: string | null
          reviewed_date?: string | null
          review_notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          tenant_id?: string | null
        }
      }
      leave_types: {
        Row: {
          id: string
          name: string
          description: string | null
          days_per_year: number | null
          is_paid: boolean | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          days_per_year?: number | null
          is_paid?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          days_per_year?: number | null
          is_paid?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      modules: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          icon: string | null
          is_active: boolean | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          icon?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          icon?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      ndas: {
        Row: {
          id: string
          customer_id: string | null
          case_id: string | null
          signed_at: string | null
          expires_at: string | null
          document_url: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id?: string | null
          case_id?: string | null
          signed_at?: string | null
          expires_at?: string | null
          document_url?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          case_id?: string | null
          signed_at?: string | null
          expires_at?: string | null
          document_url?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      number_sequences: {
        Row: {
          id: string
          sequence_name: string
          prefix: string | null
          current_value: number | null
          increment_by: number | null
          padding_length: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          sequence_name: string
          prefix?: string | null
          current_value?: number | null
          increment_by?: number | null
          padding_length?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          sequence_name?: string
          prefix?: string | null
          current_value?: number | null
          increment_by?: number | null
          padding_length?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      number_sequences_audit: {
        Row: {
          id: string
          sequence_id: string | null
          old_value: number | null
          new_value: number | null
          changed_by: string | null
          changed_at: string | null
        }
        Insert: {
          id?: string
          sequence_id?: string | null
          old_value?: number | null
          new_value?: number | null
          changed_by?: string | null
          changed_at?: string | null
        }
        Update: {
          id?: string
          sequence_id?: string | null
          old_value?: number | null
          new_value?: number | null
          changed_by?: string | null
          changed_at?: string | null
        }
      }
      onboarding_checklist_items: {
        Row: {
          id: string
          checklist_id: string
          title: string
          description: string | null
          is_required: boolean | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          checklist_id: string
          title: string
          description?: string | null
          is_required?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          checklist_id?: string
          title?: string
          description?: string | null
          is_required?: boolean | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      onboarding_checklists: {
        Row: {
          id: string
          name: string
          description: string | null
          department_id: string | null
          position_id: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          department_id?: string | null
          position_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          department_id?: string | null
          position_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      onboarding_tasks: {
        Row: {
          id: string
          employee_id: string
          checklist_item_id: string
          status: string | null
          completed_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          checklist_item_id: string
          status?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          checklist_item_id?: string
          status?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      payment_allocations: {
        Row: {
          id: string
          payment_id: string
          invoice_id: string
          amount: number
          allocated_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          payment_id: string
          invoice_id: string
          amount: number
          allocated_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          payment_id?: string
          invoice_id?: string
          amount?: number
          allocated_at?: string | null
          created_at?: string | null
        }
      }
      payment_disbursements: {
        Row: {
          id: string
          employee_id: string | null
          amount: number
          disbursement_type: string | null
          payment_date: string
          reference_number: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id?: string | null
          amount: number
          disbursement_type?: string | null
          payment_date: string
          reference_number?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string | null
          amount?: number
          disbursement_type?: string | null
          payment_date?: string
          reference_number?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      payment_receipts: {
        Row: {
          id: string
          payment_id: string
          receipt_number: string | null
          file_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          payment_id: string
          receipt_number?: string | null
          file_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          payment_id?: string
          receipt_number?: string | null
          file_url?: string | null
          created_at?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          payment_number: string | null
          customer_id: string | null
          invoice_id: string | null
          amount: number
          currency: string | null
          payment_date: string
          payment_method_id: string | null
          reference_number: string | null
          status: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          payment_number?: string | null
          customer_id?: string | null
          invoice_id?: string | null
          amount: number
          currency?: string | null
          payment_date: string
          payment_method_id?: string | null
          reference_number?: string | null
          status?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          payment_number?: string | null
          customer_id?: string | null
          invoice_id?: string | null
          amount?: number
          currency?: string | null
          payment_date?: string
          payment_method_id?: string | null
          reference_number?: string | null
          status?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      payroll_components: {
        Row: {
          id: string
          name: string
          component_type: string | null
          description: string | null
          is_taxable: boolean | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          component_type?: string | null
          description?: string | null
          is_taxable?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          component_type?: string | null
          description?: string | null
          is_taxable?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      payroll_record_items: {
        Row: {
          id: string
          payroll_record_id: string
          component_id: string | null
          component_name: string | null
          amount: number | null
          is_deduction: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          payroll_record_id: string
          component_id?: string | null
          component_name?: string | null
          amount?: number | null
          is_deduction?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          payroll_record_id?: string
          component_id?: string | null
          component_name?: string | null
          amount?: number | null
          is_deduction?: boolean | null
          created_at?: string | null
        }
      }
      payroll_records: {
        Row: {
          id: string
          employee_id: string
          pay_period_start: string
          pay_period_end: string
          gross_salary: number | null
          total_deductions: number | null
          net_salary: number | null
          status: string | null
          payment_date: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          pay_period_start: string
          pay_period_end: string
          gross_salary?: number | null
          total_deductions?: number | null
          net_salary?: number | null
          status?: string | null
          payment_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          pay_period_start?: string
          pay_period_end?: string
          gross_salary?: number | null
          total_deductions?: number | null
          net_salary?: number | null
          status?: string | null
          payment_date?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      pdf_generation_logs: {
        Row: {
          id: string
          entity_type: string | null
          entity_id: string | null
          template_id: string | null
          status: string | null
          file_url: string | null
          error_message: string | null
          generated_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          entity_type?: string | null
          entity_id?: string | null
          template_id?: string | null
          status?: string | null
          file_url?: string | null
          error_message?: string | null
          generated_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          entity_type?: string | null
          entity_id?: string | null
          template_id?: string | null
          status?: string | null
          file_url?: string | null
          error_message?: string | null
          generated_by?: string | null
          created_at?: string | null
        }
      }
      performance_reviews: {
        Row: {
          id: string
          employee_id: string
          reviewer_id: string | null
          review_period_start: string | null
          review_period_end: string | null
          overall_rating: number | null
          comments: string | null
          goals: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          reviewer_id?: string | null
          review_period_start?: string | null
          review_period_end?: string | null
          overall_rating?: number | null
          comments?: string | null
          goals?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          reviewer_id?: string | null
          review_period_start?: string | null
          review_period_end?: string | null
          overall_rating?: number | null
          comments?: string | null
          goals?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      portal_link_history: {
        Row: {
          id: string
          case_id: string | null
          customer_id: string | null
          link_token: string | null
          accessed_at: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          case_id?: string | null
          customer_id?: string | null
          link_token?: string | null
          accessed_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string | null
          customer_id?: string | null
          link_token?: string | null
          accessed_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
      }
      positions: {
        Row: {
          id: string
          title: string
          department_id: string | null
          description: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          department_id?: string | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          department_id?: string | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: string | null
          email: string | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          description: string
          quantity: number | null
          unit_price: number | null
          total_price: number | null
          received_quantity: number | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          purchase_order_id: string
          description: string
          quantity?: number | null
          unit_price?: number | null
          total_price?: number | null
          received_quantity?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          purchase_order_id?: string
          description?: string
          quantity?: number | null
          unit_price?: number | null
          total_price?: number | null
          received_quantity?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      purchase_order_statuses: {
        Row: {
          id: number
          name: string
          color: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string | null
          supplier_id: string | null
          status_id: number | null
          order_date: string | null
          expected_date: string | null
          received_date: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          currency: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          po_number?: string | null
          supplier_id?: string | null
          status_id?: number | null
          order_date?: string | null
          expected_date?: string | null
          received_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          currency?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          po_number?: string | null
          supplier_id?: string | null
          status_id?: number | null
          order_date?: string | null
          expected_date?: string | null
          received_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          currency?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      quote_history: {
        Row: {
          id: string
          quote_id: string
          action: string
          details: Json | null
          performed_by: string | null
          performed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          quote_id: string
          action: string
          details?: Json | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          quote_id?: string
          action?: string
          details?: Json | null
          performed_by?: string | null
          performed_at?: string | null
          created_at?: string | null
        }
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          description: string
          quantity: number | null
          unit_price: number | null
          discount_percentage: number | null
          tax_rate: number | null
          total_price: number | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          quote_id: string
          description: string
          quantity?: number | null
          unit_price?: number | null
          discount_percentage?: number | null
          tax_rate?: number | null
          total_price?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          quote_id?: string
          description?: string
          quantity?: number | null
          unit_price?: number | null
          discount_percentage?: number | null
          tax_rate?: number | null
          total_price?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      quote_statuses: {
        Row: {
          id: string
          name: string
          color: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          color?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      quotes: {
        Row: {
          id: string
          quote_number: string | null
          case_id: string | null
          customer_id: string | null
          status_id: string | null
          issue_date: string | null
          expiry_date: string | null
          subtotal: number | null
          tax_amount: number | null
          discount_amount: number | null
          total_amount: number | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          quote_number?: string | null
          case_id?: string | null
          customer_id?: string | null
          status_id?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          quote_number?: string | null
          case_id?: string | null
          customer_id?: string | null
          status_id?: string | null
          issue_date?: string | null
          expiry_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          discount_amount?: number | null
          total_amount?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      receipt_allocations: {
        Row: {
          id: string
          receipt_id: string
          invoice_id: string
          amount: number
          created_at: string | null
        }
        Insert: {
          id?: string
          receipt_id: string
          invoice_id: string
          amount: number
          created_at?: string | null
        }
        Update: {
          id?: string
          receipt_id?: string
          invoice_id?: string
          amount?: number
          created_at?: string | null
        }
      }
      receipts: {
        Row: {
          id: string
          receipt_number: string | null
          customer_id: string | null
          amount: number
          currency: string | null
          receipt_date: string
          payment_method_id: string | null
          reference_number: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          receipt_number?: string | null
          customer_id?: string | null
          amount: number
          currency?: string | null
          receipt_date: string
          payment_method_id?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          receipt_number?: string | null
          customer_id?: string | null
          amount?: number
          currency?: string | null
          receipt_date?: string
          payment_method_id?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      reconciliation_matches: {
        Row: {
          id: string
          session_id: string
          bank_transaction_id: string | null
          financial_transaction_id: string | null
          match_type: string | null
          matched_at: string | null
          matched_by: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          bank_transaction_id?: string | null
          financial_transaction_id?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          bank_transaction_id?: string | null
          financial_transaction_id?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      recruitment_candidates: {
        Row: {
          id: string
          job_id: string | null
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          resume_url: string | null
          status: string | null
          applied_at: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          resume_url?: string | null
          status?: string | null
          applied_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          resume_url?: string | null
          status?: string | null
          applied_at?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      recruitment_jobs: {
        Row: {
          id: string
          title: string
          department_id: string | null
          position_id: string | null
          description: string | null
          requirements: string | null
          status: string | null
          posted_at: string | null
          closes_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          department_id?: string | null
          position_id?: string | null
          description?: string | null
          requirements?: string | null
          status?: string | null
          posted_at?: string | null
          closes_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          department_id?: string | null
          position_id?: string | null
          description?: string | null
          requirements?: string | null
          status?: string | null
          posted_at?: string | null
          closes_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      report_section_library: {
        Row: {
          id: string
          name: string
          section_type: string | null
          default_content: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          section_type?: string | null
          default_content?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          section_type?: string | null
          default_content?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      report_section_presets: {
        Row: {
          id: string
          name: string
          sections: Json | null
          is_active: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          sections?: Json | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          sections?: Json | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      report_template_section_mappings: {
        Row: {
          id: string
          template_id: string
          section_id: string
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          template_id: string
          section_id: string
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          section_id?: string
          sort_order?: number | null
          created_at?: string | null
        }
      }
      resource_clone_drives: {
        Row: {
          id: string
          drive_code: string
          physical_drive_brand: string | null
          physical_drive_model: string | null
          physical_drive_serial: string | null
          physical_drive_capacity_gb: number | null
          storage_type: string | null
          storage_location_id: string | null
          shelf_number: string | null
          status: string | null
          current_case_id: string | null
          capacity_total_gb: number | null
          capacity_used_gb: number | null
          capacity_available_gb: number | null
          last_used_date: string | null
          last_wiped_date: string | null
          wipe_count: number | null
          health_status: string | null
          smart_data: Record<string, unknown> | null
          notes: string | null
          is_active: boolean | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          clone_id: string | null
          brand_id: string | null
          capacity_id: string | null
          device_type_id: string | null
          interface_id: string | null
          condition_id: number | null
          serial_number: string | null
          model: string | null
          vendor: string | null
          purchase_date: string | null
          purchase_cost: number | null
          warranty_expiry: string | null
          physical_location_notes: string | null
        }
        Insert: {
          id?: string
          drive_code?: string
          physical_drive_brand?: string | null
          physical_drive_model?: string | null
          physical_drive_serial?: string | null
          physical_drive_capacity_gb?: number | null
          storage_type?: string | null
          storage_location_id?: string | null
          shelf_number?: string | null
          status?: string | null
          current_case_id?: string | null
          capacity_total_gb?: number | null
          capacity_used_gb?: number | null
          capacity_available_gb?: number | null
          last_used_date?: string | null
          last_wiped_date?: string | null
          wipe_count?: number | null
          health_status?: string | null
          smart_data?: Record<string, unknown> | null
          notes?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          clone_id?: string | null
          brand_id?: string | null
          capacity_id?: string | null
          device_type_id?: string | null
          interface_id?: string | null
          condition_id?: number | null
          serial_number?: string | null
          model?: string | null
          vendor?: string | null
          purchase_date?: string | null
          purchase_cost?: number | null
          warranty_expiry?: string | null
          physical_location_notes?: string | null
        }
        Update: {
          id?: string
          drive_code?: string
          physical_drive_brand?: string | null
          physical_drive_model?: string | null
          physical_drive_serial?: string | null
          physical_drive_capacity_gb?: number | null
          storage_type?: string | null
          storage_location_id?: string | null
          shelf_number?: string | null
          status?: string | null
          current_case_id?: string | null
          capacity_total_gb?: number | null
          capacity_used_gb?: number | null
          capacity_available_gb?: number | null
          last_used_date?: string | null
          last_wiped_date?: string | null
          wipe_count?: number | null
          health_status?: string | null
          smart_data?: Record<string, unknown> | null
          notes?: string | null
          is_active?: boolean | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          clone_id?: string | null
          brand_id?: string | null
          capacity_id?: string | null
          device_type_id?: string | null
          interface_id?: string | null
          condition_id?: number | null
          serial_number?: string | null
          model?: string | null
          vendor?: string | null
          purchase_date?: string | null
          purchase_cost?: number | null
          warranty_expiry?: string | null
          physical_location_notes?: string | null
        }
      }
      role_module_permissions: {
        Row: {
          id: string
          role: string
          module_id: string
          can_view: boolean | null
          can_create: boolean | null
          can_edit: boolean | null
          can_delete: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          role: string
          module_id: string
          can_view?: boolean | null
          can_create?: boolean | null
          can_edit?: boolean | null
          can_delete?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string
          module_id?: string
          can_view?: boolean | null
          can_create?: boolean | null
          can_edit?: boolean | null
          can_delete?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      salary_components: {
        Row: {
          id: string
          name: string
          component_type: string | null
          description: string | null
          is_taxable: boolean | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          component_type?: string | null
          description?: string | null
          is_taxable?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          component_type?: string | null
          description?: string | null
          is_taxable?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      seed_status: {
        Row: {
          id: string
          seed_name: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          seed_name: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          seed_name?: string
          completed_at?: string | null
        }
      }
      service_catalog_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      service_line_items_catalog: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          unit_price: number | null
          unit: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          unit_price?: number | null
          unit?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          unit_price?: number | null
          unit?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      service_locations: {
        Row: {
          id: number
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      service_problems: {
        Row: {
          id: number
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      service_types: {
        Row: {
          id: string
          name: string
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      settings: {
        Row: {
          id: number
          key: string
          value: string | null
          description: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          key: string
          value?: string | null
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          key?: string
          value?: string | null
          description?: string | null
          updated_at?: string | null
        }
      }
      stock_adjustment_sessions: {
        Row: {
          id: string
          adjustment_number: string | null
          adjustment_date: string
          reason: string | null
          status: string
          notes: string | null
          approved_by: string | null
          approved_at: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          adjustment_number?: string | null
          adjustment_date?: string
          reason?: string | null
          status?: string
          notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          adjustment_number?: string | null
          adjustment_date?: string
          reason?: string | null
          status?: string
          notes?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_adjustment_session_items: {
        Row: {
          id: string
          session_id: string
          stock_item_id: string
          system_quantity: number | null
          counted_quantity: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          stock_item_id: string
          system_quantity?: number | null
          counted_quantity?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          stock_item_id?: string
          system_quantity?: number | null
          counted_quantity?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_adjustments: {
        Row: {
          id: string
          stock_item_id: string
          adjustment_type: string
          quantity_before: number
          quantity_after: number
          reason: string
          approved_by: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          stock_item_id: string
          adjustment_type: string
          quantity_before: number
          quantity_after: number
          reason: string
          approved_by?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          stock_item_id?: string
          adjustment_type?: string
          quantity_before?: number
          quantity_after?: number
          reason?: string
          approved_by?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      stock_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_category_id: string | null
          category_type: string
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_category_id?: string | null
          category_type?: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_category_id?: string | null
          category_type?: string
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_items: {
        Row: {
          id: string
          sku: string | null
          name: string
          description: string | null
          category_id: string | null
          item_type: string
          unit_of_measure: string | null
          current_quantity: number
          reserved_quantity: number
          minimum_quantity: number
          reorder_quantity: number | null
          cost_price: number | null
          selling_price: number | null
          tax_inclusive: boolean
          tax_rate_id: string | null
          brand: string | null
          model: string | null
          capacity: string | null
          warranty_months: number | null
          location: string | null
          barcode: string | null
          supplier_id: string | null
          image_url: string | null
          specifications: Json | null
          is_active: boolean | null
          is_featured: boolean
          notes: string | null
          unit_price: number | null
          quantity_on_hand: number | null
          reorder_level: number | null
          location_id: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          sku?: string | null
          name: string
          description?: string | null
          category_id?: string | null
          item_type?: string
          unit_of_measure?: string | null
          current_quantity?: number
          reserved_quantity?: number
          minimum_quantity?: number
          reorder_quantity?: number | null
          cost_price?: number | null
          selling_price?: number | null
          tax_inclusive?: boolean
          tax_rate_id?: string | null
          brand?: string | null
          model?: string | null
          capacity?: string | null
          warranty_months?: number | null
          location?: string | null
          barcode?: string | null
          supplier_id?: string | null
          image_url?: string | null
          specifications?: Json | null
          is_active?: boolean | null
          is_featured?: boolean
          notes?: string | null
          unit_price?: number | null
          quantity_on_hand?: number | null
          reorder_level?: number | null
          location_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          sku?: string | null
          name?: string
          description?: string | null
          category_id?: string | null
          item_type?: string
          unit_of_measure?: string | null
          current_quantity?: number
          reserved_quantity?: number
          minimum_quantity?: number
          reorder_quantity?: number | null
          cost_price?: number | null
          selling_price?: number | null
          tax_inclusive?: boolean
          tax_rate_id?: string | null
          brand?: string | null
          model?: string | null
          capacity?: string | null
          warranty_months?: number | null
          location?: string | null
          barcode?: string | null
          supplier_id?: string | null
          image_url?: string | null
          specifications?: Json | null
          is_active?: boolean | null
          is_featured?: boolean
          notes?: string | null
          unit_price?: number | null
          quantity_on_hand?: number | null
          reorder_level?: number | null
          location_id?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_price_history: {
        Row: {
          id: string
          stock_item_id: string
          price_type: string
          old_price: number | null
          new_price: number | null
          changed_by: string | null
          change_reason: string | null
          effective_date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          stock_item_id: string
          price_type: string
          old_price?: number | null
          new_price?: number | null
          changed_by?: string | null
          change_reason?: string | null
          effective_date?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          stock_item_id?: string
          price_type?: string
          old_price?: number | null
          new_price?: number | null
          changed_by?: string | null
          change_reason?: string | null
          effective_date?: string
          created_at?: string | null
        }
      }
      stock_sale_items: {
        Row: {
          id: string
          sale_id: string
          stock_item_id: string
          quantity: number
          unit_price: number
          cost_price: number | null
          discount_amount: number
          tax_amount: number
          line_total: number
          serial_number: string | null
          warranty_start_date: string | null
          warranty_end_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          sale_id: string
          stock_item_id: string
          quantity: number
          unit_price: number
          cost_price?: number | null
          discount_amount?: number
          tax_amount?: number
          line_total: number
          serial_number?: string | null
          warranty_start_date?: string | null
          warranty_end_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          sale_id?: string
          stock_item_id?: string
          quantity?: number
          unit_price?: number
          cost_price?: number | null
          discount_amount?: number
          tax_amount?: number
          line_total?: number
          serial_number?: string | null
          warranty_start_date?: string | null
          warranty_end_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_sales: {
        Row: {
          id: string
          sale_number: string | null
          sale_date: string
          case_id: string | null
          customer_id: string
          company_id: string | null
          subtotal: number
          tax_amount: number
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          total_amount: number
          payment_status: string
          payment_method: string | null
          invoice_id: string | null
          notes: string | null
          sold_by: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          sale_number?: string | null
          sale_date?: string
          case_id?: string | null
          customer_id: string
          company_id?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          total_amount?: number
          payment_status?: string
          payment_method?: string | null
          invoice_id?: string | null
          notes?: string | null
          sold_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          sale_number?: string | null
          sale_date?: string
          case_id?: string | null
          customer_id?: string
          company_id?: string | null
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          total_amount?: number
          payment_status?: string
          payment_method?: string | null
          invoice_id?: string | null
          notes?: string | null
          sold_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_serial_numbers: {
        Row: {
          id: string
          stock_item_id: string
          serial_number: string
          status: string
          purchase_order_id: string | null
          purchase_date: string | null
          purchase_cost: number | null
          sale_id: string | null
          sold_to_customer_id: string | null
          sold_date: string | null
          warranty_end_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          stock_item_id: string
          serial_number: string
          status?: string
          purchase_order_id?: string | null
          purchase_date?: string | null
          purchase_cost?: number | null
          sale_id?: string | null
          sold_to_customer_id?: string | null
          sold_date?: string | null
          warranty_end_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          stock_item_id?: string
          serial_number?: string
          status?: string
          purchase_order_id?: string | null
          purchase_date?: string | null
          purchase_cost?: number | null
          sale_id?: string | null
          sold_to_customer_id?: string | null
          sold_date?: string | null
          warranty_end_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_transactions: {
        Row: {
          id: string
          stock_item_id: string
          transaction_type: string
          quantity: number
          previous_quantity: number | null
          new_quantity: number | null
          case_id: string | null
          customer_id: string | null
          purchase_order_id: string | null
          sale_id: string | null
          unit_cost: number | null
          unit_price: number | null
          reference_number: string | null
          notes: string | null
          performed_by: string | null
          transaction_date: string
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          stock_item_id: string
          transaction_type: string
          quantity: number
          previous_quantity?: number | null
          new_quantity?: number | null
          case_id?: string | null
          customer_id?: string | null
          purchase_order_id?: string | null
          sale_id?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          reference_number?: string | null
          notes?: string | null
          performed_by?: string | null
          transaction_date?: string
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          stock_item_id?: string
          transaction_type?: string
          quantity?: number
          previous_quantity?: number | null
          new_quantity?: number | null
          case_id?: string | null
          customer_id?: string | null
          purchase_order_id?: string | null
          sale_id?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          reference_number?: string | null
          notes?: string | null
          performed_by?: string | null
          transaction_date?: string
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      stock_locations: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      stock_movements: {
        Row: {
          id: string
          item_id: string
          movement_type: string
          quantity: number
          from_location_id: string | null
          to_location_id: string | null
          reference_id: string | null
          reference_table: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          movement_type: string
          quantity: number
          from_location_id?: string | null
          to_location_id?: string | null
          reference_id?: string | null
          reference_table?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          movement_type?: string
          quantity?: number
          from_location_id?: string | null
          to_location_id?: string | null
          reference_id?: string | null
          reference_table?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      supplier_audit_trail: {
        Row: {
          id: string
          supplier_id: string
          action: string
          old_values: Json | null
          new_values: Json | null
          changed_by: string | null
          changed_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          action: string
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          action?: string
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string | null
          changed_at?: string | null
        }
      }
      supplier_categories: {
        Row: {
          id: number
          name: string
          description: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      supplier_communications: {
        Row: {
          id: string
          supplier_id: string
          type: string | null
          subject: string | null
          body: string | null
          direction: string | null
          sent_at: string | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          type?: string | null
          subject?: string | null
          body?: string | null
          direction?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          type?: string | null
          subject?: string | null
          body?: string | null
          direction?: string | null
          sent_at?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      supplier_contacts: {
        Row: {
          id: string
          supplier_id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          position: string | null
          is_primary: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          position?: string | null
          is_primary?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string | null
          position?: string | null
          is_primary?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      supplier_documents: {
        Row: {
          id: string
          supplier_id: string
          document_type: string | null
          file_name: string
          file_url: string
          expiry_date: string | null
          uploaded_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          document_type?: string | null
          file_name: string
          file_url: string
          expiry_date?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          document_type?: string | null
          file_name?: string
          file_url?: string
          expiry_date?: string | null
          uploaded_by?: string | null
          created_at?: string | null
        }
      }
      supplier_payment_terms: {
        Row: {
          id: number
          name: string
          days: number | null
          description: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: number
          name: string
          days?: number | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          days?: number | null
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      supplier_performance_metrics: {
        Row: {
          id: string
          supplier_id: string
          metric_date: string
          on_time_delivery_rate: number | null
          quality_score: number | null
          response_time_hours: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          metric_date: string
          on_time_delivery_rate?: number | null
          quality_score?: number | null
          response_time_hours?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          metric_date?: string
          on_time_delivery_rate?: number | null
          quality_score?: number | null
          response_time_hours?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      supplier_products: {
        Row: {
          id: string
          supplier_id: string
          name: string
          description: string | null
          sku: string | null
          unit_price: number | null
          currency: string | null
          lead_time_days: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          name: string
          description?: string | null
          sku?: string | null
          unit_price?: number | null
          currency?: string | null
          lead_time_days?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          name?: string
          description?: string | null
          sku?: string | null
          unit_price?: number | null
          currency?: string | null
          lead_time_days?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          category_id: number | null
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          country: string | null
          payment_terms_id: number | null
          currency: string | null
          tax_number: string | null
          is_active: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category_id?: number | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          payment_terms_id?: number | null
          currency?: string | null
          tax_number?: string | null
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category_id?: number | null
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          payment_terms_id?: number | null
          currency?: string | null
          tax_number?: string | null
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      system_logs: {
        Row: {
          id: string
          level: string
          message: string
          context: Json | null
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          level: string
          message: string
          context?: Json | null
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          level?: string
          message?: string
          context?: Json | null
          user_id?: string | null
          created_at?: string | null
        }
      }
      tax_rates: {
        Row: {
          id: string
          name: string
          rate: number
          description: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          rate: number
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          rate?: number
          description?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      template_categories: {
        Row: {
          id: string
          name: string
          code: string | null
          description: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          description?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      template_types: {
        Row: {
          id: string
          name: string
          code: string
          category_id: string | null
          description: string | null
          supports_variables: boolean | null
          supports_line_items: boolean | null
          default_format: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          category_id?: string | null
          description?: string | null
          supports_variables?: boolean | null
          supports_line_items?: boolean | null
          default_format?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          category_id?: string | null
          description?: string | null
          supports_variables?: boolean | null
          supports_line_items?: boolean | null
          default_format?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      template_variables: {
        Row: {
          id: string
          template_type_id: string | null
          variable_name: string
          variable_key: string
          data_type: string | null
          description: string | null
          sample_value: string | null
          format_pattern: string | null
          is_required: boolean | null
          category: string | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          template_type_id?: string | null
          variable_name: string
          variable_key: string
          data_type?: string | null
          description?: string | null
          sample_value?: string | null
          format_pattern?: string | null
          is_required?: boolean | null
          category?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          template_type_id?: string | null
          variable_name?: string
          variable_key?: string
          data_type?: string | null
          description?: string | null
          sample_value?: string | null
          format_pattern?: string | null
          is_required?: boolean | null
          category?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
      }
      template_versions: {
        Row: {
          id: string
          template_id: string
          version_number: number
          content: string | null
          content_json: Json | null
          change_description: string | null
          changed_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          template_id: string
          version_number: number
          content?: string | null
          content_json?: Json | null
          change_description?: string | null
          changed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          version_number?: number
          content?: string | null
          content_json?: Json | null
          change_description?: string | null
          changed_by?: string | null
          created_at?: string | null
        }
      }
      templates: {
        Row: {
          id: string
          type: string
          key: string
          title: string
          content_rich: Json | null
          locale: string | null
          variables: string[] | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          type: string
          key: string
          title: string
          content_rich?: Json | null
          locale?: string | null
          variables?: string[] | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          type?: string
          key?: string
          title?: string
          content_rich?: Json | null
          locale?: string | null
          variables?: string[] | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      timesheets: {
        Row: {
          id: string
          employee_id: string
          work_date: string
          project_name: string | null
          task_description: string | null
          hours: number
          is_billable: boolean | null
          status: string | null
          submitted_date: string | null
          approved_by: string | null
          approved_date: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          work_date: string
          project_name?: string | null
          task_description?: string | null
          hours: number
          is_billable?: boolean | null
          status?: string | null
          submitted_date?: string | null
          approved_by?: string | null
          approved_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          work_date?: string
          project_name?: string | null
          task_description?: string | null
          hours?: number
          is_billable?: boolean | null
          status?: string | null
          submitted_date?: string | null
          approved_by?: string | null
          approved_date?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      transaction_categories: {
        Row: {
          id: string
          name: string
          type: string
          description: string | null
          is_active: boolean | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          description?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          description?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action_type: string
          action_details: Json | null
          entity_type: string | null
          entity_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action_type: string
          action_details?: Json | null
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action_type?: string
          action_details?: Json | null
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
      }
      user_activity_sessions: {
        Row: {
          id: string
          user_id: string
          login_at: string | null
          logout_at: string | null
          ip_address: string | null
          user_agent: string | null
          device_info: Json | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          login_at?: string | null
          logout_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          login_at?: string | null
          logout_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json | null
          is_active?: boolean | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string | null
          theme: string | null
          language: string | null
          notifications_enabled: boolean | null
          email_notifications: boolean | null
          timezone: string | null
          date_format: string | null
          preferences_data: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          theme?: string | null
          language?: string | null
          notifications_enabled?: boolean | null
          email_notifications?: boolean | null
          timezone?: string | null
          date_format?: string | null
          preferences_data?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          theme?: string | null
          language?: string | null
          notifications_enabled?: boolean | null
          email_notifications?: boolean | null
          timezone?: string | null
          date_format?: string | null
          preferences_data?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string | null
          session_token: string | null
          ip_address: string | null
          user_agent: string | null
          device_type: string | null
          location: string | null
          is_active: boolean | null
          last_activity: string | null
          login_at: string | null
          logout_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_token?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          location?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          login_at?: string | null
          logout_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_token?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_type?: string | null
          location?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          login_at?: string | null
          logout_at?: string | null
          created_at?: string | null
        }
      }
      user_sidebar_preferences: {
        Row: {
          id: string
          user_id: string
          collapsed_sections: Json | null
          sidebar_width: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          collapsed_sections?: Json | null
          sidebar_width?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          collapsed_sections?: Json | null
          sidebar_width?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      vat_records: {
        Row: {
          id: string
          record_date: string
          record_type: string
          invoice_id: string | null
          expense_id: string | null
          net_amount: number
          vat_amount: number
          gross_amount: number
          vat_rate: number
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          record_date: string
          record_type: string
          invoice_id?: string | null
          expense_id?: string | null
          net_amount: number
          vat_amount: number
          gross_amount: number
          vat_rate: number
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          record_date?: string
          record_type?: string
          invoice_id?: string | null
          expense_id?: string | null
          net_amount?: number
          vat_amount?: number
          gross_amount?: number
          vat_rate?: number
          description?: string | null
          created_at?: string | null
        }
      }
      vat_returns: {
        Row: {
          id: string
          period_start: string
          period_end: string
          output_vat: number | null
          input_vat: number | null
          net_vat: number | null
          status: string
          submission_date: string | null
          payment_date: string | null
          reference_number: string | null
          notes: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
          submitted_by: string | null
        }
        Insert: {
          id?: string
          period_start: string
          period_end: string
          output_vat?: number | null
          input_vat?: number | null
          net_vat?: number | null
          status?: string
          submission_date?: string | null
          payment_date?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          id?: string
          period_start?: string
          period_end?: string
          output_vat?: number | null
          input_vat?: number | null
          net_vat?: number | null
          status?: string
          submission_date?: string | null
          payment_date?: string | null
          reference_number?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          submitted_by?: string | null
        }
      }
      vat_transactions: {
        Row: {
          id: string
          vat_return_id: string | null
          transaction_date: string
          transaction_type: string
          source_type: string
          source_id: string | null
          net_amount: number
          vat_rate: number
          vat_amount: number
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          vat_return_id?: string | null
          transaction_date: string
          transaction_type: string
          source_type: string
          source_id?: string | null
          net_amount: number
          vat_rate: number
          vat_amount: number
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          vat_return_id?: string | null
          transaction_date?: string
          transaction_type?: string
          source_type?: string
          source_id?: string | null
          net_amount?: number
          vat_rate?: number
          vat_amount?: number
          description?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      customers: {
        Row: {
          id: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string | null
          mobile: string | null
          address: string | null
          city: string | null
          country: string | null
          company_name: string | null
          customer_type: string | null
          group_id: string | null
          portal_access: boolean | null
          portal_password_hash: string | null
          notes: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
      }
    }
    Functions: {
      get_next_number: {
        Args: { sequence_name: string }
        Returns: string
      }
      get_dashboard_stats_v2: {
        Args: Record<string, never>
        Returns: Json
      }
      authenticate_portal_customer: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_staff_user: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      custody_action_category: 'creation' | 'modification' | 'access' | 'transfer' | 'verification' | 'communication' | 'evidence_handling' | 'financial' | 'critical_event'
      custody_status: 'in_custody' | 'in_transit' | 'checked_out' | 'archived' | 'disposed'
      custody_transfer_status: 'initiated' | 'pending_acceptance' | 'accepted' | 'rejected' | 'cancelled'
      integrity_check_result: 'passed' | 'failed' | 'warning' | 'not_applicable'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
