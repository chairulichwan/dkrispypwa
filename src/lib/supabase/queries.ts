// src/lib/supabase/queries.ts
import { createClient } from "@/lib/supabase/client"

export async function softDeleteAccount(accountId: string) {
  const supabase = createClient()

  const { error } = await (supabase.from("accounts") as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", accountId)

  if (error) throw error
}

export async function restoreAccount(accountId: string) {
  const supabase = createClient()

  const { error } = await (supabase.from("accounts") as any)
    .update({ deleted_at: null })
    .eq("id", accountId)

  if (error) throw error
}
