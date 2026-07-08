"use client"

import { type ReactNode, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, Plus, CreditCard, Eye, EyeOff, Copy, Check, ArrowUpRight, History, PanelTopOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { ACCOUNT_STYLE, type Account, type AccountType } from "@/app/dashboard/types"
import { INTERACTIVE_SPRING, TAP_FEEDBACK, EASE_OUT_SMOOTH } from "@/lib/motion"
import { formatRupiah, cn, maskAccountNumber, formatAccountNumber } from "@/lib/utils"
import { ROUTES, accountDetailHref, transferFromHref } from "@/lib/routes"
import toast from "react-hot-toast"

interface AccountCardsProps {
  accounts: Account[]
  onCardClick?: (account: Account) => void
}

const FALLBACK_STYLE = {
  bgColor: "bg-slate-950",
  iconBg: "bg-white/[0.08] text-slate-200",
  gradient: "from-slate-400/20 to-slate-700/10",
  border: "border-white/[0.08]",
  accentColor: "#6b7280",
  icon: <CreditCard size={18} />,
  label: "Lainnya",
}

export default function AccountCards({ accounts, onCardClick }: AccountCardsProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (expandedId && !accounts.some((account) => account.id === expandedId)) {
      setExpandedId(null)
    }
  }, [accounts, expandedId])

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-[3px] rounded-full bg-[#38BDF8]" />
            <h2 className="text-[15px] font-semibold tracking-tight text-white">Akun Saya</h2>
            <span className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              {accounts.length}
            </span>
          </div>
          <p className="mt-1 pl-5 text-[11px] text-slate-400">Tap sekali untuk membuka shortcut di bawah kartu</p>
        </div>

        <button
          type="button"
          onClick={() => router.push(ROUTES.accountsList)}
          className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-slate-300 transition-colors hover:border-white/[0.14] hover:text-white"
        >
          Semua <ChevronRight size={13} />
        </button>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 scrollbar-hide">
        {accounts.map((account, index) => {
          const cfg = ACCOUNT_STYLE[account.type as AccountType] ?? FALLBACK_STYLE
          const isExpanded = expandedId === account.id

          return (
            <div key={account.id} className="min-w-[82%] snap-center space-y-3 sm:min-w-[320px] lg:min-w-[280px]">
              <AccountCardItem
                account={account}
                cfg={cfg}
                index={index}
                expanded={isExpanded}
                onToggle={() => setExpandedId((current) => (current === account.id ? null : account.id))}
                onDetailRequest={() => {
                  if (onCardClick) {
                    onCardClick(account)
                    return
                  }
                  router.push(accountDetailHref(account.id))
                }}
              />

              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={INTERACTIVE_SPRING}
                    className="grid grid-cols-3 gap-2"
                  >
                    {[
                      {
                        id: "transfer",
                        label: "Transfer",
                        icon: <ArrowUpRight size={16} className="text-[#38BDF8]" />,
                        onClick: () => router.push(transferFromHref(account.id)),
                      },
                      {
                        id: "mutation",
                        label: "Mutasi",
                        icon: <History size={16} className="text-amber-300" />,
                        onClick: () => router.push(accountDetailHref(account.id, "overview")),
                      },
                      {
                        id: "detail",
                        label: "Detail",
                        icon: <PanelTopOpen size={16} className="text-emerald-300" />,
                        onClick: () => {
                          if (onCardClick) {
                            onCardClick(account)
                            return
                          }
                          router.push(accountDetailHref(account.id))
                        },
                      },
                    ].map((action) => (
                      <motion.button
                        key={action.id}
                        type="button"
                        whileTap={TAP_FEEDBACK}
                        transition={INTERACTIVE_SPRING}
                        onClick={action.onClick}
                        className="rounded-[20px] border border-white/[0.06] bg-[#0B1528] p-3"
                      >
                        <div className="flex flex-col items-center gap-2 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                            {action.icon}
                          </div>
                          <span className="text-[11px] font-medium text-slate-300">{action.label}</span>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          )
        })}

        <motion.button
          type="button"
          whileTap={TAP_FEEDBACK}
          transition={INTERACTIVE_SPRING}
          onClick={() => router.push(ROUTES.addAccount)}
          className="min-w-[58%] snap-center rounded-[24px] border border-dashed border-white/[0.08] bg-white/[0.03] p-4 text-left text-slate-300 sm:min-w-[220px] lg:min-w-[240px]"
        >
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#38BDF8]">
              <Plus size={18} />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-white">Tambah akun baru</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">Buka onboarding akun dalam satu langkah cepat.</p>
            </div>
          </div>
        </motion.button>
      </div>
    </section>
  )
}

function AccountCardItem({
  account,
  cfg,
  index,
  expanded,
  onToggle,
  onDetailRequest,
}: {
  account: Account
  cfg: {
    bgColor: string
    iconBg: string
    gradient: string
    border: string
    accentColor: string
    icon: ReactNode
    label: string
  }
  index: number
  expanded: boolean
  onToggle: () => void
  onDetailRequest: () => void
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
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: expanded ? 1.02 : 1 }}
      transition={{ duration: 0.42, delay: 0.05 * index, ease: EASE_OUT_SMOOTH }}
      whileTap={TAP_FEEDBACK}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onToggle()
        }
      }}
      aria-label={`${cfg.label} ${account.name}, saldo ${isEmpty ? "kosong" : formatRupiah(balance)}`}
      className={cn(
        "relative overflow-hidden rounded-[24px] border bg-[#0B1528] p-4 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#38BDF8]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]",
        expanded ? "border-white/[0.14]" : cfg.border
      )}
      style={{ boxShadow: `0 18px 42px -30px ${cfg.accentColor}88` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(56,189,248,0.04))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08]"
              style={{ backgroundColor: `${cfg.accentColor}22`, color: cfg.accentColor }}
            >
              {cfg.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{cfg.label}</p>
              <p className="truncate text-base font-semibold tracking-tight text-white">{account.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {account.is_default ? (
              <span className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-slate-300">
                Utama
              </span>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onDetailRequest()
              }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:bg-white/[0.08]"
            >
              Detail
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-300">Saldo tersedia</p>
            <p className="mt-1 text-[28px] font-medium leading-none tracking-tight tabular-nums text-white">
              {isEmpty ? "—" : formatRupiah(balance)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Shortcut</p>
            <p className="mt-1 text-sm text-slate-300">{expanded ? "Siap dipakai" : "Tap untuk buka"}</p>
          </div>
        </div>

        {account.account_number ? (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Nomor akun</p>
                <p className="mt-1 truncate font-mono text-sm tracking-wide text-slate-300">{displayNumber}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleVisibility}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/[0.08]"
                  aria-label={showNumber ? "Sembunyikan nomor" : "Tampilkan nomor"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {showNumber ? (
                      <motion.span
                        key="eye-off"
                        initial={{ opacity: 0, scale: 0.84 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.84 }}
                        className="block"
                      >
                        <EyeOff size={14} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="eye"
                        initial={{ opacity: 0, scale: 0.84 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.84 }}
                        className="block"
                      >
                        <Eye size={14} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 text-slate-300 transition hover:bg-white/[0.08]"
                  aria-label="Salin nomor rekening"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ opacity: 0, scale: 0.84 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.84 }}
                        className="block"
                      >
                        <Check size={14} className="text-emerald-400" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0, scale: 0.84 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.84 }}
                        className="block"
                      >
                        <Copy size={14} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}
