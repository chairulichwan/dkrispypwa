"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"

import type { InstallmentRow } from "@/lib/Installment"
import { cn, formatRupiah } from "@/lib/utils"
import type {
  DebtInstallmentRow,
  DebtInterestRateUnit,
  DebtInterestType,
} from "../types"

interface Props {
  schedule: InstallmentRow[]
  installments?: DebtInstallmentRow[]
  paidAmount: number
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  interestType: DebtInterestType
  interestRate?: number | null
  interestRateUnit?: DebtInterestRateUnit
}

type VisualState = "paid" | "partial" | "overdue" | "current" | "upcoming"
type RowSource = "ledger" | "derived"

interface SplitPaidRow {
  principalPaid: number
  interestPaid: number
  totalPaid: number
}

interface ViewRow {
  key: string
  period: number
  date: string
  principalDue: number
  interestDue: number
  totalDue: number
  principalPaid: number
  interestPaid: number
  totalPaid: number
  remainingDue: number
  status: string | null
  paidAt: string | null
  source: RowSource
  visualState: VisualState
  statusLabel: string
}

const clampCurrency = (value: number, max: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(Math.round(value), Math.max(0, Math.round(max)))
}

const normalizeIsoDate = (value: string | null | undefined) => {
  if (!value) return ""
  return value.split("T")[0]
}

const formatShortDate = (value: string) => {
  if (!value) return "-"

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  })
}

const isInstallmentPaidStatus = (status: string | null | undefined) => {
  const normalized = String(status ?? "").toLowerCase()
  return normalized === "paid" || normalized === "lunas" || normalized === "settled" || normalized === "completed"
}

