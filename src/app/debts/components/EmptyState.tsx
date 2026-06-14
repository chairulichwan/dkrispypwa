// src/app/debts/components/EmptyState.tsx
"use client"

import { motion } from "framer-motion"
import { Plus } from "lucide-react"

interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="py-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 20 }}
        className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#151E32] to-[#0D1526] shadow-lg"
      >
        <Icon size={24} className="text-[#475569]" />
      </motion.div>
      <p className="mb-1 text-sm font-semibold text-[#CBD5E1]">{title}</p>
      <p className="mb-3 px-4 text-xs leading-relaxed text-[#475569]">{description}</p>
      {action && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 transition-colors hover:text-sky-300"
        >
          <Plus size={12} />
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}