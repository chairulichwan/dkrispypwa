import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { calculateAccountTotals, normalizeAccounts } from "@/lib/account"

interface DashboardProfileRow {
  full_name?: string | null
  username?: string | null
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const [{ data: profile }, { data: rawAccounts }, { data: piutangRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle(),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    supabase.from("transactions").select("amount").eq("user_id", user.id).eq("type", "piutang"),
  ])

  const accounts = normalizeAccounts(rawAccounts ?? [])
  const { totalWealth, walletTotal } = calculateAccountTotals(accounts as any)

  const piutang = (piutangRows ?? []).reduce((sum, row: any) => sum + (Number(row.amount) || 0), 0)

  const normalizedProfile: DashboardProfileRow | null = profile
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

  return (
    <DashboardClient
      userId={user.id}
      userName={userName}
      totalWealth={totalWealth}
      walletTotal={walletTotal}
      piutang={piutang}
      accounts={accounts as any}
    />
  )
}
