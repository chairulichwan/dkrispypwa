//src/components/QuickAddFAB.tsx

"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  ArrowRightLeft,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"

import { ROUTES, transferFromHref } from "@/lib/routes"
import { recordQuickTransaction } from "@/lib/transactions"
import { cn, formatRupiah } from "@/lib/utils"

interface AccountLike {
  id: string
  name: string
  type: string
  balance: number | null
}

interface Props {
  accounts: AccountLike[]
  userId: string
  onSuccess?: () => void | Promise<void>
}

type QuickType = "income" | "expense"

const ACTIONS = [
  {
    id: "income" as const,
    label: "Pemasukan",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-teal-500",
    activeBg: "bg-emerald-500/15 border-emerald-400/25 text-emerald-300",
  },
  {
    id: "expense" as const,
    label: "Pengeluaran",
    icon: TrendingDown,
    gradient: "from-rose-500 to-pink-600",
    activeBg: "bg-rose-500/15 border-rose-400/25 text-rose-300",
  },
] as const

function formatInputRupiah(value: string): string {
  const numeric = value.replace(/\D/g, "")
  if (!numeric) return ""
  return new Intl.NumberFormat("id-ID").format(Number(numeric))
}

function parseInputRupiah(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0
}

function triggerHaptic(style: "light" | "medium" = "light") {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(style === "light" ? 8 : 15)
  }
}

