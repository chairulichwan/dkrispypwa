"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import Link from "next/link"
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  Clock3,
  Users,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import DashboardHeader, { HEADER_HEIGHT } from "@/components/DashboardHeader"
import BalanceCard from "@/components/BalanceCard"
import AccountCards from "@/components/AccountCards"
import BottomNav from "@/components/BottomNav"
import AccountDetailSheet from "@/components/accounts/AccountDetailSheet"
import QuickAddFAB from "@/components/QuickAddFAB"
import { getAlertDeepLink } from "@/lib/alerts"
import {
  broadcastUnreadAlertCount,
  readStoredUnreadAlertCount,
  subscribeUnreadAlertCount,
} from "@/lib/alert-sync"
import { calculateAccountTotals, normalizeAccounts } from "@/lib/account"
import { ROUTES } from "@/lib/routes"
import { Account } from "./types"
import { INTERACTIVE_SPRING, TAP_FEEDBACK, fadeUp } from "@/lib/motion"
import { formatRupiah, cn } from "@/lib/utils"

interface DebtReminderSummary {
  overdue: number
  today: number
  soon: number
}

interface DashboardDebtReminderItem {
  id: string
  type: "hutang" | "piutang"
  contactName: string
  nextInstallmentPeriodNo: number | null
  nextInstallmentDueDate: string | null
  nextInstallmentRemainingDue: number
  reminder: {
    level: "none" | "overdue" | "today" | "soon" | "upcoming"
    shortLabel: string | null
    detailLabel: string | null
  }
}

interface DashboardAlertItem {
  id: string
  type: string
  title: string
  message: string
  source: string | null
  created_at: string
  read_at?: string | null
}

interface Props {
  userId: string
  userName: string
  totalWealth: number
  walletTotal: number
  piutang: number
  hutang: number
  accounts: Account[]
  debtReminderSummary: DebtReminderSummary
  urgentDebtReminders: DashboardDebtReminderItem[]
  activeAlerts: DashboardAlertItem[]
  unreadAlertCount: number
}

const triggerHaptic = (style: "light" | "medium" | "success" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const patterns: Record<string, number | number[]> = {
      light: 8,
      medium: 15,
      success: [10, 50, 10],
    }

    navigator.vibrate(patterns[style])
  }
}


interface SmartInsightCenterProps {
  debtReminderSummary: DebtReminderSummary
  urgentDebtReminders: DashboardDebtReminderItem[]
  activeAlerts: DashboardAlertItem[]
  unreadAlertCount: number
  onNavigate: (href: string) => void
}

type FinancialPeriod = "7D" | "30D" | "3B"

interface TrendTransactionRow {
  type: string | null
  amount: number | string | null
  created_at: string | null
}

interface TrendDebtRow {
  id: string
  type: string | null
  amount: number | string | null
  total_amount_due?: number | string | null
  paid_amount?: number | string | null
  status?: string | null
  archived_at?: string | null
  disbursed_at?: string | null
  created_at?: string | null
}

interface TrendDebtPaymentRow {
  debt_id: string | null
  amount: number | string | null
  paid_at: string | null
}

