"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"

import type { InstallmentRow } from "@/lib/Installment"
import { cn, formatRupiah } from "@/lib/utils"

interface Props {
  schedule: InstallmentRow[]
  paidAmount: number
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  interestType: "flat" | "efektif"
  interestRate?: number | null
  interestRateUnit?: "monthly" | "annual"
}

export default function InstallmentSchedule({
  schedule,
  paidAmount,
  monthlyPayment,
  totalPayment,
  totalInterest,
  interestType,
  interestRate,
  interestRateUnit = "annual",
}: Props) {
  const paidPeriods = monthlyPayment > 0 ? Math.floor(paidAmount / monthlyPayment) : 0
  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] text-center">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Angsuran/bln</p>
          <p className="text-white font-black text-xs tabular-nums">{formatRupiah(monthlyPayment)}</p>
        </div>
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] text-center">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Total Bunga</p>
          <p className="text-rose-400 font-black text-xs tabular-nums">{formatRupiah(totalInterest)}</p>
        </div>
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.05] text-center">
          <p className="text-slate-500 text-[9px] uppercase tracking-wider mb-1">Total Bayar</p>
          <p className="text-white font-black text-xs tabular-nums">{formatRupiah(totalPayment)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-bold border",
            interestType === "flat"
              ? "bg-amber-500/10 border-amber-400/20 text-amber-400"
              : "bg-violet-500/10 border-violet-400/20 text-violet-400"
          )}
        >
          Bunga {interestType === "flat" ? "Flat" : "Efektif"}
        </span>
        {Number(interestRate) > 0 ? (
          <span className="text-[10px] font-semibold text-[#94A3B8]">
            {Number(interestRate)}{interestRateUnit === "monthly" ? "%/bln" : "%/th"}
          </span>
        ) : null}
        <p className="text-slate-600 text-[10px]">
          {interestType === "flat"
            ? "Bunga dihitung dari pokok awal dengan rate bulanan"
            : "Bunga dihitung dari sisa pokok dengan rate tahunan"}
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
        <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-white/[0.04] border-b border-white/[0.06]">
          <p className="col-span-1 text-[9px] font-bold text-slate-500 uppercase">#</p>
          <p className="col-span-3 text-[9px] font-bold text-slate-500 uppercase">Tanggal</p>
          <p className="col-span-2 text-[9px] font-bold text-slate-500 uppercase text-right">Pokok</p>
          <p className="col-span-2 text-[9px] font-bold text-slate-500 uppercase text-right">Bunga</p>
          <p className="col-span-2 text-[9px] font-bold text-slate-500 uppercase text-right">Total</p>
          <p className="col-span-2 text-[9px] font-bold text-slate-500 uppercase text-right">Sisa</p>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
          {schedule.map((row, index) => {
            const isPaid = index < paidPeriods
            const isCurrent = index === paidPeriods
            const isOverdue = !isPaid && row.date < today

            return (
              <motion.div
                key={row.period}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  "grid grid-cols-12 gap-1 px-3 py-2.5 transition-all",
                  isPaid ? "bg-emerald-500/[0.03]" : isCurrent ? "bg-amber-500/[0.06]" : isOverdue ? "bg-rose-500/[0.04]" : ""
                )}
              >
                <div className="col-span-1 flex items-center">
                  {isPaid ? (
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  ) : isCurrent ? (
                    <Clock size={12} className="text-amber-400" />
                  ) : isOverdue ? (
                    <AlertTriangle size={12} className="text-rose-400" />
                  ) : (
                    <span className="text-slate-600 text-[10px] font-bold">{row.period}</span>
                  )}
                </div>
                <p className={cn("col-span-3 text-[10px] tabular-nums", isPaid ? "text-slate-600" : isCurrent ? "text-amber-400 font-bold" : isOverdue ? "text-rose-400" : "text-slate-400")}>
                  {new Date(row.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                </p>
                <p className={cn("col-span-2 text-[10px] tabular-nums text-right", isPaid ? "text-slate-600" : "text-slate-300")}>
                  {formatRupiah(row.principal)}
                </p>
                <p className={cn("col-span-2 text-[10px] tabular-nums text-right", isPaid ? "text-slate-600" : "text-rose-400/70")}>
                  {formatRupiah(row.interest)}
                </p>
                <p className={cn("col-span-2 text-[10px] tabular-nums text-right font-bold", isPaid ? "text-slate-600 line-through" : isCurrent ? "text-amber-400" : "text-white")}>
                  {formatRupiah(row.total)}
                </p>
                <p className={cn("col-span-2 text-[10px] tabular-nums text-right", isPaid ? "text-slate-600" : "text-slate-500")}>
                  {formatRupiah(row.remainingPrincipal)}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={10} className="text-emerald-400" />
          <span className="text-slate-600 text-[9px]">Lunas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-amber-400" />
          <span className="text-slate-600 text-[9px]">Jatuh tempo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={10} className="text-rose-400" />
          <span className="text-slate-600 text-[9px]">Terlambat</span>
        </div>
      </div>
    </div>
  )
}
