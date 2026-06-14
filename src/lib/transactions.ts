import { createClient } from "@/lib/supabase/client"

export interface RecordQuickTransactionInput {
  userId: string
  accountId: string
  type: "income" | "expense"
  amount: number
  category?: string | null
  note?: string | null
  createdAt?: string
}

/**
 * RPC-ready transaction service.
 *
 * Current behavior:
 * - calls the planned RPC `record_account_transaction`
 * - assumes the SQL function is created in Supabase
 *
 * If the RPC is not deployed yet, this throws a clear message.
 */
export async function recordQuickTransaction({
  userId,
  accountId,
  type,
  amount,
  category,
  note,
  createdAt,
}: RecordQuickTransactionInput) {
  const supabase = createClient()

  if (!userId) throw new Error("User tidak valid")
  if (!accountId) throw new Error("Akun tidak valid")
  if (!["income", "expense"].includes(type)) throw new Error("Tipe transaksi tidak valid")
  if (amount <= 0) throw new Error("Nominal transaksi harus lebih dari 0")

  const { data, error } = await (supabase.rpc as any)("record_account_transaction", {
    p_user_id: userId,
    p_account_id: accountId,
    p_type: type,
    p_amount: amount,
    p_category: category ?? null,
    p_note: note?.trim() || null,
    p_created_at: createdAt ?? new Date().toISOString(),
  })

  if (error) {
    const msg = String(error.message || "")
    const missingRpc =
      msg.includes("Could not find the function") ||
      msg.includes("record_account_transaction") ||
      error.code === "PGRST202"

    if (missingRpc) {
      throw new Error(
        "RPC `record_account_transaction` belum tersedia di Supabase. Deploy SQL RPC yang sudah dibersihkan terlebih dahulu."
      )
    }

    throw error
  }

  return data
}
