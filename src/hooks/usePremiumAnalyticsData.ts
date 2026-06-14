//src/hooks/usePremiumAnalyticsData.ts

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface NetWorthHistoryPoint {
  month: string
  date: string
  assets: number
  liabilities: number
  netWorth: number
}

export interface BreakdownItem {
  name: string
  value: number
  color: string
  icon: string
}

export interface CashFlowDataPoint {
  month: string
  monthKey: string
  income: number | null
  expense: number | null
  forecast: number | null
  balance: number
}

export interface CashFlowCategory {
  name: string
  amount: number
  budget: number
  type: "income" | "expense"
  icon: string
  color: string
}

export interface CashFlowInsight {
  label: string
  value: string
  trend: string
  positive: boolean
}

export interface CashFlowAlert {
  type: "critical" | "warning" | "info"
  msg: string
}

interface AnalyticsState {
  loading: boolean
  error: string | null
  netWorthHistory: NetWorthHistoryPoint[]
  assetBreakdown: BreakdownItem[]
  liabilityBreakdown: BreakdownItem[]
  cashFlowData: CashFlowDataPoint[]
  categories: CashFlowCategory[]
  insights: CashFlowInsight[]
  alerts: CashFlowAlert[]
  refetch: () => Promise<void>
}

type Row = Record<string, unknown>

const COLORS = ["#22D3EE", "#3B82F6", "#818CF8", "#34D399", "#FBBF24", "#FB923C", "#F472B6", "#F87171"]

const ASSET_ICON: Record<string, string> = {
  cash: "💵",
  bank: "🏦",
  tabungan: "🏦",
  investasi: "📈",
  investment: "📈",
  saham: "📊",
  stock: "📊",
  crypto: "₿",
  properti: "🏠",
  property: "🏠",
  kendaraan: "🚗",
  vehicle: "🚗",
  emas: "🥇",
  gold: "🥇",
  piutang: "📥",
}

const LIABILITY_ICON: Record<string, string> = {
  kartu: "💳",
  credit: "💳",
  loan: "🏦",
  pinjaman: "🏦",
  mortgage: "🏠",
  kpr: "🏠",
  cicilan: "🧾",
  debt: "📉",
  hutang: "📤",
}

const CASHFLOW_ICON: Record<string, string> = {
  gaji: "💼",
  salary: "💼",
  bonus: "🎁",
  freelance: "💻",
  investment: "📈",
  investasi: "📈",
  makanan: "🍽️",
  food: "🍽️",
  transport: "🚗",
  belanja: "🛍️",
  shopping: "🛍️",
  tagihan: "⚡",
  bill: "⚡",
  hiburan: "🎬",
  entertainment: "🎬",
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function stringFrom(row: Row, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return fallback
}

function dateFrom(row: Row, keys: string[]): Date | null {
  for (const key of keys) {
    const value = row[key]
    if (!value) continue
    const date = new Date(String(value))
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number)
  const date = new Date(year, (month || 1) - 1, 1)
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date)
}

function labelFor(name: string) {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function pickIcon(name: string, map: Record<string, string>, fallback: string) {
  const lower = name.toLowerCase()
  const match = Object.entries(map).find(([key]) => lower.includes(key))
  return match?.[1] ?? fallback
}

function groupBreakdown(rows: Row[], kind: "asset" | "liability"): BreakdownItem[] {
  const grouped = new Map<string, number>()
  const iconMap = kind === "asset" ? ASSET_ICON : LIABILITY_ICON
  const fallbackIcon = kind === "asset" ? "💎" : "📉"
  const valueKeys = kind === "asset"
    ? ["current_value", "value", "balance", "amount", "market_value", "estimated_value"]
    : ["current_balance", "balance", "remaining_balance", "outstanding_balance", "amount", "value", "principal"]

  rows.forEach((row) => {
    const rawName = stringFrom(
      row,
      ["category", "type", "asset_type", "liability_type", "name"],
      kind === "asset" ? "Aset Lainnya" : "Kewajiban Lainnya"
    )

    const value = Math.abs(valueKeys.reduce((found, key) => found || toNumber(row[key]), 0))
    if (value <= 0) return

    const name = labelFor(rawName)
    grouped.set(name, (grouped.get(name) ?? 0) + value)
  })

  return [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
      icon: pickIcon(name, iconMap, fallbackIcon),
    }))
}

