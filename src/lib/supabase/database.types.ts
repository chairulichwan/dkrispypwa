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
      accounts: {
        Row: {
          id: string
          user_id: string
          type: string
          name: string
          balance: number | null
          account_number: string | null
          is_default: boolean | null
          color: string | null
          icon: string | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          name: string
          balance?: number | null
          account_number?: string | null
          is_default?: boolean | null
          color?: string | null
          icon?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          name?: string
          balance?: number | null
          account_number?: string | null
          is_default?: boolean | null
          color?: string | null
          icon?: string | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          role: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          username: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string | null
          account_id: string | null
          category_id: string | null
          counterparty_account_id: string | null
          type: string | null
          category: string | null
          amount: number | null
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          account_id?: string | null
          category_id?: string | null
          counterparty_account_id?: string | null
          type?: string | null
          category?: string | null
          amount?: number | null
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          account_id?: string | null
          category_id?: string | null
          counterparty_account_id?: string | null
          type?: string | null
          category?: string | null
          amount?: number | null
          note?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      debts: {
        Row: {
          id: string
          user_id: string
          contact_id: string
          account_id: string | null
          type: string
          amount: number
          paid_amount: number
          paid_principal: number
          paid_interest: number
          total_interest: number
          total_amount_due: number
          archived_at: string | null
          description: string | null
          due_date: string | null
          status: string
          interest_rate: number | null
          interest_type: string | null
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
          type: string
          amount: number
          paid_amount?: number
          paid_principal?: number
          paid_interest?: number
          total_interest?: number
          total_amount_due?: number
          archived_at?: string | null
          description?: string | null
          due_date?: string | null
          status?: string
          interest_rate?: number | null
          interest_type?: string | null
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
          type?: string
          amount?: number
          paid_amount?: number
          paid_principal?: number
          paid_interest?: number
          total_interest?: number
          total_amount_due?: number
          archived_at?: string | null
          description?: string | null
          due_date?: string | null
          status?: string
          interest_rate?: number | null
          interest_type?: string | null
          installment_count?: number | null
          installment_amount?: number | null
          start_date?: string | null
          disbursed_at?: string | null
          settled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          id: string
          debt_id: string
          user_id: string
          account_id: string | null
          amount: number
          principal_amount: number
          interest_amount: number
          note: string | null
          paid_at: string | null
          account_transaction_id: string | null
        }
        Insert: {
          id?: string
          debt_id: string
          user_id: string
          account_id?: string | null
          amount: number
          principal_amount?: number
          interest_amount?: number
          note?: string | null
          paid_at?: string | null
          account_transaction_id?: string | null
        }
        Update: {
          id?: string
          debt_id?: string
          user_id?: string
          account_id?: string | null
          amount?: number
          principal_amount?: number
          interest_amount?: number
          note?: string | null
          paid_at?: string | null
          account_transaction_id?: string | null
        }
        Relationships: []
      }
      debt_installments: {
        Row: {
          id: string
          debt_id: string | null
          user_id: string | null
          period_no: number | null
          due_date: string | null
          principal_due: number
          interest_due: number
          total_due: number
          principal_paid: number
          interest_paid: number
          total_paid: number
          status: string
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          debt_id?: string | null
          user_id?: string | null
          period_no?: number | null
          due_date?: string | null
          principal_due?: number
          interest_due?: number
          total_due?: number
          principal_paid?: number
          interest_paid?: number
          total_paid?: number
          status?: string
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          debt_id?: string | null
          user_id?: string | null
          period_no?: number | null
          due_date?: string | null
          principal_due?: number
          interest_due?: number
          total_due?: number
          principal_paid?: number
          interest_paid?: number
          total_paid?: number
          status?: string
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      debt_payment_allocations: {
        Row: {
          id: string
          payment_id: string | null
          debt_id: string | null
          installment_id: string | null
          principal_amount: number
          interest_amount: number
          total_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          payment_id?: string | null
          debt_id?: string | null
          installment_id?: string | null
          principal_amount?: number
          interest_amount?: number
          total_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string | null
          debt_id?: string | null
          installment_id?: string | null
          principal_amount?: number
          interest_amount?: number
          total_amount?: number
          created_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          current_value: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          current_value?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          current_value?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      liabilities: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          current_balance: number
          interest_rate: number | null
          monthly_payment: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: string
          current_balance?: number
          interest_rate?: number | null
          monthly_payment?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          current_balance?: number
          interest_rate?: number | null
          monthly_payment?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          source: string | null
          dismissed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          source?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          source?: string | null
          dismissed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      cash_flow_predictions: {
        Row: {
          id: string
          user_id: string
          prediction_date: string
          predicted_balance: number
          predicted_income: number
          predicted_expense: number
          confidence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prediction_date: string
          predicted_balance: number
          predicted_income?: number
          predicted_expense?: number
          confidence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prediction_date?: string
          predicted_balance?: number
          predicted_income?: number
          predicted_expense?: number
          confidence_score?: number | null
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: string
          icon: string | null
          color: string | null
          is_default: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: string
          icon?: string | null
          color?: string | null
          is_default?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: string
          icon?: string | null
          color?: string | null
          is_default?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          month: number
          year: number
          rollover_enabled: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          amount?: number
          month: number
          year: number
          rollover_enabled?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          amount?: number
          month?: number
          year?: number
          rollover_enabled?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      monthly_cash_flow: {
        Row: {
          user_id: string | null
          month_start: string | null
          month_label: string | null
          year: number | null
          month_num: number | null
          total_income: number | null
          total_expense: number | null
          balance: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
