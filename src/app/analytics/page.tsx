//src/app/analytics/page.tsx


import { redirect } from "next/navigation"

import BottomNav from "@/components/BottomNav"
import PremiumAnalytics from "@/components/dashboard/PremiumAnalytics"
import { generateAnalyticsAlertsForUser } from "@/lib/alert-generator"
import { ROUTES } from "@/lib/routes"
import { generateMonthlyFinancialSnapshotForUser } from "@/lib/snapshot-generator"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface AnalyticsProfileRow {
  full_name?: string | null
  username?: string | null
}

export default async function AnalyticsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(ROUTES.login)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle()

  const normalizedProfile: AnalyticsProfileRow | null = profile
    ? {
        full_name: (profile as any).full_name ?? null,
        username: (profile as any).username ?? null,
      }
    : null

  const userName =
    normalizedProfile?.full_name?.trim() ||
    normalizedProfile?.username?.trim() ||
    user.email?.split("@")[0] ||
    "User"

  const results = await Promise.allSettled([
    generateMonthlyFinancialSnapshotForUser(user.id),
    generateAnalyticsAlertsForUser(user.id),
  ])

  const [snapshotResult, alertResult] = results
  function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`
  }

  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>
    return JSON.stringify(
      {
        message: e.message ?? null,
        code: e.code ?? null,
        details: e.details ?? null,
        hint: e.hint ?? null,
      },
      null,
      2
    )
  }

  return String(error)
}

  if (snapshotResult.status === "rejected") {
  console.error(
    `[analytics/page] snapshot generator failed:\n${toErrorMessage(snapshotResult.reason)}`
  )
}

if (alertResult.status === "rejected") {
  console.error(
    `[analytics/page] alert generator failed:\n${toErrorMessage(alertResult.reason)}`
  )
}

  return (
    <div
      className="min-h-screen relative pb-24"
      style={{
        background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)",
      }}
    >
      <PremiumAnalytics userId={user.id} userName={userName} />
      <BottomNav />
    </div>
  )
}


