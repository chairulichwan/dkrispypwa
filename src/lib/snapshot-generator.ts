import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"

type SnapshotResult = {
  month: string
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  created: boolean
  updated: boolean
}

export type BackfillSnapshotResult = {
  monthsRequested: number
  created: number
  skipped: number
  months: string[]
  note: string
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return 0
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getMonthList(months: number) {
  const now = new Date()
  return Array.from({ length: months }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1)
    return monthStart(d)
  })
}

export async function generateMonthlyFinancialSnapshotForUser(userId: string): Promise<SnapshotResult> {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const currentMonthStart = monthStart(now)
  const monthValue = isoDate(currentMonthStart)

  const [assetsRes, liabilitiesRes, debtsRes, existingRes] = await Promise.all([
    (supabase.from("assets") as any).select("current_value").eq("user_id", userId),
    (supabase.from("liabilities") as any).select("current_balance").eq("user_id", userId),
    (supabase.from("debts") as any)
      .select("type, amount, paid_amount, status")
      .eq("user_id", userId)
      .eq("status", "aktif"),
    (supabase.from("monthly_financial_snapshots") as any)
      .select("id")
      .eq("user_id", userId)
      .eq("month", monthValue)
      .maybeSingle(),
  ])

  const assets = (assetsRes.data ?? []) as Array<{ current_value?: number | string | null }>
  const liabilities = (liabilitiesRes.data ?? []) as Array<{ current_balance?: number | string | null }>
  const debts = (debtsRes.data ?? []) as Array<{ type?: string | null; amount?: number | string | null; paid_amount?: number | string | null }>

  const assetBase = assets.reduce((sum, row) => sum + toNumber(row.current_value), 0)
  const liabilityBase = liabilities.reduce((sum, row) => sum + toNumber(row.current_balance), 0)

  const debtAsset = debts
    .filter((row) => row.type === "piutang")
    .reduce((sum, row) => sum + Math.max(0, toNumber(row.amount) - toNumber(row.paid_amount)), 0)

  const debtLiability = debts
    .filter((row) => row.type === "hutang")
    .reduce((sum, row) => sum + Math.max(0, toNumber(row.amount) - toNumber(row.paid_amount)), 0)

  const totalAssets = assetBase + debtAsset
  const totalLiabilities = liabilityBase + debtLiability
  const netWorth = totalAssets - totalLiabilities

  if (existingRes.data?.id) {
    const { error } = await (supabase.from("monthly_financial_snapshots") as any)
      .update({
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
      })
      .eq("id", existingRes.data.id)
      .eq("user_id", userId)

    if (error) {
      throw new Error(`[snapshot-generator:update] ${error.code ?? "unknown"}: ${error.message}${error.details ? ` | ${error.details}` : ""}`)
    }

    return {
      month: monthValue,
      totalAssets,
      totalLiabilities,
      netWorth,
      created: false,
      updated: true,
    }
  }

  const { error } = await (supabase.from("monthly_financial_snapshots") as any).insert({
    user_id: userId,
    month: monthValue,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
  })

  if (error) {
    throw new Error(`[snapshot-generator:insert] ${error.code ?? "unknown"}: ${error.message}${error.details ? ` | ${error.details}` : ""}`)
  }

  return {
    month: monthValue,
    totalAssets,
    totalLiabilities,
    netWorth,
    created: true,
    updated: false,
  }
}

/**
 * Backfill missing monthly snapshots.
 *
 * Important limitation:
 * - assets/liabilities tables only store current values, not full historical ledgers.
 * - therefore backfilled months use current asset/liability bases plus debt exposure
 *   reconstructed as-of each month end from `debts` and `debt_payments`.
 * - existing snapshot rows are left untouched to avoid destructive overwrites.
 */
export async function backfillMonthlyFinancialSnapshotsForUser(userId: string, months = 12): Promise<BackfillSnapshotResult> {
  const supabase = await createServerSupabaseClient()

  const requestedMonths = Math.max(1, Math.min(months, 36))
  const monthsList = getMonthList(requestedMonths)

  const [assetsRes, liabilitiesRes, debtsRes, paymentsRes, existingRes] = await Promise.all([
    (supabase.from("assets") as any).select("current_value").eq("user_id", userId),
    (supabase.from("liabilities") as any).select("current_balance").eq("user_id", userId),
    (supabase.from("debts") as any)
      .select("id, type, amount, paid_amount, created_at, status")
      .eq("user_id", userId),
    (supabase.from("debt_payments") as any)
      .select("debt_id, amount, paid_at")
      .eq("user_id", userId),
    (supabase.from("monthly_financial_snapshots") as any)
      .select("month")
      .eq("user_id", userId),
  ])

  const assets = (assetsRes.data ?? []) as Array<{ current_value?: number | string | null }>
  const liabilities = (liabilitiesRes.data ?? []) as Array<{ current_balance?: number | string | null }>
  const debts = (debtsRes.data ?? []) as Array<{
    id: string
    type?: string | null
    amount?: number | string | null
    paid_amount?: number | string | null
    created_at?: string | null
    status?: string | null
  }>
  const payments = (paymentsRes.data ?? []) as Array<{
    debt_id: string
    amount?: number | string | null
    paid_at?: string | null
  }>
  const existingMonths = new Set((existingRes.data ?? []).map((row: any) => String(row.month)))

  const assetBase = assets.reduce((sum, row) => sum + toNumber(row.current_value), 0)
  const liabilityBase = liabilities.reduce((sum, row) => sum + toNumber(row.current_balance), 0)

  let created = 0
  let skipped = 0
  const createdMonths: string[] = []

  for (const monthDate of monthsList) {
    const monthValue = isoDate(monthDate)
    if (existingMonths.has(monthValue)) {
      skipped += 1
      continue
    }

    const endOfMonth = monthEnd(monthDate)

    let debtAsset = 0
    let debtLiability = 0

    for (const debt of debts) {
      const createdAt = debt.created_at ? new Date(debt.created_at) : null
      if (createdAt && createdAt > endOfMonth) continue

      const principal = toNumber(debt.amount)
      const paidUntilMonth = payments
        .filter((payment) => payment.debt_id === debt.id)
        .filter((payment) => (payment.paid_at ? new Date(payment.paid_at) <= endOfMonth : false))
        .reduce((sum, payment) => sum + toNumber(payment.amount), 0)

      const remaining = Math.max(0, principal - paidUntilMonth)
      if (remaining <= 0) continue

      if (debt.type === "piutang") {
        debtAsset += remaining
      } else if (debt.type === "hutang") {
        debtLiability += remaining
      }
    }

    const totalAssets = assetBase + debtAsset
    const totalLiabilities = liabilityBase + debtLiability

    const { error } = await (supabase.from("monthly_financial_snapshots") as any).insert({
      user_id: userId,
      month: monthValue,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
    })

    if (error) {
      throw new Error(`[snapshot-backfill:insert:${monthValue}] ${error.code ?? "unknown"}: ${error.message}${error.details ? ` | ${error.details}` : ""}`)
    }

    created += 1
    createdMonths.push(monthValue)
  }

  return {
    monthsRequested: requestedMonths,
    created,
    skipped,
    months: createdMonths,
    note: "Backfill uses current asset/liability bases plus debt exposure reconstructed from debts and debt_payments per month end.",
  }
}
