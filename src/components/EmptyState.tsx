//src/components/EmptyState.tsx

"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface Props {
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  animate?: boolean
}

export default function EmptyState({
  icon: Icon,
  iconColor = "text-slate-600",
  iconBg = "bg-white/[0.04] border-white/[0.06]",
  title,
  subtitle,
  action,
  className,
  animate = false,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={cn("flex flex-col items-center justify-center py-16 text-center px-6", className)}
    >
      <motion.div
        animate={animate ? { rotate: [0, 8, -8, 8, 0], scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        className={cn("w-20 h-20 rounded-3xl border flex items-center justify-center mb-5", iconBg)}
      >
        <Icon size={32} className={iconColor} />
      </motion.div>

      <h3 className="text-white font-bold text-base">{title}</h3>

      {subtitle && (
        <p className="text-slate-500 text-sm mt-2 leading-relaxed max-w-xs">{subtitle}</p>
      )}

      {action && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white text-sm font-semibold hover:bg-white/[0.09] transition-all"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}