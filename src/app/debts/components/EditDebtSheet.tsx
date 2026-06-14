"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  ChevronDown,
  CreditCard,
  Loader2,
  PencilLine,
  Search,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import { updateDebtRecord } from "@/lib/debts"
import { cn, formatRupiah } from "@/lib/utils"
import type { DebtCardData, DebtContactItem } from "../types"
import ModernDatePicker from "./ModernDatePicker"

interface AccountItem {
  id: string
  name: string
  balance: number | null
}

interface Props {
  debt: DebtCardData | null
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void | Promise<void>
  contacts: DebtContactItem[]
  accounts: AccountItem[]
  userId: string
}

type InterestType = "flat" | "efektif"
type DebtType = "hutang" | "piutang"

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
          <span className="normal-case font-normal tracking-normal text-[#334155]">
            (opsional)
          </span>
        ) : null}
      </p>
      {children}
    </div>
  )
}

const inputCls =
  "w-full h-12 rounded-xl px-3.5 bg-[#0D1526] border border-white/[0.07] text-[#E2E8F0] text-sm font-medium placeholder:text-[#334155] outline-none focus:border-cyan-500/50 focus:bg-[#111827] transition-all duration-200"

const formatInputRupiah = (value: string) => {
  const numeric = value.replace(/\D/g, "")
  return numeric ? new Intl.NumberFormat("id-ID").format(Number(numeric)) : ""
}

const parseInputRupiah = (value: string) => Number(value.replace(/\D/g, "")) || 0

const getTodayString = () => new Date().toISOString().split("T")[0]

