//src/components/DashboardHeader.tsx
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Bell, LogOut } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"
import { useRealtimeDebts } from "@/hooks/useRealtimeDebts"

interface DashboardHeaderProps {
  userId: string
  userName: string
  onLogout?: () => void
  isLoggingOut?: boolean
  notificationCount?: number
}

export const HEADER_HEIGHT = 90

const triggerHaptic = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(8)
  }
}

export default function DashboardHeader({
  userId,
  userName,
  onLogout,
  isLoggingOut = false,
  notificationCount = 0,
}: DashboardHeaderProps) {
  const router = useRouter()
  const [activeAction, setActiveAction] = useState<"logout" | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useRealtimeDebts(userId, () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([10, 50, 10])
    }
    router.refresh()
  })

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (!showLogoutConfirm) return
    const timeout = setTimeout(() => setShowLogoutConfirm(false), 2500)
    return () => clearTimeout(timeout)
  }, [showLogoutConfirm])

  const hour = new Date().getHours()
  const greeting =
    hour < 11
      ? "Good Morning"
      : hour < 15
        ? "Good Afternoon"
        : hour < 18
          ? "Good Evening"
          : "Good Night"

  const getInitials = (name: string): string => {
    const clean = name.trim().replace(/[^a-zA-Z\s]/g, "")
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "US"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const handleLogoutClick = useCallback(() => {
    if (isLoggingOut) return
    triggerHaptic()

    if (showLogoutConfirm) {
      onLogout?.()
      setShowLogoutConfirm(false)
      return
    }

    setShowLogoutConfirm(true)
  }, [isLoggingOut, onLogout, showLogoutConfirm])

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="fixed top-0 left-0 right-0 z-40 pointer-events-none"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "12px",
      }}
    >
      <div
        className={cn(
          "absolute inset-0 transition-all duration-300 pointer-events-none rounded-b-[2rem] overflow-hidden",
          isScrolled
            ? "bg-[#0B1120]/90 backdrop-blur-2xl border-b border-white/[0.06]"
            : "bg-gradient-to-b from-[#0B1120]/30 via-[#0B1120]/20 to-transparent backdrop-blur-sm"
        )}
      />

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

      <div
        className="relative flex items-center justify-between px-5 pt-12 pb-3 pointer-events-auto"
        style={{ minHeight: `${HEADER_HEIGHT}px` }}
      >
        <div className="flex items-center gap-5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative shrink-0"
          >
            <div
              className="w-11 h-11 rounded-2xl border border-blue-500/50 flex items-center justify-center overflow-hidden"
              style={{
                background: "linear-gradient(135deg,#0a2240,#0d3566)",
                boxShadow:
                  "0 0 0 1px rgba(100,180,255,0.15),0 8px 32px rgba(10,48,96,0.6)",
              }}
            >
              <span className="text-[#7dc4f0] font-black text-xl tracking-tight" aria-label={`Avatar ${userName}`}>
                {getInitials(userName)}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 animate-pulse rounded-full border-2 border-[#0B1120]" />
          </motion.div>

          <div className="flex flex-col min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#64748B] uppercase">
              {greeting}
            </p>
            <h1 className="text-base font-bold text-[#F1F5F9] tracking-tight leading-tight truncate">
              {userName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
          <Link
            href={ROUTES.notifications}
            onClick={triggerHaptic}
            className="relative flex items-center justify-center w-10 h-9 rounded-xl hover:bg-white/[0.04] active:scale-90 transition-all"
            aria-label="Notifikasi"
          >
            <div className="relative z-10">
              <Bell
                size={17}
                className="text-[#94A3B8] hover:text-amber-400 transition-colors duration-200"
                strokeWidth={1.8}
              />
              <AnimatePresence>
                {notificationCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 flex items-center justify-center text-[8px] font-bold text-white bg-amber-400 rounded-full border border-[#0B1120]"
                  >
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </Link>

          <motion.button
            onClick={handleLogoutClick}
            onHoverStart={() => setActiveAction("logout")}
            onHoverEnd={() => setActiveAction(null)}
            whileTap={{ scale: 0.88 }}
            disabled={isLoggingOut}
            className={cn(
              "relative flex items-center justify-center w-10 h-9 rounded-xl transition-colors",
              isLoggingOut && "cursor-wait"
            )}
            aria-label={showLogoutConfirm ? "Konfirmasi logout" : "Keluar"}
          >
            {(activeAction === "logout" || showLogoutConfirm) && !isLoggingOut && (
              <motion.div
                layoutId="headerPill"
                className={cn(
                  "absolute inset-0 rounded-xl border",
                  showLogoutConfirm
                    ? "bg-red-400/15 border-red-400/30"
                    : "bg-amber-400/10 border-amber-400/20"
                )}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}

            <div className="relative z-10">
              <AnimatePresence mode="wait">
                {isLoggingOut ? (
                  <motion.div
                    key="spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-slate-600 border-t-amber-400 rounded-full"
                  />
                ) : showLogoutConfirm ? (
                  <motion.div
                    key="confirm"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <LogOut size={17} className="text-red-400" strokeWidth={2.5} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <LogOut
                      size={17}
                      className={cn(
                        "transition-colors duration-200",
                        activeAction === "logout" ? "text-amber-400" : "text-[#64748B]"
                      )}
                      strokeWidth={activeAction === "logout" ? 2.5 : 1.8}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showLogoutConfirm && !isLoggingOut && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-5 top-[calc(100%-4px)] px-2.5 py-1.5 bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-xl text-[10px] font-medium text-red-300 shadow-lg pointer-events-auto"
          >
            Klik lagi untuk keluar
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

