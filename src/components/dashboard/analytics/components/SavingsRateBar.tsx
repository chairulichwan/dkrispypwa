//src/components/dashboard/analytics/components/SavingsRateBar.tsx


"use client"

import { motion } from "framer-motion"
import { Target, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import OceanCard from "./OceanCard"

interface SavingsRateBarProps {
  rate: number
  target?: number
  change?: number
}

export default function SavingsRateBar({ rate, target = 30, change = 0 }: SavingsRateBarProps) {
  const clampedRate = Math.max(0, Math.min(100, rate))
  const clampedTarget = Math.max(0, Math.min(100, target))
  const isAboveTarget = rate >= target

  return (
    <OceanCard className="p-5" glow={isAboveTarget ? "emerald" : "rose"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[#64748B]">Tingkat Tabungan</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">
            {rate.toFixed(1)}<span className="text-sm font-normal text-[#64748B]">%</span>
          </p>
        </div>
        <div className="text-right">
          <div className={cn("flex items-center gap-1 text-xs font-semibold", change >= 0 ? "text-emerald-400" : "text-rose-400")}>
            <TrendingUp className={cn("h-3.5 w-3.5", change < 0 && "rotate-180")} />
            {change >= 0 ? "+" : ""}{change.toFixed(1)}% vs bulan lalu
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">Target: {target}%</p>
        </div>
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedRate}%` }}
          transition={{ delay: 0.3, duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative h-full rounded-full"
          style={{
            background: isAboveTarget
              ? "linear-gradient(90deg, #22D3EE, #34D399)"
              : "linear-gradient(90deg, #F87171, #FBBF24)",
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              animation: "shimmer 2s infinite",
            }}
          />
        </motion.div>
        <div className="absolute bottom-0 top-0 w-0.5 bg-white/40" style={{ left: `${clampedTarget}%` }}>
          <div className="absolute -top-5 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <Target className="h-3 w-3 text-white/60" />
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex justify-between">
        <span className="text-[10px] text-[#64748B]">0%</span>
        <span className={cn("text-[10px] font-medium", isAboveTarget ? "text-cyan-400/60" : "text-amber-400/60")}>
          Target {target}% ↑
        </span>
        <span className="text-[10px] text-[#64748B]">100%</span>
      </div>
    </OceanCard>
  )
}

