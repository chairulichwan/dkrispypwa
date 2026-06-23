"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion"
import { formatRupiahCompact } from "@/lib/utils"

type FinancialPeriod = "7D" | "30D" | "3B"

interface SparklineGraphProps {
  trendPoints: number[]
  isPositive: boolean
  strokeColor: string
  isLoading: boolean
  period?: FinancialPeriod
}

type ChartPoint = {
  x: number
  y: number
  value: number
}

const VIEWBOX_WIDTH = 320
const VIEWBOX_HEIGHT = 120
const PADDING_X = 12
const PADDING_Y = 12
const TOOLTIP_WIDTH = 128
const MOBILE_HOLD_MS = 140

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildSmoothChart(values: number[]) {
  if (values.length < 2) {
    return {
      points: [] as ChartPoint[],
      linePath: "",
      areaPath: "",
    }
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const spread = max - min || 1

  const points: ChartPoint[] = values.map((value, index) => {
    const x = PADDING_X + (index / Math.max(values.length - 1, 1)) * (VIEWBOX_WIDTH - PADDING_X * 2)
    const y =
      VIEWBOX_HEIGHT -
      PADDING_Y -
      ((value - min) / spread) * (VIEWBOX_HEIGHT - PADDING_Y * 2)

    return { x, y, value }
  })

  let linePath = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    linePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  const bottomY = (VIEWBOX_HEIGHT - PADDING_Y / 2).toFixed(2)
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${bottomY} L ${points[0].x.toFixed(2)} ${bottomY} Z`

  return { points, linePath, areaPath }
}

function getTimeLabel(period: FinancialPeriod, index: number, total: number) {
  const distance = total - 1 - index

  if (period === "3B") {
    if (distance <= 0) return "Bulan ini"
    if (distance === 1) return "1 bulan lalu"
    return `${distance} bulan lalu`
  }

  if (distance <= 0) return "Hari ini"
  if (distance === 1) return "1 hari lalu"
  return `${distance} hari lalu`
}

function getDeltaPercent(currentValue: number, previousValue: number | null) {
  if (previousValue === null || previousValue === 0) return null
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100
}

export default function SparklineGraph({
  trendPoints,
  isPositive,
  strokeColor,
  isLoading,
  period = "7D",
}: SparklineGraphProps) {
  const reduceMotion = useReducedMotion()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const uniqueId = useId().replace(/:/g, "")

  const chart = useMemo(() => {
    const safePoints = trendPoints.map((point) => Math.max(0, Number(point) || 0))
    return buildSmoothChart(safePoints)
  }, [trendPoints])

  const displayIndex = activeIndex ?? Math.max(0, chart.points.length - 1)
  const displayPoint = chart.points[displayIndex] ?? null
  const previousPoint = displayIndex > 0 ? chart.points[displayIndex - 1] ?? null : null
  const deltaPercent = displayPoint ? getDeltaPercent(displayPoint.value, previousPoint?.value ?? null) : null

  const tooltipXMotion = useMotionValue(0)
  const tooltipYMotion = useMotionValue(0)
  const trackerXMotion = useMotionValue(0)
  const trackerYMotion = useMotionValue(0)

  const tooltipX = useSpring(tooltipXMotion, { stiffness: 360, damping: 32, mass: 0.72 })
  const tooltipY = useSpring(tooltipYMotion, { stiffness: 360, damping: 32, mass: 0.72 })
  const trackerX = useSpring(trackerXMotion, { stiffness: 420, damping: 34, mass: 0.62 })
  const trackerY = useSpring(trackerYMotion, { stiffness: 420, damping: 34, mass: 0.62 })

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearHoldTimer()
  }, [clearHoldTimer])

  const syncDisplayPoint = useCallback(
    (index: number | null) => {
      const svg = svgRef.current
      const point = index !== null ? chart.points[index] ?? null : null
      if (!svg || !point) return

      const rect = svg.getBoundingClientRect()
      const pointX = (point.x / VIEWBOX_WIDTH) * rect.width
      const pointY = (point.y / VIEWBOX_HEIGHT) * rect.height
      const clampedTooltipX = clamp(pointX - TOOLTIP_WIDTH / 2, 8, Math.max(8, rect.width - TOOLTIP_WIDTH - 8))
      const tooltipYTarget = Math.max(6, pointY - 50)

      trackerXMotion.set(point.x)
      trackerYMotion.set(point.y)
      tooltipXMotion.set(clampedTooltipX)
      tooltipYMotion.set(tooltipYTarget)
    },
    [chart.points, tooltipXMotion, tooltipYMotion, trackerXMotion, trackerYMotion]
  )

  useEffect(() => {
    if (chart.points.length > 0) {
      syncDisplayPoint(displayIndex)
    }
  }, [chart.points.length, displayIndex, syncDisplayPoint])

  const updateActivePoint = useCallback(
    (clientX: number) => {
      const svg = svgRef.current
      if (!svg || chart.points.length === 0) return

      const rect = svg.getBoundingClientRect()
      const relativeX = ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH

      let nearestIndex = 0
      let minDistance = Number.POSITIVE_INFINITY

      for (let index = 0; index < chart.points.length; index += 1) {
        const distance = Math.abs(chart.points[index].x - relativeX)
        if (distance < minDistance) {
          minDistance = distance
          nearestIndex = index
        }
      }

      setActiveIndex(nearestIndex)
      syncDisplayPoint(nearestIndex)
    },
    [chart.points, syncDisplayPoint]
  )

  const clearInteraction = useCallback(() => {
    clearHoldTimer()
    setIsInteracting(false)
    setActiveIndex(null)
    if (chart.points.length > 0) {
      syncDisplayPoint(chart.points.length - 1)
    }
  }, [chart.points.length, clearHoldTimer, syncDisplayPoint])

  const startInteraction = useCallback(
    (clientX: number) => {
      setIsInteracting(true)
      updateActivePoint(clientX)
    },
    [updateActivePoint]
  )

  const isCoarsePointer = useCallback(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(pointer: coarse)").matches
  }, [])

  if (isLoading) {
    return (
      <div className="relative h-[120px] overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_36%)]" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.3, ease: "linear" }}
        />
        <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-white/[0.05]" />
        <motion.div
          className="absolute left-4 right-4 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-cyan-400/40"
          initial={{ scaleX: 0.7, opacity: 0.45 }}
          animate={{ scaleX: [0.72, 1, 0.72], opacity: [0.35, 0.7, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
        />
      </div>
    )
  }

  if (chart.points.length < 2 || !chart.linePath || !displayPoint) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-[24px] border border-white/[0.06] bg-white/[0.03] px-4 text-center backdrop-blur-xl">
        <p className="text-[11px] text-slate-500">Belum cukup histori untuk menampilkan grafik tren aset.</p>
      </div>
    )
  }

  const areaGradientId = `spark-area-${uniqueId}`
  const strokeGradientId = `spark-stroke-${uniqueId}`
  const flowGradientId = `spark-flow-${uniqueId}`
  const glowFilterId = `spark-glow-${uniqueId}`
  const dotGlowFilterId = `spark-dot-${uniqueId}`
  const crosshairColor = isPositive ? "rgba(16,185,129,0.42)" : "rgba(239,68,68,0.42)"
  const tooltipLabel = getTimeLabel(period, displayIndex, chart.points.length)

  return (
    <div className="relative h-[120px] overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.10),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_38%)]" />

      <AnimatePresence initial={false}>
        {displayPoint ? (
          <motion.div
            key={isInteracting ? "interactive-bubble" : "idle-bubble"}
            initial={{ opacity: 0, y: 8, scale: 0.92, filter: "blur(6px)" }}
            animate={{ opacity: isInteracting ? 1 : 0.86, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, scale: 0.92, filter: "blur(6px)" }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-none absolute z-20"
            style={{ left: tooltipX, top: tooltipY, width: `${TOOLTIP_WIDTH}px` }}
          >
            <div className="rounded-[16px] border border-white/[0.08] bg-[#0B1528]/88 px-3 py-2 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.82)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">{tooltipLabel}</p>
                {deltaPercent !== null ? (
                  <span
                    className={`text-[9px] font-semibold ${deltaPercent >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {deltaPercent >= 0 ? "+" : ""}{deltaPercent.toFixed(1)}%
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium tracking-tight tabular-nums text-white">
                {formatRupiahCompact(displayPoint.value)}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="relative z-10 h-full w-full touch-none"
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerDown={(event) => {
          const coarse = isCoarsePointer()
          clearHoldTimer()

          if (coarse) {
            holdTimerRef.current = setTimeout(() => {
              startInteraction(event.clientX)
            }, MOBILE_HOLD_MS)
            return
          }

          startInteraction(event.clientX)
        }}
        onPointerMove={(event) => {
          if (isCoarsePointer()) {
            if (isInteracting) {
              updateActivePoint(event.clientX)
            }
            return
          }

          startInteraction(event.clientX)
        }}
        onPointerLeave={clearInteraction}
        onPointerUp={clearInteraction}
        onPointerCancel={clearInteraction}
      >
        <defs>
          <linearGradient id={areaGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
            <stop offset="60%" stopColor={strokeColor} stopOpacity="0.06" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>

          <linearGradient id={strokeGradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
            <stop offset="52%" stopColor={strokeColor} stopOpacity="0.92" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="1" />
          </linearGradient>

          <linearGradient id={flowGradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            {!reduceMotion ? (
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="-160 0"
                to="360 0"
                dur="4.8s"
                repeatCount="indefinite"
              />
            ) : null}
          </linearGradient>

          <filter id={glowFilterId} x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={dotGlowFilterId} x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.path
          d={chart.areaPath}
          fill={`url(#${areaGradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        <motion.path
          d={chart.linePath}
          fill="none"
          stroke={strokeColor}
          strokeOpacity="0.18"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowFilterId})`}
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0.35 }}
          animate={reduceMotion ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        />

        <motion.path
          d={chart.linePath}
          fill="none"
          stroke={`url(#${strokeGradientId})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0.55 }}
          animate={reduceMotion ? { opacity: 1 } : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        />

        <motion.path
          d={chart.linePath}
          fill="none"
          stroke={`url(#${flowGradientId})`}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.9"
          initial={{ opacity: 0.75 }}
          animate={{ opacity: reduceMotion ? 0.4 : 0.75 }}
          transition={{ duration: 0.2 }}
        />

        <AnimatePresence initial={false}>
          {isInteracting ? (
            <motion.g
              key="crosshair"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ x: trackerX }}
            >
              <line
                x1={0}
                y1={PADDING_Y / 2}
                x2={0}
                y2={VIEWBOX_HEIGHT - PADDING_Y / 2}
                stroke={crosshairColor}
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            </motion.g>
          ) : null}
        </AnimatePresence>

        <motion.g
          initial={false}
          animate={{ opacity: isInteracting ? 1 : 0.88, scale: isInteracting ? 1 : 0.94 }}
          transition={{ duration: 0.14 }}
          style={{ x: trackerX, y: trackerY }}
        >
          <circle cx={0} cy={0} r="5.5" fill={strokeColor} filter={`url(#${dotGlowFilterId})`} />
          <circle cx={0} cy={0} r="2.2" fill="#F8FAFC" />
        </motion.g>
      </svg>
    </div>
  )
}
