import { NextResponse } from "next/server"

import { generateAnalyticsAlertsForUser } from "@/lib/alert-generator"
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

    const result = await generateAnalyticsAlertsForUser(user.id)

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error("[alerts/generate] error:", error)
    return NextResponse.json({ error: error?.message || "Failed to generate alerts" }, { status: 500 })
  }
}
