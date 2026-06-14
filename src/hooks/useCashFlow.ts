// src/hooks/useCashFlow.ts
// Disesuaikan dengan schema aktual:
//   - Data historis dari VIEW monthly_cash_flow (aggregate transactions)
//   - Data prediksi dari tabel cash_flow_predictions
//   - Kategori dari tabel categories (sudah ada)
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  MonthlyCashFlowRow,
  CashFlowPredictionRow,
  CategoryRow,
  BudgetRow,
  FinanceSummary,
} from '@/types/finance'

// Gabungan data historis + prediksi untuk chart
export interface ChartDataPoint {
  month:    string
  year:     number
  income:   number | null
  expense:  number | null
  forecast: number | null
  balance:  number
  isActual: boolean
}

interface UseCashFlowReturn {
  chartData:   ChartDataPoint[]
  categories:  CategoryRow[]
  budgets:     BudgetRow[]
  summary:     FinanceSummary
  loading:     boolean
  error:       string | null
  refetch:     () => Promise<void>
}

export function useCashFlow(
  userId: string,
  year = new Date().getFullYear()
): UseCashFlowReturn {
  const supabase = createClient()

  const [history,     setHistory]     = useState<MonthlyCashFlowRow[]>([])
  const [predictions, setPredictions] = useState<CashFlowPredictionRow[]>([])
  const [categories,  setCategories]  = useState<CategoryRow[]>([])
  const [budgets,     setBudgets]     = useState<BudgetRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── Fetch ────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    const now = new Date()

    const [histRes, predRes, catRes, budRes] = await Promise.all([
      // Data historis dari view (aggregate transactions per bulan)
      supabase
        .from('monthly_cash_flow')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .order('month_num', { ascending: true }),

      // Prediksi AI (3 bulan ke depan)
      supabase
        .from('cash_flow_predictions')
        .select('*')
        .eq('user_id', userId)
        .gte('prediction_date', now.toISOString().slice(0, 10))
        .order('prediction_date', { ascending: true })
        .limit(6),

      // Kategori (user + default)
      supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${userId},is_default.eq.true`)
        .order('type').order('name'),

      // Budget bulan & tahun ini
      supabase
        .from('budgets')
        .select('*, categories(name, icon, color, type)')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', now.getMonth() + 1),
    ])

    if (histRes.error) setError(histRes.error.message)
    if (predRes.error) setError(predRes.error.message)

    // ✅ FIX: Cast data ke tipe yang benar
    setHistory((histRes.data ?? []) as unknown as MonthlyCashFlowRow[])
    setPredictions((predRes.data ?? []) as unknown as CashFlowPredictionRow[])
    setCategories((catRes.data ?? []) as unknown as CategoryRow[])
    setBudgets((budRes.data ?? []) as unknown as BudgetRow[])
    setLoading(false)
  }, [userId, year])

  // ── Realtime: re-fetch saat ada transaksi baru ────────────────
  useEffect(() => {
    if (!userId) return

    fetchAll()
    channelRef.current?.unsubscribe()

    channelRef.current = supabase
      .channel(`cashflow:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => fetchAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_flow_predictions', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setPredictions(prev => [...prev, payload.new as CashFlowPredictionRow])
          } else if (payload.eventType === 'DELETE') {
            setPredictions(prev => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [userId, fetchAll])

  // ── Gabungkan historis + prediksi untuk chart ────────────────
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const MONTH_LABELS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']

    // Data historis (bulan yang sudah lewat)
    const actual: ChartDataPoint[] = history.map(h => ({
      month:    h.month_label,
      year:     h.year,
      income:   h.total_income,
      expense:  h.total_expense,
      forecast: null,
      balance:  h.balance,
      isActual: true,
    }))

    // Data prediksi (bulan mendatang)
    const forecast: ChartDataPoint[] = predictions.map(p => {
      const d = new Date(p.prediction_date)
      return {
        month:    MONTH_LABELS[d.getMonth()],
        year:     d.getFullYear(),
        income:   null,
        expense:  null,
        forecast: p.predicted_income,
        balance:  p.predicted_balance,
        isActual: false,
      }
    })

    return [...actual, ...forecast]
  }, [history, predictions])

  // ── Summary dari data historis (rata-rata) ───────────────────
  const summary = useMemo<FinanceSummary>(() => {
    if (history.length === 0) return { avgIncome: 0, avgExpense: 0, savingRate: 0, savingAmount: 0 }
    const avgIncome  = history.reduce((s, h) => s + h.total_income,  0) / history.length
    const avgExpense = history.reduce((s, h) => s + h.total_expense, 0) / history.length
    const savingAmount = avgIncome - avgExpense
    const savingRate   = avgIncome > 0 ? (savingAmount / avgIncome) * 100 : 0
    return { avgIncome, avgExpense, savingRate, savingAmount }
  }, [history])

  return { chartData, categories, budgets, summary, loading, error, refetch: fetchAll }
}