function normalizeTransactions(rows: Row[]) {
  return rows
    .map((row) => {
      const rawAmount = toNumber(row.amount ?? row.value ?? row.total ?? row.nominal)
      const explicitType = stringFrom(row, ["type", "transaction_type", "cashflow_type"], "").toLowerCase()

      const type: "income" | "expense" =
        explicitType.includes("expense") ||
        explicitType.includes("keluar") ||
        explicitType.includes("pengeluaran") ||
        explicitType.includes("transfer_out")
          ? "expense"
          : "income"

      const date = dateFrom(row, ["transaction_date", "date", "paid_at", "created_at", "updated_at"]) ?? new Date()
      const category = labelFor(
        stringFrom(
          row,
          ["category", "category_name", "merchant_category", "description"],
          type === "income" ? "Pemasukan Lainnya" : "Pengeluaran Lainnya"
        )
      )

      return {
        type,
        amount: Math.abs(rawAmount),
        date,
        monthKey: monthKey(date),
        category,
      }
    })
    .filter((item) => item.amount > 0)
}

function normalizeDebtRows(rows: Row[]) {
  return rows.map((row) => {
    const amount = toNumber(row.amount)
    const paidAmount = toNumber(row.paid_amount)
    const remaining = Math.max(0, amount - paidAmount)
    return {
      type: stringFrom(row, ["type"], ""),
      remaining,
      description: stringFrom(row, ["description"], ""),
    }
  })
}

function debtBreakdownsFromRows(debtRows: ReturnType<typeof normalizeDebtRows>) {
  const assetMap = new Map<string, number>()
  const liabilityMap = new Map<string, number>()

  debtRows.forEach((debt) => {
    if (debt.remaining <= 0) return

    if (debt.type === "piutang") {
      const key = debt.description ? labelFor(debt.description) : "Piutang Aktif"
      assetMap.set(key, (assetMap.get(key) ?? 0) + debt.remaining)
    }

    if (debt.type === "hutang") {
      const key = debt.description ? labelFor(debt.description) : "Hutang Aktif"
      liabilityMap.set(key, (liabilityMap.get(key) ?? 0) + debt.remaining)
    }
  })

  const debtAssetBreakdown: BreakdownItem[] = [...assetMap.entries()].map(([name, value], index) => ({
    name,
    value,
    color: COLORS[(index + 2) % COLORS.length],
    icon: pickIcon(name, ASSET_ICON, "📥"),
  }))

  const debtLiabilityBreakdown: BreakdownItem[] = [...liabilityMap.entries()].map(([name, value], index) => ({
    name,
    value,
    color: COLORS[(index + 4) % COLORS.length],
    icon: pickIcon(name, LIABILITY_ICON, "📤"),
  }))

  return { debtAssetBreakdown, debtLiabilityBreakdown }
}

function buildHistoryFromSnapshots(
  snapshotRows: Row[],
  assetTotal: number,
  liabilityTotal: number,
  transactions: ReturnType<typeof normalizeTransactions>
): NetWorthHistoryPoint[] {
  if (snapshotRows.length > 0) {
    return snapshotRows
      .map((row) => {
        const date = dateFrom(row, ["month", "snapshot_date", "created_at"]) ?? new Date()
        const assets = toNumber(row.total_assets)
        const liabilities = toNumber(row.total_liabilities)
        const netWorth = toNumber(row.net_worth) || assets - liabilities
        return {
          month: monthLabelFromKey(monthKey(date)),
          date: monthKey(date),
          assets,
          liabilities,
          netWorth,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12)
  }

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return monthKey(d)
  })

  const savingsByMonth = new Map<string, number>()
  transactions.forEach((item) => {
    if (!months.includes(item.monthKey)) return
    savingsByMonth.set(item.monthKey, (savingsByMonth.get(item.monthKey) ?? 0) + (item.type === "income" ? item.amount : -item.amount))
  })

  const currentAssets = assetTotal
  const currentLiabilities = liabilityTotal
  const currentNetWorth = currentAssets - currentLiabilities
  let accumulated = 0

  return [...months]
    .reverse()
    .map((key) => {
      const netWorth = currentNetWorth - accumulated
      const savings = savingsByMonth.get(key) ?? 0
      accumulated += savings
      return {
        month: monthLabelFromKey(key),
        date: key,
        assets: Math.max(0, netWorth + currentLiabilities),
        liabilities: currentLiabilities,
        netWorth,
      }
    })
    .reverse()
}

