// src/lib/supabase/server-queries.ts
import 'server-only' // ✅ Mencegah import accidental ke client
import { createServerSupabaseClient } from './server'

/**
 * Query piutang — HANYA untuk Server Component
 */
export async function fetchPiutang(userId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
  .from('accounts')
  .select(`
    transactions!transactions_account_id_fkey (
      amount
    )
  `)
  .eq('user_id', userId)
  .eq('transactions.type', 'piutang')

  if (error) throw error

  return (data ?? []).flatMap(
    (acc: any) => acc.transactions ?? []
  )
}