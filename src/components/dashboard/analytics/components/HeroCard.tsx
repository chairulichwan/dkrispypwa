//src/components/dashboard/analytics/components/HeroCard.tsx

"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff, Info, Landmark, ShieldCheck, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { cn, formatRupiah } from "@/lib/utils"

interface HeroCardProps {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  change: number
  changePercentage: number
}

export default function HeroCard({ netWorth, totalAssets, totalLiabilities, change, changePercentage }: HeroCardProps) {
  const [hidden, setHidden] = useState(false)
  const isPositive = change >= 0
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

  const health = useMemo(() => {
    if (debtRatio < 25) return { label: "Portfolio sehat", color: "#34D399" }
    if (debtRatio < 45) return { label: "Masih terkendali", color: "#22D3EE" }
    return { label: "Perlu perhatian", color: "#F87171" }
  }, [debtRatio])

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 210, damping: 24, mass: 0.8 }}
      className="relative overflow-hidden rounded-[34px] border border-white/[0.09] p-5 shadow-2xl sm:p-6"
      style={{
        background:
          'radial-gradient(circle at 20% 0%, rgba(34,211,238,0.22), transparent 34%), radial-gradient(circle at 90% 20%, rgba(37,99,235,0.18), transparent 30%), linear-gradient(145deg, rgba(13, 26, 48, 0.94), rgba(5, 10, 20, 0.97))',
        backdropFilter: 'blur(26px)',
        boxShadow: '0 28px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.075)',
      }}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-blue-600/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />

      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/12 p-2.5 shadow-lg shadow-cyan-500/10">
              <Wallet className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">Net Worth</p>
                <Info className="h-3 w-3 shrink-0 text-[#64748B]" />
              </div>
              <p className="mt-0.5 text-[11px] text-[#94A3B8]">Kekayaan bersih real-time</p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setHidden((prev) => !prev)}
            className="rounded-2xl border border-white/[0.09] bg-white/[0.055] p-2.5 shadow-lg backdrop-blur-xl transition-all hover:bg-white/[0.09]"
            aria-label={hidden ? "Tampilkan nilai" : "Sembunyikan nilai"}
          >
            {hidden ? <EyeOff className="h-4 w-4 text-[#94A3B8]" /> : <Eye className="h-4 w-4 text-cyan-300" />}
          </motion.button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={hidden ? "hidden" : "visible"}
            initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            className="mb-3"
          >
            <p className="break-words bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-400 bg-clip-text text-[34px] font-black tracking-[-0.04em] text-transparent sm:text-5xl">
              {hidden ? <span className="text-cyan-200/90">••••••••</span> : formatRupiah(netWorth)}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-xl',
            isPositive ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/20 bg-rose-400/10 text-rose-300'
          )}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{isPositive ? '+' : ''}{formatRupiah(change, true)}</span>
            <span className="opacity-75">({isPositive ? '+' : ''}{changePercentage.toFixed(1)}%)</span>
          </div>

          <div
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-xl"
            style={{ borderColor: `${health.color}33`, background: `${health.color}12`, color: health.color }}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {health.label}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/18 bg-emerald-400/[0.075] p-3">
            <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-emerald-400/10 blur-2xl" />
            <div className="relative flex items-center gap-2">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/12 p-2">
                <Landmark className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#64748B]">Total Aset</p>
                <p className="truncate text-sm font-black tabular-nums text-emerald-300">{hidden ? '•••••' : formatRupiah(totalAssets, true)}</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-rose-400/18 bg-rose-400/[0.075] p-3">
            <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-rose-400/10 blur-2xl" />
            <div className="relative flex items-center gap-2">
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/12 p-2">
                <TrendingDown className="h-4 w-4 text-rose-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#64748B]">Kewajiban</p>
                <p className="truncate text-sm font-black tabular-nums text-rose-300">{hidden ? '•••••' : formatRupiah(totalLiabilities, true)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