function buildCashFlowFromSources(monthlyRows: Row[], predictionRows: Row[]): CashFlowDataPoint[] {
  const actual = monthlyRows
    .map((row) => {
      const date = dateFrom(row, ["month_start"]) ?? new Date()
      const key = monthKey(date)
      return {
        month: stringFrom(row, ["month_label"], monthLabelFromKey(key)),
        monthKey: key,
        income: toNumber(row.total_income),
        expense: toNumber(row.total_expense),
        forecast: null,
        balance: toNumber(row.balance),
      }
    })
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-6)

  const groupedPredictions = new Map<string, { income: number; expense: number }>()

  predictionRows.forEach((row) => {
    const date = dateFrom(row, ["prediction_date"])
    if (!date) return
    const key = monthKey(date)
    const current = groupedPredictions.get(key) ?? { income: 0, expense: 0 }
    current.income += toNumber(row.predicted_income)
    current.expense += toNumber(row.predicted_expense)
    groupedPredictions.set(key, current)
  })

  const forecast = [...groupedPredictions.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([key, value]) => ({
      month: monthLabelFromKey(key),
      monthKey: key,
      income: null,
      expense: null,
      forecast: value.income,
      balance: value.income - value.expense,
    }))

  return [...actual, ...forecast]
}

function buildCategories(transactions: ReturnType<typeof normalizeTransactions>, budgetRows: Row[]) {
  const currentMonthKey = monthKey(new Date())
  const source = transactions.filter((item) => item.monthKey === currentMonthKey)
  const effectiveSource = source.length > 0 ? source : transactions

  const budgetMap = new Map<string, { amount: number; type: "income" | "expense"; icon: string; color: string }>()
  budgetRows.forEach((row) => {
    const joined = (row.categories as Row | null) ?? null
    const name = labelFor(stringFrom(joined ?? {}, ["name"], stringFrom(row, ["category_name"], "Kategori")))
    const typeRaw = stringFrom(joined ?? {}, ["type"], "expense").toLowerCase()
    const type = typeRaw === "income" ? "income" : "expense"
    budgetMap.set(name, {
      amount: toNumber(row.amount),
      type,
      icon: stringFrom(joined ?? {}, ["icon"], pickIcon(name, CASHFLOW_ICON, type === "income" ? "💰" : "🧾")),
      color: stringFrom(joined ?? {}, ["color"], COLORS[budgetMap.size % COLORS.length]),
    })
  })

  const grouped = new Map<string, { amount: number; type: "income" | "expense" }>()
  effectiveSource.forEach((item) => {
    const key = `${item.type}:${item.category}`
    const existing = grouped.get(key) ?? { amount: 0, type: item.type }
    existing.amount += item.amount
    grouped.set(key, existing)
  })

  return [...grouped.entries()]
    .map(([key, value], index) => {
      const [, rawName] = key.split(":")
      const budget = budgetMap.get(rawName)
      return {
        name: rawName,
        amount: value.amount,
        budget: budget?.amount ?? (value.type === "expense" ? value.amount * 1.1 : value.amount),
        type: value.type,
        icon: budget?.icon ?? pickIcon(rawName, CASHFLOW_ICON, value.type === "income" ? "💰" : "🧾"),
        color: budget?.color ?? COLORS[index % COLORS.length],
      }
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
}

function formatShort(value: number) {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`
  return `Rp${value.toFixed(0)}`
}

function buildInsights(cashFlowData: CashFlowDataPoint[], categories: CashFlowCategory[]): CashFlowInsight[] {
  const actual = cashFlowData.filter((item) => item.income !== null)
  const avgIncome = actual.reduce((sum, item) => sum + (item.income ?? 0), 0) / Math.max(actual.length, 1)
  const avgExpense = actual.reduce((sum, item) => sum + (item.expense ?? 0), 0) / Math.max(actual.length, 1)
  const savingRate = avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0
  const topExpense = categories.filter((item) => item.type === "expense").sort((a, b) => b.amount - a.amount)[0]
  const negativeForecast = cashFlowData.find((item) => item.forecast !== null && item.balance < 0)

  return [
    {
      label: "Rata-rata Tabungan",
      value: `${savingRate.toFixed(1)}%`,
      trend: savingRate >= 30 ? "+Sehat" : "Perlu naik",
      positive: savingRate >= 20,
    },
    {
      label: "Pengeluaran Terbesar",
      value: topExpense?.name ?? "-",
      trend: topExpense ? formatShort(topExpense.amount) : "-",
      positive: true,
    },
    {
      label: "Prediksi Risiko",
      value: negativeForecast ? negativeForecast.month : "Aman",
      trend: negativeForecast ? "Perlu perhatian" : "Stabil",
      positive: !negativeForecast,
    },
  ]
}

function buildAlerts(categories: CashFlowCategory[], cashFlowData: CashFlowDataPoint[]): CashFlowAlert[] {
  const alerts: CashFlowAlert[] = []
  const overBudget = categories.find((item) => item.type === "expense" && item.budget > 0 && item.amount > item.budget)
  const negativeForecast = cashFlowData.find((item) => item.forecast !== null && item.balance < 0)

  if (negativeForecast) {
    alerts.push({
      type: "critical",
      msg: `Prediksi saldo ${negativeForecast.month} berpotensi negatif. Evaluasi pengeluaran sebelum periode itu tiba.`,
    })
  }

  if (overBudget) {
    alerts.push({
      type: "warning",
      msg: `${overBudget.name} melebihi budget ${Math.round(((overBudget.amount - overBudget.budget) / overBudget.budget) * 100)}%.`,
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "info",
      msg: "Analytics stabil. Snapshot kekayaan dan prediksi arus kas terbaca dengan baik.",
    })
  }

  return alerts
}

async function safeUserTable(supabase: any, table: string, userId: string) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId).limit(5000)
  if (error) {
    console.warn(`[usePremiumAnalyticsData] Failed loading ${table}:`, error.message)
    return [] as Row[]
  }
  return (data ?? []) as Row[]
}

export function usePremiumAnalyticsData(userId: string): AnalyticsState {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assetRows, setAssetRows] = useState<Row[]>([])
  const [liabilityRows, setLiabilityRows] = useState<Row[]>([])
  const [debtRows, setDebtRows] = useState<Row[]>([])
  const [transactionRows, setTransactionRows] = useState<Row[]>([])
  const [snapshotRows, setSnapshotRows] = useState<Row[]>([])
  const [predictionRows, setPredictionRows] = useState<Row[]>([])
  const [monthlyRows, setMonthlyRows] = useState<Row[]>([])
  const [budgetRows, setBudgetRows] = useState<Row[]>([])

  const refetch = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()
      const today = now.toISOString().slice(0, 10)
      const monthStart = new Date(currentYear, now.getMonth(), 1).toISOString()
      const nextMonthStart = new Date(currentYear, now.getMonth() + 1, 1).toISOString()

      const [assets, liabilities, debts, transactions, snapshots, predictions, monthly, budgets] = await Promise.all([
        safeUserTable(supabase, "assets", userId),
        safeUserTable(supabase, "liabilities", userId),
        (async () => {
          const { data, error } = await (supabase.from("debts") as any)
            .select("id, type, amount, paid_amount, description, status")
            .eq("user_id", userId)
            .eq("status", "aktif")
          if (error) {
            console.warn("[usePremiumAnalyticsData] Failed loading debts:", error.message)
            return [] as Row[]
          }
          return (data ?? []) as Row[]
        })(),
        safeUserTable(supabase, "transactions", userId),
        safeUserTable(supabase, "monthly_financial_snapshots", userId),
        (async () => {
          const { data, error } = await supabase
            .from("cash_flow_predictions")
            .select("*")
            .eq("user_id", userId)
            .gte("prediction_date", today)
            .order("prediction_date", { ascending: true })
            .limit(90)
          if (error) {
            console.warn("[usePremiumAnalyticsData] Failed loading cash_flow_predictions:", error.message)
            return [] as Row[]
          }
          return (data ?? []) as Row[]
        })(),
        (async () => {
          const { data, error } = await (supabase.from("monthly_cash_flow") as any)
            .select("*")
            .eq("user_id", userId)
            .order("month_start", { ascending: true })
            .limit(12)
          if (error) {
            console.warn("[usePremiumAnalyticsData] Failed loading monthly_cash_flow:", error.message)
            return [] as Row[]
          }
          return (data ?? []) as Row[]
        })(),
        (async () => {
          const { data, error } = await (supabase.from("budgets") as any)
            .select("amount, month, year, categories:category_id(name, icon, color, type)")
            .eq("user_id", userId)
            .eq("month", currentMonth)
            .eq("year", currentYear)
          if (error) {
            console.warn("[usePremiumAnalyticsData] Failed loading budgets:", error.message)
            return [] as Row[]
          }
          return (data ?? []) as Row[]
        })(),
      ])

      setAssetRows(assets)
      setLiabilityRows(liabilities)
      setDebtRows(debts)
      setTransactionRows(transactions)
      setSnapshotRows(snapshots)
      setPredictionRows(predictions)
      setMonthlyRows(monthly)
      setBudgetRows(budgets)

      if (
        assets.length === 0 &&
        liabilities.length === 0 &&
        debts.length === 0 &&
        transactions.length === 0 &&
        snapshots.length === 0 &&
        predictions.length === 0 &&
        monthly.length === 0
      ) {
        setError("Belum ada data analytics. Tambahkan aset, kewajiban, hutang/piutang, atau transaksi terlebih dahulu.")
      }

      void monthStart
      void nextMonthStart
    } catch (err) {
      console.error("[usePremiumAnalyticsData] Unexpected error:", err)
      setError("Gagal memuat data analytics.")
    } finally {
      setLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return useMemo(() => {
    const baseAssetBreakdown = groupBreakdown(assetRows, "asset")
    const baseLiabilityBreakdown = groupBreakdown(liabilityRows, "liability")
    const normalizedDebts = normalizeDebtRows(debtRows)
    const { debtAssetBreakdown, debtLiabilityBreakdown } = debtBreakdownsFromRows(normalizedDebts)
    const assetBreakdown = [...baseAssetBreakdown, ...debtAssetBreakdown]
    const liabilityBreakdown = [...baseLiabilityBreakdown, ...debtLiabilityBreakdown]
    const transactions = normalizeTransactions(transactionRows)
    const assetTotal = assetBreakdown.reduce((sum, item) => sum + item.value, 0)
    const liabilityTotal = liabilityBreakdown.reduce((sum, item) => sum + item.value, 0)
    const netWorthHistory = buildHistoryFromSnapshots(snapshotRows, assetTotal, liabilityTotal, transactions)
    const cashFlowData = buildCashFlowFromSources(monthlyRows, predictionRows)
    const categories = buildCategories(transactions, budgetRows)

    return {
      loading,
      error,
      netWorthHistory,
      assetBreakdown,
      liabilityBreakdown,
      cashFlowData,
      categories,
      insights: buildInsights(cashFlowData, categories),
      alerts: buildAlerts(categories, cashFlowData),
      refetch,
    }
  }, [assetRows, liabilityRows, debtRows, transactionRows, snapshotRows, predictionRows, monthlyRows, budgetRows, loading, error, refetch])
}

