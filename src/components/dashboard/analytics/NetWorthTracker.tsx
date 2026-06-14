//src/components/dashboard/analytics/NetWorthTracker.tsx

"use client"

import { motion } from "framer-motion"
import { Activity, Shield } from "lucide-react"
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import type { BreakdownItem, NetWorthHistoryPoint } from "@/hooks/usePremiumAnalyticsData"
import { formatRupiah } from "@/lib/utils"
import HeroCard from "./components/HeroCard"
import InteractivePieChart from "./components/InteractivePieChart"
import OceanCard from "./components/OceanCard"
import SafeResponsiveContainer from "./components/SafeResponsiveContainer"
import ScoreMeter from "./components/ScoreMeter"

interface Props {
  history: NetWorthHistoryPoint[]
  assets: BreakdownItem[]
  liabilities: BreakdownItem[]
}

function formatCompact(value: number) {
  return formatRupiah(value, true)
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-[160px] rounded-2xl border border-white/[0.08] p-3 shadow-2xl bg-[#081120]/95 backdrop-blur-xl">
      <p className="mb-2 text-xs font-medium text-[#64748B]">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="mb-1 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="text-xs font-semibold tabular-nums text-[#F1F5F9]">{formatCompact(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function NetWorthTracker({ history, assets, liabilities }: Props) {
  const latest = history[history.length - 1] ?? { assets: 0, liabilities: 0, netWorth: 0 }
  const prev = history[history.length - 2] ?? latest

  const change = latest.netWorth - prev.netWorth
  const changePct = prev.netWorth !== 0 ? (change / Math.abs(prev.netWorth)) * 100 : 0
  const debtRatio = latest.assets > 0 ? (latest.liabilities / latest.assets) * 100 : 0
  const healthScore = Math.min(100, Math.max(0, 100 - debtRatio))

  const breakdown = assets.length > 0 ? assets : liabilities
  const breakdownTitle = assets.length > 0 ? "Alokasi Aset" : "Kewajiban"
  const breakdownTotal = breakdown.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-4 pb-8">
      <HeroCard
        netWorth={latest.netWorth}
        totalAssets={latest.assets}
        totalLiabilities={latest.liabilities}
        change={change}
        changePercentage={changePct}
      />

      <div className="grid grid-cols-2 gap-3">
        <OceanCard className="flex items-center justify-center p-4" glow="cyan">
          <ScoreMeter score={healthScore} label="Kesehatan Finansial" size={110} />
        </OceanCard>

        <OceanCard className="p-4" glow="rose">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg border border-rose-500/25 bg-rose-500/15 p-1.5">
              <Shield className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">Rasio Utang</p>
          </div>
          <p className="mb-1 text-3xl font-black tabular-nums text-[#F1F5F9]">
            {debtRatio.toFixed(1)}<span className="text-sm font-normal text-[#64748B]">%</span>
          </p>
          <p className="text-[10px] text-[#64748B]">
            {debtRatio < 30 ? "✅ Sangat sehat" : debtRatio < 50 ? "⚠️ Waspada" : "🚨 Kritis"}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(debtRatio, 100)}%` }}
              transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background:
                  debtRatio < 30
                    ? "linear-gradient(90deg, #10B981, #34D399)"
                    : debtRatio < 50
                      ? "linear-gradient(90deg, #FBBF24, #F59E0B)"
                      : "linear-gradient(90deg, #F87171, #EF4444)",
              }}
            />
          </div>
        </OceanCard>
      </div>

      <OceanCard className="p-5" glow="blue">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-[#F1F5F9]">Tren Kekayaan</h3>
        </div>
        <div className="h-[240px] min-h-[240px] w-full min-w-0">
          <SafeResponsiveContainer>
            <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradNW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAsset" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value: number) => formatCompact(value)} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="assets" name="Aset" stroke="#3b82f6" strokeWidth={2} fill="url(#gradAsset)" dot={false} />
              <Area type="monotone" dataKey="netWorth" name="Kekayaan Bersih" stroke="#22d3ee" strokeWidth={2.5} fill="url(#gradNW)" dot={false} />
            </AreaChart>
          </SafeResponsiveContainer>
        </div>
      </OceanCard>

      {assets.length > 0 ? (
        <InteractivePieChart
          data={assets.map((item) => ({
            name: item.name,
            value: item.value,
            color: item.color,
            icon: item.icon,
          }))}
          title="Alokasi Aset"
          total={assets.reduce((sum, item) => sum + item.value, 0)}
        />
      ) : (
        <OceanCard className="p-5" glow="rose">
          <div className="mb-4">
            <h3 className="text-sm font-black text-[#F1F5F9]">{breakdownTitle}</h3>
            <p className="text-[11px] text-[#64748B]">Distribusi nilai berdasarkan data terbaru.</p>
          </div>

          {breakdown.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-center text-xs text-[#64748B]">
              Belum ada data aset / kewajiban.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-2">
                <p className="text-xs text-[#64748B]">Total</p>
                <p className="text-xl font-bold tabular-nums text-[#F1F5F9]">{formatRupiah(breakdownTotal)}</p>
              </div>
              {breakdown.map((item, index) => {
                const pct = breakdownTotal > 0 ? Math.round((item.value / breakdownTotal) * 100) : 0
                return (
                  <motion.div
                    key={`${item.name}-${index}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index, type: "spring", stiffness: 220, damping: 22 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate text-sm font-medium text-[#CBD5E1]">{item.name}</span>
                        <span className="ml-2 flex-shrink-0 text-sm font-bold tabular-nums text-[#F1F5F9]">{formatCompact(item.value)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.1 + 0.05 * index, duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: item.color }}
                        />
                      </div>
                    </div>
                    <span className="w-8 flex-shrink-0 text-right text-xs tabular-nums text-[#64748B]">{pct}%</span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </OceanCard>
      )}
    </div>
  )
}