export default function InstallmentSchedule({
  schedule,
  installments = [],
  paidAmount,
  monthlyPayment,
  totalPayment,
  totalInterest,
  interestType,
  interestRate,
  interestRateUnit = "annual",
}: Props) {
  const today = new Date().toISOString().split("T")[0]
  const hasLedgerRows = installments.length > 0

  const fallbackPaidMap = useMemo(() => {
    const map = new Map<number, SplitPaidRow>()
    const sortedSchedule = [...schedule].sort((a, b) => a.period - b.period)
    let remainingPaid = Math.max(0, Math.round(paidAmount || 0))

    for (const row of sortedSchedule) {
      const interestPaid = clampCurrency(remainingPaid, row.interest)
      remainingPaid = Math.max(0, remainingPaid - interestPaid)

      const principalPaid = clampCurrency(remainingPaid, row.principal)
      remainingPaid = Math.max(0, remainingPaid - principalPaid)

      map.set(row.period, {
        principalPaid,
        interestPaid,
        totalPaid: principalPaid + interestPaid,
      })
    }

    return map
  }, [paidAmount, schedule])

  const rows = useMemo<ViewRow[]>(() => {
    const scheduleMap = new Map<number, InstallmentRow>()
    const actualMap = new Map<number, DebtInstallmentRow>()
    const periodSet = new Set<number>()

    for (const row of schedule) {
      scheduleMap.set(row.period, row)
      periodSet.add(row.period)
    }

    for (const row of installments) {
      const period = row.period_no || 0
      if (period <= 0) continue
      actualMap.set(period, row)
      periodSet.add(period)
    }

    const merged = Array.from(periodSet)
      .sort((a, b) => a - b)
      .map((period) => {
        const simulated = scheduleMap.get(period)
        const actual = actualMap.get(period)
        const derivedPaid = fallbackPaidMap.get(period)

        const principalDue = Math.max(0, Math.round(actual?.principal_due ?? simulated?.principal ?? 0))
        const interestDue = Math.max(0, Math.round(actual?.interest_due ?? simulated?.interest ?? 0))
        const totalDue = Math.max(
          0,
          Math.round(actual?.total_due ?? simulated?.total ?? principalDue + interestDue)
        )

        const principalPaid = actual
          ? clampCurrency(actual.principal_paid, principalDue)
          : clampCurrency(derivedPaid?.principalPaid || 0, principalDue)
        const interestPaid = actual
          ? clampCurrency(actual.interest_paid, interestDue)
          : clampCurrency(derivedPaid?.interestPaid || 0, interestDue)

        const rawTotalPaid = actual
          ? actual.total_paid || principalPaid + interestPaid
          : derivedPaid?.totalPaid || principalPaid + interestPaid

        const totalPaid = clampCurrency(rawTotalPaid, totalDue)
        const remainingDue = Math.max(0, totalDue - totalPaid)
        const paidByStatus = isInstallmentPaidStatus(actual?.status)
        const date = normalizeIsoDate(actual?.due_date) || simulated?.date || ""
        const source: RowSource = actual ? "ledger" : "derived"

        return {
          key: actual?.id || `period-${period}`,
          period,
          date,
          principalDue,
          interestDue,
          totalDue,
          principalPaid,
          interestPaid,
          totalPaid,
          remainingDue,
          status: actual?.status ?? null,
          paidAt: normalizeIsoDate(actual?.paid_at),
          source,
          isPaid: paidByStatus || remainingDue <= 0,
        }
      })

    const nextOpenPeriod = merged.find((row) => !row.isPaid && row.remainingDue > 0)?.period ?? null

    return merged.map((row) => {
      const isPartial = !row.isPaid && row.totalPaid > 0
      const isOverdue = !row.isPaid && !isPartial && !!row.date && row.date < today
      const isCurrent = !row.isPaid && !isPartial && nextOpenPeriod === row.period

      let visualState: VisualState = "upcoming"
      let statusLabel = row.source === "ledger" ? "Belum bayar" : "Estimasi"

      if (row.isPaid) {
        visualState = "paid"
        statusLabel = row.paidAt ? `Lunas ${formatShortDate(row.paidAt)}` : "Lunas"
      } else if (isPartial) {
        visualState = "partial"
        statusLabel = `Parsial • sisa ${formatRupiah(row.remainingDue)}`
      } else if (isOverdue) {
        visualState = "overdue"
        statusLabel = `Terlambat • sisa ${formatRupiah(row.remainingDue)}`
      } else if (isCurrent) {
        visualState = "current"
        statusLabel = `Angsuran berikutnya • ${formatRupiah(row.totalDue)}`
      }

      return {
        ...row,
        visualState,
        statusLabel,
      }
    })
  }, [fallbackPaidMap, installments, schedule, today])

  const paidCount = rows.filter((row) => row.visualState === "paid").length
  const partialCount = rows.filter((row) => row.visualState === "partial").length
  const overdueCount = rows.filter((row) => row.visualState === "overdue").length
  const remainingTotal = rows.reduce((sum, row) => sum + row.remainingDue, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3 text-center">
          <p className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Angsuran/bln</p>
          <p className="text-xs font-black tabular-nums text-white">{formatRupiah(monthlyPayment)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3 text-center">
          <p className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Total Bunga</p>
          <p className="text-xs font-black tabular-nums text-rose-400">{formatRupiah(totalInterest)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3 text-center">
          <p className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Total Bayar</p>
          <p className="text-xs font-black tabular-nums text-white">{formatRupiah(totalPayment)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[10px] font-bold",
            interestType === "flat"
              ? "border-amber-400/20 bg-amber-500/10 text-amber-400"
              : "border-violet-400/20 bg-violet-500/10 text-violet-400"
          )}
        >
          Bunga {interestType === "flat" ? "Flat" : "Efektif"}
        </span>

        {Number(interestRate) > 0 ? (
          <span className="text-[10px] font-semibold text-[#94A3B8]">
            {Number(interestRate)}
            {interestRateUnit === "monthly" ? "%/bln" : "%/th"}
          </span>
        ) : null}

        <span className="rounded-lg border border-emerald-400/15 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
          {paidCount}/{rows.length || 0} lunas
        </span>

        {partialCount > 0 ? (
          <span className="rounded-lg border border-amber-400/15 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
            {partialCount} parsial
          </span>
        ) : null}

        {overdueCount > 0 ? (
          <span className="rounded-lg border border-rose-400/15 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-300">
            {overdueCount} telat
          </span>
        ) : (
          <span className="text-[10px] text-[#64748B]">Sisa tagihan {formatRupiah(remainingTotal)}</span>
        )}
      </div>

      <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5">
        <p className="text-[10px] leading-4 text-[#94A3B8]">
          {hasLedgerRows
            ? "Status per cicilan sudah mengikuti ledger debt_installments aktual, jadi cicilan parsial/lunas tampil per baris."
            : "Ledger cicilan detail belum ditemukan. Status per cicilan di bawah diinfer dari total pembayaran dengan urutan alokasi bunga lalu pokok."}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="grid grid-cols-12 gap-1 border-b border-white/[0.06] bg-white/[0.04] px-3 py-2">
          <p className="col-span-1 text-[9px] font-bold uppercase text-slate-500">#</p>
          <p className="col-span-3 text-[9px] font-bold uppercase text-slate-500">Tanggal</p>
          <p className="col-span-2 text-right text-[9px] font-bold uppercase text-slate-500">Pokok</p>
          <p className="col-span-2 text-right text-[9px] font-bold uppercase text-slate-500">Bunga</p>
          <p className="col-span-2 text-right text-[9px] font-bold uppercase text-slate-500">Total</p>
          <p className="col-span-2 text-right text-[9px] font-bold uppercase text-slate-500">Sisa</p>
        </div>

        <div className="max-h-72 divide-y divide-white/[0.04] overflow-y-auto">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#64748B]">Belum ada jadwal cicilan</div>
          ) : (
            rows.map((row, index) => {
              const isPaid = row.visualState === "paid"
              const isPartial = row.visualState === "partial"
              const isCurrent = row.visualState === "current"
              const isOverdue = row.visualState === "overdue"

              return (
                <motion.div
                  key={row.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "grid grid-cols-12 gap-1 px-3 py-2.5 transition-all",
                    isPaid
                      ? "bg-emerald-500/[0.03]"
                      : isPartial
                        ? "bg-amber-500/[0.06]"
                        : isCurrent
                          ? "bg-sky-500/[0.05]"
                          : isOverdue
                            ? "bg-rose-500/[0.04]"
                            : ""
                  )}
                >
                  <div className="col-span-1 flex items-center">
                    {isPaid ? (
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    ) : isPartial ? (
                      <Clock size={12} className="text-amber-400" />
                    ) : isCurrent ? (
                      <Clock size={12} className="text-sky-400" />
                    ) : isOverdue ? (
                      <AlertTriangle size={12} className="text-rose-400" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600">{row.period}</span>
                    )}
                  </div>

                  <div className="col-span-3 min-w-0">
                    <p
                      className={cn(
                        "text-[10px] tabular-nums",
                        isPaid
                          ? "text-slate-600"
                          : isPartial
                            ? "font-bold text-amber-300"
                            : isCurrent
                              ? "font-bold text-sky-300"
                              : isOverdue
                                ? "text-rose-400"
                                : "text-slate-400"
                      )}
                    >
                      {formatShortDate(row.date)}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-[#64748B]">{row.statusLabel}</p>
                  </div>

                  <p className={cn("col-span-2 text-right text-[10px] tabular-nums", isPaid ? "text-slate-600" : "text-slate-300")}>
                    {formatRupiah(row.principalDue)}
                  </p>
                  <p className={cn("col-span-2 text-right text-[10px] tabular-nums", isPaid ? "text-slate-600" : "text-rose-400/70")}>
                    {formatRupiah(row.interestDue)}
                  </p>
                  <p
                    className={cn(
                      "col-span-2 text-right text-[10px] font-bold tabular-nums",
                      isPaid
                        ? "text-slate-600 line-through"
                        : isPartial
                          ? "text-amber-300"
                          : isCurrent
                            ? "text-sky-300"
                            : "text-white"
                    )}
                  >
                    {formatRupiah(row.totalDue)}
                  </p>
                  <p
                    className={cn(
                      "col-span-2 text-right text-[10px] font-semibold tabular-nums",
                      isPaid
                        ? "text-emerald-300"
                        : isPartial
                          ? "text-amber-300"
                          : isOverdue
                            ? "text-rose-400"
                            : "text-slate-500"
                    )}
                  >
                    {formatRupiah(row.remainingDue)}
                  </p>

                  <div className="col-span-12 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] pt-2 text-[9px]">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[#94A3B8]">
                      <span className="rounded-md bg-white/[0.03] px-1.5 py-0.5">Terbayar {formatRupiah(row.totalPaid)}</span>
                      <span>Pokok {formatRupiah(row.principalPaid)}</span>
                      <span>•</span>
                      <span>Bunga {formatRupiah(row.interestPaid)}</span>
                    </div>

                    <span className={cn("font-semibold", row.source === "ledger" ? "text-emerald-300" : "text-[#64748B]")}>
                      {row.source === "ledger" ? "Data aktual" : "Data inferensi"}
                    </span>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={10} className="text-emerald-400" />
          <span className="text-[9px] text-slate-600">Lunas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-amber-400" />
          <span className="text-[9px] text-slate-600">Parsial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-sky-400" />
          <span className="text-[9px] text-slate-600">Angsuran berikutnya</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={10} className="text-rose-400" />
          <span className="text-[9px] text-slate-600">Terlambat</span>
        </div>
      </div>
    </div>
  )
}
