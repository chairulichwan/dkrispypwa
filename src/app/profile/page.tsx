
// src/app/profile/page.tsx
import { redirect } from "next/navigation"

import { ROUTES } from "@/lib/routes"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import ProfileClient from "./ProfileClient"

interface ProfileRow {
  id: string
  email?: string | null
  username?: string | null
  full_name?: string | null
  phone?: string | null
}

interface BalanceRow {
  balance?: number | null
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(ROUTES.login)
  }

  const [{ data: rawProfile }, { data: rawAccounts }, { count: txCount }] =
    await Promise.all([
      (supabase.from("profiles") as any)
        .select("id, email, username, full_name, phone")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("balance")
        .eq("user_id", user.id)
        .is("deleted_at", null),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ])

  const profile = (rawProfile ?? null) as ProfileRow | null
  const accounts = (rawAccounts ?? []) as BalanceRow[]

  const totalBalance = accounts.reduce(
    (sum, account) => sum + (Number(account.balance) || 0),
    0
  )

  const totalTransactions = txCount ?? 0

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? profile?.email ?? ""}
      profile={
        profile
          ? {
              id: profile.id,
              email: profile.email ?? user.email ?? "",
              username: profile.username ?? "",
              full_name: profile.full_name ?? null,
              phone: profile.phone ?? null,
            }
          : null
      }
      totalBalance={totalBalance}
      totalTransactions={totalTransactions}
    />
  )
}