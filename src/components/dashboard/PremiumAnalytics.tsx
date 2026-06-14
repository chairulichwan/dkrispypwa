//src/components/dashboard/PremiumAnalytics.tsx

//src/components/dashboard/PremiumAnalytics.tsx

"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, TrendingUp, Wallet, Sparkles, type LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { usePremiumAnalyticsData } from "@/hooks/usePremiumAnalyticsData"
import { useAlerts } from "@/hooks/useAlerts"
import BalanceAlertBanner, { type BannerAlertItem } from "@/components/dashboard/analytics/BalanceAlertBanner"
import NetWorthTracker from "@/components/dashboard/analytics/NetWorthTracker"
import CashFlowForecast from "@/components/dashboard/analytics/CashFlowForecast"

interface PremiumAnalyticsProps {
  userId: string
  userName?: string
}

type Tab = "networth" | "cashflow"

interface TabItem {
  id: Tab
  label: string
  labelShort: string
  icon: LucideIcon
  description: string
}

const TABS: TabItem[] = [
  {
    id: "networth",
    label: "Kekayaan Bersih",
    labelShort: "Kekayaan",
    icon: Wallet,
    description: "Aset & liabilitas",
  },
  {
    id: "cashflow",
    label: "Prediksi Arus Kas",
    labelShort: "Prediksi",
    icon: TrendingUp,
    description: "Pemasukan & pengeluaran",
  },
]

// ─── Floating ambient orbs ────────────────────────────────────────────────────
function AmbientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Top center — cyan bloom */}
      <div
        className="absolute -top-20 left-1/2 h-[380px] w-[520px] -translate-x-1/2 rounded-full opacity-[0.18]"
        style={{ background: "radial-gradient(ellipse, #06B6D4 0%, transparent 70%)", filter: "blur(72px)" }}
      />
      {/* Top-right — cobalt */}
      <div
        className="absolute -right-16 top-0 h-64 w-64 rounded-full opacity-[0.12]"
        style={{ background: "radial-gradient(ellipse, #2563EB 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      {/* Bottom-left — indigo */}
      <div
        className="absolute -left-12 bottom-1/3 h-56 w-56 rounded-full opacity-[0.09]"
        style={{ background: "radial-gradient(ellipse, #6366F1 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      {/* Bottom-right — sapphire */}
      <div
        className="absolute -bottom-8 right-0 h-72 w-72 rounded-full opacity-[0.10]"
        style={{ background: "radial-gradient(ellipse, #1D4ED8 0%, transparent 70%)", filter: "blur(90px)" }}
      />
    </div>
  )
}

// ─── Scanline / noise texture overlay ─────────────────────────────────────────
function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
      }}
      aria-hidden
    />
  )
}

