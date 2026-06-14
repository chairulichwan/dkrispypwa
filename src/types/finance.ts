// src/types/finance.ts
// Disesuaikan dengan schema AKTUAL dari database.types.ts project ini

export type AlertType    = 'critical' | 'warning' | 'info' | 'success'
export type CategoryType = 'income' | 'expense'
export type AssetType    = 'savings' | 'investment' | 'property' | 'vehicle' | 'other'
export type LiabilityType = 'mortgage' | 'credit_card' | 'loan' | 'installment' | 'other'
export type DebtType     = 'hutang' | 'piutang'

// ── Rows (sesuai kolom DB aktual) ──────────────────────────────

/** public.assets — kolom kunci: current_value (bukan value) */
export interface AssetRow {
  id:            string
  user_id:       string
  name:          string
  type:          AssetType
  current_value: number
  description:   string | null
  created_at:    string
  updated_at:    string
}

/** public.liabilities — kolom kunci: current_balance, monthly_payment */
export interface LiabilityRow {
  id:              string
  user_id:         string
  name:            string
  type:            LiabilityType
  current_balance: number
  interest_rate:   number | null
  monthly_payment: number | null
  description:     string | null
  created_at:      string
  updated_at:      string
}

/** public.net_worth_snapshots */
export interface NetWorthSnapshotRow {
  id:                string
  user_id:           string
  snapshot_date:     string
  total_assets:      number
  total_liabilities: number
  net_worth:         number
  created_at:        string
}

/** public.cash_flow_predictions */
export interface CashFlowPredictionRow {
  id:                string
  user_id:           string
  prediction_date:   string
  predicted_balance: number
  predicted_income:  number
  predicted_expense: number
  confidence_score:  number
  created_at:        string
}

/** public.transactions */
export interface TransactionRow {
  id:                      string
  user_id:                 string
  account_id:              string | null
  category_id:             string | null
  counterparty_account_id: string | null
  type:                    CategoryType
  category:                string | null
  amount:                  number
  note:                    string | null
  created_at:              string
}

/** public.categories */
export interface CategoryRow {
  id:         string
  user_id:    string | null
  name:       string
  type:       CategoryType
  icon:       string | null
  color:      string | null
  is_default: boolean
  created_at: string
}

/** public.budgets */
export interface BudgetRow {
  id:               string
  user_id:          string
  category_id:      string
  amount:           number
  month:            number
  year:             number
  rollover_enabled: boolean
  created_at:       string
  updated_at:       string
}

/** Budget dengan join categories */
export interface BudgetWithCategory extends BudgetRow {
  categories: {
    name: string
    icon: string | null
    color: string | null
    type: CategoryType
  }
}

/** public.alerts */
export interface AlertRow {
  id:           string
  user_id:      string
  type:         AlertType
  title:        string
  message:      string
  source:       string | null
  dismissed_at: string | null
  created_at:   string
}

/** public.debts */
export interface DebtRow {
  id:                string
  user_id:           string
  counterparty_name: string
  type:              DebtType
  amount:            number
  remaining:         number
  due_date:          string | null
  interest_rate:     number | null
  is_paid:           boolean
  notes:             string | null
  created_at:        string
  updated_at:        string
}

// ── Dari view monthly_cash_flow ────────────────────────────────
export interface MonthlyCashFlowRow {
  user_id:       string
  month_start:   string
  month_label:   string
  year:          number
  month_num:     number
  total_income:  number
  total_expense: number
  balance:       number
}

// ── Insert payloads ────────────────────────────────────────────
export type AssetInsert = Omit<AssetRow, 'id' | 'created_at' | 'updated_at'>
export type LiabilityInsert = Omit<LiabilityRow, 'id' | 'created_at' | 'updated_at'>
export type AlertInsert = Omit<AlertRow, 'id' | 'created_at'>
export type NetWorthSnapshotInsert = Omit<NetWorthSnapshotRow, 'id' | 'created_at'>
export type DebtInsert = Omit<DebtRow, 'id' | 'created_at' | 'updated_at'>

// ── UI derived ─────────────────────────────────────────────────
export interface NetWorthSummary {
  totalAssets:       number
  totalLiabilities:  number
  netWorth:          number
  debtToAssetRatio:  number
  monthlyGrowth:     number
}

export interface FinanceSummary {
  avgIncome:    number
  avgExpense:   number
  savingRate:   number
  savingAmount: number
}

// ── Chart data points ──────────────────────────────────────────
export interface NetWorthChartPoint {
  month:       string
  year:        number
  assets:      number
  liabilities: number
  netWorth:    number
}

export interface CashFlowChartPoint {
  month:    string
  year:     number
  income:   number | null
  expense:  number | null
  forecast: number | null
  balance:  number
  isActual: boolean
}

// ── Meta constants ─────────────────────────────────────────────
export const ASSET_META: Record<AssetType, { icon: string; color: string; label: string }> = {
  savings:    { icon: '🏦', color: '#22D3EE', label: 'Tabungan'  },
  investment: { icon: '📈', color: '#38BDF8', label: 'Investasi' },
  property:   { icon: '🏠', color: '#818CF8', label: 'Properti'  },
  vehicle:    { icon: '🚗', color: '#34D399', label: 'Kendaraan' },
  other:      { icon: '💎', color: '#F472B6', label: 'Lainnya'   },
}

export const LIABILITY_META: Record<LiabilityType, { icon: string; color: string; label: string }> = {
  mortgage:    { icon: '🏠', color: '#F87171', label: 'KPR'          },
  credit_card: { icon: '💳', color: '#FBBF24', label: 'Kartu Kredit' },
  loan:        { icon: '🏦', color: '#FB923C', label: 'Pinjaman'     },
  installment: { icon: '📦', color: '#A78BFA', label: 'Cicilan'      },
  other:       { icon: '📋', color: '#94A3B8', label: 'Lainnya'      },
}

export const DEBT_META: Record<DebtType, { icon: string; color: string; label: string }> = {
  hutang:  { icon: '📤', color: '#F87171', label: 'Hutang'  },
  piutang: { icon: '📥', color: '#34D399', label: 'Piutang' },
}

export const ALERT_META: Record<AlertType, { icon: string; color: string; bgColor: string }> = {
  critical: { icon: '🚨', color: '#F87171', bgColor: 'bg-red-500/10' },
  warning:  { icon: '⚠️', color: '#FBBF24', bgColor: 'bg-amber-500/10' },
  info:     { icon: 'ℹ️', color: '#38BDF8', bgColor: 'bg-blue-500/10' },
  success:  { icon: '✅', color: '#34D399', bgColor: 'bg-emerald-500/10' },
}