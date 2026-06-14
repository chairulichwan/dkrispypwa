// src/app/accounts/[id]/AccountDetailClient.tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import toast from "react-hot-toast"
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Download,
  History,
  Loader2,
  Pencil,
  Settings,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { ACCOUNT_STYLE, type AccountType } from "@/app/dashboard/types"
import UndoToast from "@/components/UndoToast"
import { accountDetailHref, ROUTES } from "@/lib/routes"
import { createClient } from "@/lib/supabase/client"
import { restoreAccount, softDeleteAccount } from "@/lib/supabase/queries"
import { exportTransactionsCSV } from "@/lib/export-csv"
import { cn, formatAccountNumber, formatRupiah } from "@/lib/utils"

interface Counterparty {
  id: string
  name: string
  type: string
}

interface TransactionItem {
  id: string
  type: string | null
  amount: number
  category?: string | null
  note?: string | null
  created_at?: string | null
  counterparty?: Counterparty | null
}

interface AccountItem {
  id: string
  type: string
  name: string
  balance: number | null
  account_number?: string | null
  is_default?: boolean | null
}

interface Props {
  accountId: string
  initialTab: string
  account: AccountItem
  transactions: TransactionItem[]
  fallback?: React.ReactNode
  onClose?: () => void
  onDeleteSuccess?: (accountId: string, accountName: string) => void
}

function getCounterpartyName(tx: TransactionItem): string | null {
  if (tx.counterparty?.name) return tx.counterparty.name
  if (!tx.note) return null

  if (tx.type === "transfer_out") {
    const match = tx.note.match(/ke\s+(.+?)(?:\s*•|$)/i)
    return match ? match[1].trim() : null
  }

  if (tx.type === "transfer_in") {
    const match = tx.note.match(/dari\s+(.+?)(?:\s*•|$)/i)
    return match ? match[1].trim() : null
  }

  return null
}

function extractUserNote(tx: TransactionItem): string | null {
  if (!tx.note || typeof tx.note !== "string") return null

  if (tx.note.includes(" • ke ") || tx.note.includes(" • dari ")) {
    const userNote = tx.note.split(" • ")[0]?.trim()
    return userNote || null
  }

  if (/^Transfer (ke|dari) .+$/i.test(tx.note.trim())) return null

  if (!["transfer_in", "transfer_out"].includes(tx.type ?? "")) {
    return tx.note
  }

  return tx.note
}