// ─── Premium badge pill ────────────────────────────────────────────────────────
function PremiumBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
      className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 px-2 py-0.5"
      style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))" }}
    >
      <Sparkles className="h-2.5 w-2.5 text-amber-400" />
      <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/90">Premium</span>
    </motion.div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function PremiumAnalytics({ userId, userName = "User" }: PremiumAnalyticsProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>("networth")
  const [scrolled, setScrolled] = useState(false)

  const {
    loading,
    error,
    netWorthHistory,
    assetBreakdown,
    liabilityBreakdown,
    cashFlowData,
    categories,
    insights,
    alerts,
    refetch,
  } = usePremiumAnalyticsData(userId)

  const {
    alerts: realAlerts,
    dismiss: dismissRealAlert,
    dismissAll: dismissAllRealAlerts,
  } = useAlerts(userId)

  const displayName = useMemo(() => {
    const first = (userName || "User").split(" ")[0]
    return first.length > 12 ? first.slice(0, 12) : first
  }, [userName])

  const bannerAlerts = useMemo<BannerAlertItem[]>(() => {
    if (realAlerts.length > 0) {
      return realAlerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
      }))
    }
    return alerts.map((alert, index) => ({
      id: `derived-${alert.type}-${index}`,
      type: alert.type,
      title:
        alert.type === "critical"
          ? "Risiko Saldo Serius"
          : alert.type === "warning"
            ? "Perlu Perhatian"
            : "Info Analytics",
      message: alert.msg,
    }))
  }, [alerts, realAlerts])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 18)
    onScroll()
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  const activeTabData = TABS.find((t) => t.id === activeTab)!

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        height: "100dvh",
        background: "linear-gradient(160deg, #03080F 0%, #060D1A 40%, #04090F 100%)",
        color: "#F1F5F9",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <AmbientOrbs />
      <NoiseOverlay />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.header
        className={cn(
          "relative z-20 transition-all duration-500",
          scrolled && "shadow-2xl shadow-black/40"
        )}
        style={{
          background: scrolled
            ? "linear-gradient(180deg, rgba(3,8,15,0.96) 0%, rgba(4,10,18,0.88) 100%)"
            : "transparent",
          backdropFilter: scrolled ? "blur(24px) saturate(180%)" : undefined,
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        }}
      >
        {/* Top row: back + title */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-12">
          {/* Back button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.push(ROUTES.dashboard)}
            className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.07] transition-all"
            style={{ background: "rgba(255,255,255,0.04)" }}
            aria-label="Kembali"
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
            <ArrowLeft className="relative h-[17px] w-[17px] text-[#94A3B8]" />
          </motion.button>

          {/* Logo icon */}
          <motion.div
            initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
            className="relative shrink-0"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 shadow-lg shadow-cyan-500/10"
              style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.22), rgba(37,99,235,0.18))" }}
            >
              {/* inner shine */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent" />
              <TrendingUp className="relative h-[18px] w-[18px] text-cyan-300" />
            </div>
            {/* glow ring */}
            <div
              className="absolute -inset-0.5 rounded-2xl opacity-40"
              style={{ background: "radial-gradient(circle, rgba(6,182,212,0.3), transparent 70%)", filter: "blur(4px)" }}
            />
          </motion.div>

          {/* Text group */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <motion.h1
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="truncate text-[17px] font-bold leading-none tracking-tight text-[#F1F5F9]"
              >
                Analitik Premium
              </motion.h1>
              <PremiumBadge />
            </div>
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.07, ease: [0.23, 1, 0.32, 1] }}
              className="truncate text-[11px] text-[#475569]"
            >
              Halo, <span className="text-[#64748B] font-medium">{displayName}</span> 👋
            </motion.p>
          </div>
        </div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.38, ease: [0.23, 1, 0.32, 1] }}
          className="mx-4 mb-3"
        >
          <div
            className="relative flex rounded-2xl p-1"
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.3)",
            }}
            role="tablist"
            aria-label="Analytics tabs"
          >
            {/* Sliding pill */}
            <motion.div
              className="pointer-events-none absolute bottom-1 top-1 rounded-xl"
              initial={false}
              animate={{
                left: activeTab === "networth" ? 4 : "calc(50% + 2px)",
                right: activeTab === "cashflow" ? 4 : "calc(50% + 2px)",
              }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              style={{
                background: "linear-gradient(135deg, #0891B2 0%, #1D4ED8 100%)",
                boxShadow: "0 4px 20px rgba(6,182,212,0.28), 0 1px 0 rgba(255,255,255,0.15) inset",
              }}
            />

            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 transition-colors duration-200",
                    isActive ? "text-white" : "text-[#475569] hover:text-[#64748B]"
                  )}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-all", isActive && "drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]")} />
                  <div className="text-left">
                    <div className={cn("text-xs font-semibold leading-none", isActive ? "text-white" : "text-inherit")}>
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.labelShort}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-0.5 hidden text-[9px] font-normal text-white/60 sm:block"
                      >
                        {tab.description}
                      </motion.div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      </motion.header>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto overscroll-contain scroll-smooth"
        style={{
          WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(116px + env(safe-area-inset-bottom))",
          // Custom scrollbar
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as CSSProperties}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        <main className="mx-auto w-full max-w-2xl px-4 pt-2">
          <BalanceAlertBanner
            alerts={bannerAlerts}
            onDismiss={realAlerts.length > 0 ? dismissRealAlert : undefined}
            onDismissAll={realAlerts.length > 0 ? dismissAllRealAlerts : undefined}
          />

          {/* Section heading pill */}
          <motion.div
            key={activeTab + "-heading"}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="mb-3 flex items-center gap-2"
          >
            <div
              className="h-px flex-1 rounded-full"
              style={{ background: "linear-gradient(90deg, rgba(6,182,212,0.25), transparent)" }}
            />
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#1E3A4A]">
              <activeTabData.icon className="h-2.5 w-2.5 text-cyan-700/60" />
              {activeTabData.description}
            </span>
            <div
              className="h-px flex-1 rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.25))" }}
            />
          </motion.div>

          {/* Tab panels */}
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "networth" ? (
              <motion.div
                key="networth"
                initial={{ opacity: 0, x: -24, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 24, filter: "blur(4px)" }}
                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              >
                <NetWorthTracker
                  history={netWorthHistory}
                  assets={assetBreakdown}
                  liabilities={liabilityBreakdown}
                />
              </motion.div>
            ) : (
              <motion.div
                key="cashflow"
                initial={{ opacity: 0, x: 24, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -24, filter: "blur(4px)" }}
                transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              >
                <CashFlowForecast
                  loading={loading}
                  error={error}
                  cashFlowData={cashFlowData}
                  categories={categories}
                  insights={insights}
                  alerts={alerts}
                  onRefresh={refetch}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Bottom fade vignette ────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-20"
        style={{
          background: "linear-gradient(0deg, rgba(3,8,15,0.92) 0%, transparent 100%)",
        }}
        aria-hidden
      />
    </div>
  )
}


