//src/components/dashboard/analytics/CashFlowForecast.tsx

"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, Zap, TrendingUp, TrendingDown, BarChart2, Activity } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { CashFlowAlert, CashFlowCategory, CashFlowDataPoint, CashFlowInsight } from "@/hooks/usePremiumAnalyticsData"
import { cn, formatRupiah } from "@/lib/utils"
import OceanCard from "./components/OceanCard"
import SafeResponsiveContainer from "./components/SafeResponsiveContainer"
import SavingsRateBar from "./components/SavingsRateBar"

interface Props {
  loading: boolean
  error: string | null
  cashFlowData: CashFlowDataPoint[]
  categories: CashFlowCategory[]
  insights: CashFlowInsight[]
  alerts: CashFlowAlert[]
  onRefresh: () => Promise<void>
}

function formatCompact(value: number | null) {
  return formatRupiah(value ?? 0, true)
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[140px] rounded-2xl border border-white/10 p-3 shadow-2xl bg-[#06101F]/95 backdrop-blur-xl">
      <p className="mb-2 text-xs font-medium text-[#94A3B8]">{label}</p>
      {payload.map((entry: any, index: number) =>
        entry.value !== null ? (
          <div key={`${entry.name}-${index}`} className="mb-1 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: entry.color || entry.fill || "#94A3B8" }} />
            <span className="text-xs font-semibold tabular-nums text-white">{formatCompact(entry.value)}</span>
            <span className="text-xs text-[#64748B]">{entry.name}</span>
          </div>
        ) : null
      )}
    </div>
  )
}

// ─── Alert style map ──────────────────────────────────────────────────────────
function getAlertStyle(type: CashFlowAlert["type"]) {
  switch (type) {
    case "critical":
      return {
        Icon: AlertTriangle,
        wrap: "border border-rose-500/20 bg-rose-500/10",
        icon: "text-rose-400",
        text: "text-rose-300/90",
      }
    case "warning":
      return {
        Icon: AlertCircle,
        wrap: "border border-amber-500/20 bg-amber-500/10",
        icon: "text-amber-400",
        text: "text-amber-300/90",
      }
    default:
      return {
        Icon: Info,
        wrap: "border border-cyan-500/20 bg-cyan-500/10",
        icon: "text-cyan-400",
        text: "text-cyan-300/90",
      }
  }
}

// ─── Skeleton bone with shimmer ───────────────────────────────────────────────
function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl bg-white/[0.06]", className)}
      style={style}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)" }}
      />
    </div>
  )
}

