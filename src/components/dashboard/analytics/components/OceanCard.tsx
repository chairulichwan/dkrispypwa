//src/components/dashboard/analytics/components/OceanCard.tsx

"use client"

import type { ReactNode } from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface OceanCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode
  glow?: "cyan" | "blue" | "emerald" | "rose" | "none"
}

const glowMap = {
  cyan: "before:from-cyan-400/[0.08] before:to-blue-500/[0.04]",
  blue: "before:from-blue-400/[0.08] before:to-indigo-500/[0.04]",
  emerald: "before:from-emerald-400/[0.08] before:to-cyan-500/[0.04]",
  rose: "before:from-rose-400/[0.08] before:to-pink-500/[0.04]",
  none: "before:from-white/[0.04] before:to-transparent",
} as const

export default function OceanCard({ children, className, glow = "cyan", style, ...props }: OceanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.85 }}
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-white/[0.07] shadow-2xl',
        'bg-[#0B1628]/70 backdrop-blur-2xl',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:content-[""]',
        glowMap[glow],
        className
      )}
      style={{
        boxShadow: '0 22px 70px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        ...style,
      }}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

