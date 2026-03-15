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
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr' | null
          phone: string | null
          avatar_url: string | null
          is_active: boolean
          last_login: string | null
          password_reset_required: boolean
          case_access_level: 'restricted' | 'full'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr' | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
          password_reset_required?: boolean
          case_access_level?: 'restricted' | 'full'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'technician' | 'sales' | 'accounts' | 'hr' | null
          phone?: string | null
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
          password_reset_required?: boolean
          case_access_level?: 'restricted' | 'full'
          created_at?: string
          updated_at?: string
        }
      }
      system_logs: {
        Row: {
          id: string
          level: 'error' | 'warning' | 'info' | 'debug'
          module: string
          action: string
          message: string
          user_id: string | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          level: 'error' | 'warning' | 'info' | 'debug'
          module: string
          action: string
          message: string
          user_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          level?: 'error' | 'warning' | 'info' | 'debug'
          module?: string
          action?: string
          message?: string
          user_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      audit_trails: {
        Row: {
          id: string
          user_id: string
          action_type: 'create' | 'update' | 'delete' | 'view'
          table_name: string
          record_id: string | null
          old_values: Json
          new_values: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: 'create' | 'update' | 'delete' | 'view'
          table_name: string
          record_id?: string | null
          old_values?: Json
          new_values?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: 'create' | 'update' | 'delete' | 'view'
          table_name?: string
          record_id?: string | null
          old_values?: Json
          new_values?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      user_activity_sessions: {
        Row: {
          id: string
          user_id: string
          login_at: string
          logout_at: string | null
          ip_address: string | null
          user_agent: string | null
          device_info: Json
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          login_at?: string
          logout_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          login_at?: string
          logout_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json
          is_active?: boolean
        }
      }
      database_backups: {
        Row: {
          id: string
          backup_type: 'full' | 'incremental' | 'manual'
          file_path: string | null
          file_size_bytes: number
          status: 'pending' | 'in_progress' | 'completed' | 'failed'
          error_message: string | null
          created_by: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          backup_type: 'full' | 'incremental' | 'manual'
          file_path?: string | null
          file_size_bytes?: number
          status?: 'pending' | 'in_progress' | 'completed' | 'failed'
          error_message?: string | null
          created_by: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          backup_type?: 'full' | 'incremental' | 'manual'
          file_path?: string | null
          file_size_bytes?: number
          status?: 'pending' | 'in_progress' | 'completed' | 'failed'
          error_message?: string | null
          created_by?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      settings: {
        Row: {
          id: number
          company_profile: Json
          localization: Json
          portal: Json
          limits: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          company_profile?: Json
          localization?: Json
          portal?: Json
          limits?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          company_profile?: Json
          localization?: Json
          portal?: Json
          limits?: Json
          created_at?: string
          updated_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_department_id: string | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_department_id?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_department_id?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      positions: {
        Row: {
          id: string
          title: string
          description: string | null
          department_id: string | null
          level: 'entry' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          department_id?: string | null
          level?: 'entry' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          department_id?: string | null
          level?: 'entry' | 'mid' | 'senior' | 'lead' | 'manager' | 'director' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          employee_number: string
          department_id: string | null
          position_id: string | null
          employment_type: 'full_time' | 'part_time' | 'contract' | 'intern'
          employment_status: 'active' | 'on_leave' | 'suspended' | 'terminated'
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
          country: string
          emergency_contact_name: string | null
          emergency_contact_relationship: string | null
          emergency_contact_phone: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_sort_code: string | null
          tax_code: string | null
          national_insurance_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          employee_number: string
          department_id?: string | null
          position_id?: string | null
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern'
          employment_status?: 'active' | 'on_leave' | 'suspended' | 'terminated'
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
          country?: string
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          tax_code?: string | null
          national_insurance_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_number?: string
          department_id?: string | null
          position_id?: string | null
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern'
          employment_status?: 'active' | 'on_leave' | 'suspended' | 'terminated'
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
          country?: string
          emergency_contact_name?: string | null
          emergency_contact_relationship?: string | null
          emergency_contact_phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          tax_code?: string | null
          national_insurance_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      employee_documents: {
        Row: {
          id: string
          employee_id: string
          document_type: 'contract' | 'id' | 'certificate' | 'training' | 'other'
          title: string
          description: string | null
          file_path: string | null
          file_name: string | null
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          expiry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          document_type?: 'contract' | 'id' | 'certificate' | 'training' | 'other'
          title: string
          description?: string | null
          file_path?: string | null
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          document_type?: 'contract' | 'id' | 'certificate' | 'training' | 'other'
          title?: string
          description?: string | null
          file_path?: string | null
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      performance_reviews: {
        Row: {
          id: string
          employee_id: string
          reviewer_id: string
          review_period_start: string
          review_period_end: string
          review_date: string | null
          overall_rating: number | null
          strengths: string | null
          areas_for_improvement: string | null
          goals_achieved: string | null
          goals_next_period: string | null
          comments: string | null
          status: 'draft' | 'submitted' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          reviewer_id: string
          review_period_start: string
          review_period_end: string
          review_date?: string | null
          overall_rating?: number | null
          strengths?: string | null
          areas_for_improvement?: string | null
          goals_achieved?: string | null
          goals_next_period?: string | null
          comments?: string | null
          status?: 'draft' | 'submitted' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          reviewer_id?: string
          review_period_start?: string
          review_period_end?: string
          review_date?: string | null
          overall_rating?: number | null
          strengths?: string | null
          areas_for_improvement?: string | null
          goals_achieved?: string | null
          goals_next_period?: string | null
          comments?: string | null
          status?: 'draft' | 'submitted' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      recruitment_jobs: {
        Row: {
          id: string
          title: string
          description: string | null
          department_id: string | null
          position_id: string | null
          employment_type: 'full_time' | 'part_time' | 'contract' | 'intern' | null
          location: string | null
          salary_range_min: number | null
          salary_range_max: number | null
          openings: number
          status: 'open' | 'on_hold' | 'closed' | 'filled'
          posted_date: string
          closing_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          department_id?: string | null
          position_id?: string | null
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern' | null
          location?: string | null
          salary_range_min?: number | null
          salary_range_max?: number | null
          openings?: number
          status?: 'open' | 'on_hold' | 'closed' | 'filled'
          posted_date?: string
          closing_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          department_id?: string | null
          position_id?: string | null
          employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern' | null
          location?: string | null
          salary_range_min?: number | null
          salary_range_max?: number | null
          openings?: number
          status?: 'open' | 'on_hold' | 'closed' | 'filled'
          posted_date?: string
          closing_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recruitment_candidates: {
        Row: {
          id: string
          job_id: string | null
          first_name: string
          last_name: string
          email: string
          phone: string | null
          resume_path: string | null
          cover_letter: string | null
          current_stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          rating: number | null
          notes: string | null
          applied_date: string
          last_contact_date: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          resume_path?: string | null
          cover_letter?: string | null
          current_stage?: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          rating?: number | null
          notes?: string | null
          applied_date?: string
          last_contact_date?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          resume_path?: string | null
          cover_letter?: string | null
          current_stage?: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
          rating?: number | null
          notes?: string | null
          applied_date?: string
          last_contact_date?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      onboarding_checklists: {
        Row: {
          id: string
          name: string
          description: string | null
          for_position_id: string | null
          is_default: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          for_position_id?: string | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          for_position_id?: string | null
          is_default?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      onboarding_checklist_items: {
        Row: {
          id: string
          checklist_id: string
          task_name: string
          task_description: string | null
          assigned_to_role: 'hr' | 'manager' | 'it' | 'employee' | null
          due_days_from_start: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          checklist_id: string
          task_name: string
          task_description?: string | null
          assigned_to_role?: 'hr' | 'manager' | 'it' | 'employee' | null
          due_days_from_start?: number
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          checklist_id?: string
          task_name?: string
          task_description?: string | null
          assigned_to_role?: 'hr' | 'manager' | 'it' | 'employee' | null
          due_days_from_start?: number
          order_index?: number
          created_at?: string
        }
      }
      onboarding_tasks: {
        Row: {
          id: string
          employee_id: string
          checklist_item_id: string | null
          task_name: string
          task_description: string | null
          assigned_to: string | null
          due_date: string | null
          completed_date: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'skipped'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          checklist_item_id?: string | null
          task_name: string
          task_description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          completed_date?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          checklist_item_id?: string | null
          task_name?: string
          task_description?: string | null
          assigned_to?: string | null
          due_date?: string | null
          completed_date?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'skipped'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      salary_components: {
        Row: {
          id: string
          name: string
          component_type: 'allowance' | 'deduction' | 'bonus'
          calculation_type: 'fixed' | 'percentage'
          default_amount: number
          is_taxable: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          component_type: 'allowance' | 'deduction' | 'bonus'
          calculation_type?: 'fixed' | 'percentage'
          default_amount?: number
          is_taxable?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          component_type?: 'allowance' | 'deduction' | 'bonus'
          calculation_type?: 'fixed' | 'percentage'
          default_amount?: number
          is_taxable?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      employee_salary_config: {
        Row: {
          id: string
          employee_id: string
          base_salary: number
          payment_frequency: 'monthly' | 'biweekly' | 'weekly'
          currency: string
          effective_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          base_salary: number
          payment_frequency?: 'monthly' | 'biweekly' | 'weekly'
          currency?: string
          effective_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          base_salary?: number
          payment_frequency?: 'monthly' | 'biweekly' | 'weekly'
          currency?: string
          effective_date?: string
          created_at?: string
          updated_at?: string
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
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          component_id: string
          amount?: number
          effective_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          component_id?: string
          amount?: number
          effective_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      payroll_records: {
        Row: {
          id: string
          employee_id: string
          payroll_month: number
          payroll_year: number
          base_salary: number
          total_allowances: number
          total_deductions: number
          tax_amount: number
          gross_salary: number
          net_salary: number
          payment_date: string | null
          payment_method: 'bank_transfer' | 'cash' | 'cheque'
          status: 'draft' | 'approved' | 'processed' | 'paid'
          notes: string | null
          processed_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          payroll_month: number
          payroll_year: number
          base_salary: number
          total_allowances?: number
          total_deductions?: number
          tax_amount?: number
          gross_salary: number
          net_salary: number
          payment_date?: string | null
          payment_method?: 'bank_transfer' | 'cash' | 'cheque'
          status?: 'draft' | 'approved' | 'processed' | 'paid'
          notes?: string | null
          processed_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          payroll_month?: number
          payroll_year?: number
          base_salary?: number
          total_allowances?: number
          total_deductions?: number
          tax_amount?: number
          gross_salary?: number
          net_salary?: number
          payment_date?: string | null
          payment_method?: 'bank_transfer' | 'cash' | 'cheque'
          status?: 'draft' | 'approved' | 'processed' | 'paid'
          notes?: string | null
          processed_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payroll_record_items: {
        Row: {
          id: string
          payroll_record_id: string
          component_id: string | null
          component_name: string
          component_type: 'allowance' | 'deduction' | 'bonus' | 'tax'
          amount: number
          is_taxable: boolean
          created_at: string
        }
        Insert: {
          id?: string
          payroll_record_id: string
          component_id?: string | null
          component_name: string
          component_type: 'allowance' | 'deduction' | 'bonus' | 'tax'
          amount: number
          is_taxable?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          payroll_record_id?: string
          component_id?: string | null
          component_name?: string
          component_type?: 'allowance' | 'deduction' | 'bonus' | 'tax'
          amount?: number
          is_taxable?: boolean
          created_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          employee_id: string
          attendance_date: string
          check_in_time: string | null
          check_out_time: string | null
          total_hours: number
          status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          attendance_date: string
          check_in_time?: string | null
          check_out_time?: string | null
          total_hours?: number
          status?: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          attendance_date?: string
          check_in_time?: string | null
          check_out_time?: string | null
          total_hours?: number
          status?: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leave_types: {
        Row: {
          id: string
          name: string
          description: string | null
          annual_days: number
          carry_over_allowed: boolean
          max_carry_over_days: number
          requires_approval: boolean
          is_paid: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          annual_days?: number
          carry_over_allowed?: boolean
          max_carry_over_days?: number
          requires_approval?: boolean
          is_paid?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          annual_days?: number
          carry_over_allowed?: boolean
          max_carry_over_days?: number
          requires_approval?: boolean
          is_paid?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      leave_balances: {
        Row: {
          id: string
          employee_id: string
          leave_type_id: string
          year: number
          total_days: number
          used_days: number
          pending_days: number
          remaining_days: number
          carried_over_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type_id: string
          year: number
          total_days?: number
          used_days?: number
          pending_days?: number
          remaining_days?: number
          carried_over_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type_id?: string
          year?: number
          total_days?: number
          used_days?: number
          pending_days?: number
          remaining_days?: number
          carried_over_days?: number
          created_at?: string
          updated_at?: string
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
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          applied_date: string
          reviewed_by: string | null
          reviewed_date: string | null
          review_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type_id: string
          start_date: string
          end_date: string
          total_days: number
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          applied_date?: string
          reviewed_by?: string | null
          reviewed_date?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type_id?: string
          start_date?: string
          end_date?: string
          total_days?: number
          reason?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          applied_date?: string
          reviewed_by?: string | null
          reviewed_date?: string | null
          review_notes?: string | null
          created_at?: string
          updated_at?: string
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
          is_billable: boolean
          status: 'draft' | 'submitted' | 'approved' | 'rejected'
          submitted_date: string | null
          approved_by: string | null
          approved_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          work_date: string
          project_name?: string | null
          task_description?: string | null
          hours: number
          is_billable?: boolean
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          submitted_date?: string | null
          approved_by?: string | null
          approved_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          work_date?: string
          project_name?: string | null
          task_description?: string | null
          hours?: number
          is_billable?: boolean
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          submitted_date?: string | null
          approved_by?: string | null
          approved_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      supplier_categories: {
        Row: {
          id: number
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      supplier_payment_terms: {
        Row: {
          id: number
          name: string
          days: number
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: number
          name: string
          days?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: number
          name?: string
          days?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      purchase_order_statuses: {
        Row: {
          id: number
          name: string
          color: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: number
          name: string
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: number
          name?: string
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      suppliers: {
        Row: {
          id: string
          supplier_number: string
          supplier_name: string
          category_id: number | null
          company_type: string | null
          tax_id: string | null
          registration_number: string | null
          email: string | null
          phone: string | null
          mobile: string | null
          website: string | null
          description: string | null
          primary_contact_name: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          primary_contact_position: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          country: string | null
          status: string | null
          payment_terms: string | null
          payment_terms_id: number | null
          credit_limit: number | null
          currency: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_swift_code: string | null
          lead_time_days: number | null
          minimum_order_quantity: number | null
          preferred_shipping_method: string | null
          delivery_zones: string[] | null
          notes: string | null
          rating: number | null
          on_time_delivery_rate: number | null
          response_time_hours: number | null
          quality_score: number | null
          pricing_score: number | null
          reliability_score: number | null
          is_active: boolean
          is_approved: boolean | null
          created_by: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          supplier_number: string
          supplier_name: string
          category_id?: number | null
          company_type?: string | null
          tax_id?: string | null
          registration_number?: string | null
          email?: string | null
          phone?: string | null
          mobile?: string | null
          website?: string | null
          description?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          primary_contact_position?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          status?: string | null
          payment_terms?: string | null
          payment_terms_id?: number | null
          credit_limit?: number | null
          currency?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_swift_code?: string | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          preferred_shipping_method?: string | null
          delivery_zones?: string[] | null
          notes?: string | null
          rating?: number | null
          on_time_delivery_rate?: number | null
          response_time_hours?: number | null
          quality_score?: number | null
          pricing_score?: number | null
          reliability_score?: number | null
          is_active?: boolean
          is_approved?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          supplier_number?: string
          supplier_name?: string
          category_id?: number | null
          company_type?: string | null
          tax_id?: string | null
          registration_number?: string | null
          email?: string | null
          phone?: string | null
          mobile?: string | null
          website?: string | null
          description?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          primary_contact_position?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          country?: string | null
          status?: string | null
          payment_terms?: string | null
          payment_terms_id?: number | null
          credit_limit?: number | null
          currency?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_swift_code?: string | null
          lead_time_days?: number | null
          minimum_order_quantity?: number | null
          preferred_shipping_method?: string | null
          delivery_zones?: string[] | null
          notes?: string | null
          rating?: number | null
          on_time_delivery_rate?: number | null
          response_time_hours?: number | null
          quality_score?: number | null
          pricing_score?: number | null
          reliability_score?: number | null
          is_active?: boolean
          is_approved?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      supplier_contacts: {
        Row: {
          id: string
          supplier_id: string
          name: string
          email: string | null
          phone: string | null
          position: string | null
          is_primary: boolean
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          name: string
          email?: string | null
          phone?: string | null
          position?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          position?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      supplier_products_services: {
        Row: {
          id: string
          supplier_id: string
          name: string
          sku: string | null
          description: string | null
          unit_price: number
          currency: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          name: string
          sku?: string | null
          description?: string | null
          unit_price?: number
          currency?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          name?: string
          sku?: string | null
          description?: string | null
          unit_price?: number
          currency?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
      }
      supplier_documents: {
        Row: {
          id: string
          supplier_id: string
          title: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          category: string | null
          description: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          supplier_id: string
          title: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          category?: string | null
          description?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          supplier_id?: string
          title?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          category?: string | null
          description?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
      }
      supplier_performance_metrics: {
        Row: {
          id: string
          supplier_id: string
          metric_period_start: string
          metric_period_end: string
          total_orders: number | null
          on_time_deliveries: number | null
          on_time_delivery_rate: number | null
          average_response_time_hours: number | null
          total_items_received: number | null
          defective_items: number | null
          quality_defect_rate: number | null
          pricing_consistency_score: number | null
          reliability_score: number | null
          overall_rating: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          metric_period_start: string
          metric_period_end: string
          total_orders?: number | null
          on_time_deliveries?: number | null
          on_time_delivery_rate?: number | null
          average_response_time_hours?: number | null
          total_items_received?: number | null
          defective_items?: number | null
          quality_defect_rate?: number | null
          pricing_consistency_score?: number | null
          reliability_score?: number | null
          overall_rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          metric_period_start?: string
          metric_period_end?: string
          total_orders?: number | null
          on_time_deliveries?: number | null
          on_time_delivery_rate?: number | null
          average_response_time_hours?: number | null
          total_items_received?: number | null
          defective_items?: number | null
          quality_defect_rate?: number | null
          pricing_consistency_score?: number | null
          reliability_score?: number | null
          overall_rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      supplier_communications: {
        Row: {
          id: string
          supplier_id: string
          communication_type: 'call' | 'email' | 'meeting' | 'note'
          subject: string | null
          content: string
          communication_date: string
          follow_up_date: string | null
          follow_up_completed: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          communication_type: 'call' | 'email' | 'meeting' | 'note'
          subject?: string | null
          content: string
          communication_date?: string
          follow_up_date?: string | null
          follow_up_completed?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          communication_type?: 'call' | 'email' | 'meeting' | 'note'
          subject?: string | null
          content?: string
          communication_date?: string
          follow_up_date?: string | null
          follow_up_completed?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
          id: string
          po_number: string
          supplier_id: string
          status: string | null
          status_id: number | null
          order_date: string | null
          expected_delivery_date: string | null
          actual_delivery_date: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          currency: string | null
          payment_status: string | null
          shipping_address: string | null
          shipping_method: string | null
          tracking_number: string | null
          approved_by: string | null
          approved_at: string | null
          received_by: string | null
          received_at: string | null
          notes: string | null
          internal_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          po_number: string
          supplier_id: string
          status?: string | null
          status_id?: number | null
          order_date?: string | null
          expected_delivery_date?: string | null
          actual_delivery_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          currency?: string | null
          payment_status?: string | null
          shipping_address?: string | null
          shipping_method?: string | null
          tracking_number?: string | null
          approved_by?: string | null
          approved_at?: string | null
          received_by?: string | null
          received_at?: string | null
          notes?: string | null
          internal_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          po_number?: string
          supplier_id?: string
          status?: string | null
          status_id?: number | null
          order_date?: string | null
          expected_delivery_date?: string | null
          actual_delivery_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          currency?: string | null
          payment_status?: string | null
          shipping_address?: string | null
          shipping_method?: string | null
          tracking_number?: string | null
          approved_by?: string | null
          approved_at?: string | null
          received_by?: string | null
          received_at?: string | null
          notes?: string | null
          internal_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          po_id: string
          line_number: number
          product_service_id: string | null
          description: string
          quantity: number
          unit_price: number
          line_total: number
          quantity_received: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          po_id: string
          line_number: number
          product_service_id?: string | null
          description: string
          quantity?: number
          unit_price?: number
          line_total?: number
          quantity_received?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          po_id?: string
          line_number?: number
          product_service_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          line_total?: number
          quantity_received?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
