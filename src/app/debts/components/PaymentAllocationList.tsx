
"use client"

import { CalendarDays, Hash } from "lucide-react"

import { cn, formatRupiah } from "@/lib/utils"
import type { DebtInstallmentRow, DebtPaymentAllocationRow } from "../types"

interface Props {
  allocations: DebtPaymentAllocationRow[]
  installmentsById: Record<string, DebtInstallmentRow>
  isPiutang: boolean
}

export default function PaymentAllocationList({
  allocations,
  installmentsById,
  isPiutang,
}: Props) {
  if (allocations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
        <p className="text-sm font-semibold text-[#CBD5E1]">Belum ada detail alokasi</p>
        <p className="mt-1 text-xs text-[#64748B]">
          Payment lama mungkin belum punya allocation detail.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {allocations.map((allocation) => {
        const installment = allocation.installment_id
          ? installmentsById[allocation.installment_id]
          : undefined

        return (
          <div
            key={allocation.id}
            className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-3.5"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      isPiutang
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-300"
                    )}
                  >
                    <Hash size={10} />
                    {installment ? `Cicilan ${installment.period_no}` : "Legacy allocation"}
                  </span>

                  {installment?.due_date ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B]">
                      <CalendarDays size={10} />
                      {new Date(installment.due_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="shrink-0 text-sm font-black tabular-nums text-white">
                {formatRupiah(allocation.total_amount)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/[0.04] bg-[#0D1526] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Pokok</p>
                <p className="mt-1 text-sm font-bold tabular-nums text-white">
                  {formatRupiah(allocation.principal_amount)}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.04] bg-[#0D1526] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Bunga</p>
                <p className="mt-1 text-sm font-bold tabular-nums text-rose-400">
                  {formatRupiah(allocation.interest_amount)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}