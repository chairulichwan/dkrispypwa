import type { Database } from "@/lib/supabase/database.types"

type DebtRow = Database["public"]["Tables"]["debts"]["Row"]
type AccountRow = Database["public"]["Tables"]["accounts"]["Row"]

export interface DebtContactItem {
  id: string
  name: string
  phone?: string | null
}

export interface DebtAccountItem extends Pick<AccountRow, "id" | "name"> {
  balance: number | null
}

export interface DebtCardData
  extends Omit<
    DebtRow,
    "type" | "status" | "interest_type" | "interest_rate_unit"
  > {
  type: "hutang" | "piutang"
  status: "aktif" | "lunas"
  interest_type?: "flat" | "efektif" | null
  interest_rate_unit?: "monthly" | "annual"
  contacts: DebtContactItem
}

export interface DebtQueryRow
  extends Omit<
    DebtRow,
    "type" | "status" | "interest_type" | "interest_rate_unit"
  > {
  type: string
  status: string
  interest_type?: string | null
  interest_rate_unit?: string | null
  contacts: DebtContactItem | DebtContactItem[] | null
}