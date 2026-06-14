// src/hooks/useRealtimeDebts.ts

"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export function useRealtimeDebts(userId: string, onUpdate: () => void) {
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`realtime-debts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "debts",
          filter: `user_id=eq.${userId}`,
        },
        () => onUpdate()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onUpdate])
}
