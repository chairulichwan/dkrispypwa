import { redirect } from "next/navigation"

import { ROUTES } from "@/lib/routes"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import DebtsClient from "./DebtsClient"
import type {
  AccountDbRow,
  DebtAccountItem,
  DebtCardData,
  DebtContactItem,
  DebtInstallmentDbRow,
  DebtQueryRow,
} from "./types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type AccountRow = Pick<AccountDbRow, "id" | "name" | "balance">
type InstallmentReminderRow = Pick<
  DebtInstallmentDbRow,
  "debt_id" | "period_no" | "due_date" | "total_due" | "total_paid" | "status"
>

const normalizeDebtType = (value: string): DebtCardData["type"] =>
  value === "hutang" ? "hutang" : "piutang"

const normalizeDebtStatus = (value: string): DebtCardData["status"] =>
  value === "lunas" ? "lunas" : "aktif"

const normalizeInterestType = (
  value: string | null | undefined
): DebtCardData["interest_type"] => {
  if (value === "flat" || value === "efektif") return value
  return null
}

const normalizeInterestRateUnit = (
  value: string | null | undefined,
  interestType: string | null | undefined
): DebtCardData["interest_rate_unit"] => {
  if (value === "monthly" || value === "annual") return value
  return interestType === "flat" ? "monthly" : "annual"
}

const normalizeContact = (
  contact: DebtQueryRow["contacts"],
  fallbackContactId: string
): DebtContactItem => {
  const value = Array.isArray(contact) ? contact[0] : contact

  return {
    id: value?.id ?? fallbackContactId,
    name: value?.name ?? "Kontak tidak diketahui",
    phone: value?.phone ?? null,
  }
}

const normalizeDebt = (
  row: DebtQueryRow,
  nextInstallment?: InstallmentReminderRow | null
): DebtCardData => ({
  id: row.id,
  user_id: row.user_id,
  contact_id: row.contact_id,
  account_id: row.account_id,
  type: normalizeDebtType(row.type),
  amount: Number(row.amount) || 0,
  paid_amount: Number(row.paid_amount) || 0,
  paid_principal: Number(row.paid_principal) || 0,
  paid_interest: Number(row.paid_interest) || 0,
  total_interest: Number(row.total_interest) || 0,
  total_amount_due: Number(row.total_amount_due) || Number(row.amount) || 0,
  archived_at: row.archived_at ?? null,
  origination_transaction_id: row.origination_transaction_id ?? null,
  next_installment_period_no: nextInstallment?.period_no ?? null,
  next_installment_due_date: nextInstallment?.due_date ?? null,
  next_installment_status: nextInstallment?.status ?? null,
  next_installment_remaining_due:
    nextInstallment != null
      ? Math.max(0, (Number(nextInstallment.total_due) || 0) - (Number(nextInstallment.total_paid) || 0))
      : null,
  description: row.description,
  due_date: row.due_date,
  status: normalizeDebtStatus(row.status),
  interest_rate: row.interest_rate == null ? null : Number(row.interest_rate),
  interest_type: normalizeInterestType(row.interest_type),
  interest_rate_unit: normalizeInterestRateUnit(row.interest_rate_unit, row.interest_type),
  installment_count: row.installment_count == null ? null : Number(row.installment_count),
  installment_amount: row.installment_amount == null ? null : Number(row.installment_amount),
  start_date: row.start_date,
  disbursed_at: row.disbursed_at ?? null,
  settled_at: row.settled_at ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
  contacts: normalizeContact(row.contacts, row.contact_id),
})

const normalizeAccount = (row: AccountRow): DebtAccountItem => ({
  id: row.id,
  name: row.name,
  balance: row.balance == null ? 0 : Number(row.balance),
})

export default async function DebtsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const [{ data: rawDebts }, { data: rawAccounts }, { data: rawContacts }, { data: rawInstallments }] = await Promise.all([
    (supabase.from("debts") as any)
      .select(
        `
        id,
        user_id,
        contact_id,
        account_id,
        type,
        amount,
        paid_amount,
        paid_principal,
        paid_interest,
        total_interest,
        total_amount_due,
        archived_at,
        origination_transaction_id,
        description,
        due_date,
        status,
        interest_rate,
        interest_type,
        interest_rate_unit,
        installment_count,
        installment_amount,
        start_date,
        disbursed_at,
        settled_at,
        created_at,
        updated_at,
        contacts(id, name, phone)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, name, balance")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("contacts")
      .select("id, name, phone")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("debt_installments")
      .select("debt_id, period_no, due_date, total_due, total_paid, status")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
      .order("period_no", { ascending: true }),
  ])

  const nextInstallmentMap = new Map<string, InstallmentReminderRow>()

  for (const row of (rawInstallments ?? []) as InstallmentReminderRow[]) {
    if (!row.debt_id) continue

    const totalDue = Number(row.total_due) || 0
    const totalPaid = Number(row.total_paid) || 0
    const remainingDue = Math.max(0, totalDue - totalPaid)
    if (remainingDue <= 0) continue
    if (nextInstallmentMap.has(row.debt_id)) continue

    nextInstallmentMap.set(row.debt_id, row)
  }

  const debts = ((rawDebts ?? []) as DebtQueryRow[]).map((row) =>
    normalizeDebt(row, nextInstallmentMap.get(row.id) ?? null)
  )
  const accounts = ((rawAccounts ?? []) as AccountRow[]).map(normalizeAccount)
  const contacts = ((rawContacts ?? []) as DebtContactItem[]).map((contact) => ({
    id: contact.id,
    name: contact.name,
    phone: contact.phone ?? null,
  }))

  return <DebtsClient userId={user.id} debts={debts} accounts={accounts} contacts={contacts} />
}
