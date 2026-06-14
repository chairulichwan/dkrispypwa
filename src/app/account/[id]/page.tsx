// src/app/account/[id]/page.tsx
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import AccountDetailClient from "./AccountDetailClient"

interface AccountPageRow {
  id: string
  type: string
  name: string
  balance: number | null
  account_number?: string | null
  is_default?: boolean | null
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #060b14 100%)" }}
    >
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
    </div>
  )
}

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (accountError || !account) {
    redirect(ROUTES.dashboard)
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      `
        id,
        type,
        amount,
        category,
        note,
        created_at,
        counterparty:counterparty_account_id(id, name, type)
      `
    )
    .eq("account_id", id)
    .eq("user_id", user.id)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(50)

  const normalizedAccount: AccountPageRow = {
    id: (account as any).id,
    type: (account as any).type,
    name: (account as any).name,
    balance: Number((account as any).balance) || 0,
    account_number: (account as any).account_number ?? null,
    is_default: (account as any).is_default ?? null,
  }

  return (
    <AccountDetailClient
      accountId={id}
      initialTab={tab ?? "overview"}
      account={normalizedAccount}
      transactions={(transactions ?? []).map((tx: any) => ({
        ...tx,
        amount: Number(tx.amount) || 0,
      }))}
      fallback={<LoadingFallback />}
    />
  )
}


