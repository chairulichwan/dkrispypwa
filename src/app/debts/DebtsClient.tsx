"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, ChevronLeft, Plus, Search } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { getDebtReminderMeta } from "@/lib/debt-reminders"
import { setDebtArchiveState } from "@/lib/debts"
import { ROUTES } from "@/lib/routes"
import { cn, formatRupiah } from "@/lib/utils"
import AddDebtSheet from "./components/AddDebtSheet"
import DebtCard from "./components/DebtCard"
import EditDebtSheet from "./components/EditDebtSheet"
import PaymentSheet from "./components/PaymentSheet"
import type {
  DebtAccountItem,
  DebtCardData,
  DebtContactItem,
  DebtPaymentSuccessPayload,
} from "./types"

interface Props {
  userId: string
  debts: DebtCardData[]
  accounts: DebtAccountItem[]
  contacts: DebtContactItem[]
}

type FilterType = "semua" | "piutang" | "hutang" | "lunas" | "arsip"
type UrgencySectionId = "overdue" | "today" | "soon" | "other"

interface UrgencySection {
  id: UrgencySectionId
  title: string
  subtitle: string
  pillClassName: string
  countClassName: string
  debts: DebtCardData[]
}

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "semua", label: "Aktif" },
  { id: "piutang", label: "Piutang" },
  { id: "hutang", label: "Hutang" },
  { id: "lunas", label: "Lunas" },
  { id: "arsip", label: "Arsip" },
]

const triggerHaptic = (style: "light" | "medium" | "success" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const patterns = {
      light: 8,
      medium: 15,
      success: [10, 50, 10],
    }

    navigator.vibrate(patterns[style])
  }
}

const getDebtOutstanding = (debt: DebtCardData) => {
  const totalAmountDue = Number(debt.total_amount_due) || Number(debt.amount) || 0
  const paidAmount = Number(debt.paid_amount) || 0
  return Math.max(0, totalAmountDue - paidAmount)
}

