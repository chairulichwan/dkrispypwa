// src/hooks/useAlerts.ts
// Menggunakan tabel alerts baru (dari migration 002)
// Menggantikan localStorage yang ada di lib/services/notification-service.ts
"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export type RealAlertType = "critical" | "warning" | "info"

export interface RealAlertItem {
  id: string
  user_id: string
  type: RealAlertType
  title: string
  message: string
  source?: string | null
  dismissed_at?: string | null
  created_at: string
}

interface UseAlertsResult {
  alerts: RealAlertItem[]
  loading: boolean
  dismiss: (id: string) => Promise<void>
  dismissAll: () => Promise<void>
  refetch: () => Promise<void>
}

export function useAlerts(userId: string): UseAlertsResult {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<RealAlertItem[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data, error } = await (supabase.from("alerts") as any)
      .select("id, user_id, type, title, message, source, dismissed_at, created_at")
      .eq("user_id", userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error) {
      setAlerts((data ?? []) as RealAlertItem[])
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const dismiss = useCallback(async (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
    const { error } = await (supabase.from("alerts") as any)
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)

    if (error) {
      await refetch()
      throw new Error(error.message)
    }
  }, [refetch, supabase, userId])

  const dismissAll = useCallback(async () => {
    const ids = alerts.map((alert) => alert.id)
    if (ids.length === 0) return

    setAlerts([])

    const { error } = await (supabase.from("alerts") as any)
      .update({ dismissed_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", userId)

    if (error) {
      await refetch()
      throw new Error(error.message)
    }
  }, [alerts, refetch, supabase, userId])

  return { alerts, loading, dismiss, dismissAll, refetch }
}
