//src/app/api/analytics/snapshot/route.ts

import { NextResponse } from "next/server"

import { generateMonthlyFinancialSnapshotForUser } from "@/lib/snapshot-generator"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await generateMonthlyFinancialSnapshotForUser(user.id)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[analytics/snapshot] error:", error)
    return NextResponse.json({ error: error?.message || "Failed to generate snapshot" }, { status: 500 })
  }
}
