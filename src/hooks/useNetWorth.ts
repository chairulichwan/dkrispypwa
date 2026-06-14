// src/hooks/useNetWorth.ts
// Disesuaikan dengan schema aktual:
//   - assets.current_value    (bukan .value)
//   - liabilities.current_balance (bukan .total_value)
//   - net_worth_snapshots     (bukan net_worth_history)
//   - ASSET_META / LIABILITY_META untuk icon & warna
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"

export interface AssetRow {
  id: string
  user_id: string
  name: string
  type: string
  current_value: number
  description: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface LiabilityRow {
  id: string
  user_id: string
  name: string
  type: string
  current_balance: number
  interest_rate: number | null
  monthly_payment: number | null
  description: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface NetWorthSnapshotRow {
  id?: string
  user_id: string
  snapshot_date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
}

export interface NetWorthSummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  debtToAssetRatio: number
  monthlyGrowth: number
}

export interface AssetInsert {
  name: string
  type: string
  current_value: number
  description?: string | null
}

export interface LiabilityInsert {
  name: string
  type: string
  current_balance: number
  interest_rate?: number | null
  monthly_payment?: number | null
  description?: string | null
}

export interface NetWorthSnapshotInsert {
  user_id: string
  snapshot_date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
}

interface UseNetWorthReturn {
  assets: AssetRow[]
  liabilities: LiabilityRow[]
  snapshots: NetWorthSnapshotRow[]
  summary: NetWorthSummary
  loading: boolean
  error: string | null
  addAsset: (row: Omit<AssetInsert, "user_id">) => Promise<void>
  updateAsset: (id: string, updates: Partial<AssetRow>) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  addLiability: (row: Omit<LiabilityInsert, "user_id">) => Promise<void>
  updateLiability: (id: string, updates: Partial<LiabilityRow>) => Promise<void>
  deleteLiability: (id: string) => Promise<void>
  saveSnapshot: () => Promise<void>
  refetch: () => Promise<void>
}

export interface HistoryChartPoint {
  month: string
  year: number
  assets: number
  liabilities: number
  value: number
}

export function useNetWorth(userId: string): UseNetWorthReturn {
  const supabase = createClient()

  const [assets, setAssets] = useState<AssetRow[]>([])
  const [liabilities, setLiabilities] = useState<LiabilityRow[]>([])
  const [snapshots, setSnapshots] = useState<NetWorthSnapshotRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    const [assetRes, liabilityRes, snapshotRes] = await Promise.all([
      (supabase.from("assets") as any)
        .select("*")
        .eq("user_id", userId)
        .order("current_value", { ascending: false }),
      (supabase.from("liabilities") as any)
        .select("*")
        .eq("user_id", userId)
        .order("current_balance", { ascending: false }),
      ((supabase.from as any)("monthly_financial_snapshots") as any)
        .select("id, user_id, month, total_assets, total_liabilities, net_worth")
        .eq("user_id", userId)
        .order("month", { ascending: true })
        .limit(24),
    ])

    if (assetRes.error) setError(assetRes.error.message)
    if (liabilityRes.error) setError(liabilityRes.error.message)
    if (snapshotRes.error) setError(snapshotRes.error.message)

    setAssets(
      ((assetRes.data ?? []) as any[]).map((row) => ({
        ...row,
        current_value: Number(row.current_value) || 0,
      }))
    )

    setLiabilities(
      ((liabilityRes.data ?? []) as any[]).map((row) => ({
        ...row,
        current_balance: Number(row.current_balance) || 0,
        interest_rate: row.interest_rate == null ? null : Number(row.interest_rate),
        monthly_payment: row.monthly_payment == null ? null : Number(row.monthly_payment),
      }))
    )

    setSnapshots(
      ((snapshotRes.data ?? []) as any[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        snapshot_date: row.month,
        total_assets: Number(row.total_assets) || 0,
        total_liabilities: Number(row.total_liabilities) || 0,
        net_worth: Number(row.net_worth) || 0,
      }))
    )

    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const summary = useMemo<NetWorthSummary>(() => {
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.current_value || 0), 0)
    const totalLiabilities = liabilities.reduce(
      (sum, liability) => sum + (liability.current_balance || 0),
      0
    )
    const netWorth = totalAssets - totalLiabilities
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

    const len = snapshots.length
    const monthlyGrowth =
      len >= 2
        ? ((snapshots[len - 1].net_worth - snapshots[len - 2].net_worth) /
            Math.abs(snapshots[len - 2].net_worth || 1)) *
          100
        : 0

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      debtToAssetRatio,
      monthlyGrowth,
    }
  }, [assets, liabilities, snapshots])

  const addAsset = useCallback(
    async (row: Omit<AssetInsert, "user_id">) => {
      const payload = {
        ...row,
        user_id: userId,
      }

      const { error } = await (supabase.from("assets") as any).insert(payload)
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll, supabase, userId]
  )

  const updateAsset = useCallback(
    async (id: string, updates: Partial<AssetRow>) => {
      const payload = {
        ...updates,
      }

      const { error } = await (supabase.from("assets") as any)
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId)

      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll, supabase, userId]
  )

  const deleteAsset = useCallback(
    async (id: string) => {
      const { error } = await (supabase.from("assets") as any)
        .delete()
        .eq("id", id)
        .eq("user_id", userId)

      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll, supabase, userId]
  )

  const addLiability = useCallback(
    async (row: Omit<LiabilityInsert, "user_id">) => {
      const payload = {
        ...row,
        user_id: userId,
      }

      const { error } = await (supabase.from("liabilities") as any).insert(payload)
      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll, supabase, userId]
  )

  const updateLiability = useCallback(
    async (id: string, updates: Partial<LiabilityRow>) => {
      const payload = {
        ...updates,
      }

      const { error } = await (supabase.from("liabilities") as any)
        .update(payload)
        .eq("id", id)
        .eq("user_id", userId)

      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll, supabase, userId]
  )

  const deleteLiability = useCallback(
    async (id: string) => {
      const { error } = await (supabase.from("liabilities") as any)
        .delete()
        .eq("id", id)
        .eq("user_id", userId)

      if (error) throw new Error(error.message)
      await fetchAll()
    },
    [fetchAll, supabase, userId]
  )

  const saveSnapshot = useCallback(async () => {
    const response = await fetch("/api/analytics/snapshot", { method: "POST" })

    if (!response.ok) {
      const result = await response.json().catch(() => null)
      throw new Error(result?.error || "Gagal menyimpan snapshot")
    }

    await fetchAll()
  }, [fetchAll])

  return {
    assets,
    liabilities,
    snapshots,
    summary,
    loading,
    error,
    addAsset,
    updateAsset,
    deleteAsset,
    addLiability,
    updateLiability,
    deleteLiability,
    saveSnapshot,
    refetch: fetchAll,
  }
}

export function snapshotsToChartData(
  snapshots: NetWorthSnapshotRow[]
): HistoryChartPoint[] {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]

  return snapshots.map((snapshot) => {
    const date = new Date(snapshot.snapshot_date)

    return {
      month: MONTHS[date.getMonth()],
      year: date.getFullYear(),
      assets: snapshot.total_assets,
      liabilities: snapshot.total_liabilities,
      value: snapshot.net_worth,
    }
  })
}