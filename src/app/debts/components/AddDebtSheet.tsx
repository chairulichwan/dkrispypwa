//src\app\debts\components\AddDebtSheet.tsx


"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Loader2,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  User,
  UserPlus,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import { createDebtRecord } from "@/lib/debts"
import { cn, formatRupiah } from "@/lib/utils"
import type { DebtAccountItem } from "../types"
import { useAddDebtForm, type AddDebtContactItem } from "./useAddDebtForm"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void | Promise<void>
  contacts: AddDebtContactItem[]
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
  "w-full h-12 rounded-xl px-3.5 bg-[#0D1526] border border-white/[0.07] text-[#E2E8F0] text-sm font-medium placeholder:text-[#334155] outline-none focus:border-cyan-500/50 focus:bg-[#111827] transition-all duration-200"

export default function AddDebtSheet({
  isOpen,
  onClose,
  onSuccess,
  contacts,
  accounts,
  userId,
}: Props) {
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const {
    type,
    setType,
    contactId,
    setContactId,
    newContactName,
    setNewContactName,
    isNewContact,
    contactSearch,
    setContactSearch,
    accountId,
    setAccountId,
    amount,
    description,
    setDescription,
    dueDate,
    setDueDate,
    useInstallment,
    setUseInstallment,
    interestRate,
    setInterestRate,
    interestType,
    setInterestType,
    installmentCount,
    setInstallmentCount,
    startDate,
    setStartDate,
    loading,
    setLoading,
    amountNumeric,
    isOverLimit,
    isDueDateInPast,
    isDirty,
    isValid,
    filteredContacts,
    installmentPreview,
    reset,
    handleAmountChange,
    toggleIsNewContact,
  } = useAddDebtForm({ contacts })

  const noContactsAtAll = contacts.length === 0
  const noSearchResults = !isNewContact && contactSearch.trim() !== "" && filteredContacts.length === 0
  const noAccounts = accounts.length === 0

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accountId, accounts]
  )

  const selectedAccountBalance = Number(selectedAccount?.balance) || 0

  const isInsufficientFunds =
    type === "piutang" && !!accountId && !!selectedAccount && amountNumeric > selectedAccountBalance

  const amountCompact =
    amountNumeric >= 1_000_000
      ? `${(amountNumeric / 1_000_000).toFixed(amountNumeric % 1_000_000 === 0 ? 0 : 1)}jt`
      : amountNumeric >= 1_000
        ? `${(amountNumeric / 1_000).toFixed(0)}rb`
        : null

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
    reset()
    onClose()
  }, [onClose, reset])

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
    if (!isValid || loading || isOverLimit || isInsufficientFunds) return

    setLoading(true)

    try {
      const count = Math.max(1, parseInt(installmentCount, 10) || 1)
      const rate = parseFloat(interestRate) || 0
      const monthlyInstallment = installmentPreview?.monthly ?? 0

      await createDebtRecord({
        userId,
        type,
        amount: amountNumeric,
        contactId: isNewContact ? null : contactId,
        newContactName: isNewContact ? newContactName : null,
        accountId: accountId || null,
        description,
        dueDate: dueDate || null,
        useInstallment,
        interestRate: rate,
        interestType,
        installmentCount: count,
        installmentAmount: monthlyInstallment,
        startDate: useInstallment ? startDate : null,
      })

      toast.success(type === "piutang" ? "Piutang dicatat!" : "Hutang dicatat!", {
        style: {
          background: "#0D1526",
          color: "#F1F5F9",
          border: "1px solid #10B981",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: "600",
        },
      })

      reset()
      await onSuccess()
      onClose()
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Gagal menyimpan"
      const message =
        rawMessage.includes("Insufficient balance") ||
        rawMessage.includes("Saldo akun tidak cukup") ||
        rawMessage.includes("Dana akun tidak mencukupi")
          ? "Dana akun Anda tidak mencukupi"
          : rawMessage

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

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseRequest}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            style={{ WebkitBackdropFilter: "blur(8px)" }}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-debt-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[94vh] flex-col overflow-hidden rounded-t-[28px] bg-[#0B1120] shadow-[0_-32px_80px_-10px_rgba(0,0,0,0.7)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-sky-500 via-violet-500 to-indigo-500" />

            <div className="flex justify-center shrink-0 pb-1 pt-3">
              <div className="h-1 w-9 rounded-full bg-white/10" />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div>
                <h2 id="add-debt-title" className="text-base font-bold tracking-tight text-[#F1F5F9]">
                  Tambah Catatan
                </h2>
                <p className="mt-0.5 text-[11px] text-[#475569]">Hutang atau piutang baru</p>
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
              className="relative flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-6 pt-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.05] bg-[#0D1526] p-1">
                {(["piutang", "hutang"] as const).map((item) => {
                  const active = type === item
                  const currentIsPiutang = item === "piutang"

                  return (
                    <motion.button
                      key={item}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setType(item)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all",
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

              <Field label="Jumlah">
                <div className="group relative">
                  <div
                    className={cn(
                      "pointer-events-none absolute -inset-1 rounded-2xl opacity-0 blur-xl transition-opacity duration-500",
                      isOverLimit
                        ? "bg-rose-500/20 group-focus-within:opacity-100"
                        : "bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 group-focus-within:opacity-100"
                    )}
                  />

                  <div className="relative">
                    <motion.span
                      animate={{
                        color:
                          amountNumeric > 0
                            ? isOverLimit
                              ? "#fb7185"
                              : "#22d3ee"
                            : "#475569",
                      }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 select-none text-xl font-black"
                    >
                      Rp
                    </motion.span>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(event) => handleAmountChange(event.target.value)}
                      placeholder="0"
                      aria-label="Jumlah hutang atau piutang"
                      aria-invalid={isOverLimit}
                      className={cn(
                        "h-16 w-full rounded-xl border-2 bg-[#0D1526] pl-14 pr-4 text-3xl font-black tabular-nums tracking-tight text-[#F1F5F9]",
                        "placeholder:text-2xl placeholder:font-bold placeholder:text-[#1E293B]",
                        "outline-none transition-all duration-300",
                        isOverLimit
                          ? "border-rose-500/60 focus:border-rose-500"
                          : "border-white/[0.07] focus:border-cyan-500/50 focus:bg-[#111827]"
                      )}
                    />

                    <AnimatePresence>
                      {amountCompact && !isOverLimit ? (
                        <motion.div
                          key={amountNumeric}
                          initial={{ opacity: 0, y: 5, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-400/80">
                            {amountCompact}
                          </span>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>

                {isOverLimit ? (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 flex items-center gap-1 text-[11px] text-rose-400"
                  >
                    <AlertCircle size={11} /> Jumlah melebihi batas maksimum
                  </motion.p>
                ) : null}
              </Field>

              <Field label="Kontak">
                <div className="mb-1.5 flex items-center justify-between">
                  <span />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleIsNewContact}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400"
                  >
                    {isNewContact ? (
                      <>
                        <ChevronDown size={11} />
                        Pilih kontak
                      </>
                    ) : (
                      <>
                        <UserPlus size={11} />
                        Kontak baru
                      </>
                    )}
                  </motion.button>
                </div>

                <AnimatePresence mode="wait">
                  {isNewContact ? (
                    <motion.div
                      key="new-contact"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="relative"
                    >
                      <User
                        size={14}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475569]"
                      />
                      <input
                        type="text"
                        value={newContactName}
                        onChange={(event) => setNewContactName(event.target.value)}
                        placeholder="Nama kontak baru"
                        className={cn(inputCls, "pl-10")}
                        autoFocus
                        aria-label="Nama kontak baru"
                      />
                    </motion.div>
                  ) : noContactsAtAll ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
                      <p className="text-sm font-semibold text-[#CBD5E1]">Belum ada kontak</p>
                      <p className="mt-1 text-xs text-[#475569]">Buat kontak baru untuk mulai mencatat hutang/piutang.</p>
                      <button
                        type="button"
                        onClick={toggleIsNewContact}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-400"
                      >
                        <UserPlus size={12} />
                        Buat kontak baru
                      </button>
                    </div>
                  ) : noSearchResults ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
                      <p className="text-sm font-semibold text-[#CBD5E1]">Kontak tidak ditemukan</p>
                      <p className="mt-1 text-xs text-[#475569]">
                        Tidak ada kontak dengan kata kunci &quot;{contactSearch}&quot;.
                      </p>
                      <button
                        type="button"
                        onClick={toggleIsNewContact}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-400"
                      >
                        <UserPlus size={12} />
                        Buat kontak baru
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      key="existing-contact"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-2"
                    >
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
                            aria-label="Cari kontak"
                          />
                        </div>
                      ) : null}

                      <div className="relative">
                        <select
                          value={contactId}
                          onChange={(event) => setContactId(event.target.value)}
                          className={cn(inputCls, "appearance-none pr-9")}
                          aria-label="Pilih kontak"
                        >
                          {filteredContacts.length === 0 ? <option value="">Tidak ada kontak ditemukan</option> : null}
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Akun" optional>
                  <div className="space-y-1.5">
                    <div className="relative">
                      <CreditCard
                        size={13}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                      />

                      {noAccounts ? (
                        <div className={cn(inputCls, "flex items-center pl-9 text-[13px] text-[#475569]")}>
                          Belum ada akun
                        </div>
                      ) : (
                        <>
                          <select
                            value={accountId}
                            onChange={(event) => setAccountId(event.target.value)}
                            className={cn(
                              inputCls,
                              "appearance-none pl-9 pr-8 text-[13px]",
                              isInsufficientFunds && "border-rose-500/60 text-rose-300"
                            )}
                            aria-label="Pilih akun"
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
                        </>
                      )}
                    </div>

                    {isInsufficientFunds ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1 text-[11px] text-rose-400"
                      >
                        <AlertCircle size={11} /> Dana akun Anda tidak mencukupi. Saldo tersedia {formatRupiah(selectedAccountBalance)}.
                      </motion.p>
                    ) : null}
                  </div>
                </Field>

                <Field label="Jatuh Tempo" optional>
                  <div className="space-y-1.5">
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
                        aria-label="Tanggal jatuh tempo"
                      />
                    </div>

                    {isDueDateInPast ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1 text-[11px] text-rose-400"
                      >
                        <AlertCircle size={11} /> Tanggal jatuh tempo tidak boleh di masa lalu
                      </motion.p>
                    ) : null}
                  </div>
                </Field>
              </div>

              <Field label="Keterangan">
                <div className="relative">
                  <input
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value.slice(0, 120))}
                    placeholder="Misal: Modal, Pinjaman barang, dll"
                    className={inputCls}
                    aria-label="Keterangan"
                  />
                  <span
                    className={cn(
                      "absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums transition-colors",
                      description.length > 100 ? "text-amber-400" : "text-[#334155]"
                    )}
                  >
                    {description.length}/120
                  </span>
                </div>
              </Field>

              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => setUseInstallment((prev: boolean) => !prev)}
                aria-expanded={useInstallment}
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
                              aria-label={interestType === "flat" ? "Suku bunga per bulan" : "Suku bunga per tahun"}
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
                              aria-label="Jumlah bulan cicilan"
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
                            aria-label="Tanggal mulai cicilan"
                          />
                        </Field>
                      </div>

                      {installmentPreview ? (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-violet-500/20 bg-[#0D1526] p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Preview Angsuran</p>
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
                                <p className={cn("text-sm font-black tabular-nums", row.color)}>{row.value}</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-3 border-t border-white/[0.06] pt-3">
                            <p className="text-[10px] leading-relaxed text-[#64748B]">
                              {interestType === "flat"
                                ? "Bunga flat dihitung dari pokok awal tetap, dengan rate bulanan."
                                : "Bunga efektif dihitung dari sisa pokok, dengan rate tahunan yang dikonversi ke bunga bulanan."}
                            </p>
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
                whileTap={isValid && !loading && !isOverLimit && !isInsufficientFunds ? { scale: 0.97 } : {}}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all",
                  isValid && !loading && !isOverLimit && !isInsufficientFunds
                    ? type === "piutang"
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
                    <Plus size={15} />
                    Simpan {type === "piutang" ? "Piutang" : "Hutang"}
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
                  className="fixed inset-0 z-[60] bg-black/50"
                  aria-hidden="true"
                />

                <motion.div
                  role="alertdialog"
                  aria-labelledby="confirm-add-debt-title"
                  aria-describedby="confirm-add-debt-desc"
                  initial={{ opacity: 0, scale: 0.92, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 16 }}
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="fixed inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-[60] rounded-2xl border border-white/[0.08] bg-[#111827] p-5 shadow-2xl"
                >
                  <p id="confirm-add-debt-title" className="mb-1 text-sm font-bold text-[#F1F5F9]">
                    Buang perubahan?
                  </p>
                  <p id="confirm-add-debt-desc" className="mb-5 text-xs text-[#64748B]">
                    Data yang sudah diisi akan hilang.
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