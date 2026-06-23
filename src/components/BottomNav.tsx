"use client"

import { motion } from "framer-motion"
import { Home, Activity, BarChart3, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { INTERACTIVE_SPRING } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/routes"

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, href: ROUTES.dashboard },
  { id: "activity", label: "Activity", icon: Activity, href: "/activity" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: ROUTES.analytics },
  { id: "profile", label: "Profile", icon: User, href: ROUTES.profile },
] as const

const triggerHaptic = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(8)
  }
}

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="absolute inset-0 border-t border-white/[0.08] bg-[#030712]/94 backdrop-blur-2xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/18 to-transparent" />

      <div className="relative flex items-center justify-around px-2 pb-2 pt-2.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={id}
              href={href}
              onClick={triggerHaptic}
              className="relative flex w-16 flex-col items-center justify-center gap-1 py-1.5"
              style={{ touchAction: "manipulation" }}
            >
              {isActive ? (
                <motion.div
                  layoutId="navGlow"
                  transition={INTERACTIVE_SPRING}
                  className="absolute inset-0 rounded-[18px] border border-cyan-400/18 bg-cyan-500/10"
                />
              ) : null}

              <div className="relative z-10">
                <Icon
                  size={20}
                  className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-[#38BDF8] scale-105" : "text-slate-500"
                  )}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
              </div>

              <span
                className={cn(
                  "relative z-10 text-[9px] font-semibold tracking-wide transition-colors duration-200",
                  isActive ? "text-[#38BDF8]" : "text-slate-500"
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