export default function AccountDetailClient({
  accountId,
  initialTab,
  account,
  transactions,
  onClose,
  onDeleteSuccess,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? initialTab)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [undoData, setUndoData] = useState<{ accountId: string; accountName: string } | null>(null)
  const [editForm, setEditForm] = useState({
    name: account.name,
    account_number: account.account_number || "",
  })

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? initialTab)
  }, [initialTab, searchParams])

  useEffect(() => {
    setEditForm({
      name: account.name,
      account_number: account.account_number || "",
    })
  }, [account.account_number, account.name])

  const cfg = ACCOUNT_STYLE[account.type as AccountType] ?? ACCOUNT_STYLE.rekening
  const balance = account.balance ?? 0

  const income = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === "income" || tx.type === "transfer_in")
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
    [transactions]
  )

  const expense = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === "expense" || tx.type === "transfer_out")
        .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
    [transactions]
  )

  const handleTabChange = useCallback(
    (tabId: string) => {
      router.push(accountDetailHref(accountId, tabId), { scroll: false })
      setActiveTab(tabId)
    },
    [accountId, router]
  )

  const startEditing = () => {
    setEditForm({
      name: account.name,
      account_number: account.account_number || "",
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setEditForm({
      name: account.name,
      account_number: account.account_number || "",
    })
    setIsEditing(false)
  }

  const handleUpdate = async () => {
    const cleanName = editForm.name.trim()
    if (!cleanName) {
      toast.error("Nama akun tidak boleh kosong")
      return
    }

    if (cleanName.length > 50) {
      toast.error("Nama akun maksimal 50 karakter")
      return
    }

    setIsSaving(true)

    try {
      const { error } = await (supabase
        .from("accounts") as any)
        .update({
          name: cleanName,
          account_number: editForm.account_number.trim() || null,
        })
        .eq("id", accountId)

      if (error) throw error

      toast.success("Perubahan disimpan! ✓", {
        duration: 4000,
        style: {
          background: "#1e293b",
          color: "#fff",
          border: "1px solid #334155",
          borderRadius: "16px",
        },
      })

      setIsEditing(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan perubahan"
      toast.error(message, {
        style: {
          background: "#1e293b",
          color: "#fff",
          border: "1px solid #ef4444",
        },
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (account.is_default) {
      toast.error("Akun utama tidak bisa dihapus!")
      setShowConfirm(false)
      return
    }

    setIsDeleting(true)
    const loadingId = toast.loading("Menghapus akun...")

    try {
      if (transactions.length > 0) {
        exportTransactionsCSV(transactions, account.name)
      }

      await softDeleteAccount(account.id)

      setShowConfirm(false)
      setIsDeleting(false)
      toast.success("Akun berhasil dihapus! 🗑️", { id: loadingId })

      onDeleteSuccess?.(account.id, account.name)
      onClose?.()
      setUndoData({ accountId: account.id, accountName: account.name })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus akun"
      toast.error(message, { id: loadingId })
      setIsDeleting(false)
    }
  }

  const handleRestore = async () => {
    if (!undoData) return

    try {
      await restoreAccount(undoData.accountId)
      setShowConfirm(false)
      setIsDeleting(false)
      setUndoData(null)
      router.refresh()
    } catch {
      toast.error("Gagal memulihkan akun")
      setIsDeleting(false)
    }
  }

  return (
    <main
      className="min-h-screen pb-20 relative"
      style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #060b14 100%)" }}
    >
      <header
        className="sticky top-0 z-30 px-5 pb-4 backdrop-blur-2xl bg-[#060b14]/80 border-b border-white/[0.04]"
        style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}
      >
        <Link href={ROUTES.dashboard} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={18} /> Kembali
        </Link>

        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.08]", cfg.iconBg)}>
            {cfg.icon || <CreditCard size={24} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase">{cfg.label}</p>
            <h1 className="text-white font-bold text-xl truncate">{account.name}</h1>
          </div>
        </div>

        <div className="flex gap-1 mt-4 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {[
            { id: "overview", label: "Ringkasan", icon: TrendingUp },
            { id: "settings", label: "Pengaturan", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all",
                activeTab === tab.id ? "bg-white/[0.08] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 mt-6 space-y-6">
        {activeTab === "overview" && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-3xl p-6 border backdrop-blur-xl bg-gradient-to-br relative overflow-hidden",
                cfg.gradient,
                cfg.border
              )}
            >
              <div
                className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none"
                style={{ background: cfg.accentColor }}
              />
              <p className="text-slate-400 text-sm mb-1 relative z-10">Total Saldo</p>
              <p className="text-white font-black text-4xl tabular-nums tracking-tight relative z-10">
                {formatRupiah(balance)}
              </p>
              {account.account_number && (
                <p className="font-mono text-xs text-slate-500 mt-3 relative z-10 tracking-wider">
                  {formatAccountNumber(account.account_number)}
                </p>
              )}
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4 bg-emerald-500/[0.06] border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Pemasukan</span>
                </div>
                <p className="text-white font-bold text-lg tabular-nums">{formatRupiah(income)}</p>
                <p className="text-slate-500 text-[10px] mt-1">30 hari terakhir</p>
              </div>

              <div className="rounded-2xl p-4 bg-rose-500/[0.06] border border-rose-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-rose-400" />
                  <span className="text-[11px] font-bold text-rose-400 uppercase">Pengeluaran</span>
                </div>
                <p className="text-white font-bold text-lg tabular-nums">{formatRupiah(expense)}</p>
                <p className="text-slate-500 text-[10px] mt-1">30 hari terakhir</p>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Transaksi Terakhir</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="rounded-2xl p-8 bg-white/[0.02] border border-white/[0.06] text-center">
                  <History size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-bold">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.slice(0, 8).map((tx, index) => {
                    const isIncome = tx.type === "income" || tx.type === "transfer_in"
                    const counterparty = getCounterpartyName(tx)
                    const userNote = extractUserNote(tx)

                    const style =
                      tx.type === "income" || tx.type === "transfer_in"
                        ? {
                          bg: "bg-emerald-500/20",
                          text: "text-emerald-400",
                          icon: tx.type === "income" ? <TrendingUp size={16} /> : <ArrowDownLeft size={16} />,
                          prefix: "+",
                          label: tx.type === "income" ? tx.category || "Pemasukan" : "Transfer Masuk",
                        }
                        : tx.type === "expense" || tx.type === "transfer_out"
                          ? {
                            bg: "bg-rose-500/20",
                            text: "text-rose-400",
                            icon: tx.type === "expense" ? <TrendingDown size={16} /> : <ArrowUpRight size={16} />,
                            prefix: "-",
                            label: tx.type === "expense" ? tx.category || "Pengeluaran" : "Transfer Keluar",
                          }
                          : {
                            bg: "bg-slate-500/20",
                            text: "text-slate-400",
                            icon: <History size={16} />,
                            prefix: "",
                            label: tx.category || tx.type || "Transaksi",
                          }

                    return (
                      <div
                        key={tx.id || index}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", style.bg, style.text)}>
                            {style.icon}
                          </div>

                          <div className="min-w-0">
                            <p className="text-white text-sm font-bold">{style.label}</p>
                            <div className="mt-0.5 space-y-0.5">
                              {counterparty && (
                                <p className="text-slate-400 text-[10px] truncate max-w-[180px]">
                                  {tx.type === "transfer_out" ? "Ke" : "Dari"} <span className="text-slate-300 font-semibold">{counterparty}</span>
                                </p>
                              )}
                              {userNote && (
                                <p className="text-slate-500 text-[10px] italic truncate max-w-[180px]">{userNote}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <p className="text-slate-500 text-[10px] mb-0.5 tabular-nums whitespace-nowrap">
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })
                              : "-"}
                          </p>
                          <span className={cn("text-sm font-bold tabular-nums", style.text)}>
                            {style.prefix}
                            {formatRupiah(tx.amount)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "settings" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <span className="text-slate-400 text-sm">Nama Akun</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                    maxLength={50}
                    className="bg-white/[0.08] text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-violet-400 w-48 text-right transition-colors"
                    placeholder="Nama akun"
                    autoFocus
                  />
                ) : (
                  <span className="text-white text-sm font-bold">{account.name}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <span className="text-slate-400 text-sm">Nomor Rekening</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.account_number}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, account_number: event.target.value }))}
                    maxLength={30}
                    className="bg-white/[0.08] text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-violet-400 w-48 text-right font-mono transition-colors"
                    placeholder="Opsional"
                  />
                ) : (
                  <span className="text-white text-sm font-bold font-mono">{account.account_number || "—"}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <span className="text-slate-400 text-sm">Jenis Akun</span>
                <span className="text-white text-sm font-bold">{cfg.label}</span>
              </div>

              <div className="flex items-center justify-between p-4">
                <span className="text-slate-400 text-sm">Status</span>
                <span className="text-white text-sm font-bold">{account.is_default ? "🌟 Akun Utama" : "Aktif"}</span>
              </div>

              {isEditing && (
                <div className="flex gap-2 p-4 bg-white/[0.02] border-t border-white/[0.06]">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-slate-300 text-sm font-semibold hover:bg-white/[0.1] transition-all disabled:opacity-50"
                  >
                    Batal
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpdate}
                    disabled={isSaving || !editForm.name.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Simpan"}
                  </motion.button>
                </div>
              )}
            </div>

            {!isEditing && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={startEditing}
                className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-slate-300 text-sm font-semibold hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2"
              >
                <Pencil size={16} />
                Edit Informasi Akun
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => exportTransactionsCSV(transactions, account.name)}
              disabled={transactions.length === 0}
              className="w-full py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-slate-300 text-sm font-bold hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download size={16} />
              Export Riwayat Transaksi (CSV)
            </motion.button>

            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <h3 className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={14} /> Zona Bahaya
              </h3>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                    <Trash2 size={20} className="text-rose-400" />
                  </div>

                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">Hapus Akun</p>
                    <p className="text-rose-400/70 text-[11px] mt-1 leading-relaxed">
                      Riwayat transaksi akan otomatis diunduh sebagai CSV sebelum akun dihapus.
                      Tindakan ini <strong>tidak dapat dibatalkan</strong> setelah batas undo berakhir.
                    </p>

                    {account.is_default ? (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <ShieldAlert size={14} className="text-amber-400 shrink-0" />
                        <span className="text-amber-400/90 text-[10px] font-bold">Akun utama tidak bisa dihapus</span>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowConfirm(true)}
                        disabled={isDeleting}
                        className="mt-3 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Hapus Akun Ini
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setShowConfirm(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
            >
              <div className="rounded-3xl bg-[#131b2e] border border-white/[0.08] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={28} className="text-rose-400" />
                </div>

                <h3 className="text-white font-bold text-lg text-center mb-2">Hapus Akun?</h3>
                <p className="text-slate-400 text-xs text-center leading-relaxed mb-4">
                  Kamu akan menghapus <strong className="text-white">{account.name}</strong> beserta riwayat transaksinya.
                </p>

                <div className="mb-5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Download size={14} className="text-blue-400 shrink-0" />
                  <span className="text-blue-400/90 text-[10px] font-bold leading-snug">
                    Riwayat transaksi akan otomatis diunduh sebagai CSV sebelum akun dihapus
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="py-3 rounded-xl bg-white/[0.06] text-slate-300 text-sm font-bold hover:bg-white/[0.1] transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="py-3 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Ya, Hapus"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {undoData && (
        <UndoToast
          message={`"${undoData.accountName}" telah dihapus`}
          onUndo={handleRestore}
          duration={5000}
          onExpired={() => {
            setUndoData(null)
            router.refresh()
            router.replace(ROUTES.dashboard)
          }}
        />
      )}
    </main>
  )
}