function buildFallbackTrendPoints(
  period: FinancialPeriod,
  totalWealth: number,
  walletTotal: number,
  piutang: number,
  hutang: number
) {
  const anchor = Math.max(totalWealth, walletTotal, piutang, hutang, 1)

  if (period === "3B") {
    return [
      Math.max(anchor * 0.82, totalWealth * 0.86),
      Math.max(anchor * 0.88, totalWealth * 0.92),
      Math.max(anchor * 0.94, totalWealth),
    ]
  }

  const length = period === "30D" ? 30 : 7
  return Array.from({ length }, (_, index) => {
    const step = index / Math.max(length - 1, 1)
    return Math.max(anchor * (0.74 + step * 0.2), totalWealth * (0.8 + step * 0.2))
  })
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toMonthKey(date: Date) {
  return date.toISOString().slice(0, 7)
}

function getDebtOutstandingBasisDelta(type: string | null, totalDueAmount: number) {
  if (type === "piutang") return totalDueAmount
  if (type === "hutang") return -totalDueAmount
  return 0
}

function buildDailyWealthTrendPoints(
  currentWealth: number,
  rows: TrendTransactionRow[],
  debtRows: TrendDebtRow[],
  paymentRows: TrendDebtPaymentRow[],
  days: number
) {
  const today = new Date()
  const dayKeys = Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - index))
    return toDayKey(date)
  })

  const keySet = new Set(dayKeys)
  const deltaMap = new Map<string, number>()
  const debtTypeMap = new Map(debtRows.map((row) => [row.id, row.type]))

  rows.forEach((row) => {
    if (!row.created_at) return
    const key = row.created_at.slice(0, 10)
    if (!keySet.has(key)) return

    const amount = Number(row.amount) || 0
    let delta = 0

    if (row.type === "income") delta = amount
    else if (row.type === "expense") delta = -amount

    deltaMap.set(key, (deltaMap.get(key) ?? 0) + delta)
  })

  debtRows.forEach((row) => {
    const eventDate = row.disbursed_at ?? row.created_at ?? null
    if (!eventDate) return

    const key = eventDate.slice(0, 10)
    if (!keySet.has(key)) return

    const totalDueDelta = getDebtOutstandingBasisDelta(
      row.type,
      Number(row.total_amount_due) || Number(row.amount) || 0
    )
    deltaMap.set(key, (deltaMap.get(key) ?? 0) + totalDueDelta)
  })

  paymentRows.forEach((row) => {
    if (!row.paid_at || !row.debt_id) return
    const key = row.paid_at.slice(0, 10)
    if (!keySet.has(key)) return

    const debtType = debtTypeMap.get(row.debt_id) ?? null
    const paymentAmount = Number(row.amount) || 0
    const paymentDelta = debtType === "piutang" ? -paymentAmount : debtType === "hutang" ? paymentAmount : 0
    deltaMap.set(key, (deltaMap.get(key) ?? 0) + paymentDelta)
  })

  const points = new Array<number>(dayKeys.length)
  let cursor = currentWealth

  for (let index = dayKeys.length - 1; index >= 0; index -= 1) {
    const key = dayKeys[index]
    points[index] = cursor
    cursor -= deltaMap.get(key) ?? 0
  }

  return points
}

function buildMonthlyWealthTrendPoints(
  currentWealth: number,
  rows: TrendTransactionRow[],
  debtRows: TrendDebtRow[],
  paymentRows: TrendDebtPaymentRow[]
) {
  const now = new Date()
  const monthKeys = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (2 - index), 1)
    return toMonthKey(date)
  })

  const keySet = new Set(monthKeys)
  const deltaMap = new Map<string, number>()
  const debtTypeMap = new Map(debtRows.map((row) => [row.id, row.type]))

  rows.forEach((row) => {
    if (!row.created_at) return
    const key = row.created_at.slice(0, 7)
    if (!keySet.has(key)) return

    const amount = Number(row.amount) || 0
    let delta = 0

    if (row.type === "income") delta = amount
    else if (row.type === "expense") delta = -amount

    deltaMap.set(key, (deltaMap.get(key) ?? 0) + delta)
  })

  debtRows.forEach((row) => {
    const eventDate = row.disbursed_at ?? row.created_at ?? null
    if (!eventDate) return

    const key = eventDate.slice(0, 7)
    if (!keySet.has(key)) return

    const totalDueDelta = getDebtOutstandingBasisDelta(
      row.type,
      Number(row.total_amount_due) || Number(row.amount) || 0
    )
    deltaMap.set(key, (deltaMap.get(key) ?? 0) + totalDueDelta)
  })

  paymentRows.forEach((row) => {
    if (!row.paid_at || !row.debt_id) return
    const key = row.paid_at.slice(0, 7)
    if (!keySet.has(key)) return

    const debtType = debtTypeMap.get(row.debt_id) ?? null
    const paymentAmount = Number(row.amount) || 0
    const paymentDelta = debtType === "piutang" ? -paymentAmount : debtType === "hutang" ? paymentAmount : 0
    deltaMap.set(key, (deltaMap.get(key) ?? 0) + paymentDelta)
  })

  const points = new Array<number>(monthKeys.length)
  let cursor = currentWealth

  for (let index = monthKeys.length - 1; index >= 0; index -= 1) {
    const key = monthKeys[index]
    points[index] = cursor
    cursor -= deltaMap.get(key) ?? 0
  }

  return points
}

