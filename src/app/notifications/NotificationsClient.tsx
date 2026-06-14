//src/app/notifications/NotificationsClient.tsx

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, PanInfo } from "framer-motion"
import { formatRupiah, cn } from "@/lib/utils"
import BottomNav from "@/components/BottomNav"
import { useRealtimeDebts } from "@/hooks/useRealtimeDebts"
import {
    Bell, BellOff, AlertTriangle, Clock, CalendarDays,
    ChevronRight, ChevronLeft, CheckCircle2, Info, Sparkles, Trash2,
    CheckCheck, Volume2, VolumeX, MoreVertical, Eye, RefreshCw
} from "lucide-react"
import Link from "next/link"

interface DebtItem {
    id: string
    type: 'hutang' | 'piutang'
    amount: number
    paid_amount: number
    due_date: string | null
    installment_count: number | null
    installment_amount: number | null
    start_date: string | null
    interest_rate: number | null
    contacts: { id: string; name: string }
}

interface Props {
    userId: string
    overdueDebts: DebtItem[]
    installmentDebts: DebtItem[]
    todayStr: string
    in7DaysStr: string
}

type NotifItem = {
    id: string
    type: 'overdue' | 'upcoming' | 'installment'
    title: string
    subtitle: string
    amount: number
    date: string
    debtId: string
    urgent: boolean
}

// ✅ Haptic helper dengan pattern yang berbeda
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        const patterns = {
            light: 8,
            medium: 15,
            heavy: [20, 40, 20],
            success: [10, 50, 10, 50, 10]
        }
        navigator.vibrate(patterns[style])
    }
}

// ✅ PWA Badge API helper
const updateAppBadge = (count: number) => {
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
        try {
            // @ts-ignore
            navigator.setAppBadge(count)
        } catch (e) { }
    }
}

function buildNotifications(
    overdueDebts: DebtItem[],
    installmentDebts: DebtItem[],
    todayStr: string
): NotifItem[] {
    const items: NotifItem[] = []

    overdueDebts.forEach(d => {
        const isOverdue = (d.due_date ?? '') < todayStr
        const remaining = d.amount - d.paid_amount
        items.push({
            id: `debt-${d.id}`,
            type: isOverdue ? 'overdue' : 'upcoming',
            title: isOverdue
                ? `${d.type === 'piutang' ? 'Piutang' : 'Hutang'} jatuh tempo!`
                : `${d.type === 'piutang' ? 'Piutang' : 'Hutang'} akan jatuh tempo`,
            subtitle: `${d.contacts.name} · ${d.type === 'piutang' ? 'Tagih' : 'Bayar'} ${formatRupiah(remaining)}`,
            amount: remaining,
            date: d.due_date ?? '',
            debtId: d.id,
            urgent: isOverdue,
        })
    })

    installmentDebts.forEach(d => {
        if (!d.start_date || !d.installment_count || !d.installment_amount) return
        const paidCount = Math.floor(d.paid_amount / d.installment_amount)
        const nextPeriod = paidCount + 1
        if (nextPeriod > d.installment_count) return

        const nextDate = new Date(d.start_date)
        nextDate.setMonth(nextDate.getMonth() + nextPeriod)
        const nextDateStr = nextDate.toISOString().split('T')[0]
        const isUrgent = nextDateStr <= todayStr

        items.push({
            id: `installment-${d.id}-${nextPeriod}`,
            type: 'installment',
            title: `Cicilan ${nextPeriod}/${d.installment_count}`,
            subtitle: `${d.contacts.name} · ${d.type === 'piutang' ? 'Terima' : 'Bayar'} ${formatRupiah(d.installment_amount)}`,
            amount: d.installment_amount,
            date: nextDateStr,
            debtId: d.id,
            urgent: isUrgent,
        })
    })

    return items.sort((a, b) => {
        if (a.urgent && !b.urgent) return -1
        if (!a.urgent && b.urgent) return 1
        return a.date.localeCompare(b.date)
    })
}

