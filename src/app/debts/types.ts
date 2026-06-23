import type { Database } from "@/lib/supabase/database.types"

export type DebtDbRow = Database["public"]["Tables"]["debts"]["Row"]
export type AccountDbRow = Database["public"]["Tables"]["accounts"]["Row"]
export type DebtPaymentDbRow = Database["public"]["Tables"]["debt_payments"]["Row"]
export type DebtInstallmentDbRow = Database["public"]["Tables"]["debt_installments"]["Row"]
export type DebtPaymentAllocationDbRow = Database["public"]["Tables"]["debt_payment_allocations"]["Row"]

export type DebtType = "hutang" | "piutang"
export type DebtStatus = "aktif" | "lunas"
export type DebtInterestType = "flat" | "efektif"
export type DebtInterestRateUnit = "monthly" | "annual"
export type DebtSheetTab = "bayar" | "jadwal" | "riwayat"

export interface DebtContactItem {
  id: string
  name: string
  phone?: string | null
}

export interface DebtAccountItem extends Pick<AccountDbRow, "id" | "name"> {
  balance: number | null
}

export interface DebtCardData
  extends Omit<DebtDbRow, "type" | "status" | "interest_type" | "interest_rate_unit"> {
  type: DebtType
  status: DebtStatus
  interest_type?: DebtInterestType | null
  interest_rate_unit?: DebtInterestRateUnit
  archived_at: string | null
  origination_transaction_id: string | null
  next_installment_period_no?: number | null
  next_installment_due_date?: string | null
  next_installment_status?: string | null
  next_installment_remaining_due?: number | null
  contacts: DebtContactItem
}

export interface DebtQueryRow
  extends Omit<DebtDbRow, "type" | "status" | "interest_type" | "interest_rate_unit"> {
  type: string
  status: string
  interest_type?: string | null
  interest_rate_unit?: string | null
  archived_at: string | null
  origination_transaction_id: string | null
  contacts: DebtContactItem | DebtContactItem[] | null
}

export interface DebtPaymentRow
  extends Pick<
    DebtPaymentDbRow,
    "id" | "debt_id" | "user_id" | "account_id" | "note" | "paid_at" | "account_transaction_id"
  > {
  amount: number
  principal_amount: number
  interest_amount: number
}

export interface DebtInstallmentRow
  extends Pick<
    DebtInstallmentDbRow,
    "id" | "debt_id" | "user_id" | "due_date" | "status" | "paid_at" | "created_at" | "updated_at"
  > {
  period_no: number
  principal_due: number
  interest_due: number
  total_due: number
  principal_paid: number
  interest_paid: number
  total_paid: number
}

export interface DebtPaymentAllocationRow
  extends Pick<DebtPaymentAllocationDbRow, "id" | "payment_id" | "debt_id" | "installment_id"> {
  principal_amount: number
  interest_amount: number
  total_amount: number
  created_at: string | null
  installment?: DebtInstallmentRow | null
  payment?: DebtPaymentRow | null
}

export interface DebtPaymentSuccessPayload {
  debtId: string
  paidAmount: number
  paidPrincipal: number
  paidInterest: number
  outstandingAmount?: number
}
