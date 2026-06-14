"use client"

import { motion } from "framer-motion"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  PencilLine,
} from "lucide-react"

import { cn, formatRupiahCompact } from "@/lib/utils"
import type { DebtCardData } from "../types"

interface Props {
  debt: DebtCardData
  index: number
  onClick: (debt: DebtCardData) => void
  onEdit?: (debt: DebtCardData) => void
}

const triggerHaptic = (style: "light" | "medium" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(style === "light" ? 8 : 14)
  }
}

export default function DebtCard({ debt, index, onClick, onEdit }: Props) {
  const totalAmountDue = Number(debt.total_amount_due) || Number(debt.amount) || 0
  const remaining = Math.max(0, totalAmountDue - debt.paid_amount)
  const progress = totalAmountDue > 0 ? (debt.paid_amount / totalAmountDue) * 100 : 0
  const isLunas = debt.status === "lunas" || remaining <= 0
  const isPiutang = debt.type === "piutang"
  const todayStr = new Date().toISOString().split("T")[0]
  const isOverdue = !isLunas && !!debt.due_date && debt.due_date < todayStr
  const interestRate = Number(debt.interest_rate) || 0
  const interestType =
    debt.interest_type === "efektif"
      ? "efektif"
      : debt.interest_type === "flat"
        ? "flat"
        : null
  const interestRateUnit = debt.interest_rate_unit === "monthly" ? "%/bln" : "%/th"
  const isMetadataOnly = (Number(debt.paid_amount) || 0) > 0

  const handleOpenDetail = () => {
    triggerHaptic("light")
    onClick(debt)
  }

  const handleEdit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    triggerHaptic("medium")
    onEdit?.(debt)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 28 }}
      whileTap={{ scale: 0.985 }}
      className="group w-full text-left"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={handleOpenDetail}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            handleOpenDetail()
          }
        }}
        aria-label={`Detail ${isPiutang ? "piutang" : "hutang"} ${debt.contacts.name}`}
        className={cn(
          "relative overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-300",
          "bg-[#151E32] hover:bg-[#1E293B]",
          isLunas
            ? "border-white/[0.04] opacity-75"
            : isPiutang
              ? "border-emerald-500/20 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)]"
              : "border-rose-500/20 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.1)]"
        )}
      >
        {!isLunas ? (
          <div
            className={cn(
              "pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full opacity-[0.03] blur-3xl transition-opacity group-hover:opacity-[0.06]",
              isPiutang ? "bg-emerald-400" : "bg-rose-400"
            )}
          />
        ) : null}

        {/* Top content */}
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
              {isLunas ? (
                <CheckCircle2 size={20} strokeWidth={2.5} />
              ) : (
                debt.contacts.name.charAt(0).toUpperCase()
              )}
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

                {isOverdue ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400">
                    <AlertCircle size={8} /> Telat
                  </span>
                ) : null}
              </div>

              {debt.description ? (
                <p className="mb-2 truncate text-[11px] text-[#64748B]">
                  {debt.description}
                </p>
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

                {isMetadataOnly ? (
                  <span className="shrink-0 rounded-full border border-sky-500/10 bg-sky-500/5 px-2 py-0.5 text-[9px] font-bold text-sky-300">
                    Metadata-only edit
                  </span>
                ) : null}

                {debt.due_date ? (
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-[10px] font-medium",
                      isOverdue ? "text-rose-400/80" : "text-[#64748B]"
                    )}
                  >
                    <CalendarDays size={10} strokeWidth={2} />
                    {new Date(debt.due_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex max-w-[42%] shrink-0 flex-col items-end gap-1 pt-0.5 text-right">
            <p
              className={cn(
                "w-full truncate text-[15px] font-black tracking-tight tabular-nums",
                isLunas
                  ? "text-[#64748B] line-through"
                  : isPiutang
                    ? "text-emerald-400"
                    : "text-rose-400"
              )}
            >
              {formatRupiahCompact(isLunas ? totalAmountDue : remaining)}
            </p>

            {!isLunas && debt.paid_amount > 0 ? (
              <p className="w-full max-w-full truncate text-[10px] font-medium tabular-nums text-[#475569]">
                dari {formatRupiahCompact(totalAmountDue)}
              </p>
            ) : null}

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

        {/* Progress */}
        {debt.paid_amount > 0 ? (
          <div className="relative z-10 mt-3.5">
            <div className="h-1 overflow-hidden rounded-full border border-white/[0.03] bg-[#0B1120]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${isLunas ? 100 : progress}%` }}
                transition={{
                  delay: index * 0.03 + 0.2,
                  duration: 0.8,
                  ease: [0.32, 0.72, 0, 1],
                }}
                className={cn(
                  "h-full rounded-full",
                  isLunas
                    ? "bg-emerald-500/50"
                    : isPiutang
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                )}
              />
            </div>

            <div className="mt-1.5 flex justify-between gap-2">
              <p
                className={cn(
                  "shrink-0 text-[9px] font-medium",
                  isLunas ? "text-emerald-400" : "text-[#64748B]"
                )}
              >
                {isLunas ? "✓ Lunas" : `${Math.round(progress)}% terbayar`}
              </p>

              <p className="truncate text-[9px] font-medium tabular-nums text-[#475569]">
                {formatRupiahCompact(debt.paid_amount)} / {formatRupiahCompact(totalAmountDue)}
              </p>
            </div>
          </div>
        ) : null}

        {/* Action row */}
        {onEdit ? (
          <div className="relative z-10 mt-4 border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-[#CBD5E1] transition hover:bg-white/[0.08]"
                aria-label="Edit debt"
              >
                <PencilLine size={12} />
                {isMetadataOnly ? "Edit metadata" : "Edit debt"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}