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

import { INTERACTIVE_SPRING, TAP_FEEDBACK } from "@/lib/motion"
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

function triggerHaptic(style: "light" | "medium" | "success" = "light") {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const patterns = {
      light: 8,
      medium: 15,
      success: [10, 50, 10],
    }

    navigator.vibrate(patterns[style])
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
            background: "#0B1528",
            color: "#F8FAFC",
            border: "1px solid #10B981",
          },
        }
      )

      setSheetOpen(false)
      resetForm()
      await onSuccess?.()
      router.refresh()
      triggerHaptic("success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan transaksi"
      toast.error(message, {
        style: {
          background: "#0B1528",
          color: "#F8FAFC",
          border: "1px solid #EF4444",
        },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-24 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              transition={INTERACTIVE_SPRING}
              className="mb-5 flex gap-3 pointer-events-auto"
            >
              {ACTIONS.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 12, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.92 }}
                  transition={{ ...INTERACTIVE_SPRING, delay: index * 0.03 }}
                  whileTap={TAP_FEEDBACK}
                  onClick={() => openSheet(action.id)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br text-white shadow-lg", action.gradient)}>
                    <action.icon size={18} />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-300">{action.label}</span>
                </motion.button>
              ))}

              <motion.button
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.92 }}
                transition={{ ...INTERACTIVE_SPRING, delay: 0.08 }}
                whileTap={TAP_FEEDBACK}
                onClick={handleTransfer}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-cyan-400/25 bg-cyan-500/15 text-[#38BDF8] shadow-lg shadow-cyan-500/10">
                  <ArrowRightLeft size={18} />
                </div>
                <span className="text-[10px] font-semibold text-slate-300">Transfer</span>
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => {
            triggerHaptic("light")
            setOpen((prev) => !prev)
          }}
          whileTap={TAP_FEEDBACK}
          transition={INTERACTIVE_SPRING}
          className="pointer-events-auto relative flex h-[58px] w-[58px] items-center justify-center rounded-full border border-cyan-400/25 bg-[#38BDF8] text-[#030712] shadow-[0_18px_40px_-18px_rgba(56,189,248,0.85)]"
          aria-label={open ? "Tutup menu cepat" : "Buka menu cepat"}
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={INTERACTIVE_SPRING}>
            {open ? <X size={22} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
          </motion.div>

          {!open ? (
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-300/40"
              animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          ) : null}
        </motion.button>
      </div>

      <AnimatePresence>
        {sheetOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="fixed inset-0 z-50 bg-[#030712]/78 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={INTERACTIVE_SPRING}
              className="fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-[28px] border-t border-white/[0.08] bg-[#030712]"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent" />

              <div className="px-4 pt-4 pb-8">
                <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/[0.12]" />

                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold tracking-tight text-white">
                      {txType === "income" ? "Catat Pemasukan" : "Catat Pengeluaran"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Optimized untuk 3 tap cepat via FAB</p>
                  </div>

                  <motion.button
                    type="button"
                    whileTap={TAP_FEEDBACK}
                    transition={INTERACTIVE_SPRING}
                    onClick={closeSheet}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300"
                    aria-label="Tutup"
                  >
                    <X size={14} />
                  </motion.button>
                </div>

                <div className="mb-4 flex gap-1.5 rounded-[20px] border border-white/[0.06] bg-[#0B1528] p-1">
                  {ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setTxType(action.id)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors",
                        txType === action.id
                          ? action.activeBg
                          : "border-transparent text-slate-500 hover:text-slate-300"
                      )}
                    >
                      <action.icon size={12} />
                      {action.label}
                    </button>
                  ))}
                </div>

                <div className="relative mb-4 rounded-[24px] border border-white/[0.08] bg-[#0B1528] px-4 py-4">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[20px] font-medium text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(formatInputRupiah(event.target.value))}
                    placeholder="0"
                    autoFocus
                    className="w-full bg-transparent pl-10 pr-2 text-[28px] font-medium tracking-tight tabular-nums text-white outline-none placeholder:text-slate-700"
                  />
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Akun</p>
                  <div className="rounded-[20px] border border-white/[0.08] bg-[#0B1528] p-3">
                    <select
                      value={accountId}
                      onChange={(event) => setAccountId(event.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 text-sm font-medium text-white outline-none"
                    >
                      {accounts.length === 0 ? <option value="">Belum ada akun</option> : null}
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id} className="bg-[#0B1528]">
                          {account.name} ({formatRupiah(account.balance ?? 0)})
                        </option>
                      ))}
                    </select>

                    {selectedAccount ? (
                      <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                        <p className="text-[10px] text-slate-400">Saldo saat ini</p>
                        <p className="mt-1 text-sm font-medium tracking-tight tabular-nums text-white">
                          {formatRupiah(selectedAccount.balance ?? 0)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <input
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 100))}
                  placeholder="Catatan opsional"
                  className="mb-5 h-12 w-full rounded-[20px] border border-white/[0.08] bg-[#0B1528] px-4 text-sm text-white outline-none placeholder:text-slate-600"
                />

                {!hasAccounts ? (
                  <p className="mb-4 text-xs text-amber-300">Tambahkan akun terlebih dahulu sebelum mencatat transaksi.</p>
                ) : null}

                <motion.button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  whileTap={canSubmit ? TAP_FEEDBACK : {}}
                  transition={INTERACTIVE_SPRING}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-[20px] px-4 py-4 text-[15px] font-semibold transition-all",
                    canSubmit
                      ? txType === "income"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_18px_40px_-22px_rgba(16,185,129,0.8)]"
                        : "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-[0_18px_40px_-22px_rgba(239,68,68,0.8)]"
                      : "cursor-not-allowed border border-white/[0.06] bg-white/[0.03] text-slate-600"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Menyimpan...
                    </>
                  ) : txType === "income" ? (
                    <>
                      <TrendingUp size={16} /> Simpan Pemasukan
                    </>
                  ) : (
                    <>
                      <TrendingDown size={16} /> Simpan Pengeluaran
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
