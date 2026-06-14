import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase/server"

type AlertType = "critical" | "warning" | "info"

interface AlertCandidate {
  source: string
  type: AlertType
  title: string
  message: string
}

interface GenerateAlertsResult {
  candidates: number
  inserted: number
  updated: number
  dismissed: number
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  return 0
}

function formatRupiahCompact(value: number) {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`
  return `Rp${Math.round(value)}`
}

function dateLabel(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export async function generateAnalyticsAlertsForUser(userId: string): Promise<GenerateAlertsResult> {
  const supabase = await createServerSupabaseClient()

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthKey = `${year}-${String(month).padStart(2, "0")}`
  const monthStart = new Date(year, now.getMonth(), 1).toISOString()
  const nextMonthStart = new Date(year, now.getMonth() + 1, 1).toISOString()

  const [predictionsRes, budgetsRes, txRes, existingRes] = await Promise.all([
    (supabase.from("cash_flow_predictions") as any)
      .select("prediction_date, predicted_balance, predicted_income, predicted_expense")
      .eq("user_id", userId)
      .gte("prediction_date", today)
      .order("prediction_date", { ascending: true })
      .limit(30),
    (supabase.from("budgets") as any)
      .select("category_id, amount, categories:category_id(name, type)")
      .eq("user_id", userId)
      .eq("month", month)
      .eq("year", year),
    (supabase.from("transactions") as any)
      .select("category_id, category, amount, type, created_at")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("created_at", monthStart)
      .lt("created_at", nextMonthStart),
    (supabase.from("alerts") as any)
      .select("id, source, dismissed_at")
      .eq("user_id", userId)
      .like("source", "analytics:%"),
  ])

  const predictions = (predictionsRes.data ?? []) as any[]
  const budgets = (budgetsRes.data ?? []) as any[]
  const transactions = (txRes.data ?? []) as any[]
  const existingAlerts = (existingRes.data ?? []) as any[]

  const candidates: AlertCandidate[] = []

  const firstNegative = predictions.find((row) => toNumber(row.predicted_balance) < 0)
  if (firstNegative) {
    candidates.push({
      source: `analytics:negative-balance:${firstNegative.prediction_date}`,
      type: "critical",
      title: "Saldo Negatif Terdeteksi",
      message: `Prediksi saldo pada ${dateLabel(firstNegative.prediction_date)} turun ke ${formatRupiahCompact(toNumber(firstNegative.predicted_balance))}.`,
    })
  }

  const firstLow = predictions.find((row) => {
    const balance = toNumber(row.predicted_balance)
    return balance >= 0 && balance < 1_000_000
  })
  if (firstLow) {
    candidates.push({
      source: `analytics:low-balance:${firstLow.prediction_date}`,
      type: "warning",
      title: "Saldo Rendah",
      message: `Saldo diprediksi hanya ${formatRupiahCompact(toNumber(firstLow.predicted_balance))} pada ${dateLabel(firstLow.prediction_date)}.`,
    })
  }

  if (budgets.length > 0) {
    const spentMap = new Map<string, number>()

    for (const row of transactions) {
      const key = String(row.category_id ?? row.category ?? "lainnya")
      spentMap.set(key, (spentMap.get(key) ?? 0) + toNumber(row.amount))
    }

    let topOverrun:
      | { key: string; name: string; budget: number; spent: number; pct: number }
      | null = null

    for (const row of budgets) {
      const categoryName = String(row.categories?.name ?? row.category_id ?? "Kategori")
      const key = String(row.category_id ?? categoryName)
      const budget = toNumber(row.amount)
      const spent = spentMap.get(key) ?? 0
      if (budget <= 0 || spent <= budget) continue
      const pct = ((spent - budget) / budget) * 100
      if (!topOverrun || pct > topOverrun.pct) {
        topOverrun = { key, name: categoryName, budget, spent, pct }
      }
    }

    if (topOverrun) {
      candidates.push({
        source: `analytics:budget-overrun:${monthKey}:${topOverrun.key}`,
        type: "warning",
        title: "Budget Terlampaui",
        message: `${topOverrun.name} sudah melebihi budget ${Math.round(topOverrun.pct)}% bulan ini.`,
      })
    }
  }

  if (candidates.length === 0) {
    candidates.push({
      source: `analytics:stable:${monthKey}`,
      type: "info",
      title: "Kondisi Stabil",
      message: "Tidak ada risiko utama yang terdeteksi dari prediksi saldo dan budget bulan berjalan.",
    })
  }

  const candidateSources = new Set(candidates.map((candidate) => candidate.source))

  const staleIds = existingAlerts
    .filter((alert) => !alert.dismissed_at && !candidateSources.has(String(alert.source ?? "")))
    .map((alert) => alert.id)

  let dismissed = 0
  if (staleIds.length > 0) {
    const { error } = await (supabase.from("alerts") as any)
      .update({ dismissed_at: new Date().toISOString() })
      .in("id", staleIds)
      .eq("user_id", userId)

    if (error) {
      throw new Error(`[alert-generator:dismiss] ${error.code ?? "unknown"}: ${error.message}${error.details ? ` | ${error.details}` : ""}`)
    }

    dismissed = staleIds.length
  }

  let inserted = 0
  let updated = 0

  for (const candidate of candidates) {
    const existing = existingAlerts.find((alert) => alert.source === candidate.source)

    if (!existing) {
      const { error } = await (supabase.from("alerts") as any).insert({
        user_id: userId,
        type: candidate.type,
        title: candidate.title,
        message: candidate.message,
        source: candidate.source,
      })

      if (error) {
        throw new Error(`[alert-generator:insert] ${error.code ?? "unknown"}: ${error.message}${error.details ? ` | ${error.details}` : ""}`)
      }

      inserted += 1
      continue
    }

    if (!existing.dismissed_at) {
      const { error } = await (supabase.from("alerts") as any)
        .update({
          type: candidate.type,
          title: candidate.title,
          message: candidate.message,
        })
        .eq("id", existing.id)
        .eq("user_id", userId)

      if (error) {
        throw new Error(`[alert-generator:update] ${error.code ?? "unknown"}: ${error.message}${error.details ? ` | ${error.details}` : ""}`)
      }

      updated += 1
    }
  }

  return {
    candidates: candidates.length,
    inserted,
    updated,
    dismissed,
  }
}
