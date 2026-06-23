"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, History, Settings, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { INTERACTIVE_SPRING, TAP_FEEDBACK } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { accountDetailHref, transferFromHref } from "@/lib/routes"

interface Props {
  accountId: string
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number } | null
}

const triggerHaptic = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10)
  }
}

const ACTIONS = [
  {
    label: "Transfer",
    icon: ArrowUpRight,
    color: "text-[#38BDF8] bg-[#38BDF8]/12 border-[#38BDF8]/20",
    getHref: (accountId: string) => transferFromHref(accountId),
  },
  {
    label: "Mutasi",
    icon: History,
    color: "text-amber-300 bg-amber-500/12 border-amber-500/20",
    getHref: (accountId: string) => accountDetailHref(accountId, "overview"),
  },
  {
    label: "Pengaturan",
    icon: Settings,
    color: "text-slate-300 bg-white/[0.06] border-white/[0.08]",
    getHref: (accountId: string) => accountDetailHref(accountId, "settings"),
  },
] as const

export default function QuickActionOverlay({ accountId, isOpen, onClose, position }: Props) {
  const router = useRouter()

  if (!position || !accountId) return null

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-[#030712]/42 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={INTERACTIVE_SPRING}
            style={{ left: position.x, top: position.y }}
            className="fixed z-50 -translate-x-1/2 -translate-y-full pb-2"
          >
            <div className="rounded-[24px] border border-white/[0.10] bg-[#0B1528]/95 p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
              <div className="flex items-center gap-1">
                {ACTIONS.map((action) => (
                  <motion.button
                    key={action.label}
                    type="button"
                    whileTap={TAP_FEEDBACK}
                    transition={INTERACTIVE_SPRING}
                    onClick={() => {
                      triggerHaptic()
                      router.push(action.getHref(accountId))
                      onClose()
                    }}
                    className="flex flex-col items-center gap-1 px-3.5 py-2.5 rounded-xl transition-colors hover:bg-white/[0.05]"
                    aria-label={action.label}
                  >
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", action.color)}>
                      <action.icon size={16} />
                    </div>
                    <span className="whitespace-nowrap text-[9px] font-semibold text-slate-300">{action.label}</span>
                  </motion.button>
                ))}

                <div className="mx-0.5 h-8 w-px bg-white/[0.08]" />

                <motion.button
                  type="button"
                  whileTap={TAP_FEEDBACK}
                  transition={INTERACTIVE_SPRING}
                  onClick={() => {
                    triggerHaptic()
                    onClose()
                  }}
                  className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/[0.05]"
                  aria-label="Tutup"
                >
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            <div className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/[0.10] bg-[#0B1528]/95" />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
