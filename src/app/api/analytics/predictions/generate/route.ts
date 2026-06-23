// src/app/api/analytics/predictions/generate/route.ts

import { NextResponse } from "next/server"

import type { Database } from "@/lib/supabase/database.types"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type CashFlowStatsRow = {
  transaction_count: number | null
  avg_daily_income: number | null
  avg_daily_expense: number | null
}

type AccountBalanceRow = Pick<Database["public"]["Tables"]["accounts"]["Row"], "balance">
type PredictionInsert = Database["public"]["Tables"]["cash_flow_predictions"]["Insert"]

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 6)

    const { data: stats, error: statsError } = await (supabase.rpc as any)("get_cash_flow_stats", {
      p_user_id: user.id,
      p_start_date: startDate.toISOString().split("T")[0],
    })

    if (statsError) throw statsError

    const statRows = (stats ?? []) as CashFlowStatsRow[]

    if (statRows.length === 0 || Number(statRows[0]?.transaction_count ?? 0) < 5) {
      return NextResponse.json(
        {
          error: "Data transaksi tidak cukup (minimal 5 transaksi dalam 6 bulan terakhir)",
        },
        { status: 400 }
      )
    }

    const stat = statRows[0]
    const avgIncome = Number(stat.avg_daily_income) || 0
    const avgExpense = Number(stat.avg_daily_expense) || 0

    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("balance")
      .eq("user_id", user.id)
      .is("deleted_at", null)

    if (accountsError) throw accountsError

    const accountRows = (accounts ?? []) as AccountBalanceRow[]
    let currentBalance = accountRows.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)

    const predictions: PredictionInsert[] = []

    for (let i = 0; i < 30; i += 1) {
      const date = new Date()
      date.setDate(date.getDate() + i)

      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const weekendMultiplier = isWeekend ? 1.2 : 1

      const predictedIncome = avgIncome
      const predictedExpense = avgExpense * weekendMultiplier

      currentBalance = currentBalance + predictedIncome - predictedExpense

      predictions.push({
        user_id: user.id,
        prediction_date: date.toISOString().split("T")[0],
        predicted_balance: currentBalance,
        predicted_income: predictedIncome,
        predicted_expense: predictedExpense,
        confidence_score: Math.max(0.5, 0.95 - i * 0.015),
      })
    }

    const { error: deleteError } = await supabase
      .from("cash_flow_predictions")
      .delete()
      .eq("user_id", user.id)

    if (deleteError) throw deleteError

    const { error: insertError } = await (supabase.from("cash_flow_predictions") as any).insert(
      predictions as PredictionInsert[]
    )

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      data: predictions,
      meta: {
        count: predictions.length,
        days: 30,
        historicalMonths: 6,
      },
    })
  } catch (error: any) {
    console.error("Error generating prediction:", error)

    return NextResponse.json(
      { error: error?.message || "Failed to generate prediction" },
      { status: 500 }
    )
  }
}
