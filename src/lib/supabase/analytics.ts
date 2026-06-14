// src/lib/supabase/analytics.ts

import { createClient } from "./client"
import { getMonthsAgo, toISODate } from "@/lib/utils/date"
import type {
  NetWorthSnapshot,
  Asset,
  Liability,
  CashFlowPrediction,
} from "@/types/analytics"

// ============================================
// NET WORTH FUNCTIONS
// ============================================

export async function getNetWorthHistory(
  userId: string,
  months: number = 12
): Promise<NetWorthSnapshot[]> {
  const supabase = createClient()
  const startDate = toISODate(getMonthsAgo(months))

  // Mengikuti schema aktual: monthly_financial_snapshots
  const { data, error } = await (supabase.from as any)("monthly_financial_snapshots")
    .select("id, user_id, month, total_assets, total_liabilities, net_worth")
    .eq("user_id", userId)
    .gte("month", startDate)
    .order("month", { ascending: true })

  if (error) throw error

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    snapshot_date: row.month,
    total_assets: Number(row.total_assets) || 0,
    total_liabilities: Number(row.total_liabilities) || 0,
    net_worth: Number(row.net_worth) || 0,
  })) as NetWorthSnapshot[]
}

export async function calculateCurrentNetWorth(userId: string) {
  const supabase = createClient()

  const { data, error } = await (supabase.rpc as any)("calculate_net_worth", {
    p_user_id: userId,
  })

  if (error) throw error

  const rows = (data ?? []) as Array<{
    total_assets?: number | null
    total_liabilities?: number | null
    net_worth?: number | null
  }>

  if (rows.length === 0) {
    return { totalAssets: 0, totalLiabilities: 0, netWorth: 0 }
  }

  const row = rows[0]

  return {
    totalAssets: Number(row.total_assets) || 0,
    totalLiabilities: Number(row.total_liabilities) || 0,
    netWorth: Number(row.net_worth) || 0,
  }
}

export async function getAssets(userId: string): Promise<Asset[]> {
  const supabase = createClient()

  const { data, error } = await (supabase.from("assets") as any)
    .select("*")
    .eq("user_id", userId)
    .order("current_value", { ascending: false })

  if (error) throw error
  return (data ?? []) as Asset[]
}

export async function getLiabilities(userId: string): Promise<Liability[]> {
  const supabase = createClient()

  const { data, error } = await (supabase.from("liabilities") as any)
    .select("*")
    .eq("user_id", userId)
    .order("current_balance", { ascending: false })

  if (error) throw error
  return (data ?? []) as Liability[]
}

// ============================================
// CASH FLOW FUNCTIONS
// ============================================

export async function getCashFlowPredictions(
  userId: string,
  days: number = 30
): Promise<CashFlowPrediction[]> {
  const supabase = createClient()
  const today = toISODate(new Date())

  const { data, error } = await (supabase.from("cash_flow_predictions") as any)
    .select("*")
    .eq("user_id", userId)
    .gte("prediction_date", today)
    .order("prediction_date", { ascending: true })
    .limit(days)

  if (error) throw error
  return (data ?? []) as CashFlowPrediction[]
}

export async function getCashFlowStats(userId: string, months: number = 6) {
  const supabase = createClient()
  const startDate = toISODate(getMonthsAgo(months))

  const { data, error } = await (supabase.rpc as any)("get_cash_flow_stats", {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: toISODate(new Date()),
  })

  if (error) throw error

  const rows = (data ?? []) as Array<{
    total_income?: number | null
    total_expense?: number | null
    transaction_count?: number | null
    days_count?: number | null
    avg_daily_income?: number | null
    avg_daily_expense?: number | null
  }>

  if (rows.length === 0) {
    return {
      total_income: 0,
      total_expense: 0,
      transaction_count: 0,
      days_count: 1,
      avg_daily_income: 0,
      avg_daily_expense: 0,
    }
  }

  const stats = rows[0]

  return {
    total_income: Number(stats.total_income) || 0,
    total_expense: Number(stats.total_expense) || 0,
    transaction_count: Number(stats.transaction_count) || 0,
    days_count: Number(stats.days_count) || 1,
    avg_daily_income: Number(stats.avg_daily_income) || 0,
    avg_daily_expense: Number(stats.avg_daily_expense) || 0,
  }
}

// ============================================
// BUDGET FUNCTIONS
// ============================================

export async function processBudgetRollover(userId: string, currentMonth: string) {
  const supabase = createClient()

  const { data, error } = await (supabase.rpc as any)("process_budget_rollover", {
    p_user_id: userId,
    p_current_month: currentMonth,
  })

  if (error) throw error
  return data
}

export async function getCategoryComparison(
  userId: string,
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
) {
  const supabase = createClient()

  const { data, error } = await (supabase.rpc as any)("get_category_comparison", {
    p_user_id: userId,
    p_current_start: currentStart,
    p_current_end: currentEnd,
    p_previous_start: previousStart,
    p_previous_end: previousEnd,
  })

  if (error) throw error
  return (data ?? []) as any[]
}

// ============================================
// SNAPSHOT FUNCTIONS
// ============================================

export async function saveNetWorthSnapshot(userId: string): Promise<NetWorthSnapshot> {
  const supabase = createClient()

  const { data, error } = await (supabase.rpc as any)("save_net_worth_snapshot", {
    p_user_id: userId,
  })

  if (error) throw error

  const row = data as
    | {
        id?: string
        user_id?: string
        snapshot_date?: string
        month?: string
        total_assets?: number | null
        total_liabilities?: number | null
        net_worth?: number | null
      }
    | null
    | undefined

  return {
    id: row?.id,
    user_id: row?.user_id ?? userId,
    snapshot_date: row?.snapshot_date ?? row?.month ?? toISODate(new Date()),
    total_assets: Number(row?.total_assets) || 0,
    total_liabilities: Number(row?.total_liabilities) || 0,
    net_worth: Number(row?.net_worth) || 0,
  } as NetWorthSnapshot
}