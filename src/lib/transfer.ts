import { createClient } from "@/lib/supabase/client"

export interface PerformTransferInput {
  userId: string
  fromAccountId: string
  toAccountId: string
  amount: number
  note?: string
  fromAccountName?: string
  toAccountName?: string
}

export interface PerformTransferResult {
  success: boolean
  from_balance?: number
  to_balance?: number
  transfer_out_id?: string
  transfer_in_id?: string
}

/**
 * RPC-ready transfer client service.
 *
 * Expected SQL function in Supabase:
 *   public.perform_transfer(...)
 *
 * This keeps the UI thin and moves the multi-step mutation path into
 * a single DB transaction once the RPC is deployed.
 */
export async function performTransfer({
  userId,
  fromAccountId,
  toAccountId,
  amount,
  note,
}: PerformTransferInput): Promise<PerformTransferResult> {
  const supabase = createClient()

  if (!userId) throw new Error("User tidak valid")
  if (!fromAccountId || !toAccountId) throw new Error("ID akun tidak valid")
  if (fromAccountId === toAccountId) throw new Error("Akun sumber dan tujuan tidak boleh sama")
  if (!amount || amount <= 0) throw new Error("Nominal transfer harus lebih dari 0")

  const { data, error } = await (supabase.rpc as any)("perform_transfer", {
    p_user_id: userId,
    p_from_account_id: fromAccountId,
    p_to_account_id: toAccountId,
    p_amount: amount,
    p_note: note?.trim() || null,
    p_created_at: new Date().toISOString(),
  })

  if (error) {
    const message = String(error.message || "")
    const missingRpc =
      message.includes("Could not find the function") ||
      message.includes("perform_transfer") ||
      error.code === "PGRST202"

    if (missingRpc) {
      throw new Error(
        "RPC `perform_transfer` belum tersedia di Supabase. Deploy SQL yang sudah dibersihkan terlebih dahulu."
      )
    }

    throw error
  }

  return (data ?? { success: false }) as PerformTransferResult
}
