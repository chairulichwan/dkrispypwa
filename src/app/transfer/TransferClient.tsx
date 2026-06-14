// src/app/transfer/TransferClient.tsx
"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import toast from "react-hot-toast"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Search,
  X,
} from "lucide-react"

import { ACCOUNT_STYLE, type AccountType } from "@/app/dashboard/types"
import { ROUTES } from "@/lib/routes"
import { performTransfer } from "@/lib/transfer"
import { cn, formatRupiah } from "@/lib/utils"

interface Account {
  id: string
  name: string
  type: string
  balance: number
  account_number?: string | null
  is_default?: boolean
}

interface Props {
  user: { id: string; email?: string }
  accounts: Account[]
  preselectedFromId?: string
}

type TransferStep = "select" | "confirm" | "success"

interface TransferForm {
  fromAccountId: string
  toAccountId: string
  amount: string
  note: string
}

const formatInputRupiah = (value: string): string => {
  const numeric = value.replace(/\D/g, "")
  if (!numeric) return ""
  return new Intl.NumberFormat("id-ID").format(Number(numeric))
}

const parseInputRupiah = (formatted: string): number => {
  return Number(formatted.replace(/\D/g, "")) || 0
}

export default function TransferClient({ user, accounts, preselectedFromId }: Props) {
  const router = useRouter()

  const [step, setStep] = useState<TransferStep>("select")
  const [loading, setLoading] = useState(false)
  const [showFromSelector, setShowFromSelector] = useState(false)
  const [showToSelector, setShowToSelector] = useState(false)
  const [searchFrom, setSearchFrom] = useState("")
  const [searchTo, setSearchTo] = useState("")
  const [form, setForm] = useState<TransferForm>({
    fromAccountId: preselectedFromId || (accounts[0]?.id ?? ""),
    toAccountId: "",
    amount: "",
    note: "",
  })

  const availableFromAccounts = useMemo(
    () => accounts.filter((account) => account.id !== form.toAccountId),
    [accounts, form.toAccountId]
  )

  const availableToAccounts = useMemo(
    () => accounts.filter((account) => account.id !== form.fromAccountId),
    [accounts, form.fromAccountId]
  )

  const fromAccount = accounts.find((account) => account.id === form.fromAccountId)
  const toAccount = accounts.find((account) => account.id === form.toAccountId)

  const amountNumeric = parseInputRupiah(form.amount)
  const fromBalance = fromAccount?.balance ?? 0
  const hasSufficientBalance = amountNumeric > 0 && amountNumeric <= fromBalance
  const isFormValid = !!fromAccount && !!toAccount && hasSufficientBalance

  const filteredFromAccounts = useMemo(() => {
    if (!searchFrom.trim()) return availableFromAccounts
    const query = searchFrom.toLowerCase()
    return availableFromAccounts.filter(
      (account) =>
        account.name.toLowerCase().includes(query) ||
        (account.account_number?.includes(query) ?? false) ||
        account.type.toLowerCase().includes(query)
    )
  }, [availableFromAccounts, searchFrom])

  const filteredToAccounts = useMemo(() => {
    if (!searchTo.trim()) return availableToAccounts
    const query = searchTo.toLowerCase()
    return availableToAccounts.filter(
      (account) =>
        account.name.toLowerCase().includes(query) ||
        (account.account_number?.includes(query) ?? false) ||
        account.type.toLowerCase().includes(query)
    )
  }, [availableToAccounts, searchTo])

  const handleSelectFrom = (accountId: string) => {
    setForm((prev) => ({ ...prev, fromAccountId: accountId }))
    setShowFromSelector(false)
    setSearchFrom("")
  }

  const handleSelectTo = (accountId: string) => {
    setForm((prev) => ({ ...prev, toAccountId: accountId }))
    setShowToSelector(false)
    setSearchTo("")
  }

  const handleTransfer = async () => {
    if (!isFormValid || loading || !fromAccount || !toAccount) return

    setLoading(true)

    try {
      await performTransfer({
        userId: user.id,
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount: amountNumeric,
        note: form.note,
        fromAccountName: fromAccount.name,
        toAccountName: toAccount.name,
      })

      setStep("success")
      router.refresh()

      toast.success("Transfer berhasil! 💸", {
        duration: 3000,
        style: { background: "#1e293b", color: "#fff", border: "1px solid #22c55e" },
      })

      setTimeout(() => {
        router.push(ROUTES.dashboard)
        router.refresh()
      }, 1800)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal melakukan transfer"
      toast.error(message, {
        style: { background: "#1e293b", color: "#fff", border: "1px solid #ef4444" },
      })
    } finally {
      setLoading(false)
    }
  }

  const renderAccountItem = (
    account: Account,
    onSelect: (id: string) => void,
    isSelected: boolean
  ) => {
    const style = ACCOUNT_STYLE[account.type as AccountType] ?? ACCOUNT_STYLE.rekening

    return (
      <button
        key={account.id}
        onClick={() => onSelect(account.id)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
          isSelected
            ? "bg-violet-500/20 border border-violet-400/30"
            : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
        )}
      >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08]", style.iconBg)}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold truncate">{account.name}</p>
          <p className="text-slate-500 text-[10px] truncate">
            {style.label}
            {account.account_number ? ` • ${account.account_number.slice(-4)}` : ""}
          </p>
        </div>
        <p className="text-emerald-400 text-sm font-bold tabular-nums">{formatRupiah(account.balance ?? 0)}</p>
      </button>
    )
  }

  return (
    <main
      className="min-h-screen pb-10 relative"
      style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #060b14 100%)" }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-500/20 blur-[100px]" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 rounded-full bg-amber-500/20 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-30 px-5 pt-12 pb-4 backdrop-blur-2xl bg-[#060b14]/70 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.dashboard} className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
            <ArrowLeft size={18} className="text-white" />
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">Transfer</h1>
            <p className="text-slate-500 text-[11px]">
              {step === "select" && "Pilih akun & nominal"}
              {step === "confirm" && "Konfirmasi transfer"}
              {step === "success" && "Berhasil!"}
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 mt-6">
        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                  Dari Akun
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowFromSelector((prev) => !prev)
                      setShowToSelector(false)
                      setSearchFrom("")
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-left hover:bg-white/[0.06] transition-colors"
                  >
                    {fromAccount ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08]",
                            (ACCOUNT_STYLE[fromAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).iconBg
                          )}>
                            {(ACCOUNT_STYLE[fromAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).icon}
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold">{fromAccount.name}</p>
                            <p className="text-slate-500 text-[10px]">
                              Saldo: <span className="text-emerald-400 font-bold">{formatRupiah(fromAccount.balance)}</span>
                            </p>
                          </div>
                        </div>
                        <ChevronDown size={16} className="text-slate-500" />
                      </>
                    ) : (
                      <span className="text-slate-500">Pilih akun sumber</span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showFromSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-40 w-full mt-2 rounded-2xl bg-slate-900/95 border border-white/[0.1] backdrop-blur-xl shadow-2xl max-h-72 overflow-hidden"
                      >
                        <div className="p-3 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04]">
                            <Search size={16} className="text-slate-400" />
                            <input
                              type="text"
                              placeholder="Cari akun..."
                              value={searchFrom}
                              onChange={(event) => setSearchFrom(event.target.value)}
                              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                              autoFocus
                            />
                            {searchFrom && (
                              <button onClick={() => setSearchFrom("")} className="p-1">
                                <X size={14} className="text-slate-500" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                          {filteredFromAccounts.map((account) =>
                            renderAccountItem(account, handleSelectFrom, account.id === form.fromAccountId)
                          )}
                          {filteredFromAccounts.length === 0 && (
                            <p className="px-4 py-3 text-center text-slate-500 text-sm">Akun tidak ditemukan</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                  <ArrowRightLeft size={18} className="text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                  Ke Akun
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowToSelector((prev) => !prev)
                      setShowFromSelector(false)
                      setSearchTo("")
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-left hover:bg-white/[0.06] transition-colors"
                  >
                    {toAccount ? (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08]",
                            (ACCOUNT_STYLE[toAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).iconBg
                          )}>
                            {(ACCOUNT_STYLE[toAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).icon}
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold">{toAccount.name}</p>
                            <p className="text-slate-500 text-[10px]">
                              {(ACCOUNT_STYLE[toAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).label}
                            </p>
                          </div>
                        </div>
                        <ChevronDown size={16} className="text-slate-500" />
                      </>
                    ) : (
                      <span className="text-slate-500">Pilih akun tujuan</span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showToSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-40 w-full mt-2 rounded-2xl bg-slate-900/95 border border-white/[0.1] backdrop-blur-xl shadow-2xl max-h-72 overflow-hidden"
                      >
                        <div className="p-3 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04]">
                            <Search size={16} className="text-slate-400" />
                            <input
                              type="text"
                              placeholder="Cari akun..."
                              value={searchTo}
                              onChange={(event) => setSearchTo(event.target.value)}
                              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                              autoFocus
                            />
                            {searchTo && (
                              <button onClick={() => setSearchTo("")} className="p-1">
                                <X size={14} className="text-slate-500" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                          {filteredToAccounts.map((account) =>
                            renderAccountItem(account, handleSelectTo, account.id === form.toAccountId)
                          )}
                          {filteredToAccounts.length === 0 && (
                            <p className="px-4 py-3 text-center text-slate-500 text-sm">Akun tidak ditemukan</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                  Nominal Transfer
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, amount: formatInputRupiah(event.target.value) }))
                    }
                    placeholder="0"
                    className={cn(
                      "w-full h-16 rounded-2xl pl-14 pr-4 bg-white/[0.04] border text-white",
                      "text-2xl font-black tabular-nums placeholder:text-slate-700",
                      "placeholder:font-normal placeholder:text-base outline-none transition-all",
                      amountNumeric > fromBalance
                        ? "border-rose-500/50 focus:border-rose-400"
                        : "border-white/[0.08] focus:border-amber-400/40"
                    )}
                  />
                </div>

                {amountNumeric > fromBalance && (
                  <p className="text-rose-400 text-[11px] mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={12} /> Saldo tidak mencukupi
                  </p>
                )}

                {fromAccount && (
                  <p className="text-slate-500 text-[11px] mt-1">
                    Sisa saldo: <span className="text-slate-300">{formatRupiah(Math.max(0, fromBalance - amountNumeric))}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                  Catatan <span className="text-slate-600 normal-case font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value.slice(0, 100) }))}
                  placeholder="Contoh: Transfer bulanan"
                  maxLength={100}
                  className="w-full h-14 rounded-2xl px-4 bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-slate-600 outline-none focus:border-amber-400/40 transition-all"
                />
              </div>

              <motion.button
                onClick={() => isFormValid && setStep("confirm")}
                disabled={!isFormValid || loading}
                whileTap={isFormValid && !loading ? { scale: 0.98 } : {}}
                className={cn(
                  "w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border",
                  isFormValid && !loading
                    ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white shadow-[0_10px_30px_rgba(245,158,11,0.35)] border-amber-400/30"
                    : "bg-white/[0.04] text-slate-600 border-white/[0.06] cursor-not-allowed"
                )}
              >
                Lanjutkan <ArrowRightLeft size={16} />
              </motion.button>
            </motion.div>
          )}

          {step === "confirm" && fromAccount && toAccount && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="rounded-3xl p-5 border backdrop-blur-xl bg-gradient-to-br from-violet-500/20 to-amber-500/10 border-violet-400/30 relative overflow-hidden">
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 pointer-events-none"
                  style={{ background: "#8b5cf6" }}
                />

                <div className="relative text-center">
                  <p className="text-slate-400 text-xs mb-1">Kamu akan mentransfer</p>
                  <p className="text-white font-black text-3xl tabular-nums">{formatRupiah(amountNumeric)}</p>
                </div>

                <div className="relative flex items-center justify-center gap-4 mt-6">
                  <div className="text-center">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border border-white/[0.08] mb-2",
                      (ACCOUNT_STYLE[fromAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).iconBg
                    )}>
                      {(ACCOUNT_STYLE[fromAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).icon}
                    </div>
                    <p className="text-white text-sm font-bold">{fromAccount.name}</p>
                    <p className="text-rose-400 text-[11px] font-bold">- {formatRupiah(amountNumeric)}</p>
                  </div>

                  <ArrowRightLeft size={20} className="text-slate-500" />

                  <div className="text-center">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border border-white/[0.08] mb-2",
                      (ACCOUNT_STYLE[toAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).iconBg
                    )}>
                      {(ACCOUNT_STYLE[toAccount.type as AccountType] ?? ACCOUNT_STYLE.rekening).icon}
                    </div>
                    <p className="text-white text-sm font-bold">{toAccount.name}</p>
                    <p className="text-emerald-400 text-[11px] font-bold">+ {formatRupiah(amountNumeric)}</p>
                  </div>
                </div>

                {form.note && (
                  <div className="relative mt-5 pt-4 border-t border-white/[0.1]">
                    <p className="text-slate-400 text-[11px] uppercase tracking-wider mb-1">Catatan</p>
                    <p className="text-white text-sm">{form.note}</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/[0.1] border border-amber-500/20">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-400/90 text-[11px] leading-relaxed">
                  Transfer ini <strong>tidak dapat dibatalkan</strong> setelah dikonfirmasi.
                  Pastikan akun tujuan sudah benar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep("select")}
                  disabled={loading}
                  className="py-4 rounded-2xl bg-white/[0.06] text-slate-300 text-sm font-semibold hover:bg-white/[0.1] transition-all disabled:opacity-50"
                >
                  Kembali
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTransfer}
                  disabled={loading}
                  className="py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Memproses...
                    </>
                  ) : (
                    "✅ Konfirmasi Transfer"
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_20px_60px_rgba(16,185,129,0.4)]"
              >
                <Check size={40} className="text-white" strokeWidth={3} />
              </motion.div>

              <h2 className="text-white font-black text-2xl mt-8">Transfer Berhasil!</h2>
              <p className="text-slate-400 text-sm mt-2 text-center">
                {formatRupiah(amountNumeric)} telah ditransfer
                <br />
                dari {fromAccount?.name} ke {toAccount?.name}
              </p>
              <p className="text-slate-500 text-[11px] mt-6">Mengalihkan ke dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}



