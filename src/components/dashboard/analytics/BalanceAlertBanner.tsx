//src/components/dashboard/analytics/BalanceAlertBanner.tsx

"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, AlertTriangle, Bell, Info, X } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type BannerAlertType = "critical" | "warning" | "info"

export interface BannerAlertItem {
  id: string
  type: BannerAlertType
  title: string
  message: string
}

interface BalanceAlertBannerProps {
  alerts: BannerAlertItem[]
  onDismiss?: (id: string) => Promise<void> | void
  onDismissAll?: () => Promise<void> | void
}

const ALERT_CONFIG = {
  critical: {
    Icon: AlertTriangle,
    bgGradient: "from-red-500/20 via-red-500/10 to-transparent",
    borderColor: "border-red-400/40",
    iconBg: "bg-red-500/20 border-red-400/30",
    iconColor: "text-red-400",
    textColor: "text-red-300",
    titleColor: "text-red-200",
    badge: "KRITIS",
    badgeColor: "bg-red-500/30 text-red-200 border-red-400/40",
    glowColor: "bg-red-500",
  },
  warning: {
    Icon: AlertCircle,
    bgGradient: "from-amber-500/20 via-amber-500/10 to-transparent",
    borderColor: "border-amber-400/40",
    iconBg: "bg-amber-500/20 border-amber-400/30",
    iconColor: "text-amber-400",
    textColor: "text-amber-300",
    titleColor: "text-amber-200",
    badge: "PERINGATAN",
    badgeColor: "bg-amber-500/30 text-amber-200 border-amber-400/40",
    glowColor: "bg-amber-500",
  },
  info: {
    Icon: Info,
    bgGradient: "from-cyan-500/20 via-cyan-500/10 to-transparent",
    borderColor: "border-cyan-400/40",
    iconBg: "bg-cyan-500/20 border-cyan-400/30",
    iconColor: "text-cyan-400",
    textColor: "text-cyan-300",
    titleColor: "text-cyan-200",
    badge: "INFO",
    badgeColor: "bg-cyan-500/30 text-cyan-200 border-cyan-400/40",
    glowColor: "bg-cyan-500",
  },
} as const

const DEFAULT_TITLES: Record<BannerAlertType, string> = {
  critical: "Risiko Saldo Serius",
  warning: "Perlu Perhatian",
  info: "Info Analytics",
}

export default function BalanceAlertBanner({ alerts, onDismiss, onDismissAll }: BalanceAlertBannerProps) {
  const [localDismissedIds, setLocalDismissedIds] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)

  const visibleAlerts = useMemo(() => alerts.filter((alert) => !localDismissedIds.has(alert.id)), [alerts, localDismissedIds])

  if (visibleAlerts.length === 0) return null

  const currentAlert = visibleAlerts[currentIndex] ?? visibleAlerts[0]
  const alertType = currentAlert.type
  const config = ALERT_CONFIG[alertType]
  const Icon = config.Icon

  const handleDismiss = async (id: string) => {
    setLocalDismissedIds((prev) => new Set(prev).add(id))
    setCurrentIndex((prev) => Math.max(0, Math.min(prev, visibleAlerts.length - 2)))
    await onDismiss?.(id)
  }

  const handleDismissAll = async () => {
    setLocalDismissedIds(new Set(visibleAlerts.map((alert) => alert.id)))
    setCurrentIndex(0)
    await onDismissAll?.()
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={currentAlert.id}
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{ willChange: "transform, opacity" }}
        className={cn(
          "relative mb-4 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl",
          config.borderColor,
          `bg-gradient-to-r ${config.bgGradient}`
        )}
      >
        <div className={cn("pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-50 blur-3xl", config.glowColor)} />

        <div className="relative p-4">
          <div className="flex items-start gap-3">
            <div className={cn("shrink-0 rounded-xl border p-2.5", config.iconBg)}>
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h4 className={cn("text-sm font-bold", config.titleColor)}>{currentAlert.title || DEFAULT_TITLES[alertType]}</h4>
                <span className={cn("rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", config.badgeColor)}>
                  {config.badge}
                </span>
                {visibleAlerts.length > 1 && <span className="text-[10px] text-[#64748B]">{currentIndex + 1}/{visibleAlerts.length}</span>}
              </div>

              <p className={cn("text-xs leading-relaxed", config.textColor)}>{currentAlert.message}</p>

              {alertType === "critical" && (
                <button className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-[#F1F5F9] transition-all hover:bg-white/[0.1] active:scale-[0.98]">
                  <Bell className="h-3 w-3" />
                  Aktifkan Notifikasi Push
                </button>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-1">
              <button
                onClick={() => void handleDismiss(currentAlert.id)}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06] active:scale-95"
                aria-label="Tutup peringatan ini"
              >
                <X className="h-4 w-4 text-[#64748B] hover:text-[#F1F5F9]" />
              </button>

              {visibleAlerts.length > 1 && (
                <button
                  onClick={() => setCurrentIndex((currentIndex + 1) % visibleAlerts.length)}
                  className="rounded-lg p-1.5 text-xs font-bold text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F1F5F9] active:scale-95"
                  aria-label="Peringatan berikutnya"
                >
                  ›
                </button>
              )}
            </div>
          </div>

          {visibleAlerts.length > 1 && (
            <button
              onClick={() => void handleDismissAll()}
              className="mt-3 w-full rounded-lg border border-white/[0.06] bg-white/[0.04] py-1.5 text-[10px] font-semibold text-[#64748B] transition-colors hover:bg-white/[0.08] hover:text-[#F1F5F9] active:scale-[0.99]"
            >
              Tutup Semua ({visibleAlerts.length} peringatan)
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

