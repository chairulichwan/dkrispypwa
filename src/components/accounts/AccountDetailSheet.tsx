// src/components/accounts/AccountDetailSheet.tsx
"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ACCOUNT_STYLE, type Account, type AccountType } from "@/app/dashboard/types"
import { formatRupiah, cn, maskAccountNumber, formatAccountNumber } from "@/lib/utils"
import { accountDetailHref, topupAccountHref, transferFromHref } from "@/lib/routes"
import toast from "react-hot-toast"

interface Props {
  account: Account | null
  isOpen: boolean
  onClose: () => void
}

const triggerHaptic = (style: "light" | "medium" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(style === "light" ? 10 : 20)
  }
}

const FALLBACK_STYLE = {
  gradient: "from-[#1E293B]/40 to-[#151E32]/40",
  border: "border-white/[0.06]",
  accentColor: "#64748b",
  iconBg: "bg-[#151E32] text-[#94A3B8] border border-white/[0.06]",
  icon: <CreditCard size={24} />,
  label: "Lainnya",
}

export default function AccountDetailSheet({ account, isOpen, onClose }: Props) {
  const router = useRouter()
  const [showNumber, setShowNumber] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setShowNumber(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && account) {
      triggerHaptic("medium")
    }
  }, [isOpen, account])

  if (!account) return null

  const cfg = ACCOUNT_STYLE[account.type as AccountType] ?? FALLBACK_STYLE
  const balance = account.balance ?? 0

  const handleCopy = async () => {
    if (!account.account_number) return

    triggerHaptic("light")

    try {
      await navigator.clipboard.writeText(account.account_number)
      toast.success("Nomor rekening disalin!", {
        style: { background: "#0B1120", color: "#F1F5F9", border: "1px solid #10B981" },
      })
    } catch {
      toast.error("Gagal menyalin", {
        style: { background: "#0B1120", color: "#F1F5F9", border: "1px solid #F43F5E" },
      })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            onClick={() => {
              triggerHaptic("light")
              onClose()
            }}
            className="fixed inset-0 z-50 bg-[#020617]/70 backdrop-blur-md"
            style={{ WebkitBackdropFilter: "blur(12px)" }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                triggerHaptic("light")
                onClose()
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] flex flex-col rounded-t-[2rem] overflow-hidden bg-[#0B1120] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.5)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className={cn("h-[2px] w-full bg-gradient-to-r shrink-0", cfg.gradient)} />

            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0 bg-[#0B1120]">
              <div className="w-10 h-1.5 rounded-full bg-white/10" />
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 scroll-native"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[#F1F5F9] font-bold text-[17px] tracking-tight">Detail Akun</h2>
                  <p className="text-[#64748B] text-[11px] mt-0.5">Informasi &amp; aksi cepat</p>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic("light")
                    onClose()
                  }}
                  className="p-2 -mr-2 rounded-full hover:bg-white/[0.06] active:scale-90 transition-all"
                >
                  <X size={18} className="text-[#94A3B8]" />
                </button>
              </div>

              <div
                className={cn(
                  "rounded-3xl p-5 border backdrop-blur-xl bg-gradient-to-br relative overflow-hidden mb-5",
                  cfg.gradient,
                  cfg.border
                )}
              >
                <div
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ background: cfg.accentColor }}
                />

                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.08]", cfg.iconBg)}>
                      {cfg.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.15em] text-[#94A3B8] uppercase">{cfg.label}</p>
                      <h3 className="text-[#F1F5F9] font-bold text-[17px] tracking-tight">{account.name}</h3>
                    </div>
                  </div>

                  {account.is_default && (
                    <span className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-wider">
                      <Shield size={10} /> Utama
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-[#94A3B8] text-[11px] font-medium mb-1">Saldo Tersedia</p>
                  <p className="text-[#F1F5F9] font-black text-[28px] tabular-nums tracking-tight leading-none">
                    {formatRupiah(balance)}
                  </p>
                </div>

                {account.account_number && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="font-mono text-[13px] text-[#F1F5F9] tracking-wider tabular-nums">
                      {showNumber
                        ? formatAccountNumber(account.account_number)
                        : maskAccountNumber(account.account_number)}
                    </span>

                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          triggerHaptic("light")
                          setShowNumber((prev) => !prev)
                        }}
                        className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:scale-90 transition-all"
                      >
                        {showNumber ? (
                          <EyeOff size={14} className="text-[#94A3B8]" />
                        ) : (
                          <Eye size={14} className="text-[#94A3B8]" />
                        )}
                      </button>

                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:scale-90 transition-all"
                      >
                        <Copy size={14} className="text-[#94A3B8]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-wider mb-2.5">Aksi Cepat</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Transfer",
                      icon: ArrowUpRight,
                      color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
                      action: () => {
                        triggerHaptic("medium")
                        router.push(transferFromHref(account.id))
                      },
                    },
                    {
                      label: "Mutasi",
                      icon: History,
                      color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
                      action: () => {
                        triggerHaptic("medium")
                        router.push(accountDetailHref(account.id, "overview"))
                      },
                    },
                    {
                      label: "Top Up",
                      icon: ArrowDownLeft,
                      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
                      action: () => {
                        triggerHaptic("medium")
                        router.push(topupAccountHref(account.id))
                      },
                    },
                  ].map((item) => (
                    <motion.button
                      key={item.label}
                      whileTap={{ scale: 0.95 }}
                      onClick={item.action}
                      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-[#151E32] border border-white/[0.04] hover:bg-[#1E293B] transition-all"
                    >
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border", item.color)}>
                        <item.icon size={18} strokeWidth={2.5} />
                      </div>
                      <span className="text-[11px] font-bold text-[#F1F5F9]">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  triggerHaptic("medium")
                  onClose()
                  router.push(accountDetailHref(account.id, "settings"))
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Kelola Akun <ArrowUpRight size={16} strokeWidth={2.5} />
              </motion.button>

              <div className="h-6" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}


