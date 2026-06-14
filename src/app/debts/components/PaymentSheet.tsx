"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  ReceiptText,
  Wallet,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import { calcInstallment } from "@/lib/Installment"
import { recordDebtPayment } from "@/lib/debts"
import { createClient } from "@/lib/supabase/client"
import { cn, formatRupiah } from "@/lib/utils"
import type { DebtCardData } from "../types"
import InstallmentSchedule from "./Installmentschedule"

interface AccountItem {
  id: string
  name: string
  balance: number | null
}

interface PaymentRow {
  id: string
  amount: number
  principal_amount: number
  interest_amount: number
  note: string | null
  paid_at: string | null
}

interface Props {
  debt: DebtCardData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: {
    debtId: string
    paidAmount: number
    paidPrincipal: number
    paidInterest: number
    outstandingAmount?: number
  }) => void | Promise<void>
  accounts: AccountItem[]
  userId: string
}

type Tab = "bayar" | "jadwal" | "riwayat"

function Field({
  label,
  optional,
  children,
}: {
  label: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
        {label}
        {optional ? (
          <span className="normal-case font-normal tracking-normal text-[#334155]">(opsional)</span>
        ) : null}
      </p>
      {children}
    </div>
  )
}

const inputCls =
  "w-full h-12 rounded-xl px-3.5 bg-[#0D1526] border border-white/[0.07] text-[#E2E8F0] text-sm font-medium placeholder:text-[#334155] outline-none focus:border-blue-500/50 focus:bg-[#111827] transition-all"

const formatInputRupiah = (value: string) => {
  const numeric = value.replace(/\D/g, "")
  return numeric ? new Intl.NumberFormat("id-ID").format(Number(numeric)) : ""
}

const parseInputRupiah = (value: string) => Number(value.replace(/\D/g, "")) || 0

const triggerHaptic = (style: "light" | "medium" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(style === "light" ? 8 : 14)
  }
}

const formatHistoryDate = (value: string | null) =>
  new Date(value ?? new Date()).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

