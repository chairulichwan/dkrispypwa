"use client"

import { useMemo, useState, useEffect, useRef, type MouseEvent } from "react"
import { motion, AnimatePresence, useMotionValue, useSpring, useReducedMotion } from "framer-motion"
import {
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Coins,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import { IOS_SPRING } from "@/lib/motion"
import { cn, formatRupiah, formatRupiahCompact } from "@/lib/utils"
import SparklineGraph from "./SparklineGraph"

type FinancialPeriod = "7D" | "30D" | "3B"

interface BalanceCardProps {
  totalWealth: number
  walletTotal: number
  piutang: number
  hutang: number
  onSync?: () => void
  isSyncing?: boolean
  isChartLoading: boolean
  trendPoints?: number[]
  onPeriodChange?: (period: FinancialPeriod) => void
}

const BALANCE_CARD_SPRING = { type: "spring" as const, stiffness: 380, damping: 28 }

const TEXT_FADE = {
  initial: { opacity: 0, y: 6, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(2px)" },
}

const triggerHaptic = (ms: number | number[]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(ms)
  }
}

function SubBalanceSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
      <div className="flex gap-3 overflow-x-hidden pb-1">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="relative flex min-h-[100px] w-[calc(50%-6px)] shrink-0 flex-col justify-between overflow-hidden rounded-[22px] border border-white/[0.04] bg-slate-950/20 p-4"
          >
            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl border border-white/[0.05] bg-white/[0.03]" />
              <div className="h-3 w-12 rounded-md bg-white/[0.03]" />
            </div>
            <div className="mt-3">
              <div className="h-5 w-24 rounded-lg bg-white/[0.03]" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5 pt-0.5">
        <div className="h-1 w-3 rounded-full bg-white/[0.06]" />
        <div className="h-1 w-1.5 rounded-full bg-white/[0.03]" />
      </div>
    </motion.div>
  )
}

