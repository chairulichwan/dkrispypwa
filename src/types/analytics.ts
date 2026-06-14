// src/types/analytics.ts

export interface NetWorthSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  created_at?: string;
}

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: 'savings' | 'investment' | 'property' | 'vehicle' | 'other';
  current_value: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type: 'mortgage' | 'credit_card' | 'loan' | 'installment' | 'other';
  current_balance: number;
  interest_rate?: number;
  monthly_payment?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CashFlowPrediction {
  id: string;
  user_id: string;
  prediction_date: string;
  predicted_balance: number;
  predicted_income: number;
  predicted_expense: number;
  confidence_score: number;
  created_at?: string;
}