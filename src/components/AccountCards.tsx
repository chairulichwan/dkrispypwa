// src/components/AccountCards.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Plus, CreditCard, Eye, EyeOff, Copy, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { ACCOUNT_STYLE, type Account, type AccountType } from "@/app/dashboard/types"
import { formatRupiah, cn, maskAccountNumber, formatAccountNumber } from "@/lib/utils"
import { ROUTES, accountDetailHref } from "@/lib/routes"
import toast from "react-hot-toast"

interface AccountCardsProps {
  accounts: Account[]
  onCardClick?: (account: Account) => void
  onLongPress?: (account: Account, pos: { x: number; y: number }) => void
}

const FALLBACK_STYLE = {
  bgColor: "bg-gray-50",
  iconBg: "bg-gray-100 text-gray-600",
  gradient: "from-gray-500/20 to-gray-500/10",
  border: "border-gray-500/20",
  accentColor: "#6b7280",
  icon: <CreditCard size={18} />,
  label: "Lainnya",
}

export default function AccountCards({ accounts, onCardClick, onLongPress }: AccountCardsProps) {
  const router = useRouter()

  return (
    <section className="pb-2">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
          <h2 className="text-[15px] font-bold text-white tracking-tight">Akun Saya</h2>
          <span className="px-1.5 py-0.5 rounded-md bg-white/[0.06] text-[9px] font-bold text-slate-400 border border-white/[0.06]">
            {accounts.length}
          </span>
        </div>

        <button
          onClick={() => router.push(ROUTES.accountsList)}
          className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400/80 tracking-wide hover:text-amber-400 transition-colors"
        >
          Semua <ChevronRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {accounts.map((account, index) => {
          const cfg = ACCOUNT_STYLE[account.type as AccountType] ?? FALLBACK_STYLE

          return (
            <AccountCardItem
              key={account.id}
              account={account}
              cfg={cfg}
              index={index}
              onNavigate={() =>
                onCardClick ? onCardClick(account) : router.push(accountDetailHref(account.id))
              }
              onLongPress={onLongPress ? (pos) => onLongPress(account, pos) : undefined}
            />
          )
        })}

        <motion.button
          onClick={() => router.push(ROUTES.addAccount)}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
          className="rounded-[25px] border-2 border-dashed border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center gap-1.5 min-h-[140px] text-slate-500 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all cursor-pointer"
        >
          <div className="w-9 h-9 rounded-[14px] bg-white/[0.06] flex items-center justify-center">
            <Plus size={18} />
          </div>
          <span className="text-[10px] font-bold">Tambah</span>
        </motion.button>
      </div>
    </section>
  )
}

function AccountCardItem({
  account,
  cfg,
  index,
  onNavigate,
  onLongPress,
}: {
  account: Account
  cfg: {
    bgColor: string
    iconBg: string
    gradient: string
    border: string
    accentColor: string
    icon: React.ReactNode
    label: string
  }
  index: number
  onNavigate: () => void
  onLongPress?: (pos: { x: number; y: number }) => void
}) {
  const [showNumber, setShowNumber] = useState(false)
  const [copied, setCopied] = useState(false)

  const balance = account.balance ?? 0
  const isEmpty = balance === 0

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation()
    if (!account.account_number) return

    try {
      await navigator.clipboard.writeText(account.account_number)
      setCopied(true)
      toast.success("Nomor rekening disalin!", { duration: 1500 })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Gagal menyalin")
    }
  }

  const toggleVisibility = (event: React.MouseEvent) => {
    event.stopPropagation()
    setShowNumber((prev) => !prev)
  }

  const displayNumber = showNumber
    ? formatAccountNumber(account.account_number)
    : maskAccountNumber(account.account_number)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.07 * index, ease: [0.23, 1, 0.32, 1] }}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
      onClick={onNavigate}
      onContextMenu={(event) => {
        event.preventDefault()
        onLongPress?.({ x: event.clientX, y: event.clientY })
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onNavigate()
        }
      }}
      aria-label={`${cfg.label} ${account.name}, saldo ${isEmpty ? "kosong" : formatRupiah(balance)}`}
      className={cn(
        "relative overflow-hidden rounded-[25px] p-3 border backdrop-blur-sm cursor-pointer",
        "bg-gradient-to-br transition-all duration-300 outline-none",
        "focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a]",
        cfg.gradient,
        cfg.border
      )}
    >
      <div className={cn("absolute inset-0 opacity-60 rounded-[22px] pointer-events-none", cfg.gradient)} />
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ background: cfg.accentColor }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2">
          <div className={cn("w-9 h-9 rounded-[14px] flex items-center justify-center border border-white/[0.08]", cfg.iconBg)}>
            {cfg.icon}
          </div>

          {account.is_default && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          )}
        </div>

        <p className="text-[8px] font-bold tracking-[0.10em] text-slate-500 uppercase mb-0.5">{cfg.label}</p>
        <p className="text-[13px] font-bold text-slate-300 mb-1 truncate">{account.name}</p>

        <p
          className={cn(
            "text-[12px] font-bold tracking-tight leading-none tabular-nums mb-2",
            isEmpty ? "text-slate-500" : "text-white"
          )}
        >
          {isEmpty ? "—" : formatRupiah(balance)}
        </p>

        {account.account_number && (
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-mono text-slate-400 tracking-wider tabular-nums truncate">
                {displayNumber}
              </span>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={toggleVisibility}
                  className="p-1 rounded-md hover:bg-white/[0.08] transition-colors"
                  aria-label={showNumber ? "Sembunyikan nomor" : "Tampilkan nomor"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {showNumber ? (
                      <motion.span
                        key="eye-off"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <EyeOff size={10} className="text-slate-500" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="eye"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Eye size={10} className="text-slate-500" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <button
                  onClick={handleCopy}
                  className="p-1 rounded-md hover:bg-white/[0.08] transition-colors"
                  aria-label="Salin nomor rekening"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Check size={10} className="text-emerald-400" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Copy size={10} className="text-slate-500" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

