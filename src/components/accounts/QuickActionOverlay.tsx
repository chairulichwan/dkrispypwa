// src/components/accounts/QuickActionOverlay.tsx
"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, History, Settings, X } from "lucide-react"
import { useRouter } from "next/navigation"
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
    color: "text-blue-400 bg-blue-500/20",
    getHref: (accountId: string) => transferFromHref(accountId),
  },
  {
    label: "Mutasi",
    icon: History,
    color: "text-amber-400 bg-amber-500/20",
    getHref: (accountId: string) => accountDetailHref(accountId, "overview"),
  },
  {
    label: "Pengaturan",
    icon: Settings,
    color: "text-slate-400 bg-white/10",
    getHref: (accountId: string) => accountDetailHref(accountId, "settings"),
  },
] as const

export default function QuickActionOverlay({ accountId, isOpen, onClose, position }: Props) {
  const router = useRouter()

  if (!position || !accountId) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            style={{ left: position.x, top: position.y }}
            className="fixed z-50 -translate-x-1/2 -translate-y-full mb-2"
          >
            <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-[#1a2332]/95 border border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {ACTIONS.map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    triggerHaptic()
                    router.push(action.getHref(accountId))
                    onClose()
                  }}
                  className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-colors hover:bg-white/[0.06]"
                  aria-label={action.label}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", action.color)}>
                    <action.icon size={16} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 whitespace-nowrap">{action.label}</span>
                </motion.button>
              ))}

              <div className="w-px h-8 bg-white/[0.08] mx-0.5" />

              <button
                onClick={() => {
                  triggerHaptic()
                  onClose()
                }}
                className="p-2 rounded-xl hover:bg-white/[0.06] transition-colors"
                aria-label="Tutup"
              >
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-[#1a2332]/95 border-r border-b border-white/[0.1]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}



