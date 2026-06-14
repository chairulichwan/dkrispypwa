//src/components/dashboard/analytics/components/ScoreMeter.tsx

"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ScoreMeterProps {
  score: number
  label: string
  size?: number
}

export default function ScoreMeter({ score, label, size = 120 }: ScoreMeterProps) {
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const normalizedScore = Math.max(0, Math.min(100, score))
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference

  const getColor = () => {
    if (normalizedScore >= 80) return { stroke: "#10B981", text: "text-emerald-400", label: "Sangat Baik" }
    if (normalizedScore >= 60) return { stroke: "#22D3EE", text: "text-cyan-400", label: "Baik" }
    if (normalizedScore >= 40) return { stroke: "#FBBF24", text: "text-amber-400", label: "Cukup" }
    return { stroke: "#F87171", text: "text-rose-400", label: "Perlu Perhatian" }
  }

  const color = getColor()

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90 transform" width={size} height={size} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
            animate={{ strokeDasharray: circumference, strokeDashoffset }}
            transition={{ duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
            style={{ filter: `drop-shadow(0 0 8px ${color.stroke}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className={cn("text-3xl font-black tabular-nums", color.text)}
          >
            {Math.round(normalizedScore)}
          </motion.span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#64748B]">Skor</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-xs font-medium text-[#64748B]">{label}</p>
        <p className={cn("mt-0.5 text-sm font-bold", color.text)}>{color.label}</p>
      </div>
    </div>
  )
}

