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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_number: string | null
          balance: number | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          balance?: number | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          balance?: number | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          message: string
          source: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          message: string
          source?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          message?: string
          source?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          current_value: number
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_rollovers: {
        Row: {
          budgeted_amount: number
          category_id: string
          created_at: string
          id: string
          month_year: string
          rollover_amount: number | null
          spent_amount: number | null
          user_id: string
        }
        Insert: {
          budgeted_amount?: number
          category_id: string
          created_at?: string
          id?: string
          month_year: string
          rollover_amount?: number | null
          spent_amount?: number | null
          user_id: string
        }
        Update: {
          budgeted_amount?: number
          category_id?: string
          created_at?: string
          id?: string
          month_year?: string
          rollover_amount?: number | null
          spent_amount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_rollovers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          month: number
          rollover_enabled: boolean | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          amount?: number
          category_id: string
          created_at?: string
          id?: string
          month: number
          rollover_enabled?: boolean | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: number
          rollover_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          predicted_balance: number
          predicted_expense: number
          predicted_income: number
          prediction_date: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          predicted_balance: number
          predicted_expense?: number
          predicted_income?: number
          prediction_date: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          predicted_balance?: number
          predicted_expense?: number
          predicted_income?: number
          prediction_date?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      debt_installments: {
        Row: {
          created_at: string
          debt_id: string
          due_date: string
          id: string
          interest_due: number
          interest_paid: number
          paid_at: string | null
          period_no: number
          principal_due: number
          principal_paid: number
          status: string
          total_due: number
          total_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          debt_id: string
          due_date: string
          id?: string
          interest_due?: number
          interest_paid?: number
          paid_at?: string | null
          period_no: number
          principal_due?: number
          principal_paid?: number
          status?: string
          total_due?: number
          total_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          debt_id?: string
          due_date?: string
          id?: string
          interest_due?: number
          interest_paid?: number
          paid_at?: string | null
          period_no?: number
          principal_due?: number
          principal_paid?: number
          status?: string
          total_due?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_installments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debt_ledger_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_installments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payment_allocations: {
        Row: {
          created_at: string
          debt_id: string
          id: string
          installment_id: string | null
          interest_amount: number
          payment_id: string
          principal_amount: number
          total_amount: number
        }
        Insert: {
          created_at?: string
          debt_id: string
          id?: string
          installment_id?: string | null
          interest_amount?: number
          payment_id: string
          principal_amount?: number
          total_amount?: number
        }
        Update: {
          created_at?: string
          debt_id?: string
          id?: string
          installment_id?: string | null
          interest_amount?: number
          payment_id?: string
          principal_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "debt_payment_allocations_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debt_ledger_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payment_allocations_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payment_allocations_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "debt_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "debt_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          account_id: string | null
          account_transaction_id: string | null
          amount: number
          debt_id: string
          id: string
          interest_amount: number
          note: string | null
          paid_at: string | null
          principal_amount: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_transaction_id?: string | null
          amount: number
          debt_id: string
          id?: string
          interest_amount?: number
          note?: string | null
          paid_at?: string | null
          principal_amount?: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_transaction_id?: string | null
          amount?: number
          debt_id?: string
          id?: string
          interest_amount?: number
          note?: string | null
          paid_at?: string | null
          principal_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_account_transaction_id_fkey"
            columns: ["account_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debt_ledger_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          account_id: string | null
          origination_transaction_id: string | null
          type: string
          amount: number
          paid_amount: number
          paid_principal: number
          paid_interest: number
          total_interest: number
          total_amount_due: number
          description: string | null
          due_date: string | null
          status: string
          interest_rate: number | null
          interest_type: string | null
          interest_rate_unit: string
          installment_count: number | null
          installment_amount: number | null
          start_date: string | null
          disbursed_at: string | null
          settled_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          contact_id: string
          account_id?: string | null
          origination_transaction_id?: string | null
          type: string
          amount: number
          paid_amount?: number
          paid_principal?: number
          paid_interest?: number
          total_interest?: number
          total_amount_due?: number
          description?: string | null
          due_date?: string | null
          status?: string
          interest_rate?: number | null
          interest_type?: string | null
          interest_rate_unit?: string
          installment_count?: number | null
          installment_amount?: number | null
          start_date?: string | null
          disbursed_at?: string | null
          settled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          contact_id?: string
          account_id?: string | null
          origination_transaction_id?: string | null
          type?: string
          amount?: number
          paid_amount?: number
          paid_principal?: number
          paid_interest?: number
          total_interest?: number
          total_amount_due?: number
          description?: string | null
          due_date?: string | null
          status?: string
          interest_rate?: number | null
          interest_type?: string | null
          interest_rate_unit?: string
          installment_count?: number | null
          installment_amount?: number | null
          start_date?: string | null
          disbursed_at?: string | null
          settled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          created_at: string
          current_balance: number
          description: string | null
          id: string
          interest_rate: number | null
          monthly_payment: number | null
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          description?: string | null
          id?: string
          interest_rate?: number | null
          monthly_payment?: number | null
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          description?: string | null
          id?: string
          interest_rate?: number | null
          monthly_payment?: number | null
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_financial_snapshots: {
        Row: {
          created_at: string
          id: string
          month: string
          net_worth: number | null
          total_assets: number
          total_liabilities: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          net_worth?: number | null
          total_assets?: number
          total_liabilities?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          net_worth?: number | null
          total_assets?: number
          total_liabilities?: number
          user_id?: string
        }
        Relationships: []
      }
      net_worth_snapshots: {
        Row: {
          created_at: string
          id: string
          net_worth: number | null
          snapshot_date: string
          total_assets: number | null
          total_liabilities: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          net_worth?: number | null
          snapshot_date: string
          total_assets?: number | null
          total_liabilities?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          net_worth?: number | null
          snapshot_date?: string
          total_assets?: number | null
          total_liabilities?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number | null
          category: string | null
          category_id: string | null
          counterparty_account_id: string | null
          created_at: string | null
          id: string
          note: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          category?: string | null
          category_id?: string | null
          counterparty_account_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          category?: string | null
          category_id?: string | null
          counterparty_account_id?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_counterparty_account_id_fkey"
            columns: ["counterparty_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password: string
          phone: string
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password: string
          phone: string
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password?: string
          phone?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_report: {
        Row: {
          date: string | null
          total_expense: number | null
          total_income: number | null
        }
        Relationships: []
      }
      debt_ledger_summary: {
        Row: {
          account_id: string | null
          contact_id: string | null
          disbursed_at: string | null
          due_date: string | null
          id: string | null
          installment_amount: number | null
          installment_count: number | null
          interest_rate: number | null
          interest_type: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          paid_interest: number | null
          paid_principal: number | null
          principal_amount: number | null
          settled_at: string | null
          start_date: string | null
          status: string | null
          total_amount_due: number | null
          total_interest: number | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          disbursed_at?: string | null
          due_date?: string | null
          id?: string | null
          installment_amount?: number | null
          installment_count?: number | null
          interest_rate?: number | null
          interest_type?: string | null
          outstanding_amount?: never
          paid_amount?: number | null
          paid_interest?: number | null
          paid_principal?: number | null
          principal_amount?: number | null
          settled_at?: string | null
          start_date?: string | null
          status?: string | null
          total_amount_due?: number | null
          total_interest?: number | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          disbursed_at?: string | null
          due_date?: string | null
          id?: string | null
          installment_amount?: number | null
          installment_count?: number | null
          interest_rate?: number | null
          interest_type?: string | null
          outstanding_amount?: never
          paid_amount?: number | null
          paid_interest?: number | null
          paid_principal?: number | null
          principal_amount?: number | null
          settled_at?: string | null
          start_date?: string | null
          status?: string | null
          total_amount_due?: number | null
          total_interest?: number | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_cash_flow: {
        Row: {
          balance: number | null
          month_label: string | null
          month_num: number | null
          month_start: string | null
          total_expense: number | null
          total_income: number | null
          user_id: string | null
          year: number | null
        }
        Relationships: []
      }
      public_usernames: {
        Row: {
          username: string | null
        }
        Insert: {
          username?: string | null
        }
        Update: {
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_net_worth: {
        Args: { p_user_id: string }
        Returns: {
          net_worth: number
          total_assets: number
          total_liabilities: number
        }[]
      }
      create_debt_record: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_contact_id: string
          p_created_at?: string
          p_description?: string
          p_due_date?: string
          p_installment_amount?: number
          p_installment_count?: number
          p_interest_rate?: number
          p_interest_type?: string
          p_start_date?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      get_cash_flow_stats: {
        Args: { p_end_date?: string; p_start_date: string; p_user_id: string }
        Returns: {
          avg_daily_expense: number
          avg_daily_income: number
          days_count: number
          total_expense: number
          total_income: number
          transaction_count: number
        }[]
      }
      get_category_comparison: {
        Args: {
          p_current_end: string
          p_current_start: string
          p_previous_end: string
          p_previous_start: string
          p_user_id: string
        }
        Returns: {
          category_id: string
          category_name: string
          change_amount: number
          change_percentage: number
          current_amount: number
          previous_amount: number
        }[]
      }
      perform_transfer: {
        Args: {
          p_amount: number
          p_created_at?: string
          p_from_account_id: string
          p_note?: string
          p_to_account_id: string
          p_user_id: string
        }
        Returns: Json
      }
      process_budget_rollover: {
        Args: { p_current_month: string; p_user_id: string }
        Returns: number
      }
      record_account_transaction: {
        Args: {
          p_account_id: string
          p_amount: number
          p_category?: string
          p_created_at?: string
          p_note?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      record_debt_payment: {
        Args: {
          p_account_id?: string
          p_amount: number
          p_create_account_tx?: boolean
          p_debt_id: string
          p_note?: string
          p_paid_at?: string
          p_user_id: string
        }
        Returns: Json
      }
      save_net_worth_snapshot: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          net_worth: number | null
          snapshot_date: string
          total_assets: number | null
          total_liabilities: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "net_worth_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_type:
        | "tunai"
        | "rekening"
        | "e-wallet"
        | "BCA"
        | "Mandiri"
        | "DKI"
        | "ovo"
        | "gopay"
        | "gofood"
        | "shopeefood"
        | "qris"
        | "toko"
        | "online-shop"
        | "freelance"
        | "jasa"
        | "kuliner"
        | "usaha-lainnya"
      transaction_type:
        | "income"
        | "expense"
        | "piutang"
        | "hutang"
        | "transfer_internal"
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
      account_type: [
        "tunai",
        "rekening",
        "e-wallet",
        "BCA",
        "Mandiri",
        "DKI",
        "ovo",
        "gopay",
        "gofood",
        "shopeefood",
        "qris",
        "toko",
        "online-shop",
        "freelance",
        "jasa",
        "kuliner",
        "usaha-lainnya",
      ],
      transaction_type: [
        "income",
        "expense",
        "piutang",
        "hutang",
        "transfer_internal",
      ],
    },
  },
} as const
