//src/components/dashboard/analytics/components/InteractivePieChart.tsx


"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Cell, Pie, PieChart, Sector } from "recharts"
import { ChevronRight, Sparkles } from "lucide-react"
import { cn, formatRupiah } from "@/lib/utils"
import OceanCard from "./OceanCard"
import SafeResponsiveContainer from "./SafeResponsiveContainer"

interface PieDataItem {
  name: string
  value: number
  color: string
  icon?: string
}

interface InteractivePieChartProps {
  data: PieDataItem[]
  title: string
  total: number
}

const PieWithActiveShape = Pie as any

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={10}
        style={{ filter: `drop-shadow(0 0 14px ${fill}8A)` }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 13}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  )
}

export default function InteractivePieChart({ data, title, total }: InteractivePieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const sortedData = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data])
  const activeItem = sortedData[activeIndex] ?? sortedData[0]
  const activePct = activeItem && total > 0 ? (activeItem.value / total) * 100 : 0
  const topAsset = sortedData[0]
  const insight = topAsset
    ? `${topAsset.icon ? `${topAsset.icon} ` : ""}${topAsset.name} mendominasi ${((topAsset.value / Math.max(total, 1)) * 100).toFixed(0)}% portofolio.`
    : "Belum ada alokasi aset."

  if (!sortedData.length) {
    return (
      <OceanCard className="p-5" glow="cyan">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F1F5F9]">{title}</h3>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-[#64748B]">Portfolio</span>
        </div>
        <div className="flex h-40 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03] text-sm text-[#64748B]">
          Tidak ada data
        </div>
      </OceanCard>
    )
  }

  return (
    <OceanCard className="p-0" glow="cyan">
      <div className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl" style={{ background: `${activeItem.color}24` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

        <div className="relative mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              </div>
              <h3 className="truncate text-sm font-semibold text-[#F1F5F9]">{title}</h3>
            </div>
            <p className="text-[11px] leading-relaxed text-[#64748B]">Distribusi aset premium berdasarkan kategori.</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-3 py-2 text-right backdrop-blur-xl">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#64748B]">Total</p>
            <p className="text-xs font-bold tabular-nums text-cyan-300">{formatRupiah(total, true)}</p>
          </div>
        </div>

        <div className="relative grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
          <div className="relative mx-auto h-[210px] min-h-[210px] w-[210px] min-w-[210px]">
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-400/10 via-blue-500/5 to-transparent blur-xl" />
            <div className="absolute inset-0 rounded-full border border-white/[0.05] bg-white/[0.025]" />
            <ResponsivePieChart data={sortedData} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-10">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeItem.name}
                  initial={{ opacity: 0, scale: 0.92, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-lg shadow-xl backdrop-blur-xl">
                    {activeItem.icon ?? "◆"}
                  </div>
                  <p className="max-w-[110px] truncate text-[11px] font-semibold text-[#F1F5F9]">{activeItem.name}</p>
                  <p className="text-2xl font-black tabular-nums" style={{ color: activeItem.color }}>
                    {activePct.toFixed(0)}<span className="text-xs text-[#64748B]">%</span>
                  </p>
                  <p className="text-[10px] font-medium tabular-nums text-[#94A3B8]">{formatRupiah(activeItem.value, true)}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`detail-${activeItem.name}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mb-3 rounded-3xl border border-white/[0.07] bg-white/[0.045] p-3.5 backdrop-blur-xl"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg" style={{ background: `${activeItem.color}18`, border: `1px solid ${activeItem.color}33` }}>
                      {activeItem.icon ?? "◆"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#F1F5F9]">{activeItem.name}</p>
                      <p className="text-[10px] text-[#64748B]">Kategori aktif</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black tabular-nums" style={{ color: activeItem.color }}>
                      {activePct.toFixed(1)}%
                    </p>
                    <p className="text-[10px] tabular-nums text-[#94A3B8]">{formatRupiah(activeItem.value, true)}</p>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(activePct, 100)}%` }}
                    transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${activeItem.color}, #22D3EE)` }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="space-y-1.5">
              {sortedData.map((item, index) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0
                const isActive = activeIndex === index
                return (
                  <motion.button
                    key={item.name}
                    type="button"
                    layout
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0, scale: isActive ? 1.012 : 1 }}
                    transition={{ delay: index * 0.035, type: "spring", stiffness: 280, damping: 26 }}
                    onClick={() => setActiveIndex(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "group w-full rounded-2xl border p-2.5 text-left transition-all active:scale-[0.985]",
                      isActive
                        ? "border-white/[0.12] bg-white/[0.07] shadow-lg"
                        : "border-transparent bg-white/[0.025] hover:border-white/[0.06] hover:bg-white/[0.045]"
                    )}
                    aria-pressed={isActive}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm transition-transform group-active:scale-95" style={{ background: `${item.color}16`, border: `1px solid ${item.color}2E` }}>
                        {item.icon ?? "◆"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[#CBD5E1]">{item.name}</span>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-[#F1F5F9]">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/[0.055]">
                          <motion.div
                            initial={false}
                            animate={{ width: `${Math.min(pct, 100)}%` }}
                            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                            className="h-full rounded-full"
                            style={{ background: item.color }}
                          />
                        </div>
                      </div>
                      <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 transition-all", isActive ? "text-cyan-300" : "text-[#475569]")} />
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="relative mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.055] px-3.5 py-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.75)]" />
            <p className="text-[11px] leading-relaxed text-cyan-100/80">
              <span className="font-bold text-cyan-200">Insight:</span> {insight}
            </p>
          </div>
        </div>
      </div>
    </OceanCard>
  )
}

function ResponsivePieChart({ data, activeIndex, setActiveIndex }: { data: PieDataItem[]; activeIndex: number; setActiveIndex: (index: number) => void }) {
  return (
    <SafeResponsiveContainer>
      <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
        <PieWithActiveShape
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="64%"
          outerRadius="82%"
          paddingAngle={3}
          dataKey="value"
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
          onClick={(_: unknown, index: number) => setActiveIndex(index)}
          stroke="rgba(5,10,20,0.72)"
          strokeWidth={3}
          style={{ cursor: "pointer", outline: "none" }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`asset-slice-${entry.name}`}
              fill={entry.color}
              opacity={activeIndex === index ? 1 : 0.52}
              style={{
                outline: "none",
                transition: "opacity 180ms ease, filter 180ms ease",
                filter: activeIndex === index ? `drop-shadow(0 0 8px ${entry.color}66)` : "none",
              }}
            />
          ))}
        </PieWithActiveShape>
      </PieChart>
    </SafeResponsiveContainer>
  )
}