function SmartInsightCenter({
  debtReminderSummary,
  urgentDebtReminders,
  activeAlerts,
  unreadAlertCount,
  onNavigate,
}: SmartInsightCenterProps) {
  const totalCritical = debtReminderSummary.overdue + debtReminderSummary.today + unreadAlertCount

  type Severity = "error" | "warning" | "info"

  const criticalRows = useMemo(() => {
    const rows: Array<{
      id: string
      label: string
      sublabel: string
      severity: Severity
      href: string
    }> = []

    const topDebt = urgentDebtReminders.find(
      (debt) => debt.reminder.level === "overdue" || debt.reminder.level === "today"
    )

    if (topDebt) {
      rows.push({
        id: topDebt.id,
        label: topDebt.contactName,
        sublabel:
          topDebt.reminder.detailLabel ?? formatRupiah(topDebt.nextInstallmentRemainingDue),
        severity: topDebt.reminder.level === "overdue" ? "error" : "warning",
        href: `${ROUTES.debts}?debt=${topDebt.id}`,
      })
    }

    const topAlert = activeAlerts.find((alert) => !alert.read_at)
    if (topAlert && rows.length < 2) {
      rows.push({
        id: `alert-${topAlert.id}`,
        label: topAlert.title,
        sublabel:
          topAlert.message.length > 55 ? `${topAlert.message.slice(0, 55)}…` : topAlert.message,
        severity:
          topAlert.type === "critical"
            ? "error"
            : topAlert.type === "warning"
              ? "warning"
              : "info",
        href: getAlertDeepLink(topAlert.source) ?? ROUTES.notifications,
      })
    }

    return rows
  }, [urgentDebtReminders, activeAlerts])

  const severityRow: Record<Severity, string> = {
    error: "border-rose-500/15 hover:border-rose-500/30",
    warning: "border-amber-500/15 hover:border-amber-500/25",
    info: "border-cyan-500/15 hover:border-cyan-500/25",
  }

  const severityDot: Record<Severity, string> = {
    error: "bg-rose-400",
    warning: "bg-amber-400",
    info: "bg-cyan-400",
  }

  const debtStats = [
    {
      count: debtReminderSummary.overdue,
      label: "Telat",
      Icon: AlertTriangle,
      active: "text-rose-300 bg-rose-500/10 border-rose-500/20",
    },
    {
      count: debtReminderSummary.today,
      label: "Hari ini",
      Icon: Clock3,
      active: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    },
    {
      count: debtReminderSummary.soon,
      label: "Dekat",
      Icon: CalendarDays,
      active: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    },
  ] as const

  return (
    <motion.div
      whileTap={TAP_FEEDBACK}
      transition={INTERACTIVE_SPRING}
      className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0B1528]/88 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/24 to-transparent" />
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.05]">
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-cyan-300" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-[13px] font-semibold tracking-tight">Smart Insight</p>
            <p className="text-slate-400 text-[10px]">Prioritas &amp; alert terkini</p>
          </div>
        </div>

        {totalCritical > 0 ? (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 flex items-center justify-center text-[10px] font-bold text-white tabular-nums">
            {totalCritical}
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-emerald-400 text-[10px] font-medium">Aman</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap px-4 py-3">
        {debtStats.map(({ count, label, Icon, active }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(ROUTES.debts)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-bold tabular-nums transition-colors",
              count > 0 ? active : "text-slate-600 bg-white/[0.02] border-white/[0.06]"
            )}
          >
            <Icon size={9} />
            <span>{count}</span>
            <span>{label}</span>
          </button>
        ))}

        {unreadAlertCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(ROUTES.notifications)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-violet-500/10 border-violet-500/20 text-violet-300 text-[10px] font-bold tabular-nums transition-colors hover:border-violet-400/40"
          >
            <BellRing size={9} />
            <span>{unreadAlertCount} alert</span>
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-2">
        {criticalRows.length > 0 ? (
          criticalRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                triggerHaptic("light")
                onNavigate(row.href)
              }}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border bg-white/[0.02] transition-colors",
                severityRow[row.severity]
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", severityDot[row.severity])} />
                <div className="min-w-0 text-left">
                  <p className="text-white text-[12px] font-semibold tracking-tight truncate">{row.label}</p>
                  <p className="text-slate-400 text-[10px] truncate mt-0.5">{row.sublabel}</p>
                </div>
              </div>
              <ChevronRight size={12} className="text-slate-500 shrink-0" />
            </button>
          ))
        ) : (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/15">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <p className="text-emerald-300 text-[12px] font-medium">
              Tidak ada cicilan mendesak atau alert aktif
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function DashboardClient({
  userId,
  userName,
  totalWealth: initialTotalWealth,
  walletTotal: initialWalletTotal,
  piutang: initialPiutang,
  hutang: initialHutang,
  accounts: initialAccounts,
  debtReminderSummary,
  urgentDebtReminders,
  activeAlerts,
  unreadAlertCount,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [accounts, setAccounts] = useState(initialAccounts)
  const [totalWealth, setTotalWealth] = useState(initialTotalWealth)
  const [walletTotal, setWalletTotal] = useState(initialWalletTotal)
  const [piutang, setPiutang] = useState(initialPiutang)
  const [hutang, setHutang] = useState(initialHutang)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [liveUnreadAlertCount, setLiveUnreadAlertCount] = useState(unreadAlertCount)
  const [hasAlertCountBootstrapped, setHasAlertCountBootstrapped] = useState(false)
  const [selectedTrendPeriod, setSelectedTrendPeriod] = useState<FinancialPeriod>("7D")
  const [trendPoints, setTrendPoints] = useState<number[]>(() =>
    buildFallbackTrendPoints("7D", initialTotalWealth, initialWalletTotal, initialPiutang, initialHutang)
  )
  const [isChartLoading, setIsChartLoading] = useState(false)
  const hydratedUnreadCountFromStorageRef = useRef(false)

  useEffect(() => {
    const storedUnreadCount = readStoredUnreadAlertCount()

    if (storedUnreadCount !== null && storedUnreadCount !== unreadAlertCount) {
      hydratedUnreadCountFromStorageRef.current = true
      setLiveUnreadAlertCount(storedUnreadCount)
      setHasAlertCountBootstrapped(true)
      return
    }

    setLiveUnreadAlertCount(unreadAlertCount)
    setHasAlertCountBootstrapped(true)
  }, [unreadAlertCount])

  useEffect(() => {
    if (!hasAlertCountBootstrapped) return

    if (hydratedUnreadCountFromStorageRef.current) {
      hydratedUnreadCountFromStorageRef.current = false
      return
    }

    setLiveUnreadAlertCount(unreadAlertCount)
  }, [hasAlertCountBootstrapped, unreadAlertCount])

  useEffect(() => {
    return subscribeUnreadAlertCount((nextUnreadCount) => {
      setLiveUnreadAlertCount(nextUnreadCount)
    })
  }, [])

  useEffect(() => {
    if (!hasAlertCountBootstrapped) return
    broadcastUnreadAlertCount(liveUnreadAlertCount)
  }, [hasAlertCountBootstrapped, liveUnreadAlertCount])

  useEffect(() => {
    document.documentElement.classList.add("dashboard-scrollbar-hide")
    document.body.classList.add("dashboard-scrollbar-hide")

    return () => {
      document.documentElement.classList.remove("dashboard-scrollbar-hide")
      document.body.classList.remove("dashboard-scrollbar-hide")
    }
  }, [])

  const fetchTrendPoints = useCallback(
    async (period: FinancialPeriod, basisWealth = totalWealth) => {
      setIsChartLoading(true)

      try {
        const days = period === "30D" ? 30 : 7
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - (period === "3B" ? 92 : days - 1))

        const [transactionRes, debtRes, paymentRes] = await Promise.all([
          supabase
            .from("transactions")
            .select("type, amount, created_at")
            .eq("user_id", userId)
            .gte("created_at", cutoffDate.toISOString())
            .order("created_at", { ascending: true }),
          (supabase.from("debts") as any)
            .select("id, type, amount, total_amount_due, paid_amount, status, archived_at, disbursed_at, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: true }),
          (supabase.from("debt_payments") as any)
            .select("debt_id, amount, paid_at")
            .eq("user_id", userId)
            .gte("paid_at", cutoffDate.toISOString())
            .order("paid_at", { ascending: true }),
        ])

        if (transactionRes.error) throw transactionRes.error
        if (debtRes.error) throw debtRes.error
        if (paymentRes.error) throw paymentRes.error

        const normalizedTransactions = (transactionRes.data ?? []) as TrendTransactionRow[]
        const normalizedDebts = (debtRes.data ?? []) as TrendDebtRow[]
        const normalizedPayments = (paymentRes.data ?? []) as TrendDebtPaymentRow[]

        const nextPoints =
          period === "3B"
            ? buildMonthlyWealthTrendPoints(basisWealth, normalizedTransactions, normalizedDebts, normalizedPayments)
            : buildDailyWealthTrendPoints(basisWealth, normalizedTransactions, normalizedDebts, normalizedPayments, days)

        setTrendPoints(nextPoints)
      } catch {
        setTrendPoints(buildFallbackTrendPoints(period, basisWealth, walletTotal, piutang, hutang))
      } finally {
        setIsChartLoading(false)
      }
    },
    [hutang, piutang, supabase, totalWealth, userId, walletTotal]
  )

  useEffect(() => {
    void fetchTrendPoints(selectedTrendPeriod)
  }, [fetchTrendPoints, selectedTrendPeriod])

  const handleSync = useCallback(async () => {
    if (isSyncing) return

    triggerHaptic("medium")
    setIsSyncing(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(ROUTES.login)
        return
      }

      const { data: rawAccounts, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true })

      if (accountError) throw accountError

      const nextAccounts = normalizeAccounts(rawAccounts ?? []) as Account[]
      const accountTotals = calculateAccountTotals(nextAccounts)
      const nextLiquidTotal = accountTotals.totalWealth

      const { data: debtRows, error: debtError } = await supabase
        .from("debts")
        .select("type, amount, paid_amount, total_amount_due, status, archived_at")
        .eq("user_id", user.id)

      if (debtError) throw debtError

      const activeVisibleDebts = (debtRows ?? []).filter((row: any) => row.status === "aktif" && !row.archived_at)

      const nextPiutang = activeVisibleDebts.reduce((sum: number, row: any) => {
        if (row.type !== "piutang") return sum
        return sum + Math.max(0, (Number(row.total_amount_due) || Number(row.amount) || 0) - (Number(row.paid_amount) || 0))
      }, 0)

      const nextHutang = activeVisibleDebts.reduce((sum: number, row: any) => {
        if (row.type !== "hutang") return sum
        return sum + Math.max(0, (Number(row.total_amount_due) || Number(row.amount) || 0) - (Number(row.paid_amount) || 0))
      }, 0)

      const nextWealthBasis = nextLiquidTotal + nextPiutang - nextHutang

      setAccounts(nextAccounts)
      setTotalWealth(nextWealthBasis)
      setWalletTotal(nextLiquidTotal)
      setPiutang(nextPiutang)
      setHutang(nextHutang)
      void fetchTrendPoints(selectedTrendPeriod, nextWealthBasis)

      triggerHaptic("success")
      toast.success("Data diperbarui! ✨", {
        style: {
          background: "#0B1120",
          color: "#F1F5F9",
          border: "1px solid #10B981",
        },
      })
    } catch {
      toast.error("Gagal sync", {
        style: {
          background: "#0B1120",
          color: "#F1F5F9",
          border: "1px solid #F43F5E",
        },
      })
    } finally {
      setIsSyncing(false)
    }
  }, [fetchTrendPoints, isSyncing, router, selectedTrendPeriod, supabase])

  const handleLogout = useCallback(async () => {
    triggerHaptic("medium")
    setIsLoggingOut(true)

    try {
      await supabase.auth.signOut()
      router.replace(ROUTES.login)
    } catch {
      router.replace(ROUTES.login)
    } finally {
      setIsLoggingOut(false)
    }
  }, [router, supabase])

  const handleCardClick = useCallback((account: Account) => {
    triggerHaptic("light")
    setSelectedAccount(account)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedAccount(null)
  }, [])

  const handlePullToRefresh = useCallback(async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    triggerHaptic("medium")
    await handleSync()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [handleSync, isRefreshing])

  if (accounts.length === 0 && isSyncing) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-[#0B1528] border border-white/[0.06] flex items-center justify-center"
        >
          <RefreshCw className="animate-spin text-amber-400" size={24} />
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-20 pointer-events-none"
          >
            <div className="px-4 py-2 rounded-full bg-[#0B1528] border border-white/[0.08] backdrop-blur-xl flex items-center gap-2 shadow-xl">
              <RefreshCw className="text-amber-400 animate-spin" size={14} />
              <span className="text-xs font-medium text-slate-200">Memuat...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardHeader
        isLoggingOut={isLoggingOut}
        notificationCount={liveUnreadAlertCount}
        onLogout={handleLogout}
        userId={userId}
        userName={userName}
      />

      <main
        className="min-h-screen bg-[#030712]"
        style={{
          touchAction: "pan-y",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)",
        }}
      >
        <div
          style={{
            height: `calc(env(safe-area-inset-top) + ${HEADER_HEIGHT + 46}px)`,
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto w-full px-4 space-y-6 pb-6 sm:max-w-2xl sm:px-5 lg:max-w-4xl lg:px-6">
          <motion.div {...fadeUp(0.12)}>
            <BalanceCard
              hutang={hutang}
              isChartLoading={isChartLoading}
              isSyncing={isSyncing}
              onPeriodChange={(period) => setSelectedTrendPeriod(period)}
              onSync={handleSync}
              piutang={piutang}
              totalWealth={totalWealth}
              trendPoints={trendPoints}
              walletTotal={walletTotal}
            />
          </motion.div>

          <motion.div {...fadeUp(0.20)}>
            <AccountCards accounts={accounts} onCardClick={handleCardClick} />
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2">
            <motion.div {...fadeUp(0.28)}>
              <Link href={ROUTES.debts} className="block group h-full">
                <motion.div
                  whileTap={TAP_FEEDBACK}
                  transition={INTERACTIVE_SPRING}
                  className="relative h-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0B1528]/88 p-4 backdrop-blur-xl transition-colors hover:border-white/[0.14]"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />
                  <div className="flex h-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center shrink-0">
                        <Users className="text-violet-400" size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold tracking-tight">Hutang &amp; Piutang</p>
                        <p className="text-slate-400 text-[11px] leading-5">Kelola catatan pinjaman</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {piutang > 0 && (
                        <div className="text-right">
                          <p className="text-emerald-400 text-xs font-medium tabular-nums tracking-tight">
                            {formatRupiah(piutang)}
                          </p>
                          <p className="text-slate-500 text-[9px]">piutang</p>
                        </div>
                      )}
                      <ChevronRight
                        className="text-slate-500 group-hover:translate-x-0.5 transition-transform"
                        size={16}
                      />
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>

            <motion.div {...fadeUp(0.36)} className="sm:col-span-2">
              <SmartInsightCenter
                activeAlerts={activeAlerts}
                debtReminderSummary={debtReminderSummary}
                onNavigate={(href) => {
                  triggerHaptic("light")
                  router.push(href)
                }}
                unreadAlertCount={liveUnreadAlertCount}
                urgentDebtReminders={urgentDebtReminders}
              />
            </motion.div>

            <motion.div {...fadeUp(0.44)}>
              <Link href={ROUTES.analytics} className="block group h-full">
                <motion.div
                  whileTap={TAP_FEEDBACK}
                  transition={INTERACTIVE_SPRING}
                  className="relative h-full overflow-hidden rounded-[24px] border border-cyan-400/15 bg-[#0B1528]/88 p-4 backdrop-blur-xl transition-colors hover:border-cyan-400/30"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/24 to-transparent" />
                  <div className="flex h-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/25 flex items-center justify-center shrink-0">
                        <TrendingUp className="text-cyan-400" size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-semibold tracking-tight">Analitik Premium</p>
                          <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-400/25 text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
                            PRO
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-5">Prediksi arus kas &amp; kekayaan bersih</p>
                      </div>
                    </div>
                    <ChevronRight
                      className="text-slate-500 group-hover:translate-x-0.5 group-hover:text-cyan-400 transition-all shrink-0"
                      size={16}
                    />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          </div>

          {accounts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, ...INTERACTIVE_SPRING }}
              className="relative overflow-hidden rounded-[24px] border border-amber-500/15 bg-[#0B1528]/88 p-4 flex items-center gap-4"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/24 to-transparent" />
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-lg">
                💡
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Belum ada akun</p>
                <p className="text-amber-400/70 text-xs mt-0.5">Tekan tombol + untuk memulai</p>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <BottomNav />

      <AccountDetailSheet
        account={selectedAccount}
        isOpen={!!selectedAccount}
        onClose={handleCloseSheet}
      />

      <QuickAddFAB
        accounts={accounts}
        onSuccess={handlePullToRefresh}
        userId={userId}
      />
    </>
  )
}
