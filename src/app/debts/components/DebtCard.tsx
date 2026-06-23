"use client"

import { motion } from "framer-motion"
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight } from "lucide-react"

import { getDebtReminderMeta } from "@/lib/debt-reminders"
import { cn, formatRupiah } from "@/lib/utils"
import type { DebtCardData } from "../types"

interface Props {
  debt: DebtCardData
  index: number
  onClick: (debt: DebtCardData) => void
}

const triggerHaptic = (style: "light" | "medium" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(style === "light" ? 8 : 14)
  }
}

export default function DebtCard({ debt, index, onClick }: Props) {
  const totalAmountDue = Number(debt.total_amount_due) || Number(debt.amount) || 0
  const paidAmount = Number(debt.paid_amount) || 0
  const remaining = Math.max(0, totalAmountDue - paidAmount)
  const progress = totalAmountDue > 0 ? (paidAmount / totalAmountDue) * 100 : 0
  const isLunas = debt.status === "lunas" || remaining <= 0
  const isPiutang = debt.type === "piutang"
  const isArchived = !!debt.archived_at
  const reminder = getDebtReminderMeta({
    dueDate: debt.due_date,
    archivedAt: debt.archived_at,
    status: debt.status,
    paidAmount,
    totalAmountDue,
    nextInstallmentDueDate: debt.next_installment_due_date,
    nextInstallmentPeriodNo: debt.next_installment_period_no,
    nextInstallmentRemainingDue: debt.next_installment_remaining_due,
  })
  const isOverdue = reminder.level === "overdue"
  const interestRate = Number(debt.interest_rate) || 0
  const interestType =
    debt.interest_type === "efektif"
      ? "efektif"
      : debt.interest_type === "flat"
        ? "flat"
        : null
  const interestRateUnit = debt.interest_rate_unit === "monthly" ? "%/bln" : "%/th"
  const displayAmount = isLunas ? totalAmountDue : remaining

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 28 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        triggerHaptic("light")
        onClick(debt)
      }}
      className="group w-full text-left"
      aria-label={`Detail ${isPiutang ? "piutang" : "hutang"} ${debt.contacts.name}`}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-300",
          "bg-[#151E32] hover:bg-[#1E293B]",
          isArchived
            ? "border-white/[0.06] opacity-75"
            : isLunas
              ? "border-white/[0.04] opacity-80"
              : isPiutang
                ? "border-emerald-500/20 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)]"
                : "border-rose-500/20 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)]"
        )}
      >
        {!isLunas && (
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full blur-3xl opacity-[0.03] transition-opacity group-hover:opacity-[0.06]",
              isPiutang ? "bg-emerald-400" : "bg-rose-400"
            )}
          />
        )}

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black",
                isLunas
                  ? "border-white/[0.06] bg-[#0B1120] text-[#64748B]"
                  : isPiutang
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-400"
              )}
            >
              {isLunas ? <CheckCircle2 size={20} strokeWidth={2.5} /> : debt.contacts.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="mb-0.5 flex min-w-0 items-center gap-2">
                <p
                  className={cn(
                    "truncate text-[15px] font-bold tracking-tight",
                    isLunas ? "text-[#94A3B8]" : "text-[#F1F5F9]"
                  )}
                >
                  {debt.contacts.name}
                </p>

                {reminder.shortLabel ? (
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      reminder.badgeClassName
                    )}
                  >
                    <AlertCircle size={8} /> {reminder.shortLabel}
                  </span>
                ) : null}

                {isArchived ? (
                  <span className="rounded-md border border-slate-400/20 bg-slate-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                    Arsip
                  </span>
                ) : isLunas ? (
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    Lunas
                  </span>
                ) : null}
              </div>

              {debt.description ? (
                <p className="mb-1.5 truncate text-[11px] text-[#64748B]">{debt.description}</p>
              ) : reminder.detailLabel ? (
                <p className="mb-1.5 truncate text-[11px] text-[#64748B]">{reminder.detailLabel}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    isPiutang
                      ? "border-emerald-500/10 bg-emerald-500/5 text-emerald-400/90"
                      : "border-rose-500/10 bg-rose-500/5 text-rose-400/90"
                  )}
                >
                  {isPiutang ? "Piutang" : "Hutang"}
                </span>

                {interestType && interestRate > 0 ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold",
                      interestType === "flat"
                        ? "border-amber-500/10 bg-amber-500/5 text-amber-300"
                        : "border-violet-500/10 bg-violet-500/5 text-violet-300"
                    )}
                  >
                    {interestType === "flat" ? "Flat" : "Efektif"} {interestRate}
                    {interestRateUnit}
                  </span>
                ) : null}

                {(debt.next_installment_due_date || debt.due_date) ? (
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-[10px] font-medium",
                      reminder.level === "overdue"
                        ? "text-rose-400/80"
                        : reminder.level === "today"
                          ? "text-amber-300"
                          : reminder.level === "soon"
                            ? "text-cyan-300"
                            : "text-[#64748B]"
                    )}
                  >
                    <CalendarDays size={10} strokeWidth={2} />
                    {debt.next_installment_period_no ? `#${debt.next_installment_period_no} • ` : ""}
                    {new Date(debt.next_installment_due_date || debt.due_date || new Date().toISOString()).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex max-w-[48%] shrink-0 flex-col items-end gap-1 pt-0.5 text-right">
            <p
              className={cn(
                "w-full truncate text-[15px] font-black tracking-tight tabular-nums",
                isArchived
                  ? "text-[#94A3B8]"
                  : isLunas
                    ? "text-[#94A3B8]"
                    : isPiutang
                      ? "text-emerald-400"
                      : "text-rose-400"
              )}
              title={formatRupiah(displayAmount)}
            >
              {formatRupiah(displayAmount)}
            </p>

            <p className="w-full truncate text-[10px] font-medium tabular-nums text-[#475569]">
              {isLunas ? "Total lunas" : "Sisa tagihan"}
            </p>

            <ChevronRight
              size={14}
              className={cn(
                "mt-auto shrink-0 transition-transform duration-300",
                isLunas
                  ? "text-[#475569]"
                  : "text-[#64748B] group-hover:translate-x-0.5 group-hover:text-[#94A3B8]"
              )}
            />
          </div>
        </div>

        {paidAmount > 0 ? (
          <div className="relative z-10 mt-3.5">
            <div className="h-1 overflow-hidden rounded-full border border-white/[0.03] bg-[#0B1120]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${isLunas ? 100 : progress}%` }}
                transition={{ delay: index * 0.03 + 0.2, duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                className={cn(
                  "h-full rounded-full",
                  isLunas ? "bg-emerald-500/50" : isPiutang ? "bg-emerald-500" : "bg-rose-500"
                )}
              />
            </div>

            <div className="mt-1.5 flex justify-between gap-2">
              <p className={cn("shrink-0 text-[9px] font-medium", isLunas ? "text-emerald-400" : "text-[#64748B]")}>
                {isLunas ? "✓ Lunas" : `${Math.round(progress)}% terbayar`}
              </p>
              <p className="truncate text-[9px] font-medium tabular-nums text-[#475569]">
                {formatRupiah(paidAmount)} / {formatRupiah(totalAmountDue)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </motion.button>
  )
}
