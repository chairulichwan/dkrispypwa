//src/components/BottomNav.tsx

"use client"

import { motion } from "framer-motion"
import { Home, Activity, BarChart3, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
      <div className="absolute inset-0 bg-[#0B1120]/95 backdrop-blur-2xl border-t border-white/[0.06]" />

      <div className="relative flex items-center justify-around px-2 pt-2.5 pb-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={id}
              href={href}
              onClick={triggerHaptic}
              className="flex flex-col items-center justify-center gap-1 w-16 py-1.5 relative"
              style={{ touchAction: "manipulation" }}
            >
              {isActive && (
                <motion.div
                  layoutId="navGlow"
                  className="absolute inset-0 rounded-2xl bg-amber-400/10 border border-amber-400/20"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              <div className="relative z-10">
                <Icon
                  size={20}
                  className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-amber-400 scale-105" : "text-[#64748B]"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>

              <span
                className={cn(
                  "text-[9px] font-bold tracking-wide relative z-10 transition-colors duration-200",
                  isActive ? "text-amber-400" : "text-[#64748B]"
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

