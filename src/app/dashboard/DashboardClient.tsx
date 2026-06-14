// src/app/dashboard/DashboardClient.tsx
"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import Link from "next/link"
import { Users, ChevronRight, RefreshCw, TrendingUp } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import DashboardHeader, { HEADER_HEIGHT } from "@/components/DashboardHeader"
import BalanceCard from "@/components/BalanceCard"
import AccountCards from "@/components/AccountCards"
import BottomNav from "@/components/BottomNav"
import AccountDetailSheet from "@/components/accounts/AccountDetailSheet"
import QuickActionOverlay from "@/components/accounts/QuickActionOverlay"
import QuickAddFAB from "@/components/QuickAddFAB"
import UndoToast from "@/components/UndoToast"

import { restoreAccount } from "@/lib/supabase/queries"
import { calculateAccountTotals, normalizeAccounts } from "@/lib/account"
import { ROUTES } from "@/lib/routes"
import { Account } from "./types"
import { formatRupiah, cn } from "@/lib/utils"

interface Props {
  userId: string
  userName: string
  totalWealth: number
  walletTotal: number
  piutang: number
  accounts: Account[]
}

const triggerHaptic = (style: "light" | "medium" | "success" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const patterns = {
      light: 8,
      medium: 15,
      success: [10, 50, 10],
    }

    navigator.vibrate(patterns[style])
  }
}