// ─── Loading skeleton — mirrors real layout shape ─────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 pb-8">
      {/* Hero cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <Bone className="h-2.5 w-14" />
            <Bone className="h-5 w-20" />
          </div>
        ))}
      </div>

      {/* Savings rate */}
      <div className="space-y-3 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <Bone className="h-3 w-28" />
          <Bone className="h-3 w-10" />
        </div>
        <Bone className="h-2.5 w-full rounded-full" />
      </div>

      {/* Chart */}
      <div className="space-y-4 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Bone className="h-3.5 w-36" />
            <Bone className="h-2.5 w-24" />
          </div>
          <Bone className="h-8 w-24 rounded-2xl" />
        </div>
        <div className="flex h-[200px] items-end gap-1.5 rounded-2xl border border-white/[0.06] bg-[#06101F]/45 p-3">
          {[55, 80, 65, 90, 70, 85, 45, 60, 50].map((h, i) => (
            <div key={i} className="flex flex-1 flex-col justify-end gap-1">
              <Bone className="w-full rounded-sm" style={{ height: `${h * 0.55}%` }} />
              <Bone className="w-full rounded-sm" style={{ height: `${h * 0.35}%`, opacity: 0.6 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Bone className="h-2 w-2 rounded-full" />
              <Bone className="h-2 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => <Bone key={i} className="h-7 w-20 rounded-xl" />)}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 p-3">
            <div className="flex items-center gap-3">
              <Bone className="h-9 w-9 flex-shrink-0 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between">
                  <Bone className="h-3 w-24" />
                  <Bone className="h-3 w-16" />
                </div>
                <div className="flex justify-between">
                  <Bone className="h-2 w-20" />
                  <Bone className="h-2 w-8" />
                </div>
              </div>
            </div>
            <Bone className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* AI insights */}
      <div className="space-y-4 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-5">
        <div className="flex items-center gap-2">
          <Bone className="h-7 w-7 rounded-xl" />
          <Bone className="h-3.5 w-20" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-center">
              <Bone className="mx-auto h-2 w-14" />
              <Bone className="mx-auto h-4 w-10" />
              <Bone className="mx-auto h-2 w-8" />
            </div>
          ))}
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] p-3">
            <Bone className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full" />
            <Bone className="h-3 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Generic empty state ──────────────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <Icon className="h-5 w-5 text-[#475569]" />
      </div>
      <p className="text-sm font-medium text-[#64748B]">{title}</p>
      <p className="text-[11px] text-[#334155]">{subtitle}</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CashFlowForecast({
  loading,
  error,
  cashFlowData,
  categories,
  insights,
  alerts,
  onRefresh,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<"income" | "expense" | "all">("all")
  const [chartView, setChartView] = useState<"bar" | "line">("bar")

  const actualMonths = useMemo(() => cashFlowData.filter((item) => item.income !== null), [cashFlowData])
  const avgIncome = actualMonths.reduce((sum, item) => sum + (item.income ?? 0), 0) / Math.max(actualMonths.length, 1)
  const avgExpense = actualMonths.reduce((sum, item) => sum + (item.expense ?? 0), 0) / Math.max(actualMonths.length, 1)
  const savingAmount = avgIncome - avgExpense
  const savingRate = avgIncome > 0 ? (savingAmount / avgIncome) * 100 : 0

  const filteredCategories = categories.filter((c) =>
    activeCategory === "all" ? true : c.type === activeCategory
  )

  if (loading) return <LoadingSkeleton />

  return (
    <div className="space-y-4 pb-8">

      {/* ── Error banner ── */}
      {error && (
        <OceanCard className="p-4" glow="blue">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-[#94A3B8]">{error}</p>
            <button
              onClick={() => void onRefresh()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 transition-all active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </OceanCard>
      )}

      {/* ── Hero cards ── */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          { label: "Pemasukan",   value: avgIncome,    color: "#22D3EE", bg: "from-cyan-500/15 to-cyan-500/5",    border: "border-cyan-500/20",    Icon: TrendingUp   },
          { label: "Pengeluaran", value: avgExpense,   color: "#F87171", bg: "from-red-500/15 to-red-500/5",      border: "border-red-500/20",      Icon: TrendingDown },
          { label: "Tabungan",    value: savingAmount, color: "#34D399", bg: "from-emerald-500/15 to-emerald-500/5", border: "border-emerald-500/20", Icon: CheckCircle2 },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br p-3", item.bg, item.border)}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="truncate text-[10px] font-medium leading-tight text-[#64748B]">{item.label}</p>
              <item.Icon className="h-3 w-3 flex-shrink-0" style={{ color: item.color }} />
            </div>
            <p className="truncate text-sm font-bold tabular-nums" style={{ color: item.color }}>
              {formatCompact(item.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Savings rate ── */}
      <SavingsRateBar rate={savingRate} target={30} change={2.1} />

      {/* ── Chart card ── */}
      <OceanCard className="p-5" glow="cyan">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Arus Kas &amp; Prediksi</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#475569]">
              Data aktual + proyeksi AI 3 bulan ke depan
            </p>
          </div>

          <div className="relative flex flex-shrink-0 rounded-2xl border border-white/[0.07] bg-white/[0.045] p-1 shadow-xl backdrop-blur-xl">
            {(["bar", "line"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setChartView(view)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                  chartView === view ? "text-white" : "text-[#64748B] hover:text-[#94A3B8]"
                )}
              >
                {chartView === view && (
                  <motion.span
                    layoutId="cashflowChartView"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  />
                )}
                {view === "bar"
                  ? <BarChart2 className="relative h-3.5 w-3.5" />
                  : <Activity className="relative h-3.5 w-3.5" />
                }
                <span className="relative hidden sm:inline">{view === "bar" ? "Bar" : "Line"}</span>
              </button>
            ))}
          </div>
        </div>

        {cashFlowData.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            title="Belum ada data arus kas"
            subtitle="Data akan muncul setelah transaksi pertama dicatat"
          />
        ) : (
          <>
            {/* FIX: pixel height avoids the height=-1 warning.
                SafeResponsiveContainer handles the mounted guard internally. */}
            <div className="h-[200px] w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#06101F]/45 p-2 sm:h-[240px]">
              <SafeResponsiveContainer>
                {chartView === "bar" ? (
                  <BarChart data={cashFlowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={2}>
                    <defs>
                      <linearGradient id="cfIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22D3EE" />
                        <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="cfExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F87171" />
                        <stop offset="100%" stopColor="#F87171" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="cfForecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818CF8" />
                        <stop offset="100%" stopColor="#818CF8" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="income"   name="Pemasukan"   fill="url(#cfIncomeGrad)"   radius={[4,4,0,0]} maxBarSize={20} />
                    <Bar dataKey="expense"  name="Pengeluaran" fill="url(#cfExpenseGrad)"  radius={[4,4,0,0]} maxBarSize={20} />
                    <Bar dataKey="forecast" name="Prediksi"    fill="url(#cfForecastGrad)" radius={[4,4,0,0]} maxBarSize={20} opacity={0.7} />
                  </BarChart>
                ) : (
                  <LineChart data={cashFlowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => formatCompact(v)} tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="income"  name="Pemasukan"   stroke="#22D3EE" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="expense" name="Pengeluaran" stroke="#F87171" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="balance" name="Saldo"       stroke="#34D399" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                  </LineChart>
                )}
              </SafeResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              {[
                { color: "#22D3EE", label: "Pemasukan"  },
                { color: "#F87171", label: "Pengeluaran" },
                { color: "#818CF8", label: "Prediksi"   },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[10px] text-[#475569]">{l.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </OceanCard>

      {/* ── Category breakdown ── */}
      <OceanCard className="p-5" glow="blue">
        <h3 className="mb-3 text-sm font-semibold text-[#F1F5F9]">Rincian Kategori</h3>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(["all", "income", "expense"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeCategory === cat
                  ? cat === "income"
                    ? "border border-cyan-500/30 bg-cyan-500/20 text-cyan-400"
                    : cat === "expense"
                      ? "border border-red-500/30 bg-red-500/20 text-red-400"
                      : "border border-white/20 bg-white/10 text-white"
                  : "bg-white/[0.03] text-[#64748B] hover:text-[#94A3B8]"
              )}
            >
              {cat === "all" ? "Semua" : cat === "income" ? "↑ Masuk" : "↓ Keluar"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-2.5"
          >
            {filteredCategories.length === 0 ? (
              <EmptyState
                icon={activeCategory === "income" ? TrendingUp : TrendingDown}
                title={activeCategory === "income" ? "Belum ada pemasukan" : "Belum ada pengeluaran"}
                subtitle="Tambahkan transaksi untuk mulai melacak kategori ini"
              />
            ) : (
              filteredCategories.map((category, index) => {
                const overBudget = category.amount > category.budget
                const pct = category.budget > 0
                  ? Math.min((category.amount / category.budget) * 100, 100)
                  : 0
                return (
                  <motion.div
                    key={`${category.type}-${category.name}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="cursor-pointer rounded-2xl p-3 transition-all hover:bg-white/[0.03] active:scale-[0.99]"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                        style={{ background: `${category.color}15`, border: `1px solid ${category.color}25` }}
                      >
                        {category.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-[#F1F5F9]">{category.name}</p>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            {overBudget && category.type === "expense" && (
                              <AlertCircle className="h-3 w-3 text-red-400" />
                            )}
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              category.type === "income" ? "text-cyan-400" : overBudget ? "text-red-400" : "text-[#F1F5F9]"
                            )}>
                              {category.type === "income" ? "+" : ""}{formatCompact(category.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] text-[#64748B]">Budget: {formatCompact(category.budget)}</span>
                          <span className={cn(
                            "text-[10px] font-medium tabular-nums",
                            overBudget && category.type === "expense" ? "text-red-400" : "text-[#64748B]"
                          )}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3 + index * 0.05, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                        className="h-full rounded-full"
                        style={{
                          background: overBudget && category.type === "expense"
                            ? "linear-gradient(90deg, #F87171, #EF4444)"
                            : category.color,
                        }}
                      />
                    </div>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        </AnimatePresence>
      </OceanCard>

      {/* ── AI Insights ── */}
      <OceanCard className="p-5" glow="emerald">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/15 p-1.5">
            <Zap className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <h3 className="text-sm font-semibold text-[#F1F5F9]">Wawasan AI</h3>
          <span className="ml-auto rounded-full border border-cyan-500/20 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
            Beta
          </span>
        </div>

        {insights.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="Belum ada wawasan"
            subtitle="Wawasan AI akan muncul setelah data cukup terkumpul"
          />
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.07 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-center"
              >
                <p className="mb-1 text-[9px] leading-tight text-[#64748B]">{insight.label}</p>
                <p className="truncate text-sm font-bold leading-none tabular-nums text-white">{insight.value}</p>
                <div className={cn(
                  "mt-1 flex items-center justify-center gap-0.5 text-[9px] font-semibold",
                  insight.positive ? "text-emerald-400" : "text-red-400"
                )}>
                  {insight.positive
                    ? <TrendingUp className="h-2.5 w-2.5" />
                    : <TrendingDown className="h-2.5 w-2.5" />
                  }
                  {insight.trend}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
            <p className="text-xs text-emerald-300/80">Semua indikator keuangan dalam kondisi baik.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, index) => {
              const style = getAlertStyle(alert.type)
              const Icon = style.Icon
              return (
                <motion.div
                  key={`${alert.type}-${index}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.07 }}
                  className={cn("flex items-start gap-2.5 rounded-2xl p-3", style.wrap)}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", style.icon)} />
                  <p className={cn("text-xs leading-relaxed", style.text)}>{alert.msg}</p>
                </motion.div>
              )
            })}
          </div>
        )}
      </OceanCard>
    </div>
  )
}