export default function DebtsClient({ userId, debts: initialDebts, accounts, contacts }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [debts, setDebts] = useState(initialDebts)
  const [filter, setFilter] = useState<FilterType>("semua")
  const [search, setSearch] = useState("")
  const [selectedDebt, setSelectedDebt] = useState<DebtCardData | null>(null)
  const [selectedDebtForEdit, setSelectedDebtForEdit] = useState<DebtCardData | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    setDebts(initialDebts)
  }, [initialDebts])

  useEffect(() => {
    const debtId = searchParams.get("debt")
    if (!debtId) return
    if (selectedDebt?.id === debtId) return

    const targetDebt = debts.find((item) => item.id === debtId)
    if (targetDebt) {
      setSelectedDebt(targetDebt)
    }
  }, [debts, searchParams, selectedDebt?.id])

  const totalPiutang = useMemo(
    () =>
      debts
        .filter((debt) => debt.type === "piutang" && debt.status === "aktif" && !debt.archived_at)
        .reduce((sum, debt) => sum + getDebtOutstanding(debt), 0),
    [debts]
  )

  const totalHutang = useMemo(
    () =>
      debts
        .filter((debt) => debt.type === "hutang" && debt.status === "aktif" && !debt.archived_at)
        .reduce((sum, debt) => sum + getDebtOutstanding(debt), 0),
    [debts]
  )

  const totalLunas = useMemo(
    () => debts.filter((debt) => debt.status === "lunas" && !debt.archived_at).length,
    [debts]
  )
  const totalArsip = useMemo(() => debts.filter((debt) => !!debt.archived_at).length, [debts])

  const reminderSummary = useMemo(() => {
    return debts.reduce(
      (acc, debt) => {
        const reminder = getDebtReminderMeta({
          dueDate: debt.due_date,
          archivedAt: debt.archived_at,
          status: debt.status,
          paidAmount: Number(debt.paid_amount) || 0,
          totalAmountDue: Number(debt.total_amount_due) || Number(debt.amount) || 0,
          nextInstallmentDueDate: debt.next_installment_due_date,
          nextInstallmentPeriodNo: debt.next_installment_period_no,
          nextInstallmentRemainingDue: debt.next_installment_remaining_due,
        })

        if (reminder.level === "overdue") acc.overdue += 1
        if (reminder.level === "today") acc.today += 1
        if (reminder.level === "soon") acc.soon += 1
        return acc
      },
      { overdue: 0, today: 0, soon: 0 }
    )
  }, [debts])

  const filteredDebts = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return debts
      .filter((debt) => {
        const isArchived = !!debt.archived_at

        if (filter === "arsip") {
          if (!isArchived) return false
        } else {
          if (isArchived) return false
          if (filter === "piutang" && debt.type !== "piutang") return false
          if (filter === "hutang" && debt.type !== "hutang") return false
          if (filter === "lunas" && debt.status !== "lunas") return false
          if (filter === "semua" && debt.status === "lunas") return false
        }

        if (keyword && !debt.contacts.name.toLowerCase().includes(keyword)) return false
        return true
      })
      .sort((a, b) => {
        if (filter === "arsip") {
          return new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime()
        }

        const reminderA = getDebtReminderMeta({
          dueDate: a.due_date,
          archivedAt: a.archived_at,
          status: a.status,
          paidAmount: Number(a.paid_amount) || 0,
          totalAmountDue: Number(a.total_amount_due) || Number(a.amount) || 0,
          nextInstallmentDueDate: a.next_installment_due_date,
          nextInstallmentPeriodNo: a.next_installment_period_no,
          nextInstallmentRemainingDue: a.next_installment_remaining_due,
        })
        const reminderB = getDebtReminderMeta({
          dueDate: b.due_date,
          archivedAt: b.archived_at,
          status: b.status,
          paidAmount: Number(b.paid_amount) || 0,
          totalAmountDue: Number(b.total_amount_due) || Number(b.amount) || 0,
          nextInstallmentDueDate: b.next_installment_due_date,
          nextInstallmentPeriodNo: b.next_installment_period_no,
          nextInstallmentRemainingDue: b.next_installment_remaining_due,
        })

        if (reminderA.priority !== reminderB.priority) {
          return reminderA.priority - reminderB.priority
        }

        if (reminderA.daysDiff !== null && reminderB.daysDiff !== null && reminderA.daysDiff !== reminderB.daysDiff) {
          return reminderA.daysDiff - reminderB.daysDiff
        }

        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
  }, [debts, filter, search])

  const showUrgencySections = filter !== "lunas" && filter !== "arsip"

  const urgencySections = useMemo<UrgencySection[]>(() => {
    const grouped: Record<UrgencySectionId, DebtCardData[]> = {
      overdue: [],
      today: [],
      soon: [],
      other: [],
    }

    filteredDebts.forEach((debt) => {
      const reminder = getDebtReminderMeta({
        dueDate: debt.due_date,
        archivedAt: debt.archived_at,
        status: debt.status,
        paidAmount: Number(debt.paid_amount) || 0,
        totalAmountDue: Number(debt.total_amount_due) || Number(debt.amount) || 0,
        nextInstallmentDueDate: debt.next_installment_due_date,
        nextInstallmentPeriodNo: debt.next_installment_period_no,
        nextInstallmentRemainingDue: debt.next_installment_remaining_due,
      })

      if (reminder.level === "overdue") {
        grouped.overdue.push(debt)
      } else if (reminder.level === "today") {
        grouped.today.push(debt)
      } else if (reminder.level === "soon") {
        grouped.soon.push(debt)
      } else {
        grouped.other.push(debt)
      }
    })

    const sections: UrgencySection[] = [
      {
        id: "overdue",
        title: "Perlu ditagih sekarang",
        subtitle: "Debt yang sudah lewat jatuh tempo dan perlu diprioritaskan.",
        pillClassName: "bg-rose-500/12 border border-rose-500/20 text-rose-300",
        countClassName: "text-rose-300 bg-rose-500/12 border border-rose-500/20",
        debts: grouped.overdue,
      },
      {
        id: "today",
        title: "Jatuh tempo hari ini",
        subtitle: "Debt yang sebaiknya langsung di-follow up hari ini.",
        pillClassName: "bg-amber-500/12 border border-amber-500/20 text-amber-300",
        countClassName: "text-amber-300 bg-amber-500/12 border border-amber-500/20",
        debts: grouped.today,
      },
      {
        id: "soon",
        title: "Jatuh tempo dekat",
        subtitle: "Debt yang akan jatuh tempo dalam 1–3 hari ke depan.",
        pillClassName: "bg-cyan-500/12 border border-cyan-500/20 text-cyan-300",
        countClassName: "text-cyan-300 bg-cyan-500/12 border border-cyan-500/20",
        debts: grouped.soon,
      },
      {
        id: "other",
        title: "Lainnya",
        subtitle: "Debt aktif lain yang masih aman dan belum urgent.",
        pillClassName: "bg-white/[0.05] border border-white/[0.08] text-[#CBD5E1]",
        countClassName: "text-[#CBD5E1] bg-white/[0.04] border border-white/[0.08]",
        debts: grouped.other,
      },
    ]
    return sections.filter((section) => section.debts.length > 0)
  }, [filteredDebts])

  const handlePaymentSuccess = async ({
    debtId,
    paidAmount,
    paidPrincipal,
    paidInterest,
    outstandingAmount,
  }: DebtPaymentSuccessPayload) => {
    triggerHaptic("success")

    setDebts((prev) =>
      prev.map((debt) => {
        if (debt.id !== debtId) return debt

        const nextPaidAmount = (Number(debt.paid_amount) || 0) + paidAmount
        const nextPaidPrincipal = (Number(debt.paid_principal) || 0) + paidPrincipal
        const nextPaidInterest = (Number(debt.paid_interest) || 0) + paidInterest
        const totalAmountDue = Number(debt.total_amount_due) || Number(debt.amount) || 0
        const nextOutstanding = outstandingAmount ?? Math.max(0, totalAmountDue - nextPaidAmount)

        return {
          ...debt,
          paid_amount: nextPaidAmount,
          paid_principal: nextPaidPrincipal,
          paid_interest: nextPaidInterest,
          status: nextOutstanding <= 0 ? "lunas" : "aktif",
        }
      })
    )

    setSelectedDebt((prev) => {
      if (!prev || prev.id !== debtId) return prev

      const nextPaidAmount = (Number(prev.paid_amount) || 0) + paidAmount
      const nextPaidPrincipal = (Number(prev.paid_principal) || 0) + paidPrincipal
      const nextPaidInterest = (Number(prev.paid_interest) || 0) + paidInterest
      const totalAmountDue = Number(prev.total_amount_due) || Number(prev.amount) || 0
      const nextOutstanding = outstandingAmount ?? Math.max(0, totalAmountDue - nextPaidAmount)

      return {
        ...prev,
        paid_amount: nextPaidAmount,
        paid_principal: nextPaidPrincipal,
        paid_interest: nextPaidInterest,
        status: nextOutstanding <= 0 ? "lunas" : "aktif",
      }
    })

    router.refresh()
  }

  const handleEditSuccess = async (updatedDebt: DebtCardData) => {
    triggerHaptic("success")

    setDebts((prev) => prev.map((item) => (item.id === updatedDebt.id ? updatedDebt : item)))
    setSelectedDebt((prev) => (prev?.id === updatedDebt.id ? updatedDebt : prev))
    setSelectedDebtForEdit(updatedDebt)
    router.refresh()
  }

  const handleCreateSuccess = async () => {
    triggerHaptic("success")
    setShowAdd(false)
    router.refresh()
  }

  const handleArchiveToggle = async (debt: DebtCardData, archive: boolean) => {
    const result = await setDebtArchiveState({
      userId,
      debtId: debt.id,
      archive,
    })

    const archivedAt = archive ? result.archived_at ?? new Date().toISOString() : null

    setDebts((prev) =>
      prev.map((item) =>
        item.id === debt.id
          ? {
              ...item,
              archived_at: archivedAt,
            }
          : item
      )
    )

    setSelectedDebt((prev) =>
      prev?.id === debt.id
        ? {
            ...prev,
            archived_at: archivedAt,
          }
        : prev
    )

    setSelectedDebtForEdit((prev) =>
      prev?.id === debt.id
        ? {
            ...prev,
            archived_at: archivedAt,
          }
        : prev
    )

    triggerHaptic("success")
    router.refresh()
  }

  return (
    <main
      className="relative h-[100dvh] overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-20 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <header
          className="shrink-0 overflow-hidden rounded-b-[2rem] border-b border-white/[0.04] bg-[#0B1120]/95 px-5 backdrop-blur-2xl"
          style={{
            paddingTop: "max(3.5rem, env(safe-area-inset-top))",
            paddingBottom: "12px",
          }}
        >
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="mb-4 flex items-center gap-3">
            <Link
              href={ROUTES.dashboard}
              onClick={() => triggerHaptic("light")}
              aria-label="Kembali ke dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] transition-all active:scale-95"
            >
              <ChevronLeft size={18} className="text-[#F1F5F9]" />
            </Link>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#F1F5F9]">Hutang &amp; Piutang</h1>
              <p className="text-[11px] text-[#64748B]">Catatan pinjaman</p>
            </div>

            <button
              onClick={() => {
                triggerHaptic("medium")
                setShowAdd(true)
              }}
              className="ml-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/20 shadow-lg shadow-violet-900/30 transition-all active:scale-95"
              aria-label="Tambah hutang/piutang"
            >
              <Plus size={20} className="text-violet-400" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/[0.04] bg-[#151E32] p-3">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-rose-400">Hutang</p>
              <p className="truncate text-xs font-black tabular-nums text-[#F1F5F9]" title={formatRupiah(totalHutang)}>
                {formatRupiah(totalHutang)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.04] bg-[#151E32] p-3">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">Piutang</p>
              <p className="truncate text-xs font-black tabular-nums text-[#F1F5F9]" title={formatRupiah(totalPiutang)}>
                {formatRupiah(totalPiutang)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Lunas / Arsip</p>
              <p className="text-sm font-black tabular-nums text-[#F1F5F9]">
                {totalLunas} <span className="text-[10px] font-medium text-[#64748B]">lunas</span>
              </p>
              <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-[#94A3B8]">
                {totalArsip} <span className="font-medium text-[#64748B]">arsip</span>
              </p>
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 scrollbar-hide">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  triggerHaptic("light")
                  setFilter(item.id)
                }}
                className={cn(
                  "shrink-0 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95",
                  filter === item.id
                    ? "border-violet-400/30 bg-violet-500/20 text-violet-400"
                    : "border-white/[0.06] bg-white/[0.03] text-[#64748B] hover:text-[#94A3B8]"
                )}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative mt-2 h-11">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama kontak..."
              className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#151E32] pl-10 pr-4 text-[16px] md:text-sm text-[#F1F5F9] placeholder:text-[#475569] outline-none transition-all focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
            />
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Reminder</p>
                <p className="mt-1 text-sm font-semibold text-[#F1F5F9]">
                  {reminderSummary.overdue > 0
                    ? `${reminderSummary.overdue} debt perlu ditagih sekarang`
                    : reminderSummary.today > 0
                      ? `${reminderSummary.today} debt jatuh tempo hari ini`
                      : reminderSummary.soon > 0
                        ? `${reminderSummary.soon} debt jatuh tempo dekat`
                        : "Semua jatuh tempo masih aman"}
                </p>
              </div>
              <div
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold",
                  reminderSummary.overdue > 0
                    ? "bg-rose-500/15 text-rose-300"
                    : reminderSummary.today > 0
                      ? "bg-amber-500/15 text-amber-300"
                      : reminderSummary.soon > 0
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "bg-emerald-500/15 text-emerald-300"
                )}
              >
                {reminderSummary.overdue > 0
                  ? "Perlu aksi"
                  : reminderSummary.today > 0
                    ? "Hari ini"
                    : reminderSummary.soon > 0
                      ? "Dekat"
                      : "Aman"}
              </div>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
              <div className="shrink-0 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-300">
                Telat {reminderSummary.overdue}
              </div>
              <div className="shrink-0 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300">
                Hari ini {reminderSummary.today}
              </div>
              <div className="shrink-0 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-300">
                3 hari lagi {reminderSummary.soon}
              </div>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto overscroll-contain px-5 pb-32 pt-5" style={{ WebkitOverflowScrolling: "touch" }}>
          <AnimatePresence mode="wait">
            {filteredDebts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.06] bg-[#151E32] shadow-lg"
                >
                  <CheckCircle2 size={32} className="text-[#64748B]" />
                </motion.div>
                <h2 className="mb-2 text-lg font-bold tracking-tight text-[#F1F5F9]">
                  {filter === "arsip" ? "Belum ada debt di arsip" : "Belum ada catatan"}
                </h2>
                <p className="max-w-xs text-sm text-[#64748B]">
                  {filter === "arsip"
                    ? "Debt yang kamu arsipkan akan tampil di sini dan tetap aman di riwayat."
                    : "Tambahkan hutang atau piutang baru untuk mulai melacak pembayaran."}
                </p>
              </motion.div>
            ) : showUrgencySections ? (
              <div className="space-y-5">
                {urgencySections.map((section, sectionIndex) => (
                  <motion.section
                    key={section.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sectionIndex * 0.04 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", section.pillClassName)}>
                              {section.title}
                            </span>
                          </div>
                          <p className="mt-2 text-[12px] leading-5 text-[#94A3B8]">{section.subtitle}</p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", section.countClassName)}>
                          {section.debts.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {section.debts.map((debt, index) => (
                        <DebtCard
                          key={debt.id}
                          debt={debt}
                          index={sectionIndex * 0.08 + index}
                          onClick={setSelectedDebt}
                        />
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDebts.map((debt, index) => (
                  <DebtCard key={debt.id} debt={debt} index={index} onClick={setSelectedDebt} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <AddDebtSheet
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleCreateSuccess}
        contacts={contacts}
        accounts={accounts}
        userId={userId}
      />

      <PaymentSheet
        debt={selectedDebt}
        isOpen={!!selectedDebt}
        onClose={() => {
          triggerHaptic("light")
          setSelectedDebt(null)
          if (searchParams.get("debt")) {
            router.replace(ROUTES.debts)
          }
        }}
        onEditRequest={(debt) => {
          if (debt.archived_at) return
          triggerHaptic("medium")
          setSelectedDebt(null)
          if (searchParams.get("debt")) {
            router.replace(ROUTES.debts)
          }
          setSelectedDebtForEdit(debt)
        }}
        onArchiveToggle={handleArchiveToggle}
        onSuccess={handlePaymentSuccess}
        accounts={accounts}
        userId={userId}
      />

      <EditDebtSheet
        debt={selectedDebtForEdit}
        isOpen={!!selectedDebtForEdit}
        onClose={() => setSelectedDebtForEdit(null)}
        onSuccess={handleEditSuccess}
        contacts={contacts}
        accounts={accounts}
        userId={userId}
      />
    </main>
  )
}
