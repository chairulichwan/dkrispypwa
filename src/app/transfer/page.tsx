//src/app/transfer/page.tsx 

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/routes"
import TransferClient from "./TransferClient"

interface TransferPageAccountRow {
  id: string
  name: string
  type: string
  balance: number
  account_number?: string | null
  is_default?: boolean
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function TransferPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, name, type, balance, account_number, is_default")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    redirect(ROUTES.dashboard)
  }

  const formattedAccounts: TransferPageAccountRow[] = (accounts ?? []).map((account: any) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    balance: Number(account.balance) || 0,
    account_number: account.account_number ?? null,
    is_default: account.is_default ?? undefined,
  }))

  return (
    <TransferClient
      user={{ id: user.id, email: user.email ?? undefined }}
      accounts={formattedAccounts}
      preselectedFromId={from}
    />
  )
}
