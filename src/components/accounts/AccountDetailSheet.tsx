"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
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
import { INTERACTIVE_SPRING, TAP_FEEDBACK } from "@/lib/motion"
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
  gradient: "from-slate-400/20 to-slate-700/10",
  border: "border-white/[0.08]",
  accentColor: "#64748b",
  iconBg: "bg-white/[0.08] text-slate-200 border border-white/[0.08]",
  icon: <CreditCard size={22} />,
  label: "Lainnya",
}

export default function AccountDetailSheet({ account, isOpen, onClose }: Props) {
  const router = useRouter()
  const [showNumber, setShowNumber] = useState(false)

  useEffect(() => {
    if (!isOpen) setShowNumber(false)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && account) triggerHaptic("medium")
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
        style: { background: "#0B1528", color: "#F8FAFC", border: "1px solid #10B981" },
      })
    } catch {
      toast.error("Gagal menyalin", {
        style: { background: "#0B1528", color: "#F8FAFC", border: "1px solid #EF4444" },
      })
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
            onClick={() => {
              triggerHaptic("light")
              onClose()
            }}
            className="fixed inset-0 z-50 bg-[#030712]/78 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={INTERACTIVE_SPRING}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.08}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) {
                triggerHaptic("light")
                onClose()
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-hidden rounded-t-[28px] border-t border-white/[0.08] bg-[#030712]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent" />
            <div className="flex justify-center py-3">
              <div className="h-1.5 w-10 rounded-full bg-white/[0.12]" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-tight text-white">Detail Akun</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">Informasi akun dan aksi cepat premium</p>
                </div>

                <motion.button
                  type="button"
                  whileTap={TAP_FEEDBACK}
                  transition={INTERACTIVE_SPRING}
                  onClick={() => {
                    triggerHaptic("light")
                    onClose()
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300"
                  aria-label="Tutup"
                >
                  <X size={16} />
                </motion.button>
              </div>

              <section
                className={cn(
                  "relative overflow-hidden rounded-[24px] border bg-[#0B1528] p-4",
                  cfg.border
                )}
                style={{ boxShadow: `0 18px 42px -30px ${cfg.accentColor}88` }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(56,189,248,0.04))]" />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08]", cfg.iconBg)}>
                      {cfg.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{cfg.label}</p>
                      <h3 className="text-base font-semibold tracking-tight text-white">{account.name}</h3>
                    </div>
                  </div>

                  {account.is_default ? (
                    <span className="inline-flex items-center gap-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300">
                      <Shield size={11} /> Utama
                    </span>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="text-[11px] text-slate-400">Saldo tersedia</p>
                  <p className="mt-1 text-[30px] font-medium leading-none tracking-tight tabular-nums text-white">
                    {formatRupiah(balance)}
                  </p>
                </div>

                {account.account_number ? (
                  <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Nomor akun</p>
                        <p className="mt-1 truncate font-mono text-sm tracking-wide text-slate-300">
                          {showNumber ? formatAccountNumber(account.account_number) : maskAccountNumber(account.account_number)}
                        </p>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <motion.button
                          type="button"
                          whileTap={TAP_FEEDBACK}
                          transition={INTERACTIVE_SPRING}
                          onClick={() => {
                            triggerHaptic("light")
                            setShowNumber((prev) => !prev)
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-slate-300"
                        >
                          {showNumber ? <EyeOff size={14} /> : <Eye size={14} />}
                        </motion.button>

                        <motion.button
                          type="button"
                          whileTap={TAP_FEEDBACK}
                          transition={INTERACTIVE_SPRING}
                          onClick={handleCopy}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-slate-300"
                        >
                          <Copy size={14} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Aksi Cepat</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Transfer",
                      icon: ArrowUpRight,
                      tone: "border-[#38BDF8]/20 bg-[#38BDF8]/10 text-[#38BDF8]",
                      action: () => router.push(transferFromHref(account.id)),
                    },
                    {
                      label: "Mutasi",
                      icon: History,
                      tone: "border-amber-500/20 bg-amber-500/10 text-amber-300",
                      action: () => router.push(accountDetailHref(account.id, "overview")),
                    },
                    {
                      label: "Top Up",
                      icon: ArrowDownLeft,
                      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
                      action: () => router.push(topupAccountHref(account.id)),
                    },
                  ].map((item) => (
                    <motion.button
                      key={item.label}
                      type="button"
                      whileTap={TAP_FEEDBACK}
                      transition={INTERACTIVE_SPRING}
                      onClick={() => {
                        triggerHaptic("medium")
                        item.action()
                      }}
                      className="rounded-[20px] border border-white/[0.06] bg-[#0B1528] p-3"
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border", item.tone)}>
                          <item.icon size={18} />
                        </div>
                        <span className="text-[11px] font-medium text-slate-300">{item.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              <motion.button
                type="button"
                whileTap={TAP_FEEDBACK}
                transition={INTERACTIVE_SPRING}
                onClick={() => {
                  triggerHaptic("medium")
                  onClose()
                  router.push(accountDetailHref(account.id, "settings"))
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-[20px] border border-cyan-500/20 bg-cyan-500/10 px-4 py-4 text-sm font-medium text-cyan-300"
              >
                Kelola Akun <ArrowUpRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