export default function QuickAddFAB({ accounts, userId, onSuccess }: Props) {
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [txType, setTxType] = useState<QuickType>("expense")
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accountId && accounts[0]?.id) {
      setAccountId(accounts[0].id)
    }
  }, [accountId, accounts])

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accounts, accountId]
  )

  const amountNumeric = parseInputRupiah(amount)
  const hasAccounts = accounts.length > 0
  const canSubmit = hasAccounts && !!accountId && amountNumeric > 0 && !loading

  const resetForm = () => {
    setAmount("")
    setNote("")
    setAccountId(accounts[0]?.id ?? "")
  }

  const openSheet = (type: QuickType) => {
    triggerHaptic("medium")
    setTxType(type)
    setOpen(false)
    setSheetOpen(true)
    resetForm()
  }

  const closeSheet = () => {
    if (loading) return
    triggerHaptic("light")
    setSheetOpen(false)
  }

  const handleTransfer = () => {
    triggerHaptic("medium")
    setOpen(false)
    if (selectedAccount?.id) {
      router.push(transferFromHref(selectedAccount.id))
      return
    }
    router.push(ROUTES.transfer)
  }

  const handleSubmit = async () => {
    if (!canSubmit || !selectedAccount) return

    setLoading(true)

    try {
      const category = txType === "income" ? "Pemasukan" : "Pengeluaran"

      await recordQuickTransaction({
        userId,
        accountId,
        type: txType,
        amount: amountNumeric,
        category,
        note,
      })

      toast.success(
        txType === "income" ? "Pemasukan berhasil dicatat!" : "Pengeluaran berhasil dicatat!",
        {
          style: {
            background: "#0B1120",
            color: "#F1F5F9",
            border: "1px solid #10B981",
          },
        }
      )

      setSheetOpen(false)
      resetForm()
      await onSuccess?.()
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan transaksi"
      toast.error(message, {
        style: {
          background: "#0B1120",
          color: "#F1F5F9",
          border: "1px solid #F43F5E",
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center z-40 pointer-events-none">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex gap-4 mb-5 pointer-events-auto"
            >
              {ACTIONS.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 16, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.85 }}
                  transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 24 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => openSheet(action.id)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={cn("bg-gradient-to-br w-12 h-12 rounded-[18px] flex items-center justify-center text-white shadow-lg", action.gradient)}>
                    <action.icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 tracking-wide">{action.label}</span>
                </motion.button>
              ))}

              <motion.button
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.85 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 24 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleTransfer}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="bg-gradient-to-br from-violet-500 to-indigo-600 w-12 h-12 rounded-[18px] flex items-center justify-center text-white shadow-lg">
                  <ArrowRightLeft size={18} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 tracking-wide">Transfer</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => {
            triggerHaptic("light")
            setOpen((prev) => !prev)
          }}
          whileTap={{ scale: 0.9 }}
          className="pointer-events-auto relative w-[58px] h-[58px] rounded-full flex items-center justify-center text-white shadow-2xl shadow-amber-500/20"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          aria-label={open ? "Tutup menu cepat" : "Buka menu cepat"}
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 24 }}>
            {open ? <X size={22} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
          </motion.div>

          {!open && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-amber-400/40"
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] overflow-hidden"
              style={{ background: "linear-gradient(180deg, #111827 0%, #0d1420 100%)" }}
            >
              <div className="h-[2px] w-full bg-gradient-to-r from-amber-400 to-orange-500" />

              <div className="px-5 pt-4 pb-10">
                <div className="w-8 h-[3px] rounded-full bg-white/10 mx-auto mb-5" />

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-bold text-[15px] leading-tight">
                      {txType === "income" ? "Catat Pemasukan" : "Catat Pengeluaran"}
                    </p>
                    <p className="text-slate-500 text-[10px] mt-0.5">Transaksi cepat</p>
                  </div>

                  <button
                    onClick={closeSheet}
                    className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center"
                    aria-label="Tutup"
                  >
                    <X size={14} className="text-slate-500" />
                  </button>
                </div>

                <div className="flex gap-1.5 mb-4 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.04]">
                  {ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => setTxType(action.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-200 border",
                        txType === action.id
                          ? action.activeBg
                          : "border-transparent text-slate-600 hover:text-slate-400"
                      )}
                    >
                      <action.icon size={12} />
                      {action.label}
                    </button>
                  ))}
                </div>

                <div className="relative mb-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xl z-10">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(formatInputRupiah(event.target.value))}
                    placeholder="0"
                    autoFocus
                    className="relative w-full h-[58px] rounded-2xl pl-14 pr-4 bg-white/[0.04] border border-white/[0.07] text-white z-10 text-[26px] font-black tabular-nums tracking-tight placeholder:text-slate-800 placeholder:font-normal placeholder:text-xl outline-none transition-all duration-200 focus:border-white/15"
                  />
                </div>

                <div className="mb-4">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.12em] mb-1.5">Akun</p>
                  <div className="relative">
                    <select
                      value={accountId}
                      onChange={(event) => setAccountId(event.target.value)}
                      className="w-full h-11 rounded-xl px-3 pr-8 bg-white/[0.04] border border-white/[0.07] text-white text-sm font-semibold outline-none appearance-none"
                    >
                      {accounts.length === 0 && <option value="">Belum ada akun</option>}
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id} className="bg-[#111827]">
                          {account.name} ({formatRupiah(account.balance ?? 0)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedAccount && (
                  <div className="mb-4 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] text-slate-500">Saldo saat ini</p>
                    <p className="text-sm font-bold text-white mt-1">{formatRupiah(selectedAccount.balance ?? 0)}</p>
                  </div>
                )}

                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 100))}
                  placeholder="Catatan (opsional)"
                  className="w-full h-11 rounded-xl px-4 bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-slate-700 outline-none focus:border-white/15 transition-all mb-5"
                />

                {!hasAccounts && (
                  <p className="text-amber-400 text-xs mb-4">Tambahkan akun terlebih dahulu sebelum mencatat transaksi.</p>
                )}

                <motion.button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  whileTap={canSubmit ? { scale: 0.97 } : {}}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200",
                    canSubmit
                      ? txType === "income"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20"
                        : "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/20"
                      : "bg-white/[0.03] text-slate-700 border border-white/[0.05] cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : txType === "income" ? (
                    <>
                      <TrendingUp size={16} />
                      Simpan Pemasukan
                    </>
                  ) : (
                    <>
                      <TrendingDown size={16} />
                      Simpan Pengeluaran
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