// ✅ Grouping helper untuk visual grouping per tanggal
function getDateGroup(dateStr: string, todayStr: string): {
    group: 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'later' | 'no-date'
    label: string
    color: string
} {
    if (!dateStr) return { group: 'no-date', label: 'Tanpa tanggal', color: 'text-slate-500' }

    if (dateStr < todayStr) {
        const days = Math.round((new Date(todayStr).getTime() - new Date(dateStr).getTime()) / 86400000)
        return {
            group: 'overdue',
            label: days === 1 ? 'Kemarin' : `${days} hari lalu`,
            color: 'text-rose-400'
        }
    }
    if (dateStr === todayStr) return { group: 'today', label: 'Hari ini', color: 'text-amber-400' }

    const days = Math.round((new Date(dateStr).getTime() - new Date(todayStr).getTime()) / 86400000)
    if (days === 1) return { group: 'tomorrow', label: 'Besok', color: 'text-blue-400' }
    if (days <= 7) return { group: 'this-week', label: `${days} hari lagi`, color: 'text-violet-400' }

    return {
        group: 'later',
        label: new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        color: 'text-slate-400'
    }
}

export default function NotificationsClient({
    userId, overdueDebts, installmentDebts, todayStr, in7DaysStr
}: Props) {
    const router = useRouter()
    const [pushEnabled, setPushEnabled] = useState(false)
    const [pushLoading, setPushLoading] = useState(false)

    const [permissionState, setPermissionState] = useState<NotificationPermission>('default')
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)

    // ✅ Persistent dismissed IDs dengan localStorage
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set()
        try {
            const saved = localStorage.getItem(`dismissed-notifs-${userId}`)
            return saved ? new Set(JSON.parse(saved)) : new Set()
        } catch {
            return new Set()
        }
    })

    const allNotifications = buildNotifications(overdueDebts, installmentDebts, todayStr)
    const notifications = allNotifications.filter(n => !dismissedIds.has(n.id))
    const urgentCount = notifications.filter(n => n.urgent).length

    // ✅ Sync PWA badge
    useEffect(() => {
        updateAppBadge(urgentCount)
    }, [urgentCount])

    // ✅ Save dismissed IDs ke localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`dismissed-notifs-${userId}`, JSON.stringify([...dismissedIds]))
        }
    }, [dismissedIds, userId])

    useEffect(() => {
        if ('Notification' in window) {
            setPermissionState(Notification.permission)
            setPushEnabled(Notification.permission === 'granted')
        }
    }, [])

    const handleTogglePush = async () => {
        if (!('Notification' in window)) {
            alert('Browser kamu tidak mendukung notifikasi')
            return
        }
        triggerHaptic('medium')
        if (pushEnabled) {
            setPushEnabled(false)
            return
        }
        setPushLoading(true)
        try {
            const permission = await Notification.requestPermission()
            setPermissionState(permission)
            if (permission === 'granted') {
                setPushEnabled(true)
                triggerHaptic('success')
                new Notification('Notifikasi Aktif! 🔔', {
                    body: 'Kamu akan mendapat pengingat hutang & cicilan',
                    icon: '/icons/icon-192.png',
                })
            }
        } finally {
            setPushLoading(false)
        }
    }

    const sendReminder = useCallback((item: NotifItem) => {
        triggerHaptic('medium')
        if (!pushEnabled) {
            handleTogglePush()
            return
        }
        new Notification(item.title, {
            body: item.subtitle,
            icon: '/icons/icon-192.png',
        })
    }, [pushEnabled])

    const handleDismiss = useCallback((id: string) => {
        triggerHaptic('light')
        setDismissedIds(prev => new Set(prev).add(id))
        setContextMenu(null)
    }, [])

    const handleClearAll = useCallback(() => {
        triggerHaptic('medium')
        setDismissedIds(new Set(notifications.map(n => n.id)))
    }, [notifications])

    const handleRefresh = useCallback(async () => {
        setRefreshing(true)
        triggerHaptic('medium')
        await router.refresh()
        setTimeout(() => setRefreshing(false), 500)
    }, [router])
    // ✅ PANGGIL HOOK DI TOP-LEVEL
        useRealtimeDebts(userId, () => {
        // Auto-refresh saat ada perubahan di tabel debts
        handleRefresh()
    })

    const handleLongPress = useCallback((id: string, e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        triggerHaptic('medium')
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        setContextMenu({
            id,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        })
    }, [])

    return (
        <main
            className="min-h-screen pb-32 relative"
            style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)" }}
        >
            {/* Ambient Glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px]" />
                <div className="absolute bottom-20 -left-40 w-96 h-96 rounded-full bg-rose-500/10 blur-[120px]" />
            </div>

            {/* Pull to refresh indicator */}
            <AnimatePresence>
                {refreshing && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-16 pointer-events-none"
                    >
                        <div className="px-4 py-2 rounded-full bg-[#151E32] border border-white/[0.08] backdrop-blur-xl flex items-center gap-2 shadow-xl">
                            <RefreshCw size={14} className="text-amber-400 animate-spin" />
                            <span className="text-xs font-bold text-[#F1F5F9]">Memuat ulang...</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky Header */}
            <header
                className="sticky top-0 z-30 px-5 pt-14 pb-4 backdrop-blur-2xl bg-[#0B1120]/80 border-b border-white/[0.04]"
                style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}
            >
                {/* Back Button + Title */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard"
                            onClick={() => triggerHaptic('light')}
                            className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] active:scale-95 transition-all"
                        >
                            <ChevronLeft size={18} className="text-[#F1F5F9]" />
                        </Link>

                        <div>
                            <h1 className="text-[#F1F5F9] font-bold text-[20px] tracking-tight leading-tight">Notifikasi</h1>
                            <p className="text-[#64748B] text-[11px] mt-0.5 font-medium">
                                {urgentCount > 0 ? (
                                    <span className="text-rose-400 font-bold">{urgentCount} perlu perhatian</span>
                                ) : (
                                    <span className="text-emerald-400 font-bold">✓ Semua aman</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        {/* Sound Toggle */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                triggerHaptic('light')
                                setSoundEnabled(!soundEnabled)
                            }}
                            className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] active:scale-95 transition-all"
                        >
                            {soundEnabled ? (
                                <Volume2 size={16} className="text-[#94A3B8]" />
                            ) : (
                                <VolumeX size={16} className="text-[#475569]" />
                            )}
                        </motion.button>

                        {/* Push Toggle */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleTogglePush}
                            disabled={pushLoading}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all active:scale-95",
                                pushEnabled
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                    : "bg-[#151E32] border-white/[0.06] text-[#64748B]"
                            )}
                        >
                            {pushLoading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                >
                                    <Bell size={13} />
                                </motion.div>
                            ) : pushEnabled ? (
                                <Bell size={13} />
                            ) : (
                                <BellOff size={13} />
                            )}
                            {pushEnabled ? 'Aktif' : 'Aktifkan'}
                        </motion.button>
                    </div>
                </div>

                {/* Permission denied warning */}
                <AnimatePresence>
                    {permissionState === 'denied' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-rose-500/[0.08] border border-rose-500/15 overflow-hidden"
                        >
                            <Info size={13} className="text-rose-400 shrink-0 mt-0.5" />
                            <p className="text-rose-400/80 text-[10px] leading-relaxed">
                                Notifikasi diblokir. Buka pengaturan browser untuk mengizinkan notifikasi.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Clear All Button */}
                {notifications.length > 0 && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClearAll}
                        className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#94A3B8] text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-white/[0.06] active:scale-[0.98] transition-all"
                    >
                        <CheckCheck size={13} />
                        Tandai semua dibaca
                    </motion.button>
                )}
            </header>

            {/* ✅ Pull-to-refresh area */}
            <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.3}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 150 && !refreshing) {
                        handleRefresh()
                    }
                }}
                className="relative z-10 px-5 mt-5"
            >
                {/* Empty state */}
                <AnimatePresence mode="wait">
                    {notifications.length === 0 && (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <div className="relative mb-6">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                                >
                                    <CheckCircle2 size={44} className="text-emerald-400" strokeWidth={2} />
                                </motion.div>

                                {[...Array(3)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{
                                            scale: [0, 1, 0],
                                            opacity: [0, 1, 0],
                                            y: [0, -20, -40]
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            delay: i * 0.3,
                                            ease: "easeOut"
                                        }}
                                        className="absolute"
                                        style={{
                                            top: `${20 + i * 10}%`,
                                            left: `${20 + i * 30}%`
                                        }}
                                    >
                                        <Sparkles size={14} className="text-amber-400" />
                                    </motion.div>
                                ))}
                            </div>

                            <h2 className="text-[#F1F5F9] font-bold text-xl tracking-tight mb-2">
                                Semua Beres! 🎉
                            </h2>
                            <p className="text-[#64748B] text-sm leading-relaxed max-w-xs mb-6">
                                {allNotifications.length > 0
                                    ? "Semua notifikasi sudah ditandai dibaca"
                                    : "Tidak ada hutang jatuh tempo atau cicilan yang perlu diperhatikan"
                                }
                            </p>

                            <Link href="/debts">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-violet-900/30 flex items-center gap-2"
                                >
                                    Lihat Catatan Hutang
                                    <ChevronRight size={16} />
                                </motion.button>
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ✅ Visual Grouping: Urgent Section */}
                {notifications.filter(n => n.urgent).length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6"
                    >
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            <p className="text-rose-400 text-[10px] font-bold uppercase tracking-[0.15em]">
                                Perlu Tindakan
                            </p>
                            <div className="flex-1 h-px bg-gradient-to-r from-rose-500/30 to-transparent" />
                        </div>
                        <div className="space-y-2">
                            {notifications.filter(n => n.urgent).map((item, i) => (
                                <NotifCard
                                    key={item.id}
                                    item={item}
                                    index={i}
                                    dateGroup={getDateGroup(item.date, todayStr)}
                                    onRemind={() => sendReminder(item)}
                                    onDismiss={() => handleDismiss(item.id)}
                                    onLongPress={handleLongPress}
                                    soundEnabled={soundEnabled}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ✅ Visual Grouping: Grouped by Date */}
                {notifications.filter(n => !n.urgent).length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <p className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-[0.15em]">
                                Akan Datang
                            </p>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
                        </div>

                        {/* Group by date */}
                        {(['tomorrow', 'this-week', 'later'] as const).map(groupKey => {
                            const groupItems = notifications.filter(n =>
                                !n.urgent && getDateGroup(n.date, todayStr).group === groupKey
                            )
                            if (groupItems.length === 0) return null
                            const sampleDateGroup = getDateGroup(groupItems[0].date, todayStr)

                            return (
                                <div key={groupKey} className="mb-4">
                                    <div className="flex items-center gap-2 mb-2 ml-1">
                                        <CalendarDays size={10} className={sampleDateGroup.color} />
                                        <p className={cn("text-[10px] font-bold", sampleDateGroup.color)}>
                                            {sampleDateGroup.label}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        {groupItems.map((item, i) => (
                                            <NotifCard
                                                key={item.id}
                                                item={item}
                                                index={i}
                                                dateGroup={getDateGroup(item.date, todayStr)}
                                                onRemind={() => sendReminder(item)}
                                                onDismiss={() => handleDismiss(item.id)}
                                                onLongPress={handleLongPress}
                                                soundEnabled={soundEnabled}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </motion.div>
                )}
            </motion.div>

            {/* ✅ iOS Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setContextMenu(null)}
                            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="fixed z-50 w-56 rounded-2xl bg-[#151E32]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
                            style={{
                                left: Math.min(contextMenu.x - 112, window.innerWidth - 240),
                                top: Math.max(contextMenu.y - 100, 80),
                            }}
                        >
                            <div className="p-1.5">
                                <button
                                    onClick={() => {
                                        const item = notifications.find(n => n.id === contextMenu.id)
                                        if (item) sendReminder(item)
                                        setContextMenu(null)
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#F1F5F9] text-sm font-medium hover:bg-white/[0.06] active:scale-95 transition-all"
                                >
                                    <Bell size={16} className="text-amber-400" />
                                    Ingatkan
                                </button>
                                <Link
                                    href={`/debts?highlight=${contextMenu.id.replace('debt-', '').replace(/installment-.*-/, '')}`}
                                    onClick={() => setContextMenu(null)}
                                    className="block w-full text-left"
                                >
                                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#F1F5F9] text-sm font-medium hover:bg-white/[0.06] active:scale-95 transition-all">
                                        <Eye size={16} className="text-blue-400" />
                                        Lihat Detail
                                    </div>
                                </Link>
                                <button
                                    onClick={() => {
                                        handleDismiss(contextMenu.id)
                                        setContextMenu(null)
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 text-sm font-medium hover:bg-rose-500/10 active:scale-95 transition-all"
                                >
                                    <Trash2 size={16} />
                                    Hapus
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <BottomNav />
        </main>
    )
}

// ✅ NotifCard dengan swipe, long-press, dan link spesifik
function NotifCard({ item, index, dateGroup, onRemind, onDismiss, onLongPress, soundEnabled }: {
    item: NotifItem
    index: number
    dateGroup: { group: string; label: string; color: string }
    onRemind: () => void
    onDismiss: () => void
    onLongPress: (id: string, e: React.MouseEvent | React.TouchEvent) => void
    soundEnabled: boolean
}) {
    const [offsetX, setOffsetX] = useState(0)
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
    const isOverdue = item.type === 'overdue'
    const isInstallment = item.type === 'installment'

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.x < -100) {
            triggerHaptic('medium')
            onDismiss()
        } else {
            setOffsetX(0)
        }
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        const timer = setTimeout(() => {
            onLongPress(item.id, e)
        }, 500)
        setLongPressTimer(timer)
    }

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer)
            setLongPressTimer(null)
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        const timer = setTimeout(() => {
            onLongPress(item.id, e)
        }, 500)
        setLongPressTimer(timer)
    }

    const handleMouseUp = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer)
            setLongPressTimer(null)
        }
    }

    const cardStyles = {
        overdue: {
            bg: "bg-rose-500/[0.06]",
            border: "border-rose-500/20",
            iconBg: "bg-rose-500/20",
            icon: <AlertTriangle size={18} className="text-rose-400" strokeWidth={2.5} />,
            glow: "bg-rose-400"
        },
        installment: {
            bg: "bg-violet-500/[0.05]",
            border: "border-violet-500/15",
            iconBg: "bg-violet-500/20",
            icon: <CalendarDays size={18} className="text-violet-400" strokeWidth={2.5} />,
            glow: "bg-violet-400"
        },
        upcoming: {
            bg: "bg-amber-500/[0.05]",
            border: "border-amber-500/15",
            iconBg: "bg-amber-500/20",
            icon: <Clock size={18} className="text-amber-400" strokeWidth={2.5} />,
            glow: "bg-amber-400"
        }
    }

    const style = isOverdue ? cardStyles.overdue : isInstallment ? cardStyles.installment : cardStyles.upcoming

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -300, height: 0 }}
            transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 28 }}
            className="relative overflow-hidden rounded-2xl group"
        >
            {/* Swipe to delete background */}
            <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-end px-5 rounded-2xl">
                <div className="flex items-center gap-2 text-rose-400">
                    <Trash2 size={16} />
                    <span className="text-xs font-bold">Hapus</span>
                </div>
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: -150, right: 0 }}
                dragElastic={0.1}
                onDrag={(_, info) => setOffsetX(info.offset.x)}
                onDragEnd={handleDragEnd}
                animate={{ x: offsetX }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <Link
                    href={`/debts?highlight=${item.debtId}`}
                    className="block"
                    onClick={() => triggerHaptic('light')}
                >
                    <div className={cn(
                        "relative rounded-2xl p-4 border transition-all bg-[#151E32]",
                        style.border,
                        "active:scale-[0.98] active:bg-[#1E293B]"
                    )}>
                        {item.urgent && (
                            <div className={cn(
                                "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-[0.08] pointer-events-none",
                                style.glow
                            )} />
                        )}

                        <div className="flex items-start gap-3 relative z-10">
                            <motion.div
                                className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.05]", style.iconBg)}
                                whileHover={{ scale: 1.05, rotate: 5 }}
                            >
                                {style.icon}
                            </motion.div>

                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-[#F1F5F9] font-bold text-[14px] tracking-tight leading-tight">
                                        {item.title}
                                    </p>
                                    {item.urgent && (
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="w-2 h-2 rounded-full bg-rose-400 shrink-0 mt-1.5"
                                        />
                                    )}
                                </div>

                                <p className="text-[#94A3B8] text-[11px] truncate mb-2">
                                    {item.subtitle}
                                </p>

                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[9px] font-bold px-2 py-0.5 rounded-md border border-white/[0.04] bg-white/[0.03]",
                                            dateGroup.color
                                        )}>
                                            {dateGroup.label}
                                        </span>
                                        <span className="text-[#F1F5F9] text-[11px] font-bold tabular-nums">
                                            {formatRupiah(item.amount)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); onRemind() }}
                                            className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 active:scale-95 transition-all"
                                        >
                                            <Bell size={10} />
                                            Ingatkan
                                        </motion.button>
                                        <button
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); onLongPress(item.id, e); }}
                                            className="p-1 rounded-md hover:bg-white/[0.06] active:scale-90 transition-all"
                                        >
                                            <MoreVertical size={12} className="text-[#64748B]" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <ChevronRight size={16} className="text-[#475569] shrink-0 mt-3" />
                        </div>
                    </div>
                </Link>
            </motion.div>
        </motion.div>
    )
}