export default function DashboardClient({
  userId,
  userName,
  totalWealth: initialTotalWealth,
  walletTotal: initialWalletTotal,
  piutang: initialPiutang,
  accounts: initialAccounts,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [accounts, setAccounts] = useState(initialAccounts)
  const [totalWealth, setTotalWealth] = useState(initialTotalWealth)
  const [walletTotal, setWalletTotal] = useState(initialWalletTotal)
  const [piutang, setPiutang] = useState(initialPiutang)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number } | null>(null)
  const [undoData, setUndoData] = useState<{ accountId: string; accountName: string } | null>(null)

  const handleSync = useCallback(async () => {
    if (isSyncing) return

    triggerHaptic("medium")
    setIsSyncing(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(ROUTES.login)
        return
      }

      const { data: rawAccounts, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true })

      if (accountError) throw accountError

      const nextAccounts = normalizeAccounts(rawAccounts ?? []) as Account[]
      const totals = calculateAccountTotals(nextAccounts)

      const { data: piutangRows, error: piutangError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "piutang")

      if (piutangError) throw piutangError

      const nextPiutang = (piutangRows ?? []).reduce((sum, row: any) => sum + (Number(row.amount) || 0), 0)

      setAccounts(nextAccounts)
      setTotalWealth(totals.totalWealth)
      setWalletTotal(totals.walletTotal)
      setPiutang(nextPiutang)

      triggerHaptic("success")
      toast.success("Data diperbarui! ✨", {
        style: { background: "#0B1120", color: "#F1F5F9", border: "1px solid #10B981" },
      })
    } catch {
      toast.error("Gagal sync", {
        style: { background: "#0B1120", color: "#F1F5F9", border: "1px solid #F43F5E" },
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, router, supabase])

  const handleLogout = useCallback(async () => {
    triggerHaptic("medium")
    setIsLoggingOut(true)

    try {
      await supabase.auth.signOut()
      router.replace(ROUTES.login)
    } catch {
      router.replace(ROUTES.login)
    } finally {
      setIsLoggingOut(false)
    }
  }, [router, supabase])

  const handleCardClick = useCallback((account: Account) => {
    triggerHaptic("light")
    setSelectedAccount(account)
    setOverlayPos(null)
  }, [])

  const handleLongPress = useCallback((account: Account, pos: { x: number; y: number }) => {
    triggerHaptic("medium")
    setSelectedAccount(account)
    setOverlayPos(pos)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSelectedAccount(null)
    setOverlayPos(null)
  }, [])

  const handleCloseOverlay = useCallback(() => {
    setOverlayPos(null)
    setSelectedAccount(null)
  }, [])

  const handleAccountDeleted = useCallback((deletedId: string, accountName: string) => {
    triggerHaptic("light")

    setAccounts((prev) => {
      const next = prev.filter((account) => account.id !== deletedId)
      const totals = calculateAccountTotals(next)

      setTotalWealth(totals.totalWealth)
      setWalletTotal(totals.walletTotal)

      return next
    })

    setUndoData({ accountId: deletedId, accountName })
  }, [])

  const handleRestore = useCallback(async () => {
    if (!undoData) return

    try {
      await restoreAccount(undoData.accountId)
      router.refresh()
      setUndoData(null)
      triggerHaptic("success")
    } catch {
      toast.error("Gagal memulihkan akun")
    }
  }, [router, undoData])

  const handlePullToRefresh = useCallback(async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    triggerHaptic("medium")
    await handleSync()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [handleSync, isRefreshing])

  if (accounts.length === 0 && isSyncing) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-[#151E32] border border-white/[0.06] flex items-center justify-center"
        >
          <RefreshCw className="animate-spin text-amber-400" size={24} />
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-20 pointer-events-none"
          >
            <div className="px-4 py-2 rounded-full bg-[#151E32] border border-white/[0.08] backdrop-blur-xl flex items-center gap-2 shadow-xl">
              <RefreshCw size={14} className="text-amber-400 animate-spin" />
              <span className="text-xs font-bold text-[#F1F5F9]">Memuat...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardHeader
        userId={userId}
        userName={userName}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main
        className="min-h-screen relative"
        style={{
          background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)",
          touchAction: "pan-y",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)",
        }}
      >
        <div
          className="pointer-events-none"
          style={{
            height: `${HEADER_HEIGHT + 25 + (typeof window !== "undefined" ? window.visualViewport?.offsetTop || 0 : 0)}px`,
          }}
          aria-hidden="true"
        />

        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-amber-500/[0.06] blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full bg-violet-600/[0.07] blur-[80px]" />
        </div>

        <div className="relative z-10 px-5">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
            className="mt-4"
          >
            <BalanceCard
              totalWealth={totalWealth}
              walletTotal={walletTotal}
              piutang={piutang}
              onSync={handleSync}
              isSyncing={isSyncing}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="mt-7"
          >
            <AccountCards
              accounts={accounts}
              onCardClick={handleCardClick}
              onLongPress={handleLongPress}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="mt-5"
          >
            <Link href={ROUTES.debts} className="block group">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "rounded-2xl p-4 border transition-all",
                  "bg-[#151E32] border-white/[0.06] hover:bg-[#1E293B] active:scale-[0.98]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-400/20 flex items-center justify-center">
                      <Users size={18} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[#F1F5F9] text-sm font-bold">Hutang &amp; Piutang</p>
                      <p className="text-[#64748B] text-[11px]">Kelola catatan pinjaman</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {piutang > 0 && (
                      <div className="text-right">
                        <p className="text-emerald-400 text-xs font-bold tabular-nums">{formatRupiah(piutang)}</p>
                        <p className="text-[#475569] text-[9px]">piutang</p>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-[#475569] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="mt-4"
          >
            <Link href={ROUTES.analytics} className="block group">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl p-4 border transition-all",
                  "bg-gradient-to-br from-[#151E32] to-[#1a2744] border-cyan-400/20",
                  "hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98]"
                )}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-400/30 flex items-center justify-center">
                      <TrendingUp size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[#F1F5F9] text-sm font-bold">Analitik Premium</p>
                        <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-[9px] font-bold text-cyan-300 uppercase tracking-wider">
                          PRO
                        </span>
                      </div>
                      <p className="text-[#64748B] text-[11px]">Prediksi arus kas &amp; kekayaan bersih</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex flex-col items-end">
                      <p className="text-cyan-400 text-xs font-bold">Lihat Insight</p>
                      <p className="text-[#475569] text-[9px]">30 hari ke depan</p>
                    </div>
                    <ChevronRight size={16} className="text-cyan-400/60 group-hover:translate-x-0.5 group-hover:text-cyan-400 transition-all" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {accounts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 25 }}
              className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-lg">💡</div>
              <div>
                <p className="text-[#F1F5F9] text-sm font-bold">Belum ada akun</p>
                <p className="text-amber-400/70 text-xs mt-0.5">Tekan tombol + untuk mulai</p>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <BottomNav />

      <AccountDetailSheet
        account={selectedAccount}
        isOpen={!!selectedAccount && !overlayPos}
        onClose={handleCloseSheet}
      />

      <QuickActionOverlay
        accountId={selectedAccount?.id ?? ""}
        isOpen={!!overlayPos}
        onClose={handleCloseOverlay}
        position={overlayPos}
      />

      {undoData && (
        <UndoToast
          message={`"${undoData.accountName}" telah dihapus`}
          onUndo={handleRestore}
          duration={5000}
          onExpired={() => setUndoData(null)}
        />
      )}

      <QuickAddFAB accounts={accounts} userId={userId} onSuccess={handlePullToRefresh} />
    </>
  )
}