export default function PaymentSheet({ debt, isOpen, onClose, onSuccess, accounts, userId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const defaultAccountId = useMemo(() => accounts[0]?.id ?? "", [accounts])

  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [accountId, setAccountId] = useState(defaultAccountId)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>("bayar")
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const principalAmount = Number(debt?.amount) || 0
  const totalInterest = Number(debt?.total_interest) || 0
  const totalAmountDue = Number(debt?.total_amount_due) || principalAmount + totalInterest
  const paidAmount = Number(debt?.paid_amount) || 0
  const paidPrincipal = Number(debt?.paid_principal) || Math.min(paidAmount, principalAmount)
  const paidInterest = Number(debt?.paid_interest) || Math.max(0, paidAmount - paidPrincipal)
  const remaining = debt ? Math.max(0, totalAmountDue - paidAmount) : 0
  const amountNumeric = useMemo(() => parseInputRupiah(amount), [amount])
  const isPiutang = debt?.type === "piutang"
  const isLunas = debt?.status === "lunas" || remaining <= 0
  const progress = totalAmountDue > 0 ? (paidAmount / totalAmountDue) * 100 : 0
  const isOverpay = amountNumeric > remaining
  const isDirty = Boolean(amount || note || accountId !== defaultAccountId)
  const isValid = amountNumeric > 0 && !!debt && !isOverpay

  const installmentCount = Number(debt?.installment_count) || 0
  const installmentAmount = Number(debt?.installment_amount) || 0
  const interestRateValue = Number(debt?.interest_rate) || 0
  const interestType: "flat" | "efektif" = debt?.interest_type === "efektif" ? "efektif" : "flat"
  const interestRateUnit: "monthly" | "annual" =
    debt?.interest_rate_unit === "monthly" ? "monthly" : "annual"
  const interestRateLabel = interestRateUnit === "monthly" ? "%/bln" : "%/th"
  const startDate = String(debt?.start_date || new Date().toISOString().split("T")[0])

  const installmentData = useMemo(() => {
    if (!debt || installmentCount <= 1) return null

    return {
      installmentCount,
      installmentAmount,
      interestRate: interestRateValue,
      interestType,
      startDate,
    }
  }, [debt, installmentAmount, installmentCount, interestRateValue, interestType, startDate])

  const schedule = useMemo(() => {
    if (!debt || !installmentData) return null

    return calcInstallment(
      principalAmount,
      installmentData.interestRate,
      installmentData.installmentCount,
      installmentData.interestType,
      new Date(installmentData.startDate)
    )
  }, [debt, installmentData, principalAmount])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accounts, accountId]
  )

  useEffect(() => {
    if (!isOpen || !debt) return

    setTab(isLunas ? (schedule ? "jadwal" : "riwayat") : "bayar")
    setAmount("")
    setNote("")
    setAccountId(defaultAccountId)
    setShowCloseConfirm(false)
  }, [defaultAccountId, debt, isLunas, isOpen, schedule])

  useEffect(() => {
    if (!isOpen || !debt?.id) {
      setPayments([])
      return
    }

    let cancelled = false

    const loadPayments = async () => {
      setLoadingPayments(true)

      const { data } = await supabase
        .from("debt_payments")
        .select("id, amount, principal_amount, interest_amount, note, paid_at")
        .eq("debt_id", debt.id)
        .order("paid_at", { ascending: false })

      if (cancelled) return

      const rows = (data ?? []) as Array<{
        id: string
        amount: number | null
        principal_amount?: number | null
        interest_amount?: number | null
        note: string | null
        paid_at: string | null
      }>

      setPayments(
        rows.map((row) => ({
          id: row.id,
          amount: Number(row.amount) || 0,
          principal_amount: Number(row.principal_amount) || 0,
          interest_amount: Number(row.interest_amount) || 0,
          note: row.note ?? null,
          paid_at: row.paid_at ?? null,
        }))
      )
      setLoadingPayments(false)
    }

    void loadPayments()

    return () => {
      cancelled = true
    }
  }, [debt?.id, isOpen, supabase])

  const handleCloseRequest = () => {
    if (loading) return

    if (isDirty) {
      setShowCloseConfirm(true)
      return
    }

    onClose()
  }

  const handleConfirmClose = () => {
    setShowCloseConfirm(false)
    setAmount("")
    setNote("")
    setAccountId(defaultAccountId)
    onClose()
  }

  const handlePayment = async () => {
    if (!debt || !isValid || loading) return

    triggerHaptic("medium")
    setLoading(true)

    try {
      const result = await recordDebtPayment({
        userId,
        debtId: debt.id,
        amount: amountNumeric,
        accountId: accountId || null,
        note,
        createAccountTransaction: !!accountId,
      })

      const nextOutstanding =
        result.outstanding_amount ?? Math.max(0, remaining - amountNumeric)

      toast.success(nextOutstanding <= 0 ? "🎉 Lunas!" : "Pembayaran dicatat!", {
        style: {
          background: "#0D1526",
          color: "#F1F5F9",
          border: "1px solid #10B981",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: "600",
        },
      })

      setAmount("")
      setNote("")
      setShowCloseConfirm(false)
      await onSuccess({
        debtId: debt.id,
        paidAmount: amountNumeric,
        paidPrincipal: Number(result.paid_principal) || 0,
        paidInterest: Number(result.paid_interest) || 0,
        outstandingAmount: result.outstanding_amount,
      })
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mencatat pembayaran"

      toast.error(message, {
        style: {
          background: "#0D1526",
          color: "#F1F5F9",
          border: "1px solid #F43F5E",
          borderRadius: "12px",
          fontSize: "14px",
        },
      })
    } finally {
      setLoading(false)
    }
  }

  if (!debt) return null

  const tabs = [
    { id: "bayar" as const, label: "Catat Bayar", show: !isLunas },
    { id: "jadwal" as const, label: "Jadwal", show: !!schedule },
    { id: "riwayat" as const, label: "Riwayat", show: true },
  ].filter((item) => item.show)

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCloseRequest}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: "blur(8px)" }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                triggerHaptic("light")
                handleCloseRequest()
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[94vh] flex-col overflow-hidden rounded-t-[28px] bg-[#0B1120] shadow-[0_-32px_80px_-10px_rgba(0,0,0,0.7)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />

            <div className="flex justify-center shrink-0 pb-1 pt-3">
              <div className="h-1 w-9 rounded-full bg-white/10" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black",
                    isPiutang
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                  )}
                >
                  {debt.contacts.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold tracking-tight text-[#F1F5F9]">
                    {debt.contacts.name}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                    <span className={cn("font-bold uppercase tracking-wider", isPiutang ? "text-emerald-400" : "text-rose-400")}>
                      {isPiutang ? "Piutang" : "Hutang"}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-[#334155]" />
                    <span className="text-[#64748B]">
                      {isLunas ? "Lunas" : `${formatRupiah(remaining)} tersisa`}
                    </span>
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleCloseRequest}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.1]"
                aria-label="Tutup"
              >
                <X size={15} className="text-[#94A3B8]" />
              </motion.button>
            </div>

            <div
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-6 pt-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="rounded-2xl border border-white/[0.05] bg-[#0D1526] p-4">
                <div className="mb-2.5 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-[#94A3B8]">Progress pembayaran</span>
                  <span className="font-bold tabular-nums text-[#F1F5F9]">
                    {formatRupiah(paidAmount)} <span className="mx-1 text-[#475569]">/</span> {formatRupiah(totalAmountDue)}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full border border-white/[0.03] bg-[#08101f]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    className={cn("h-full rounded-full", isPiutang ? "bg-emerald-500" : "bg-rose-500")}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <p className={cn("text-[10px] font-bold", isPiutang ? "text-emerald-400" : "text-rose-400")}>
                    {Math.round(progress)}% terbayar
                  </p>
                  <p className="text-[10px] font-medium tabular-nums text-[#64748B]">
                    Sisa {formatRupiah(remaining)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Pokok</p>
                    <p className="mt-1 text-sm font-black tabular-nums text-white">
                      {formatRupiah(paidPrincipal)}
                      <span className="mx-1 text-[#475569]">/</span>
                      {formatRupiah(principalAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Bunga</p>
                    <p className="mt-1 text-sm font-black tabular-nums text-rose-400">
                      {formatRupiah(paidInterest)}
                      <span className="mx-1 text-[#475569]">/</span>
                      {formatRupiah(totalInterest)}
                    </p>
                  </div>
                </div>

                {interestRateValue > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-1 font-bold uppercase tracking-wider",
                        interestType === "flat"
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                          : "border-violet-400/20 bg-violet-500/10 text-violet-300"
                      )}
                    >
                      {interestType === "flat" ? "Flat" : "Efektif"}
                    </span>
                    <span className="font-semibold text-[#94A3B8]">
                      {interestRateValue}{interestRateLabel}
                    </span>
                    <span className="text-[#64748B]">
                      {interestType === "flat"
                        ? "Bunga dihitung dari pokok awal"
                        : "Bunga dihitung dari sisa pokok"}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-1 rounded-2xl border border-white/[0.05] bg-[#0D1526] p-1">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      triggerHaptic("light")
                      setTab(item.id)
                    }}
                    className={cn(
                      "flex-1 rounded-xl py-2.5 text-[11px] font-bold transition-all active:scale-95",
                      tab === item.id
                        ? "bg-[#111827] text-[#F1F5F9] shadow-sm"
                        : "text-[#64748B] hover:text-[#94A3B8]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === "bayar" && !isLunas ? (
                <div className="space-y-4">
                  {installmentData?.installmentAmount ? (
                    <button
                      onClick={() => setAmount(formatInputRupiah(String(installmentData.installmentAmount)))}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl border p-3.5 transition-all active:scale-[0.98]",
                        amount === formatInputRupiah(String(installmentData.installmentAmount))
                          ? isPiutang
                            ? "border-emerald-500/25 bg-emerald-500/10"
                            : "border-rose-500/25 bg-rose-500/10"
                          : "border-white/[0.05] bg-[#0D1526]"
                      )}
                    >
                      <span className="text-xs font-medium text-[#94A3B8]">Bayar 1 angsuran</span>
                      <span className={cn("text-sm font-bold tabular-nums", isPiutang ? "text-emerald-400" : "text-rose-400")}>
                        {formatRupiah(installmentData.installmentAmount)}
                      </span>
                    </button>
                  ) : null}

                  <Field label="Jumlah Bayar">
                    <div className="group relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-lg font-black text-[#475569] transition-colors group-focus-within:text-[#64748B]">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={(event) => setAmount(formatInputRupiah(event.target.value))}
                        placeholder="0"
                        className={cn(
                          "h-14 w-full rounded-xl border bg-[#0D1526] pl-14 pr-20 text-2xl font-black tabular-nums text-[#F1F5F9] placeholder:font-normal placeholder:text-[#1E293B] outline-none transition-all",
                          isOverpay
                            ? "border-rose-500/60 focus:border-rose-500"
                            : "border-white/[0.07] focus:border-blue-500/50"
                        )}
                      />

                      <button
                        onClick={() => setAmount(formatInputRupiah(String(remaining)))}
                        className={cn(
                          "absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold transition-transform active:scale-90",
                          isPiutang ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        LUNAS
                      </button>
                    </div>

                    {isOverpay ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 flex items-center gap-1 text-[11px] text-rose-400"
                      >
                        <AlertCircle size={11} /> Melebihi sisa {isPiutang ? "piutang" : "hutang"}
                      </motion.p>
                    ) : null}
                  </Field>

                  <Field label="Akun Pembayaran" optional>
                    <div className="relative">
                      <CreditCard
                        size={13}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                      />
                      <select
                        value={accountId}
                        onChange={(event) => setAccountId(event.target.value)}
                        className={cn(inputCls, "appearance-none pl-9 pr-8 text-[13px]")}
                      >
                        <option value="" className="bg-[#0D1526]">
                          Tanpa akun
                        </option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id} className="bg-[#0D1526]">
                            {account.name} ({formatRupiah(account.balance ?? 0)})
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={13}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#475569]"
                      />
                    </div>
                  </Field>

                  {selectedAccount ? (
                    <div className="rounded-2xl border border-white/[0.05] bg-[#0D1526] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]">
                          <Wallet size={16} className="text-[#94A3B8]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-[#64748B]">Akun terpilih</p>
                          <p className="truncate text-sm font-bold text-white">{selectedAccount.name}</p>
                        </div>
                        <p className="shrink-0 text-xs font-semibold tabular-nums text-[#94A3B8]">
                          {formatRupiah(selectedAccount.balance ?? 0)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <Field label="Catatan" optional>
                    <div className="relative">
                      <input
                        type="text"
                        value={note}
                        onChange={(event) => setNote(event.target.value.slice(0, 80))}
                        placeholder="Catatan pembayaran"
                        className={cn(inputCls, "pr-12")}
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-[#334155]">
                        {note.length}/80
                      </span>
                    </div>
                  </Field>

                  {debt.due_date ? (
                    <div className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-[#0D1526] px-3.5 py-3 text-[11px] text-[#94A3B8]">
                      <CalendarDays size={13} className="text-[#64748B]" />
                      Jatuh tempo {formatHistoryDate(debt.due_date)}
                    </div>
                  ) : null}

                  <motion.button
                    onClick={handlePayment}
                    disabled={!isValid || loading}
                    whileTap={isValid && !loading ? { scale: 0.97 } : {}}
                    className={cn(
                      "mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all",
                      isValid && !loading
                        ? isPiutang
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30"
                          : "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/30"
                        : "cursor-not-allowed border border-white/[0.04] bg-[#0D1526] text-[#334155]"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        Catat Pembayaran
                      </>
                    )}
                  </motion.button>
                </div>
              ) : null}

              {tab === "jadwal" && schedule && installmentData ? (
                <InstallmentSchedule
                  schedule={schedule.schedule}
                  paidAmount={paidAmount}
                  monthlyPayment={schedule.monthlyPayment}
                  totalPayment={schedule.totalPayment}
                  totalInterest={schedule.totalInterest}
                  interestType={installmentData.interestType}
                  interestRate={interestRateValue}
                  interestRateUnit={interestRateUnit}
                />
              ) : null}

              {tab === "riwayat" ? (
                <div className="space-y-2">
                  {loadingPayments ? (
                    <div className="py-10 text-center">
                      <Loader2 size={28} className="mx-auto mb-3 animate-spin text-[#64748B]" />
                      <p className="text-sm font-medium text-[#64748B]">Memuat riwayat...</p>
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="py-10 text-center">
                      <ReceiptText size={32} className="mx-auto mb-3 text-[#1E293B]" />
                      <p className="text-sm font-medium text-[#64748B]">Belum ada pembayaran</p>
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-[#0D1526] p-3.5"
                      >
                        <div className="min-w-0 pr-3">
                          <p className={cn("text-sm font-bold tabular-nums", isPiutang ? "text-emerald-400" : "text-rose-400")}>
                            {isPiutang ? "+" : "-"}
                            {formatRupiah(payment.amount)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#64748B]">
                            <span>Pokok {formatRupiah(payment.principal_amount)}</span>
                            <span>•</span>
                            <span>Bunga {formatRupiah(payment.interest_amount)}</span>
                          </div>
                          {payment.note ? (
                            <p className="mt-1 truncate text-[10px] text-[#64748B]">{payment.note}</p>
                          ) : null}
                        </div>

                        <p className="shrink-0 text-[10px] font-medium tabular-nums text-[#475569]">
                          {formatHistoryDate(payment.paid_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>

          <AnimatePresence>
            {showCloseConfirm ? (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] bg-black/50"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 16 }}
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="fixed inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-[60] rounded-2xl border border-white/[0.08] bg-[#111827] p-5 shadow-2xl"
                >
                  <p className="mb-1 text-sm font-bold text-[#F1F5F9]">Buang perubahan?</p>
                  <p className="mb-5 text-xs text-[#64748B]">Input pembayaran yang sedang diisi akan hilang.</p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowCloseConfirm(false)}
                      className="rounded-xl bg-white/[0.05] py-3 text-sm font-semibold text-[#94A3B8] transition-colors hover:bg-white/[0.08]"
                    >
                      Lanjut Edit
                    </button>
                    <button
                      onClick={handleConfirmClose}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/15 py-3 text-sm font-bold text-rose-400 transition-colors hover:bg-rose-500/20"
                    >
                      Buang
                    </button>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </AnimatePresence>
  )
}