export default function EditDebtSheet({
  debt,
  isOpen,
  onClose,
  onSaved,
  contacts,
  accounts,
  userId,
}: Props) {
  const [type, setType] = useState<DebtType>("piutang")
  const [contactId, setContactId] = useState("")
  const [contactSearch, setContactSearch] = useState("")
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [useInstallment, setUseInstallment] = useState(false)
  const [interestRate, setInterestRate] = useState("")
  const [interestType, setInterestType] = useState<InterestType>("flat")
  const [installmentCount, setInstallmentCount] = useState("12")
  const [startDate, setStartDate] = useState(getTodayString())
  const [loading, setLoading] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const hasPayments = (Number(debt?.paid_amount) || 0) > 0
  const isMetadataOnly = hasPayments

  useEffect(() => {
    if (!debt || !isOpen) return

    setType(debt.type)
    setContactId(debt.contact_id || contacts[0]?.id || "")
    setContactSearch("")
    setAccountId(debt.account_id || "")
    setAmount(formatInputRupiah(String(Number(debt.amount) || 0)))
    setDescription(debt.description ?? "")
    setDueDate(debt.due_date ?? "")
    setUseInstallment((Number(debt.installment_count) || 0) > 1 || (Number(debt.interest_rate) || 0) > 0)
    setInterestRate(String(Number(debt.interest_rate) || 0))
    setInterestType(debt.interest_type === "efektif" ? "efektif" : "flat")
    setInstallmentCount(String(Number(debt.installment_count) || 1))
    setStartDate(debt.start_date || getTodayString())
    setShowCloseConfirm(false)
  }, [debt, isOpen, contacts])

  const amountNumeric = useMemo(() => parseInputRupiah(amount), [amount])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accounts, accountId]
  )

  const selectedAccountBalance = Number(selectedAccount?.balance) || 0
  const originalPrincipal = Number(debt?.amount) || 0

  const availableBalanceForSelectedAccount = useMemo(() => {
    if (!selectedAccount) return 0
    if (!debt || isMetadataOnly) return selectedAccountBalance

    let base = selectedAccountBalance

    if (debt.account_id && debt.account_id === selectedAccount.id) {
      if (debt.type === "piutang") {
        base += originalPrincipal
      } else if (debt.type === "hutang") {
        base -= originalPrincipal
      }
    }

    return base
  }, [selectedAccount, debt, isMetadataOnly, selectedAccountBalance, originalPrincipal])

  const isInsufficientFunds = useMemo(() => {
    if (isMetadataOnly) return false
    return (
      type === "piutang" &&
      !!accountId &&
      !!selectedAccount &&
      amountNumeric > availableBalanceForSelectedAccount
    )
  }, [
    isMetadataOnly,
    type,
    accountId,
    selectedAccount,
    amountNumeric,
    availableBalanceForSelectedAccount,
  ])

  const predictedBalanceAfterSave = useMemo(() => {
    if (!selectedAccount || isMetadataOnly) return null

    if (type === "piutang") {
      return availableBalanceForSelectedAccount - amountNumeric
    }

    return availableBalanceForSelectedAccount + amountNumeric
  }, [
    selectedAccount,
    isMetadataOnly,
    type,
    availableBalanceForSelectedAccount,
    amountNumeric,
  ])

  const isOverLimit = amountNumeric > 999_999_999_999

  const isDueDateInPast = useMemo(() => {
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return due < today
  }, [dueDate])

  const filteredContacts = useMemo(() => {
    const keyword = contactSearch.trim().toLowerCase()
    if (!keyword) return contacts

    return contacts.filter((contact) => {
      const name = contact.name.toLowerCase()
      const phone = contact.phone?.toLowerCase() ?? ""
      return name.includes(keyword) || phone.includes(keyword)
    })
  }, [contactSearch, contacts])

  const installmentPreview = useMemo(() => {
    if (isMetadataOnly || !useInstallment || amountNumeric <= 0) return null

    const count = Math.min(360, Math.max(1, parseInt(installmentCount) || 1))
    const rate = Math.min(100, Math.max(0, parseFloat(interestRate) || 0))

    let monthly = 0
    let totalInterest = 0
    let totalPayment = 0

    if (interestType === "flat") {
      const monthlyRate = rate / 100
      const monthlyInterest = Math.round(amountNumeric * monthlyRate)
      const monthlyPrincipal = Math.round(amountNumeric / count)
      monthly = monthlyPrincipal + monthlyInterest
      totalInterest = monthlyInterest * count
      totalPayment = amountNumeric + totalInterest
    } else {
      const monthlyRate = rate / 100 / 12

      if (monthlyRate === 0) {
        monthly = Math.ceil(amountNumeric / count)
        totalPayment = monthly * count
        totalInterest = totalPayment - amountNumeric
      } else {
        const annuity = Math.ceil(
          (amountNumeric * monthlyRate * Math.pow(1 + monthlyRate, count)) /
            (Math.pow(1 + monthlyRate, count) - 1)
        )
        monthly = annuity
        totalPayment = monthly * count
        totalInterest = totalPayment - amountNumeric
      }
    }

    return {
      count,
      monthly,
      totalInterest,
      totalPayment,
    }
  }, [
    amountNumeric,
    installmentCount,
    interestRate,
    interestType,
    isMetadataOnly,
    useInstallment,
  ])

  const initialState = useMemo(() => {
    if (!debt) return null

    return {
      type: debt.type,
      contactId: debt.contact_id || contacts[0]?.id || "",
      accountId: debt.account_id || "",
      amount: formatInputRupiah(String(Number(debt.amount) || 0)),
      description: debt.description ?? "",
      dueDate: debt.due_date ?? "",
      useInstallment:
        (Number(debt.installment_count) || 0) > 1 ||
        (Number(debt.interest_rate) || 0) > 0,
      interestRate: String(Number(debt.interest_rate) || 0),
      interestType: debt.interest_type === "efektif" ? "efektif" : "flat",
      installmentCount: String(Number(debt.installment_count) || 1),
      startDate: debt.start_date || getTodayString(),
    }
  }, [debt, contacts])

  const isDirty = useMemo(() => {
    if (!initialState) return false

    return (
      type !== initialState.type ||
      contactId !== initialState.contactId ||
      accountId !== initialState.accountId ||
      amount !== initialState.amount ||
      description !== initialState.description ||
      dueDate !== initialState.dueDate ||
      useInstallment !== initialState.useInstallment ||
      interestRate !== initialState.interestRate ||
      interestType !== initialState.interestType ||
      installmentCount !== initialState.installmentCount ||
      startDate !== initialState.startDate
    )
  }, [
    accountId,
    amount,
    contactId,
    description,
    dueDate,
    initialState,
    installmentCount,
    interestRate,
    interestType,
    startDate,
    type,
    useInstallment,
  ])

  const isValid = useMemo(() => {
    if (!debt) return false
    if (!contactId) return false
    if (isDueDateInPast) return false

    if (isMetadataOnly) {
      return true
    }

    if (amountNumeric <= 0 || isOverLimit) return false
    if (isInsufficientFunds) return false

    return true
  }, [
    contactId,
    debt,
    amountNumeric,
    isDueDateInPast,
    isInsufficientFunds,
    isMetadataOnly,
    isOverLimit,
  ])

  const handleAmountChange = (value: string) => {
    const numeric = value.replace(/\D/g, "")
    setAmount(numeric ? new Intl.NumberFormat("id-ID").format(Number(numeric)) : "")
  }

  const handleCloseRequest = useCallback(() => {
    if (loading) return

    if (isDirty) {
      setShowCloseConfirm(true)
      return
    }

    onClose()
  }, [isDirty, loading, onClose])

  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        if (showCloseConfirm) {
          setShowCloseConfirm(false)
        } else {
          handleCloseRequest()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleCloseRequest, isOpen, loading, showCloseConfirm])

  const handleSubmit = async () => {
    if (!debt || !isValid || loading) return

    setLoading(true)

    try {
      const count = Math.max(1, parseInt(installmentCount) || 1)
      const rate = parseFloat(interestRate) || 0

      await updateDebtRecord({
        userId,
        debtId: debt.id,
        contactId: contactId || null,
        type: isMetadataOnly ? null : type,
        amount: isMetadataOnly ? null : amountNumeric,
        accountId: isMetadataOnly ? null : accountId || null,
        clearAccount: !isMetadataOnly && !accountId && !!debt.account_id,
        description,
        dueDate: dueDate || null,
        interestRate: isMetadataOnly ? null : useInstallment ? rate : 0,
        interestType: isMetadataOnly ? null : useInstallment ? interestType : "flat",
        installmentCount: isMetadataOnly ? null : useInstallment ? count : 1,
        startDate: isMetadataOnly ? null : useInstallment ? startDate : null,
      })

      toast.success(
        isMetadataOnly
          ? "Debt berhasil diperbarui (metadata)"
          : "Debt berhasil diperbarui",
        {
          style: {
            background: "#0D1526",
            color: "#F1F5F9",
            border: "1px solid #10B981",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "600",
          },
        }
      )

      await onSaved?.()
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
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: "blur(8px)" }}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-debt-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[94vh] flex-col overflow-hidden rounded-t-[28px] bg-[#0B1120] shadow-[0_-32px_80px_-10px_rgba(0,0,0,0.7)] outline-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            tabIndex={-1}
          >
            <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />

            <div className="flex justify-center shrink-0 pb-1 pt-3">
              <div className="h-1 w-9 rounded-full bg-white/10" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div>
                <h2
                  id="edit-debt-title"
                  className="text-base font-bold tracking-tight text-[#F1F5F9]"
                >
                  Edit Data
                </h2>
                <p className="mt-0.5 text-[11px] text-[#475569]">
                  {isMetadataOnly
                    ? "Mode metadata-only karena sudah ada pembayaran"
                    : "Full edit karena belum ada pembayaran"}
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

            <div
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-6 pt-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div
                className={cn(
                  "rounded-2xl border p-4",
                  isMetadataOnly
                    ? "border-amber-500/15 bg-amber-500/10"
                    : "border-emerald-500/15 bg-emerald-500/10"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                      isMetadataOnly
                        ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                        : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    )}
                  >
                    <PencilLine size={16} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white">
                      {isMetadataOnly ? "Edit terbatas" : "Edit penuh diizinkan"}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#CBD5E1]">
                      {isMetadataOnly
                        ? "Debt ini sudah punya pembayaran. Kamu hanya bisa mengubah kontak, jatuh tempo, dan keterangan."
                        : "Debt ini belum punya pembayaran. Kamu bisa mengubah nominal, bunga, tenor, akun, dan data lainnya."}
                    </p>
                  </div>
                </div>
              </div>

              <Field label="Kontak">
                <div className="space-y-2">
                  {contacts.length > 5 ? (
                    <div className="relative">
                      <Search
                        size={13}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475569]"
                      />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(event) => setContactSearch(event.target.value)}
                        placeholder="Cari kontak..."
                        className={cn(inputCls, "h-10 pl-10 text-[13px]")}
                      />
                    </div>
                  ) : null}

                  <div className="relative">
                    <User
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                    />
                    <select
                      value={contactId}
                      onChange={(event) => setContactId(event.target.value)}
                      className={cn(inputCls, "appearance-none pl-9 pr-8 text-[13px]")}
                    >
                      {filteredContacts.length === 0 ? (
                        <option value="">Tidak ada kontak ditemukan</option>
                      ) : null}

                      {filteredContacts.map((contact) => (
                        <option key={contact.id} value={contact.id} className="bg-[#0D1526]">
                          {contact.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#475569]"
                    />
                  </div>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipe">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.05] bg-[#0D1526] p-1">
                    {(["piutang", "hutang"] as const).map((item) => {
                      const active = type === item
                      const isPiutang = item === "piutang"

                      return (
                        <button
                          key={item}
                          type="button"
                          disabled={isMetadataOnly}
                          onClick={() => setType(item)}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all",
                            isMetadataOnly && "cursor-not-allowed opacity-50",
                            active
                              ? isPiutang
                                ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-400"
                                : "border-rose-500/25 bg-rose-500/15 text-rose-400"
                              : "border-transparent text-[#475569]"
                          )}
                        >
                          {isPiutang ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isPiutang ? "Piutang" : "Hutang"}
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <ModernDatePicker
                  value={dueDate}
                  onChange={setDueDate}
                  label="Jatuh Tempo"
                  isInvalid={isDueDateInPast}
                  errorMessage="Tanggal jatuh tempo tidak boleh di masa lalu"
                  placeholder="Pilih tanggal"
                />
              </div>

              <Field label="Jumlah">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-[#475569]">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    placeholder="0"
                    disabled={isMetadataOnly}
                    className={cn(
                      "h-14 w-full rounded-xl border bg-[#0D1526] pl-14 pr-4 text-2xl font-black tabular-nums text-[#F1F5F9] outline-none transition-all placeholder:text-[#1E293B]",
                      isMetadataOnly && "cursor-not-allowed opacity-60",
                      isOverLimit
                        ? "border-rose-500/60 focus:border-rose-500"
                        : "border-white/[0.07] focus:border-cyan-500/50"
                    )}
                  />
                </div>

                {isOverLimit ? (
                  <p className="flex items-center gap-1 text-[11px] text-rose-400">
                    <AlertCircle size={11} /> Jumlah melebihi batas maksimum
                  </p>
                ) : null}
              </Field>

              <Field label="Akun" optional>
                <div className="space-y-1.5">
                  <div className="relative">
                    <CreditCard
                      size={13}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                    />
                    <select
                      value={accountId}
                      onChange={(event) => setAccountId(event.target.value)}
                      disabled={isMetadataOnly}
                      className={cn(
                        inputCls,
                        "appearance-none pl-9 pr-8 text-[13px]",
                        isMetadataOnly && "cursor-not-allowed opacity-60",
                        isInsufficientFunds && "border-rose-500/60 text-rose-300"
                      )}
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

                  {!isMetadataOnly && selectedAccount ? (
                    <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#64748B]">
                        Saldo tersedia untuk edit
                      </p>
                      <p className="mt-1 text-sm font-black tabular-nums text-white">
                        {formatRupiah(availableBalanceForSelectedAccount)}
                      </p>

                      {predictedBalanceAfterSave !== null ? (
                        <p
                          className={cn(
                            "mt-1 text-[11px] font-medium",
                            predictedBalanceAfterSave < 0 ? "text-rose-400" : "text-[#94A3B8]"
                          )}
                        >
                          Saldo setelah simpan: {formatRupiah(predictedBalanceAfterSave)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {isInsufficientFunds ? (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1 text-[11px] text-rose-400"
                    >
                      <AlertCircle size={11} />
                      Dana akun Anda tidak mencukupi. Saldo tersedia{" "}
                      {formatRupiah(availableBalanceForSelectedAccount)}.
                    </motion.p>
                  ) : null}
                </div>
              </Field>

              <Field label="Keterangan">
                <div className="relative">
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value.slice(0, 120))}
                    placeholder="Misal: Modal, Pinjaman barang, dll"
                    className={inputCls}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-[#334155]">
                    {description.length}/120
                  </span>
                </div>
              </Field>

              <motion.button
                whileTap={{ scale: isMetadataOnly ? 1 : 0.99 }}
                onClick={() => !isMetadataOnly && setUseInstallment((prev) => !prev)}
                aria-expanded={useInstallment}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border p-4 transition-all",
                  isMetadataOnly && "cursor-not-allowed opacity-60",
                  useInstallment
                    ? "border-violet-500/20 bg-violet-500/10"
                    : "border-white/[0.05] bg-[#0D1526] hover:border-white/[0.09]"
                )}
              >
                <div className="text-left">
                  <p
                    className={cn(
                      "text-sm font-bold",
                      useInstallment ? "text-violet-300" : "text-[#CBD5E1]"
                    )}
                  >
                    Cicilan &amp; Bunga
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#475569]">
                    Flat = % per bulan, Efektif = % per tahun
                  </p>
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
                        <Field
                          label={
                            interestType === "flat"
                              ? "Bunga / Bulan"
                              : "Bunga / Tahun"
                          }
                        >
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={interestRate}
                              onChange={(event) => setInterestRate(event.target.value)}
                              placeholder="0"
                              disabled={isMetadataOnly}
                              className={cn(
                                inputCls,
                                "pr-12",
                                isMetadataOnly && "cursor-not-allowed opacity-60"
                              )}
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
                              disabled={isMetadataOnly}
                              className={cn(
                                inputCls,
                                "pr-10",
                                isMetadataOnly && "cursor-not-allowed opacity-60"
                              )}
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
                              onClick={() => !isMetadataOnly && setInterestType("flat")}
                              disabled={isMetadataOnly}
                              aria-pressed={interestType === "flat"}
                              className={cn(
                                "min-h-[68px] rounded-xl border px-3 py-3 text-left transition-all",
                                isMetadataOnly && "cursor-not-allowed opacity-60",
                                interestType === "flat"
                                  ? "border-amber-400/25 bg-amber-500/15 text-amber-300"
                                  : "border-transparent text-[#64748B] hover:text-[#CBD5E1]"
                              )}
                            >
                              <p className="text-sm font-bold">Flat</p>
                              <p className="mt-0.5 text-[10px] leading-relaxed text-inherit/80">
                                Dari pokok awal, % per bulan
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => !isMetadataOnly && setInterestType("efektif")}
                              disabled={isMetadataOnly}
                              aria-pressed={interestType === "efektif"}
                              className={cn(
                                "min-h-[68px] rounded-xl border px-3 py-3 text-left transition-all",
                                isMetadataOnly && "cursor-not-allowed opacity-60",
                                interestType === "efektif"
                                  ? "border-violet-400/25 bg-violet-500/15 text-violet-300"
                                  : "border-transparent text-[#64748B] hover:text-[#CBD5E1]"
                              )}
                            >
                              <p className="text-sm font-bold">Efektif</p>
                              <p className="mt-0.5 text-[10px] leading-relaxed text-inherit/80">
                                Dari sisa pokok, % per tahun
                              </p>
                            </button>
                          </div>
                        </Field>

                        <ModernDatePicker
                          value={startDate}
                          onChange={setStartDate}
                          label="Tanggal Mulai"
                          placeholder="Pilih tanggal"
                        />
                      </div>

                      {installmentPreview ? (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-violet-500/20 bg-[#0D1526] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                              Preview Setelah Edit
                            </p>
                            <span className="rounded-full bg-[#151E32] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                              {interestType === "flat" ? "Flat Bulanan" : "Anuitas Tahunan"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {[
                              {
                                label: "Angsuran/bln",
                                value: formatRupiah(installmentPreview.monthly),
                                color: "text-white",
                              },
                              {
                                label: "Total bunga",
                                value: formatRupiah(installmentPreview.totalInterest),
                                color: "text-rose-400",
                              },
                              {
                                label: "Total bayar",
                                value: formatRupiah(installmentPreview.totalPayment),
                                color: "text-sky-300",
                              },
                              {
                                label: "Tenor",
                                value: `${installmentPreview.count} bulan`,
                                color: "text-white",
                              },
                            ].map((row) => (
                              <div key={row.label}>
                                <p className="mb-0.5 text-[10px] text-[#475569]">{row.label}</p>
                                <p className={cn("text-sm font-black tabular-nums", row.color)}>
                                  {row.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <motion.button
                onClick={handleSubmit}
                disabled={!isValid || loading || isOverLimit || isInsufficientFunds}
                whileTap={
                  isValid && !loading && !isOverLimit && !isInsufficientFunds
                    ? { scale: 0.97 }
                    : {}
                }
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all",
                  isValid && !loading && !isOverLimit && !isInsufficientFunds
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30"
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
                    <PencilLine size={15} />
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
                  className="fixed inset-0 z-[90] bg-black/50"
                  aria-hidden="true"
                />

                <motion.div
                  role="alertdialog"
                  aria-labelledby="edit-confirm-title"
                  aria-describedby="edit-confirm-desc"
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 16 }}
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="fixed inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-[100] rounded-2xl border border-white/[0.08] bg-[#111827] p-5 shadow-2xl"
                >
                  <p
                    id="edit-confirm-title"
                    className="mb-1 text-sm font-bold text-[#F1F5F9]"
                  >
                    Buang perubahan?
                  </p>
                  <p id="edit-confirm-desc" className="mb-5 text-xs text-[#64748B]">
                    Perubahan pada debt ini akan dibatalkan.
                  </p>

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