export default function BalanceCard({
  totalWealth,
  walletTotal,
  piutang,
  hutang,
  onSync,
  isSyncing = false,
  isChartLoading,
  trendPoints = [],
  onPeriodChange,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [lastSynced, setLastSynced] = useState("Baru saja")
  const [activeSlide, setActiveSlide] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod>("7D")
  const scrollRef = useRef<HTMLDivElement>(null)

  const [displayWealth, setDisplayWealth] = useState("••••••••")
  const motionWealth = useMotionValue(totalWealth)
  const springWealth = useSpring(motionWealth, {
    stiffness: 48,
    damping: 15,
    restDelta: 0.01,
  })

  const shouldReduceMotion = useReducedMotion()

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const springX = useSpring(rawX, { stiffness: 100, damping: 24 })
  const springY = useSpring(rawY, { stiffness: 100, damping: 24 })

  useEffect(() => {
    setIsMounted(true)
    const savedPrivacy = localStorage.getItem("balance_privacy")
    if (savedPrivacy === "hidden") setHidden(true)

    const onVisChange = () => {
      if (document.hidden) setHidden(true)
    }

    document.addEventListener("visibilitychange", onVisChange)
    return () => document.removeEventListener("visibilitychange", onVisChange)
  }, [])

  useEffect(() => {
    motionWealth.set(totalWealth)
  }, [totalWealth, motionWealth])

  useEffect(() => {
    const unsubscribe = springWealth.on("change", (latest) => {
      if (isMounted && !hidden) {
        setDisplayWealth(formatRupiah(Math.round(latest)))
      }
    })

    return () => unsubscribe()
  }, [springWealth, isMounted, hidden])

  useEffect(() => {
    if (!isMounted || hidden) {
      setDisplayWealth("••••••••")
    } else {
      setDisplayWealth(formatRupiah(Math.round(springWealth.get())))
    }
  }, [hidden, isMounted, springWealth])

  const handlePrivacyToggle = () => {
    triggerHaptic(10)
    setHidden((prev) => {
      const nextState = !prev
      localStorage.setItem("balance_privacy", nextState ? "hidden" : "visible")
      return nextState
    })
  }

  const handleSync = async () => {
    if (!onSync || isSyncing) return

    triggerHaptic(20)
    await onSync()
    const now = new Date()
    setLastSynced(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
    triggerHaptic([10, 30, 10])
  }

  const handlePeriodChangeClick = (period: FinancialPeriod) => {
    if (period === selectedPeriod || isSyncing) return

    triggerHaptic(12)
    setSelectedPeriod(period)
    onPeriodChange?.(period)
  }

  const handleCardMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (shouldReduceMotion || window.matchMedia("(pointer: coarse)").matches) return

    const rect = event.currentTarget.getBoundingClientRect()
    rawX.set(((event.clientX - rect.left - rect.width / 2) / rect.width) * 5)
    rawY.set(((event.clientY - rect.top - rect.height / 2) / rect.height) * 3)
  }

  const handleCardMouseLeave = () => {
    rawX.set(0)
    rawY.set(0)
  }

  const trendPct = useMemo(() => {
    if (!trendPoints || trendPoints.length < 2) return 0
    const first = trendPoints[0]
    const last = trendPoints[trendPoints.length - 1]
    return first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100
  }, [trendPoints])

  const isPositive = trendPct >= 0
  const strokeColor = isPositive ? "#10B981" : "#EF4444"
  const hasTrend = trendPoints && trendPoints.length >= 2

  return (
    <motion.section
      style={{
        x: springX,
        y: springY,
        background:
          "radial-gradient(ellipse 140% 70% at 75% -10%, rgba(56,189,248,0.11) 0%, #0B1528 62%)",
      }}
      onMouseMove={handleCardMouseMove}
      onMouseLeave={handleCardMouseLeave}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={IOS_SPRING}
      aria-label="Kartu Saldo Utama Finansial"
      className="relative w-full overflow-hidden rounded-[24px] border border-white/[0.08] shadow-[0_16px_44px_-22px_rgba(0,0,0,0.45)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      <div className="relative z-10 flex flex-col gap-5 p-5 sm:gap-6 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Total Kekayaan</h2>
            <p className="text-[9px] font-medium text-slate-600 tabular-nums">Diperbarui: {lastSynced}</p>
          </div>

          <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={BALANCE_CARD_SPRING}
              onClick={handlePrivacyToggle}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-200"
              aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={hidden ? "off" : "on"}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.1 }}
                >
                  {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            <div className="h-3 w-px bg-white/[0.06]" />

            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={BALANCE_CARD_SPRING}
              onClick={handleSync}
              disabled={isSyncing}
              className="flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-30"
            >
              <RefreshCw size={11} className={isSyncing ? "animate-spin text-cyan-400" : "text-slate-400"} />
              <span>Sync</span>
            </motion.button>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="relative min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.p
                key={hidden ? "hidden" : "visible"}
                variants={TEXT_FADE}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.15 }}
                className={cn(
                  "text-3xl font-bold tracking-tight tabular-nums transition-all duration-300",
                  hidden
                    ? "select-none tracking-[0.2em] text-slate-800"
                    : "bg-gradient-to-r from-white via-slate-100 to-cyan-100 bg-clip-text text-transparent"
                )}
              >
                {displayWealth}
              </motion.p>
            </AnimatePresence>

            {isSyncing ? (
              <motion.div
                className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent mix-blend-screen"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              />
            ) : null}
          </div>

          {hasTrend ? (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={BALANCE_CARD_SPRING}
              style={{
                boxShadow: isPositive
                  ? "0 2px 10px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.05)"
                  : "0 2px 10px rgba(239,110,110,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
              className={cn(
                "mb-0.5 flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tabular-nums backdrop-blur-md",
                isPositive
                  ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400"
                  : "border-rose-500/20 bg-rose-500/[0.08] text-rose-400"
              )}
            >
              {isPositive ? <TrendingUp size={10} strokeWidth={2.5} /> : <TrendingDown size={10} strokeWidth={2.5} />}
              <span>{Math.abs(trendPct).toFixed(1)}%</span>
            </motion.div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Performa Aset</p>

          <div className="relative flex rounded-lg border border-white/[0.04] bg-slate-950/60 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
            {(["7D", "30D", "3B"] as const).map((periodItem) => {
              const isSelected = selectedPeriod === periodItem

              return (
                <button
                  key={periodItem}
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handlePeriodChangeClick(periodItem)}
                  className={cn(
                    "relative z-10 px-2.5 py-1 text-[9px] font-black tracking-wider transition-colors duration-300 disabled:opacity-40",
                    isSelected ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <span className="relative z-20">{periodItem}</span>
                  {isSelected ? (
                    <motion.div
                      layoutId="activePeriodIndicator"
                      className="absolute inset-0 z-10 rounded-md border border-white/[0.07] bg-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
                      transition={{ type: "spring", stiffness: 430, damping: 32 }}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <SparklineGraph
          trendPoints={trendPoints}
          isPositive={isPositive}
          period={selectedPeriod}
          strokeColor={strokeColor}
          isLoading={isChartLoading}
        />

        {!isMounted ? (
          <SubBalanceSkeleton />
        ) : (
          <div className="flex flex-col gap-3">
            <div
              ref={scrollRef}
              onScroll={(event) => {
                const target = event.currentTarget
                const isAtEnd = target.scrollLeft + target.clientWidth >= target.scrollWidth - 15
                setActiveSlide(isAtEnd ? 1 : 0)
              }}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="flex min-h-[100px] w-[calc(50%-6px)] shrink-0 snap-start flex-col justify-between rounded-[22px] border border-emerald-500/15 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-4 shadow-sm backdrop-blur-md sm:w-auto sm:min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-[6px]" />
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/25 bg-slate-950/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                      <Coins size={14} className="text-emerald-400" strokeWidth={2.2} />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Likuid</p>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={hidden ? "hidden-liquid" : "visible-liquid"}
                      variants={TEXT_FADE}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.12 }}
                      className="truncate text-[15px] font-bold tracking-tight tabular-nums text-emerald-300"
                    >
                      {hidden ? "••••" : formatRupiahCompact(walletTotal)}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex min-h-[100px] w-[calc(50%-6px)] shrink-0 snap-start flex-col justify-between rounded-[22px] border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.06] to-transparent p-4 shadow-sm backdrop-blur-md sm:w-auto sm:min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-xl bg-amber-500/20 blur-[6px]" />
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/25 bg-slate-950/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                      <HandCoins size={14} className="text-amber-400" strokeWidth={2.2} />
                      <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-md border border-slate-950 bg-amber-500 shadow-sm">
                        <ArrowUpRight size={10} className="text-slate-950" strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Piutang</p>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={hidden ? "hidden-piutang" : "visible-piutang"}
                      variants={TEXT_FADE}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.12 }}
                      className="truncate text-[15px] font-bold tracking-tight tabular-nums text-amber-300"
                    >
                      {hidden ? "••••" : formatRupiahCompact(piutang)}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex min-h-[100px] w-[calc(50%-6px)] shrink-0 snap-start flex-col justify-between rounded-[22px] border border-rose-500/15 bg-gradient-to-b from-rose-500/[0.06] to-transparent p-4 shadow-sm backdrop-blur-md sm:w-auto sm:min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-xl bg-rose-500/20 blur-[6px]" />
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-rose-500/25 bg-slate-950/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                      <HandCoins size={14} className="text-rose-400" strokeWidth={2.2} />
                      <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-md border border-slate-950 bg-rose-500 shadow-sm">
                        <ArrowDownLeft size={10} className="text-slate-950" strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hutang</p>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={hidden ? "hidden-hutang" : "visible-hutang"}
                      variants={TEXT_FADE}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.12 }}
                      className="truncate text-[15px] font-bold tracking-tight tabular-nums text-rose-300"
                    >
                      {hidden ? "••••" : formatRupiahCompact(hutang)}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-0.5 sm:hidden">
              <div className={cn("h-1 rounded-full transition-all duration-300", activeSlide === 0 ? "w-3 bg-cyan-400/80" : "w-1.5 bg-white/10")} />
              <div className={cn("h-1 rounded-full transition-all duration-300", activeSlide === 1 ? "w-3 bg-cyan-400/80" : "w-1.5 bg-white/10")} />
            </div>
          </div>
        )}
      </div>
    </motion.section>
  )
}
