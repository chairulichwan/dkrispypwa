import { formatRupiah } from "@/lib/utils"

export type DebtReminderLevel = "none" | "overdue" | "today" | "soon" | "upcoming"

export interface DebtReminderMeta {
  level: DebtReminderLevel
  daysDiff: number | null
  shortLabel: string | null
  detailLabel: string | null
  badgeClassName: string
  cardClassName: string
  priority: number
}

interface DebtReminderInput {
  dueDate?: string | null
  archivedAt?: string | null
  status?: string | null
  paidAmount?: number | null
  totalAmountDue?: number | null
  nextInstallmentDueDate?: string | null
  nextInstallmentPeriodNo?: number | null
  nextInstallmentRemainingDue?: number | null
}

const startOfToday = () => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

const parseDateOnlyLocal = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0)
}

const formatDayLabel = (days: number) => {
  if (days === 1) return "1 hari"
  return `${days} hari`
}

export function getDebtReminderMeta({
  dueDate,
  archivedAt,
  status,
  paidAmount,
  totalAmountDue,
  nextInstallmentDueDate,
  nextInstallmentPeriodNo,
  nextInstallmentRemainingDue,
}: DebtReminderInput): DebtReminderMeta {
  const isArchived = !!archivedAt
  const isSettledByStatus = status === "lunas"
  const isSettledByAmount = totalAmountDue != null && paidAmount != null && paidAmount >= totalAmountDue

  const effectiveDueDate = nextInstallmentDueDate || dueDate
  const installmentPrefix = nextInstallmentPeriodNo ? `Cicilan #${nextInstallmentPeriodNo}` : null
  const remainingLabel =
    nextInstallmentRemainingDue != null && nextInstallmentRemainingDue > 0
      ? ` • sisa ${formatRupiah(nextInstallmentRemainingDue)}`
      : ""

  if (isArchived || isSettledByStatus || isSettledByAmount || !effectiveDueDate) {
    return {
      level: "none",
      daysDiff: null,
      shortLabel: null,
      detailLabel: null,
      badgeClassName: "",
      cardClassName: "",
      priority: 999,
    }
  }

  const today = startOfToday()
  const due = parseDateOnlyLocal(effectiveDueDate)
  due.setHours(0, 0, 0, 0)

  const daysDiff = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (daysDiff < 0) {
    const lateDays = Math.abs(daysDiff)
    return {
      level: "overdue",
      daysDiff,
      shortLabel: lateDays === 1 ? "Telat 1 hari" : `Telat ${lateDays} hari`,
      detailLabel: installmentPrefix
        ? `${installmentPrefix} lewat ${formatDayLabel(lateDays)}${remainingLabel}`
        : `Sudah lewat jatuh tempo ${formatDayLabel(lateDays)}`,
      badgeClassName: "border-rose-500/20 bg-rose-500/10 text-rose-400",
      cardClassName: "border-rose-500/20 bg-rose-500/10 text-rose-100",
      priority: 0,
    }
  }

  if (daysDiff === 0) {
    return {
      level: "today",
      daysDiff,
      shortLabel: "Hari ini",
      detailLabel: installmentPrefix
        ? `${installmentPrefix} jatuh tempo hari ini${remainingLabel}`
        : "Jatuh tempo hari ini",
      badgeClassName: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      cardClassName: "border-amber-500/20 bg-amber-500/10 text-amber-100",
      priority: 1,
    }
  }

  if (daysDiff <= 3) {
    return {
      level: "soon",
      daysDiff,
      shortLabel: daysDiff === 1 ? "Besok" : `${daysDiff} hari lagi`,
      detailLabel: installmentPrefix
        ? `${installmentPrefix} jatuh tempo ${formatDayLabel(daysDiff)} lagi${remainingLabel}`
        : `Jatuh tempo dalam ${formatDayLabel(daysDiff)}`,
      badgeClassName: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
      cardClassName: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
      priority: 2,
    }
  }

  return {
    level: "upcoming",
    daysDiff,
    shortLabel: `${daysDiff} hari lagi`,
    detailLabel: installmentPrefix
      ? `${installmentPrefix} jatuh tempo dalam ${formatDayLabel(daysDiff)}${remainingLabel}`
      : `Jatuh tempo dalam ${formatDayLabel(daysDiff)}`,
    badgeClassName: "border-slate-400/20 bg-slate-500/10 text-slate-300",
    cardClassName: "border-white/[0.08] bg-white/[0.03] text-slate-100",
    priority: 3,
  }
}
