"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Info,
  Loader2,
  Save,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import { updateDebtRecord } from "@/lib/debts"
import { calcInstallment } from "@/lib/Installment"
import { cn, formatRupiah } from "@/lib/utils"
import type {
  DebtAccountItem,
  DebtCardData,
  DebtContactItem,
  DebtInterestType,
} from "../types"

interface Props {
  debt: DebtCardData | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedDebt: DebtCardData) => void | Promise<void>
  contacts: DebtContactItem[]
  accounts: DebtAccountItem[]
  userId: string
}

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
  "w-full h-12 rounded-xl px-3.5 bg-[#0D1526] border border-white/[0.07] text-[#E2E8F0] text-sm font-medium placeholder:text-[#334155] outline-none focus:border-cyan-500/50 focus:bg-[#111827] transition-all"

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

const getTodayString = () => new Date().toISOString().split("T")[0]

export default function EditDebtSheet({
  debt,
  isOpen,
  onClose,
  onSuccess,
  contacts,
  accounts,
  userId,
}: Props) {
  const [type, setType] = useState<"hutang" | "piutang">("piutang")
  const [contactId, setContactId] = useState("")
  const [contactSearch, setContactSearch] = useState("")
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [useInstallment, setUseInstallment] = useState(false)
  const [interestRate, setInterestRate] = useState("")
  const [interestType, setInterestType] = useState<DebtInterestType>("flat")
  const [installmentCount, setInstallmentCount] = useState("12")
  const [startDate, setStartDate] = useState(getTodayString())
  const [loading, setLoading] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const metadataOnly = (Number(debt?.paid_amount) || 0) > 0
  const amountNumeric = useMemo(() => parseInputRupiah(amount), [amount])
  const countNumeric = Math.max(1, parseInt(installmentCount, 10) || 1)
  const rateNumeric = Math.max(0, parseFloat(interestRate) || 0)

    const contactOptions = useMemo(() => {
      if (!debt) return contacts

      const merged = [...(debt.contacts ? [debt.contacts] : []), ...contacts]
      const seen = new Set<string>()

      return merged.filter((contact) => {
        if (!contact?.id || seen.has(contact.id)) return false
       seen.add(contact.id)
       return true
     })
   }, [contacts, debt])

  const filteredContacts = useMemo(() => {
    const keyword = contactSearch.trim().toLowerCase()
    if (!keyword) return contactOptions

    return contactOptions.filter((contact) => {
      const name = contact.name.toLowerCase()
      const phone = contact.phone?.toLowerCase() ?? ""
      return name.includes(keyword) || phone.includes(keyword)
    })
  }, [contactOptions, contactSearch])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accountId, accounts]
  )

  const preview = useMemo(() => {
    if (!useInstallment || amountNumeric <= 0) return null

    const summary = calcInstallment(
      amountNumeric,
      rateNumeric,
      countNumeric,
      interestType,
      new Date(startDate || getTodayString())
    )

    return {
      monthly: summary.monthlyPayment,
      totalInterest: summary.totalInterest,
      totalPayment: summary.totalPayment,
    }
  }, [amountNumeric, countNumeric, interestType, rateNumeric, startDate, useInstallment])

  useEffect(() => {
    if (!debt || !isOpen) return

    const hasInstallment = (Number(debt.installment_count) || 1) > 1 || (Number(debt.interest_rate) || 0) > 0

    setType(debt.type)
    setContactId(debt.contacts.id)
    setContactSearch("")
    setAccountId(debt.account_id ?? "")
    setAmount(formatInputRupiah(String(Number(debt.amount) || 0)))
    setDescription(debt.description ?? "")
    setDueDate(debt.due_date ?? "")
    setUseInstallment(hasInstallment)
    setInterestRate(String(Number(debt.interest_rate) || 0))
    setInterestType(debt.interest_type === "efektif" ? "efektif" : "flat")
    setInstallmentCount(String(Number(debt.installment_count) || 1))
    setStartDate(debt.start_date || getTodayString())
    setShowCloseConfirm(false)
  }, [debt, isOpen])

  const isDirty = useMemo(() => {
    if (!debt) return false

    const initialHasInstallment =
      (Number(debt.installment_count) || 1) > 1 || (Number(debt.interest_rate) || 0) > 0

    if (metadataOnly) {
      return (
        contactId !== debt.contacts.id ||
        description !== (debt.description ?? "") ||
        dueDate !== (debt.due_date ?? "")
      )
    }

    return (
      type !== debt.type ||
      contactId !== debt.contacts.id ||
      accountId !== (debt.account_id ?? "") ||
      amountNumeric !== (Number(debt.amount) || 0) ||
      description !== (debt.description ?? "") ||
      dueDate !== (debt.due_date ?? "") ||
      useInstallment !== initialHasInstallment ||
      rateNumeric !== (Number(debt.interest_rate) || 0) ||
      interestType !== (debt.interest_type === "efektif" ? "efektif" : "flat") ||
      countNumeric !== (Number(debt.installment_count) || 1) ||
      startDate !== (debt.start_date || getTodayString())
    )
  }, [
    accountId,
    amountNumeric,
    contactId,
    countNumeric,
    debt,
    description,
    dueDate,
    interestType,
    metadataOnly,
    rateNumeric,
    startDate,
    type,
    useInstallment,
  ])

  const isDueDateInPast = useMemo(() => {
    if (!dueDate) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)

    return due < today
  }, [dueDate])

  const isValid = useMemo(() => {
    if (!debt) return false
    if (!contactId) return false
    if (isDueDateInPast) return false

    if (metadataOnly) return true

    if (amountNumeric <= 0) return false
    if (useInstallment && countNumeric <= 0) return false
    return true
  }, [amountNumeric, contactId, countNumeric, debt, isDueDateInPast, metadataOnly, useInstallment])

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
    onClose()
  }

  const handleSubmit = async () => {
    if (!debt || !isValid || loading) return

    triggerHaptic("medium")
    setLoading(true)

    try {
      const result = await updateDebtRecord({
        userId,
        debtId: debt.id,
        contactId,
        type: metadataOnly ? null : type,
        amount: metadataOnly ? null : amountNumeric,
        accountId: metadataOnly ? null : accountId || null,
        clearAccount: metadataOnly ? false : !accountId && !!debt.account_id,
        description,
        dueDate: dueDate || null,
        interestRate: metadataOnly ? null : useInstallment ? rateNumeric : 0,
        interestType: metadataOnly ? null : useInstallment ? interestType : "flat",
        installmentCount: metadataOnly ? null : useInstallment ? countNumeric : 1,
        startDate: metadataOnly ? null : useInstallment ? startDate : null,
      })

      const selectedContact =
        contactOptions.find((contact) => contact.id === contactId) ?? debt.contacts

      const nextUseInstallment = metadataOnly ? ((Number(debt.installment_count) || 1) > 1 || (Number(debt.interest_rate) || 0) > 0) : useInstallment
      const nextInterestType = metadataOnly
        ? debt.interest_type === "efektif"
          ? "efektif"
          : "flat"
        : useInstallment
          ? interestType
          : "flat"
      const nextInterestRateUnit = metadataOnly
        ? debt.interest_rate_unit
        : nextUseInstallment
          ? nextInterestType === "flat"
            ? "monthly"
            : "annual"
          : "monthly"

      const updatedDebt: DebtCardData = {
        ...debt,
        contact_id: selectedContact.id,
        contacts: selectedContact,
        type: metadataOnly ? debt.type : type,
        account_id: metadataOnly ? debt.account_id : accountId || null,
        amount: metadataOnly ? debt.amount : amountNumeric,
        description,
        due_date: dueDate || null,
        interest_rate: metadataOnly ? debt.interest_rate : nextUseInstallment ? rateNumeric : 0,
        interest_type: metadataOnly ? debt.interest_type : nextInterestType,
        interest_rate_unit: result.interest_rate_unit === "monthly" || result.interest_rate_unit === "annual"
          ? result.interest_rate_unit
          : nextInterestRateUnit,
        installment_count: metadataOnly ? debt.installment_count : nextUseInstallment ? countNumeric : 1,
        installment_amount:
          metadataOnly
            ? debt.installment_amount
            : nextUseInstallment
              ? preview?.monthly ?? debt.installment_amount
              : amountNumeric,
        start_date: metadataOnly ? debt.start_date : nextUseInstallment ? startDate : null,
        total_interest:
          result.total_interest != null
            ? Number(result.total_interest) || 0
            : metadataOnly
              ? debt.total_interest
              : nextUseInstallment
                ? preview?.totalInterest ?? 0
                : 0,
        total_amount_due:
          result.total_amount_due != null
            ? Number(result.total_amount_due) || amountNumeric
            : metadataOnly
              ? debt.total_amount_due
              : nextUseInstallment
                ? preview?.totalPayment ?? amountNumeric
                : amountNumeric,
        status: result.status === "lunas" ? "lunas" : result.status === "aktif" ? "aktif" : debt.status,
        origination_transaction_id:
          result.origination_transaction_id ?? debt.origination_transaction_id,
      }

      toast.success(metadataOnly ? "Metadata debt diperbarui!" : "Debt berhasil diperbarui!", {
        style: {
          background: "#0D1526",
          color: "#F1F5F9",
          border: "1px solid #10B981",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: "600",
        },
      })

      await onSuccess(updatedDebt)
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengubah debt"

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

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseRequest}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: "blur(8px)" }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-debt-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-[81] flex max-h-[94vh] flex-col overflow-hidden rounded-t-[28px] bg-[#0B1120] shadow-[0_-32px_80px_-10px_rgba(0,0,0,0.7)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

            <div className="flex justify-center shrink-0 pb-1 pt-3">
              <div className="h-1 w-9 rounded-full bg-white/10" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="min-w-0">
                <h2 id="edit-debt-title" className="truncate text-base font-bold tracking-tight text-[#F1F5F9]">
                  Edit Debt
                </h2>
                <p className="mt-0.5 text-[11px] text-[#475569]">
                  {metadataOnly ? "Mode metadata-only" : "Mode full edit"}
                </p>
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

            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-6 pt-4" style={{ WebkitOverflowScrolling: "touch" }}>
              {metadataOnly ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                      <Info size={16} className="text-amber-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-300">Debt sudah memiliki pembayaran</p>
                      <p className="mt-1 text-[12px] leading-5 text-amber-100/80">
                        Untuk menjaga konsistensi ledger, yang bisa diubah hanya kontak, keterangan, dan jatuh tempo.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.05] bg-[#0D1526] p-1">
                {(["piutang", "hutang"] as const).map((item) => {
                  const active = type === item
                  const currentIsPiutang = item === "piutang"

                  return (
                    <motion.button
                      key={item}
                      type="button"
                      whileTap={metadataOnly ? undefined : { scale: 0.96 }}
                      onClick={() => {
                        if (metadataOnly) return
                        setType(item)
                      }}
                      disabled={metadataOnly}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all",
                        metadataOnly && "cursor-not-allowed opacity-45",
                        active
                          ? currentIsPiutang
                            ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-400"
                            : "border-rose-500/25 bg-rose-500/15 text-rose-400"
                          : "border-transparent text-[#475569]"
                      )}
                    >
                      {currentIsPiutang ? (
                        <TrendingUp size={14} className={active ? "text-emerald-400" : "text-[#334155]"} />
                      ) : (
                        <TrendingDown size={14} className={active ? "text-rose-400" : "text-[#334155]"} />
                      )}
                      {currentIsPiutang ? "Piutang" : "Hutang"}
                    </motion.button>
                  )
                })}
              </div>

              <Field label="Kontak">
                <div className="space-y-2">
                  {contactOptions.length > 5 ? (
                    <div className="relative">
                      <User
                        size={13}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                      />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(event) => setContactSearch(event.target.value)}
                        placeholder="Cari kontak..."
                        className={cn(inputCls, "h-10 pl-9 text-[13px]")}
                      />
                    </div>
                  ) : null}

                  <div className="relative">
                    <select
                      value={contactId}
                      onChange={(event) => setContactId(event.target.value)}
                      className={cn(inputCls, "appearance-none pr-9")}
                    >
                      {filteredContacts.map((contact) => (
                        <option key={contact.id} value={contact.id} className="bg-[#0D1526]">
                          {contact.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#475569]"
                    />
                  </div>
                </div>
              </Field>

              {metadataOnly ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nominal Saat Ini">
                    <div className="rounded-xl border border-white/[0.05] bg-[#0D1526] px-3.5 py-3 text-sm font-black tabular-nums text-white">
                      {formatRupiah(Number(debt.amount) || 0)}
                    </div>
                  </Field>
                  <Field label="Akun Saat Ini" optional>
                    <div className="rounded-xl border border-white/[0.05] bg-[#0D1526] px-3.5 py-3 text-sm font-semibold text-[#CBD5E1]">
                      {debt.account_id ? selectedAccount?.name ?? "Akun tersimpan" : "Tanpa akun"}
                    </div>
                  </Field>
                </div>
              ) : (
                <>
                  <Field label="Jumlah">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-lg font-black text-[#475569]">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={(event) => setAmount(formatInputRupiah(event.target.value))}
                        placeholder="0"
                        className="h-14 w-full rounded-xl border border-white/[0.07] bg-[#0D1526] pl-14 pr-4 text-2xl font-black tabular-nums text-[#F1F5F9] placeholder:text-[#1E293B] outline-none transition-all focus:border-cyan-500/50"
                      />
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Akun" optional>
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

                    <Field label="Jatuh Tempo" optional>
                      <div className="relative">
                        <CalendarDays
                          size={13}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                        />
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                          className={cn(inputCls, "pl-9 text-[13px]", isDueDateInPast && "border-rose-500/60 text-rose-300")}
                        />
                      </div>
                    </Field>
                  </div>
                </>
              )}

              {metadataOnly ? (
                <Field label="Jatuh Tempo" optional>
                  <div className="relative">
                    <CalendarDays
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                    />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className={cn(inputCls, "pl-9 text-[13px]", isDueDateInPast && "border-rose-500/60 text-rose-300")}
                    />
                  </div>
                </Field>
              ) : null}

              {isDueDateInPast ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 flex items-center gap-1 text-[11px] text-rose-400"
                >
                  <AlertCircle size={11} /> Tanggal jatuh tempo tidak boleh di masa lalu
                </motion.p>
              ) : null}

              <Field label="Keterangan" optional>
                <div className="relative">
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value.slice(0, 120))}
                    placeholder="Misal: Modal, Pinjaman barang, dll"
                    className={cn(inputCls, "pr-12")}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-[#334155]">
                    {description.length}/120
                  </span>
                </div>
              </Field>

              {!metadataOnly ? (
                <>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setUseInstallment((prev) => !prev)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl border p-4 transition-all",
                      useInstallment
                        ? "border-violet-500/20 bg-violet-500/10"
                        : "border-white/[0.05] bg-[#0D1526] hover:border-white/[0.09]"
                    )}
                  >
                    <div className="text-left">
                      <p className={cn("text-sm font-bold", useInstallment ? "text-violet-300" : "text-[#CBD5E1]")}>
                        Cicilan &amp; Bunga
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#475569]">Flat = % per bulan, Efektif = % per tahun</p>
                    </div>

                    <div
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-all duration-200",
                        useInstallment ? "bg-violet-500" : "bg-[#1E293B]"
                      )}
                    >
                      <motion.div
                        animate={{ left: useInstallment ? "22px" : "2px" }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow"
                      />
                    </div>
                  </motion.button>

                  <AnimatePresence>
                    {useInstallment ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 pb-2 pt-1">
                          <div className="grid grid-cols-2 gap-3">
                            <Field label={interestType === "flat" ? "Bunga / Bulan" : "Bunga / Tahun"}>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={interestRate}
                                  onChange={(event) => setInterestRate(event.target.value)}
                                  placeholder="0"
                                  className={cn(inputCls, "pr-12")}
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#475569]">
                                  {interestType === "flat" ? "%/bln" : "%/th"}
                                </span>
                              </div>
                            </Field>

                            <Field label="Tenor">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  max="360"
                                  value={installmentCount}
                                  onChange={(event) => setInstallmentCount(event.target.value)}
                                  className={cn(inputCls, "pr-10")}
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#475569]">
                                  bln
                                </span>
                              </div>
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Jenis Bunga">
                              <div className="grid min-h-[76px] grid-cols-2 gap-2 rounded-2xl border border-white/[0.06] bg-[#0D1526] p-1">
                                <button
                                  type="button"
                                  onClick={() => setInterestType("flat")}
                                  aria-pressed={interestType === "flat"}
                                  className={cn(
                                    "min-h-[68px] rounded-xl border px-3 py-3 text-left transition-all",
                                    interestType === "flat"
                                      ? "border-amber-400/25 bg-amber-500/15 text-amber-300"
                                      : "border-transparent text-[#64748B] hover:text-[#CBD5E1]"
                                  )}
                                >
                                  <p className="text-sm font-bold">Flat</p>
                                  <p className="mt-0.5 text-[10px] leading-relaxed text-inherit/80">Dari pokok awal, % per bulan</p>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setInterestType("efektif")}
                                  aria-pressed={interestType === "efektif"}
                                  className={cn(
                                    "min-h-[68px] rounded-xl border px-3 py-3 text-left transition-all",
                                    interestType === "efektif"
                                      ? "border-violet-400/25 bg-violet-500/15 text-violet-300"
                                      : "border-transparent text-[#64748B] hover:text-[#CBD5E1]"
                                  )}
                                >
                                  <p className="text-sm font-bold">Efektif</p>
                                  <p className="mt-0.5 text-[10px] leading-relaxed text-inherit/80">Dari sisa pokok, % per tahun</p>
                                </button>
                              </div>
                            </Field>

                            <Field label="Tanggal Mulai">
                              <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                className={inputCls}
                              />
                            </Field>
                          </div>

                          {preview ? (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-2xl border border-violet-500/20 bg-[#0D1526] p-4"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Preview Angsuran Baru</p>
                                <span className="rounded-full bg-[#151E32] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                                  {interestType === "flat" ? "Flat Bulanan" : "Anuitas Tahunan"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                {[
                                  { label: "Angsuran/bln", value: formatRupiah(preview.monthly), color: "text-white" },
                                  {
                                    label: "Total bunga",
                                    value: formatRupiah(preview.totalInterest),
                                    color: "text-rose-400",
                                  },
                                  { label: "Total bayar", value: formatRupiah(preview.totalPayment), color: "text-sky-300" },
                                  { label: "Tenor", value: `${countNumeric} bulan`, color: "text-white" },
                                ].map((row) => (
                                  <div key={row.label}>
                                    <p className="mb-0.5 text-[10px] text-[#475569]">{row.label}</p>
                                    <p className={cn("text-sm font-black tabular-nums", row.color)}>{row.value}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </>
              ) : null}

              <motion.button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                whileTap={isValid && !loading ? { scale: 0.97 } : {}}
                className={cn(
                  "mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all",
                  isValid && !loading
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-900/30"
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
                    <Save size={15} />
                    Simpan Perubahan
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          <AnimatePresence>
            {showCloseConfirm ? (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[82] bg-black/50"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 16 }}
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="fixed inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-[83] rounded-2xl border border-white/[0.08] bg-[#111827] p-5 shadow-2xl"
                >
                  <p className="mb-1 text-sm font-bold text-[#F1F5F9]">Buang perubahan?</p>
                  <p className="mb-5 text-xs text-[#64748B]">Perubahan edit debt akan hilang.</p>

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
