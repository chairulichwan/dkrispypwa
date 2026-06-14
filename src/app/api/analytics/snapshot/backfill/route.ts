//src/app/api/analytics/snapshot/backfill/route.ts
import { NextResponse } from "next/server"

import { backfillMonthlyFinancialSnapshotsForUser } from "@/lib/snapshot-generator"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const months = Number(body?.months) || 12

    const result = await backfillMonthlyFinancialSnapshotsForUser(user.id, months)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[analytics/snapshot/backfill] error:", error)
    return NextResponse.json({ error: error?.message || "Failed to backfill snapshots" }, { status: 500 })
  }
}
