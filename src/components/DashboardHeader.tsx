"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Bell, LogOut } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { INTERACTIVE_SPRING, TAP_FEEDBACK, EASE_OUT_SMOOTH } from "@/lib/motion"
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

export const HEADER_HEIGHT = 88

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
    const timeout = setTimeout(() => setShowLogoutConfirm(false), 2400)
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

  const getInitials = (name: string) => {
    const clean = name.trim().replace(/[^a-zA-Z\s]/g, "")
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "US"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
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
      transition={{ duration: 0.42, ease: EASE_OUT_SMOOTH }}
      className="fixed inset-x-0 top-0 z-40 pointer-events-none"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "12px" }}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-b-[28px] border-b transition-all duration-300 pointer-events-none",
          isScrolled
            ? "border-white/[0.08] bg-[#030712]/90 backdrop-blur-2xl"
            : "border-transparent bg-[#030712]/68 backdrop-blur-xl"
        )}
      />

      <div
        className="relative mx-auto flex w-full max-w-4xl items-center justify-between px-4 pt-12 pb-2 pointer-events-auto sm:px-5 lg:px-6"
        style={{ minHeight: `${HEADER_HEIGHT}px` }}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-[#0B1528] text-[#38BDF8] shadow-[0_12px_32px_-20px_rgba(56,189,248,0.85)]">
              <span className="text-lg font-semibold tracking-tight" aria-label={`Avatar ${userName}`}>
                {getInitials(userName)}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#030712] bg-emerald-400" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{greeting}</p>
            <h1 className="truncate text-base font-semibold tracking-tight text-white">{userName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.08] bg-[#0B1528]/82 p-1.5 backdrop-blur-xl shadow-[0_10px_30px_-20px_rgba(56,189,248,0.24)]">
          <Link
            href={ROUTES.notifications}
            onClick={triggerHaptic}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/[0.05]"
            aria-label="Notifikasi"
          >
            <Bell size={17} className="text-slate-300" strokeWidth={1.9} />
            <AnimatePresence>
              {notificationCount > 0 ? (
                <motion.span
                  key={notificationCount}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={INTERACTIVE_SPRING}
                  className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border border-[#030712] bg-[#38BDF8] px-1 text-[8px] font-bold text-[#030712]"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </Link>

          <motion.button
            type="button"
            whileTap={TAP_FEEDBACK}
            transition={INTERACTIVE_SPRING}
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition",
              showLogoutConfirm ? "bg-red-500/12 text-red-300" : "hover:bg-white/[0.05]",
              isLoggingOut && "cursor-wait"
            )}
            aria-label={showLogoutConfirm ? "Konfirmasi logout" : "Keluar"}
          >
            <AnimatePresence mode="wait">
              {isLoggingOut ? (
                <motion.div
                  key="spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white/[0.16] border-t-[#38BDF8]"
                />
              ) : (
                <motion.div key={showLogoutConfirm ? "confirm" : "idle"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <LogOut size={17} strokeWidth={2.1} className={showLogoutConfirm ? "text-red-300" : "text-slate-300"} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showLogoutConfirm && !isLoggingOut ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={INTERACTIVE_SPRING}
            className="absolute right-4 top-[calc(100%-2px)] rounded-xl border border-red-500/20 bg-red-500/12 px-3 py-2 text-[10px] font-medium text-red-300 shadow-lg pointer-events-auto"
          >
            Klik lagi untuk keluar
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  )
}
