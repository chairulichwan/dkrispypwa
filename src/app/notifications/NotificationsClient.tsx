"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion, type PanInfo } from "framer-motion"
import {
  BellRing,
  CheckCheck,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react"
import toast from "react-hot-toast"

import { dismissAlert, getAlertDeepLink, markAllAlertsRead, setAlertReadState } from "@/lib/alerts"
import { broadcastUnreadAlertCount } from "@/lib/alert-sync"
import { cn } from "@/lib/utils"

interface AlertItem {
  id: string
  type: string
  title: string
  message: string
  source: string | null
  created_at: string
  read_at?: string | null
  dismissed_at?: string | null
}

interface Props {
  initialAlerts: AlertItem[]
}

type NotificationFilterId = "aktif" | "unread" | "read" | "dismissed"
type NotificationSeverityId = "semua" | "critical" | "warning" | "info"

interface UndoDismissItem {
  alertId: string
  title: string
  createdAt: number
  expiresAt: number
}

const UNDO_DISMISS_WINDOW_MS = 5000
const MAX_UNDO_STACK = 3

const isNotificationFilterId = (value: string | null): value is NotificationFilterId =>
  value === "aktif" || value === "unread" || value === "read" || value === "dismissed"

const parseNotificationFilter = (value: string | null): NotificationFilterId =>
  isNotificationFilterId(value) ? value : "aktif"

const isNotificationSeverityId = (value: string | null): value is NotificationSeverityId =>
  value === "semua" || value === "critical" || value === "warning" || value === "info"

const parseNotificationSeverity = (value: string | null): NotificationSeverityId =>
  isNotificationSeverityId(value) ? value : "semua"

const getAlertSeverity = (type: string): Exclude<NotificationSeverityId, "semua"> => {
  if (type === "critical") return "critical"
  if (type === "warning") return "warning"
  return "info"
}

const triggerHaptic = (
  style: "light" | "medium" | "success" | "read" | "unread" | "dismiss" | "restore" = "light"
) => {
  if (typeof navigator === "undefined" || !navigator.vibrate) return

  const patterns = {
    light: 8,
    medium: 15,
    success: [10, 50, 10],
    read: [8, 30, 8],
    unread: 16,
    dismiss: [12, 40, 18],
    restore: [10, 35, 10],
  }

  navigator.vibrate(patterns[style])
}

const severityBadgeClass = (type: string) =>
  type === "critical"
    ? "rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300"
    : type === "warning"
      ? "rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300"
      : "rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300"

const severityLabel = (type: string) =>
  type === "critical" ? "Kritis" : type === "warning" ? "Peringatan" : "Info"

const matchesSeverity = (alert: AlertItem, severity: NotificationSeverityId) =>
  severity === "semua" ? true : getAlertSeverity(alert.type) === severity

const shouldTriggerReadSwipe = (info: PanInfo) =>
  info.offset.x >= 78 || (info.offset.x >= 42 && info.velocity.x >= 650)

const shouldTriggerDismissSwipe = (info: PanInfo) =>
  info.offset.x <= -78 || (info.offset.x <= -42 && info.velocity.x <= -650)

export default function NotificationsClient({ initialAlerts }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filterFromUrl = parseNotificationFilter(searchParams.get("filter"))
  const severityFromUrl = parseNotificationSeverity(searchParams.get("severity"))

  const [alerts, setAlerts] = useState(initialAlerts)
  const [markingAll, setMarkingAll] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [undoingId, setUndoingId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilterId>(filterFromUrl)
  const [selectedSeverity, setSelectedSeverity] = useState<NotificationSeverityId>(severityFromUrl)
  const [undoDismissStack, setUndoDismissStack] = useState<UndoDismissItem[]>([])
  const [undoNow, setUndoNow] = useState(() => Date.now())

  useEffect(() => {
    setSelectedFilter(filterFromUrl)
  }, [filterFromUrl])

  useEffect(() => {
    setSelectedSeverity(severityFromUrl)
  }, [severityFromUrl])

  useEffect(() => {
    if (undoDismissStack.length <= 0) return

    const interval = setInterval(() => {
      setUndoNow(Date.now())
    }, 50)

    return () => clearInterval(interval)
  }, [undoDismissStack.length])

  useEffect(() => {
    if (undoDismissStack.length <= 0) return

    setUndoDismissStack((prev) => {
      const next = prev.filter((item) => item.expiresAt > undoNow)
      return next.length === prev.length ? prev : next
    })
  }, [undoDismissStack.length, undoNow])

  const unreadCount = useMemo(
    () => alerts.filter((alert) => !alert.dismissed_at && !alert.read_at).length,
    [alerts]
  )

  const activeCount = useMemo(() => alerts.filter((alert) => !alert.dismissed_at).length, [alerts])

  const readCount = useMemo(
    () => alerts.filter((alert) => !alert.dismissed_at && !!alert.read_at).length,
    [alerts]
  )

  const dismissedCount = useMemo(() => alerts.filter((alert) => !!alert.dismissed_at).length, [alerts])

  useEffect(() => {
    broadcastUnreadAlertCount(unreadCount)
  }, [unreadCount])

  const alertsByStatusFilter = useMemo(() => {
    switch (selectedFilter) {
      case "unread":
        return alerts.filter((alert) => !alert.dismissed_at && !alert.read_at)
      case "read":
        return alerts.filter((alert) => !alert.dismissed_at && !!alert.read_at)
      case "dismissed":
        return alerts.filter((alert) => !!alert.dismissed_at)
      case "aktif":
      default:
        return alerts.filter((alert) => !alert.dismissed_at)
    }
  }, [alerts, selectedFilter])

  const severityCounts = useMemo(() => {
    return alertsByStatusFilter.reduce(
      (acc, alert) => {
        const severity = getAlertSeverity(alert.type)
        acc.semua += 1
        acc[severity] += 1
        return acc
      },
      { semua: 0, critical: 0, warning: 0, info: 0 }
    )
  }, [alertsByStatusFilter])

  const filteredAlerts = useMemo(
    () => alertsByStatusFilter.filter((alert) => matchesSeverity(alert, selectedSeverity)),
    [alertsByStatusFilter, selectedSeverity]
  )

  const filterTabs = useMemo(
    () => [
      {
        id: "aktif" as const,
        label: "Aktif",
        count: activeCount,
        activeClassName: "border-violet-400/30 bg-violet-500/20 text-violet-200",
        idleClassName: "border-white/[0.08] bg-white/[0.03] text-[#94A3B8]",
      },
      {
        id: "unread" as const,
        label: "Belum dibaca",
        count: unreadCount,
        activeClassName: "border-cyan-400/30 bg-cyan-500/20 text-cyan-200",
        idleClassName: "border-white/[0.08] bg-white/[0.03] text-[#94A3B8]",
      },
      {
        id: "read" as const,
        label: "Dibaca",
        count: readCount,
        activeClassName: "border-emerald-400/30 bg-emerald-500/20 text-emerald-200",
        idleClassName: "border-white/[0.08] bg-white/[0.03] text-[#94A3B8]",
      },
      {
        id: "dismissed" as const,
        label: "Dismissed",
        count: dismissedCount,
        activeClassName: "border-rose-400/30 bg-rose-500/20 text-rose-200",
        idleClassName: "border-white/[0.08] bg-white/[0.03] text-[#94A3B8]",
      },
    ],
    [activeCount, dismissedCount, readCount, unreadCount]
  )

  const severityTabs = useMemo(
    () => [
      {
        id: "semua" as const,
        label: "Semua",
        count: severityCounts.semua,
        activeClassName: "border-white/[0.14] bg-white/[0.08] text-white",
      },
      {
        id: "critical" as const,
        label: "Kritis",
        count: severityCounts.critical,
        activeClassName: "border-rose-400/30 bg-rose-500/20 text-rose-200",
      },
      {
        id: "warning" as const,
        label: "Peringatan",
        count: severityCounts.warning,
        activeClassName: "border-amber-400/30 bg-amber-500/20 text-amber-200",
      },
      {
        id: "info" as const,
        label: "Info",
        count: severityCounts.info,
        activeClassName: "border-cyan-400/30 bg-cyan-500/20 text-cyan-200",
      },
    ],
    [severityCounts]
  )

  const replaceUrlState = useCallback(
    (nextFilter: NotificationFilterId, nextSeverity: NotificationSeverityId) => {
      const params = new URLSearchParams(searchParams.toString())

      if (nextFilter === "aktif") {
        params.delete("filter")
      } else {
        params.set("filter", nextFilter)
      }

      if (nextSeverity === "semua") {
        params.delete("severity")
      } else {
        params.set("severity", nextSeverity)
      }

      const nextQuery = params.toString()
      const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname
      router.replace(nextHref, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const handleFilterChange = useCallback(
    (nextFilter: NotificationFilterId) => {
      setSelectedFilter(nextFilter)
      replaceUrlState(nextFilter, selectedSeverity)
    },
    [replaceUrlState, selectedSeverity]
  )

  const handleSeverityChange = useCallback(
    (nextSeverity: NotificationSeverityId) => {
      setSelectedSeverity(nextSeverity)
      replaceUrlState(selectedFilter, nextSeverity)
    },
    [replaceUrlState, selectedFilter]
  )

  const queueUndoDismiss = useCallback((alert: AlertItem) => {
    const createdAt = Date.now()
    const nextItem: UndoDismissItem = {
      alertId: alert.id,
      title: alert.title,
      createdAt,
      expiresAt: createdAt + UNDO_DISMISS_WINDOW_MS,
    }

    setUndoDismissStack((prev) => [nextItem, ...prev.filter((item) => item.alertId !== alert.id)].slice(0, MAX_UNDO_STACK))
  }, [])

  const removeUndoItem = useCallback((alertId: string) => {
    setUndoDismissStack((prev) => prev.filter((item) => item.alertId !== alertId))
  }, [])

  const restoreDismissedAlert = useCallback(
    async (alert: AlertItem, mode: "undo" | "manual" = "manual") => {
      const restoreId = alert.id
      setBusyId(restoreId)

      if (mode === "undo") {
        setUndoingId(restoreId)
      }

      try {
        await dismissAlert({ alertId: restoreId, dismiss: false })
        setAlerts((prev) =>
          prev.map((item) =>
            item.id === restoreId
              ? {
                  ...item,
                  dismissed_at: null,
                }
              : item
          )
        )
        removeUndoItem(restoreId)
        triggerHaptic("restore")
        toast.success(mode === "undo" ? "Dismiss dibatalkan" : "Alert dipulihkan")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal memulihkan alert"
        toast.error(message)
      } finally {
        setBusyId((current) => (current === restoreId ? null : current))
        if (mode === "undo") {
          setUndoingId((current) => (current === restoreId ? null : current))
        }
      }
    },
    [removeUndoItem]
  )

  const handleMarkRead = useCallback(async (alert: AlertItem, read: boolean) => {
    setBusyId(alert.id)

    try {
      await setAlertReadState({ alertId: alert.id, read })
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === alert.id
            ? {
                ...item,
                read_at: read ? new Date().toISOString() : null,
              }
            : item
        )
      )
      triggerHaptic(read ? "read" : "unread")
      toast.success(read ? "Alert ditandai dibaca" : "Status baca dibuka lagi")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengubah status baca"
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }, [])

  const handleDismiss = useCallback(
    async (alert: AlertItem) => {
      setBusyId(alert.id)

      try {
        await dismissAlert({ alertId: alert.id, dismiss: true })
        setAlerts((prev) =>
          prev.map((item) =>
            item.id === alert.id
              ? {
                  ...item,
                  dismissed_at: new Date().toISOString(),
                }
              : item
          )
        )
        queueUndoDismiss(alert)
        triggerHaptic("dismiss")
        toast.success("Alert didismiss")
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal dismiss alert"
        toast.error(message)
      } finally {
        setBusyId(null)
      }
    },
    [queueUndoDismiss]
  )

  const handleMarkAll = useCallback(async () => {
    if (unreadCount <= 0 || markingAll) return

    setMarkingAll(true)
    try {
      await markAllAlertsRead()
      setAlerts((prev) =>
        prev.map((item) =>
          item.dismissed_at
            ? item
            : {
                ...item,
                read_at: item.read_at ?? new Date().toISOString(),
              }
        )
      )
      triggerHaptic("success")
      toast.success("Semua alert ditandai dibaca")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menandai semua alert"
      toast.error(message)
    } finally {
      setMarkingAll(false)
    }
  }, [markingAll, unreadCount])

  const handleOpenAlert = useCallback(
    async (alert: AlertItem) => {
      const href = getAlertDeepLink(alert.source)
      if (!href) return

      triggerHaptic("light")

      if (!alert.read_at && !alert.dismissed_at) {
        try {
          await setAlertReadState({ alertId: alert.id, read: true })
          setAlerts((prev) =>
            prev.map((item) =>
              item.id === alert.id
                ? {
                    ...item,
                    read_at: new Date().toISOString(),
                  }
                : item
            )
          )
        } catch {
          // ignore read failure, still allow deep link
        }
      }

      router.push(href)
    },
    [router]
  )

  const emptyStateCopy = useMemo(() => {
    if (selectedSeverity !== "semua") {
      return {
        title: `Tidak ada alert ${selectedSeverity === "critical" ? "kritis" : selectedSeverity === "warning" ? "peringatan" : "info"}`,
        description: "Coba ganti level severity atau tab notifikasi untuk melihat alert lainnya.",
      }
    }

    switch (selectedFilter) {
      case "unread":
        return {
          title: "Tidak ada alert belum dibaca",
          description: "Semua alert aktif sudah kamu lihat atau tandai dibaca.",
        }
      case "read":
        return {
          title: "Belum ada alert dibaca",
          description: "Alert yang sudah dibaca akan tampil di tab ini.",
        }
      case "dismissed":
        return {
          title: "Belum ada alert dismissed",
          description: "Alert yang kamu dismiss akan tersimpan di sini dan bisa dipulihkan lagi.",
        }
      case "aktif":
      default:
        return {
          title: "Belum ada alert aktif",
          description: "Saat ada risk analytics atau debt urgent, notifikasi akan tampil di sini.",
        }
    }
  }, [selectedFilter, selectedSeverity])

  return (
    <>
      <section className="space-y-4">
        <div className="rounded-[24px] border border-white/[0.07] bg-[#0B1120]/80 p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Status Alert</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {unreadCount > 0 ? `${unreadCount} alert belum dibaca` : "Semua alert aktif sudah dibaca"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={unreadCount <= 0 || markingAll}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-2 text-[11px] font-bold text-cyan-300 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={13} className={markingAll ? "animate-pulse" : ""} />
              Tandai semua dibaca
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Belum dibaca</p>
              <p className="mt-1 text-lg font-black tabular-nums text-white">{unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Aktif</p>
              <p className="mt-1 text-lg font-black tabular-nums text-white">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-rose-500/15 bg-rose-500/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Dismissed</p>
              <p className="mt-1 text-lg font-black tabular-nums text-white">{dismissedCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/[0.07] bg-[#0B1120]/80 p-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {filterTabs.map((tab) => {
              const active = selectedFilter === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light")
                    handleFilterChange(tab.id)
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold transition active:scale-95",
                    active ? tab.activeClassName : tab.idleClassName
                  )}
                  aria-pressed={active}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums",
                      active ? "bg-white/10 text-white" : "bg-white/[0.06] text-[#CBD5E1]"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
            {severityTabs.map((tab) => {
              const active = selectedSeverity === tab.id

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light")
                    handleSeverityChange(tab.id)
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition active:scale-95",
                    active ? tab.activeClassName : "border-white/[0.08] bg-white/[0.03] text-[#94A3B8]"
                  )}
                  aria-pressed={active}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-black tabular-nums",
                      active ? "bg-white/10 text-white" : "bg-white/[0.06] text-[#CBD5E1]"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/[0.07] bg-[#0B1120]/80 px-4 py-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <p className="text-[11px] font-semibold text-[#94A3B8]">
            {selectedFilter === "dismissed"
              ? "Alert yang sudah didismiss tetap aman di sini. Kamu bisa pulihkan manual atau undo beberapa alert sekaligus lewat stack di bawah."
              : "Geser cepat sedikit pun sekarang tetap terbaca: swipe kanan untuk baca / belum dibaca, swipe kiri untuk dismiss. Tap alert untuk buka deep link jika tersedia."}
          </p>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => {
                const isDismissed = !!alert.dismissed_at
                const isRead = !!alert.read_at
                const isBusy = busyId === alert.id || undoingId === alert.id
                const hasDeepLink = !!getAlertDeepLink(alert.source)

                return (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="relative overflow-hidden rounded-[24px]"
                  >
                    {!isDismissed ? (
                      <div className="pointer-events-none absolute inset-0 flex items-stretch overflow-hidden rounded-[24px]">
                        <div className="flex flex-1 items-center justify-start bg-cyan-500/15 pl-5">
                          <div className="flex items-center gap-2 text-cyan-300">
                            {isRead ? <EyeOff size={16} /> : <Eye size={16} />}
                            <span className="text-[11px] font-bold uppercase tracking-wider">
                              {isRead ? "Belum dibaca" : "Dibaca"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-1 items-center justify-end bg-rose-500/15 pr-5">
                          <div className="flex items-center gap-2 text-rose-300">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Dismiss</span>
                            <Trash2 size={16} />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <motion.div
                      layout
                      drag={isDismissed ? false : "x"}
                      dragSnapToOrigin
                      dragElastic={0.12}
                      whileDrag={{ scale: 0.992 }}
                      onDragEnd={(_, info) => {
                        if (isBusy || isDismissed) return
                        if (shouldTriggerReadSwipe(info)) {
                          void handleMarkRead(alert, !isRead)
                          return
                        }
                        if (shouldTriggerDismissSwipe(info)) {
                          void handleDismiss(alert)
                        }
                      }}
                      className={cn(
                        "rounded-[24px] border p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl",
                        isDismissed
                          ? "border-white/[0.04] bg-[#0B1120]/55 opacity-70"
                          : "border-white/[0.07] bg-[#0B1120]/80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => void handleOpenAlert(alert)}
                          disabled={!hasDeepLink}
                          className={cn(
                            "min-w-0 flex-1 text-left",
                            hasDeepLink ? "cursor-pointer" : "cursor-default"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className={severityBadgeClass(alert.type)}>{severityLabel(alert.type)}</span>
                            {isDismissed ? (
                              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                                Dismissed
                              </span>
                            ) : !isRead ? (
                              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                                Baru
                              </span>
                            ) : (
                              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                                Dibaca
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <h2 className="truncate text-base font-bold text-white">{alert.title}</h2>
                            {!isRead && !isDismissed ? <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400" /> : null}
                            {hasDeepLink ? <ChevronRight size={14} className="shrink-0 text-[#64748B]" /> : null}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#94A3B8]">{alert.message}</p>
                          <p className="mt-3 text-[11px] text-[#64748B]">
                            {new Date(alert.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </button>
                      </div>

                      {!isDismissed ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleMarkRead(alert, !isRead)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] font-bold text-cyan-300 transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isRead ? <EyeOff size={13} /> : <Eye size={13} />}
                            {isRead ? "Tandai belum dibaca" : "Tandai dibaca"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDismiss(alert)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300 transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void restoreDismissedAlert(alert, "manual")}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300 transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <RotateCcw size={13} />
                            Pulihkan alert
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )
              })
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] border border-white/[0.07] bg-[#0B1120]/80 px-5 py-16 text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                <BellRing size={28} className="mx-auto mb-4 text-[#475569]" />
                <p className="text-base font-bold text-white">{emptyStateCopy.title}</p>
                <p className="mt-2 text-sm text-[#94A3B8]">{emptyStateCopy.description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-5 left-4 right-4 z-[80] mx-auto flex max-w-md flex-col gap-3">
        <AnimatePresence initial={false}>
          {undoDismissStack.map((item, index) => {
            const remainingRatio = Math.max(0, Math.min(1, (item.expiresAt - undoNow) / UNDO_DISMISS_WINDOW_MS))
            const targetAlert = alerts.find((alert) => alert.id === item.alertId)

            return (
              <motion.div
                key={item.alertId}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.94, filter: "blur(10px)" }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1 - index * 0.03,
                  filter: "blur(0px)",
                }}
                exit={{ opacity: 0, y: 18, scale: 0.92, scaleY: 0.78, filter: "blur(10px)" }}
                transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.9 }}
                style={{ transformOrigin: "bottom center" }}
                className="pointer-events-auto"
              >
                <div className="overflow-hidden rounded-[24px] border border-rose-500/20 bg-[#101827]/95 p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-amber-500 transition-[width] duration-75 ease-linear"
                      style={{ width: `${remainingRatio * 100}%` }}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">Alert didismiss</p>
                      <p className="mt-1 truncate text-[12px] text-[#94A3B8]">{item.title}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeUndoItem(item.alertId)}
                      className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] transition hover:bg-white/[0.08]"
                    >
                      Tutup
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-[#64748B]">
                      {undoDismissStack.length > 1 ? `${undoDismissStack.length} alert siap di-undo` : "Bisa dibatalkan dalam beberapa detik."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!targetAlert) return
                        void restoreDismissedAlert(targetAlert, "undo")
                      }}
                      disabled={!targetAlert || undoingId === item.alertId}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-[11px] font-bold text-amber-300 transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Undo2 size={13} />
                      {undoingId === item.alertId ? "Mengurungkan..." : "Undo dismiss"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </>
  )
}
