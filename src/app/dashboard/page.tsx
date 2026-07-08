import { redirect } from "next/navigation"
import type { Database } from "@/lib/supabase/database.types"
import { getDebtReminderMeta } from "@/lib/debt-reminders"
import { generateAnalyticsAlertsForUser } from "@/lib/alert-generator"
import DashboardClient from "./DashboardClient"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { calculateAccountTotals, normalizeAccounts } from "@/lib/account"

interface DashboardProfileRow {
  full_name?: string | null
  username?: string | null
}

type DebtDashboardRow = Pick<
  Database["public"]["Tables"]["debts"]["Row"],
  | "id"
  | "type"
  | "amount"
  | "paid_amount"
  | "status"
  | "due_date"
  | "archived_at"
  | "total_amount_due"
> & {
  contacts?: { name: string | null }[] | { name: string | null } | null
}

type InstallmentDashboardRow = Pick<
  Database["public"]["Tables"]["debt_installments"]["Row"],
  "debt_id" | "period_no" | "due_date" | "total_due" | "total_paid" | "status"
>

interface AlertDashboardRow {
  id: string
  type: string
  title: string
  message: string
  source: string | null
  created_at: string
  read_at: string | null
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  await generateAnalyticsAlertsForUser(user.id)

  const [{ data: profile }, { data: rawAccounts }, { data: rawDebts }, { data: rawInstallments }, { data: rawAlerts }, unreadAlertsRes] = await Promise.all([
    supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle(),
    supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    (supabase.from("debts") as any)
      .select("id, type, amount, paid_amount, status, due_date, archived_at, total_amount_due, contacts(name)")
      .eq("user_id", user.id),
    supabase
      .from("debt_installments")
      .select("debt_id, period_no, due_date, total_due, total_paid, status")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
      .order("period_no", { ascending: true }),
    supabase
      .from("alerts")
      .select("id, type, title, message, source, created_at, read_at")
      .eq("user_id", user.id)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("dismissed_at", null)
      .is("read_at", null),
  ])

  const accounts = normalizeAccounts(rawAccounts ?? [])
  const accountTotals = calculateAccountTotals(accounts as any)
  const liquidTotal = accountTotals.totalWealth

  const debts = (rawDebts ?? []) as DebtDashboardRow[]
  const activeVisibleDebts = debts.filter((debt) => debt.status === "aktif" && !debt.archived_at)
  const getDebtOutstanding = (debt: DebtDashboardRow) => {
    const totalAmountDue = Number(debt.total_amount_due) || Number(debt.amount) || 0
    const paidAmount = Number(debt.paid_amount) || 0
    return Math.max(0, totalAmountDue - paidAmount)
  }

  const piutang = activeVisibleDebts
    .filter((debt) => debt.type === "piutang")
    .reduce((sum, debt) => sum + getDebtOutstanding(debt), 0)

  const hutang = activeVisibleDebts
    .filter((debt) => debt.type === "hutang")
    .reduce((sum, debt) => sum + getDebtOutstanding(debt), 0)

  const totalWealth = liquidTotal + piutang - hutang
  const walletTotal = liquidTotal
  const installments = (rawInstallments ?? []) as InstallmentDashboardRow[]

  const nextInstallmentMap = new Map<string, InstallmentDashboardRow>()
  for (const row of installments) {
    if (!row.debt_id) continue
    const remaining = Math.max(0, (Number(row.total_due) || 0) - (Number(row.total_paid) || 0))
    if (remaining <= 0) continue
    if (nextInstallmentMap.has(row.debt_id)) continue
    nextInstallmentMap.set(row.debt_id, row)
  }

  const activeDebtReminderRows = debts
    .filter((debt) => debt.status === "aktif" && !debt.archived_at)
    .map((debt) => {
      const nextInstallment = nextInstallmentMap.get(debt.id) ?? null
      const totalAmountDue = Number(debt.total_amount_due) || Number(debt.amount) || 0
      const paidAmount = Number(debt.paid_amount) || 0
      const reminder = getDebtReminderMeta({
        dueDate: debt.due_date,
        archivedAt: debt.archived_at,
        status: debt.status,
        paidAmount,
        totalAmountDue,
        nextInstallmentDueDate: nextInstallment?.due_date ?? null,
        nextInstallmentPeriodNo: nextInstallment?.period_no ?? null,
        nextInstallmentRemainingDue:
          nextInstallment != null
            ? Math.max(0, (Number(nextInstallment.total_due) || 0) - (Number(nextInstallment.total_paid) || 0))
            : null,
      })

      const contactValue = Array.isArray(debt.contacts) ? debt.contacts[0] : debt.contacts

      return {
        id: debt.id,
        type: (debt.type === "hutang" ? "hutang" : "piutang") as "hutang" | "piutang",
        contactName: contactValue?.name ?? "Kontak",
        reminder,
        nextInstallmentPeriodNo: nextInstallment?.period_no ?? null,
        nextInstallmentDueDate: nextInstallment?.due_date ?? debt.due_date ?? null,
        nextInstallmentRemainingDue:
          nextInstallment != null
            ? Math.max(0, (Number(nextInstallment.total_due) || 0) - (Number(nextInstallment.total_paid) || 0))
            : Math.max(0, totalAmountDue - paidAmount),
      }
    })
    .sort((a, b) => {
      if (a.reminder.priority !== b.reminder.priority) return a.reminder.priority - b.reminder.priority
      if (a.reminder.daysDiff !== null && b.reminder.daysDiff !== null && a.reminder.daysDiff !== b.reminder.daysDiff) {
        return a.reminder.daysDiff - b.reminder.daysDiff
      }
      return 0
    })

  const debtReminderSummary = activeDebtReminderRows.reduce(
    (acc, row) => {
      if (row.reminder.level === "overdue") acc.overdue += 1
      if (row.reminder.level === "today") acc.today += 1
      if (row.reminder.level === "soon") acc.soon += 1
      return acc
    },
    { overdue: 0, today: 0, soon: 0 }
  )

  const urgentDebtReminders = activeDebtReminderRows.filter((row) => row.reminder.level !== "none").slice(0, 3)
  const activeAlerts = (rawAlerts ?? []) as AlertDashboardRow[]
  const unreadAlertCount = unreadAlertsRes.count ?? 0

  const normalizedProfile: DashboardProfileRow | null = profile
    ? {
        full_name: (profile as any).full_name ?? null,
        username: (profile as any).username ?? null,
      }
    : null

  const userName =
    normalizedProfile?.full_name?.trim() ||
    normalizedProfile?.username?.trim() ||
    user.email?.split("@")[0] ||
    "User"

  return (
    <DashboardClient
      userId={user.id}
      userName={userName}
      totalWealth={totalWealth}
      walletTotal={walletTotal}
      piutang={piutang}
      hutang={hutang}
      accounts={accounts as any}
      debtReminderSummary={debtReminderSummary}
      urgentDebtReminders={urgentDebtReminders}
      activeAlerts={activeAlerts}
      unreadAlertCount={unreadAlertCount}
    />
  )
}
