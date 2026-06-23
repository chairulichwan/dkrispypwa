"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CalendarDays, CheckCircle2, Loader2, ReceiptText, X } from "lucide-react"

import { cn, formatRupiah } from "@/lib/utils"
import type {
  DebtInstallmentRow,
  DebtPaymentAllocationRow,
  DebtPaymentRow,
} from "../types"

interface Props {
  payment: DebtPaymentRow | null
  allocations: DebtPaymentAllocationRow[]
  installmentsById: Record<string, DebtInstallmentRow>
  isPiutang: boolean
  isOpen: boolean
  isLoading?: boolean
  onClose: () => void
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "-"

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const getInstallmentStatusLabel = (installment?: DebtInstallmentRow | null) => {
  if (!installment) return "Installment tidak ditemukan"

  const remaining = Math.max(0, installment.total_due - installment.total_paid)

  if (remaining <= 0) return "Lunas"
  if (installment.total_paid > 0) return `Parsial • sisa ${formatRupiah(remaining)}`
  return `Belum bayar • ${formatRupiah(remaining)}`
}

export default function PaymentAllocationSheet({
  payment,
  allocations,
  installmentsById,
  isPiutang,
  isOpen,
  isLoading = false,
  onClose,
}: Props) {
  const totalAllocated = allocations.reduce((sum, row) => sum + row.total_amount, 0)

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[90vh] flex-col overflow-hidden rounded-t-[28px] bg-[#0B1120] shadow-[0_-32px_80px_-10px_rgba(0,0,0,0.7)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500" />

            <div className="flex justify-center shrink-0 pb-1 pt-3">
              <div className="h-1 w-9 rounded-full bg-white/10" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div>
                <h3 className="text-base font-bold tracking-tight text-[#F1F5F9]">Detail Alokasi Pembayaran</h3>
                <p className="mt-0.5 text-[11px] text-[#64748B]">Rincian pembayaran ke tiap cicilan</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.1]"
                aria-label="Tutup detail alokasi"
              >
                <X size={15} className="text-[#94A3B8]" />
              </motion.button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6 pt-4">
              {payment ? (
                <div className="rounded-2xl border border-white/[0.05] bg-[#0D1526] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("text-lg font-black tabular-nums", isPiutang ? "text-emerald-400" : "text-rose-400")}>
                        {isPiutang ? "+" : "-"}
                        {formatRupiah(payment.amount)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#94A3B8]">
                        <span>Pokok {formatRupiah(payment.principal_amount)}</span>
                        <span>•</span>
                        <span>Bunga {formatRupiah(payment.interest_amount)}</span>
                      </div>
                      {payment.note ? <p className="mt-2 text-xs text-[#64748B]">{payment.note}</p> : null}
                    </div>

                    <div className="shrink-0 text-right text-[10px] text-[#64748B]">
                      <div className="flex items-center justify-end gap-1">
                        <CalendarDays size={11} />
                        <span>{formatDate(payment.paid_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Total header</p>
                      <p className="mt-1 text-sm font-black tabular-nums text-white">{formatRupiah(payment.amount)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Total alokasi</p>
                      <p className="mt-1 text-sm font-black tabular-nums text-cyan-300">{formatRupiah(totalAllocated)}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {isLoading ? (
                <div className="py-12 text-center">
                  <Loader2 size={28} className="mx-auto mb-3 animate-spin text-[#64748B]" />
                  <p className="text-sm font-medium text-[#64748B]">Memuat detail alokasi...</p>
                </div>
              ) : allocations.length === 0 ? (
                <div className="py-12 text-center">
                  <ReceiptText size={32} className="mx-auto mb-3 text-[#1E293B]" />
                  <p className="text-sm font-medium text-[#64748B]">Belum ada detail alokasi untuk pembayaran ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allocations.map((allocation, index) => {
                    const installment = allocation.installment_id
                      ? installmentsById[allocation.installment_id] ?? null
                      : null

                    return (
                      <motion.div
                        key={allocation.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="rounded-2xl border border-white/[0.05] bg-[#0D1526] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
                                Cicilan #{installment?.period_no ?? "?"}
                              </span>
                              {installment && Math.max(0, installment.total_due - installment.total_paid) <= 0 ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                  <CheckCircle2 size={11} /> Lunas
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs text-[#94A3B8]">{getInstallmentStatusLabel(installment)}</p>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-black tabular-nums text-white">{formatRupiah(allocation.total_amount)}</p>
                            <p className="mt-1 text-[10px] text-[#64748B]">{formatDate(allocation.created_at)}</p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Pokok dialokasikan</p>
                            <p className="mt-1 text-xs font-black tabular-nums text-white">
                              {formatRupiah(allocation.principal_amount)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
                            <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Bunga dialokasikan</p>
                            <p className="mt-1 text-xs font-black tabular-nums text-rose-400">
                              {formatRupiah(allocation.interest_amount)}
                            </p>
                          </div>
                        </div>

                        {installment ? (
                          <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-[11px] text-[#94A3B8]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>Jatuh tempo {formatDate(installment.due_date)}</span>
                              <span>•</span>
                              <span>Total cicilan {formatRupiah(installment.total_due)}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[#64748B]">
                              <span>Terbayar {formatRupiah(installment.total_paid)}</span>
                              <span>•</span>
                              <span>Sisa {formatRupiah(Math.max(0, installment.total_due - installment.total_paid))}</span>
                            </div>
                          </div>
                        ) : null}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
