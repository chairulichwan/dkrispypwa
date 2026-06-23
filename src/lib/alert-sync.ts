export const ALERT_UNREAD_COUNT_STORAGE_KEY = "dkrispy:alerts:unread-count"
export const ALERT_UNREAD_COUNT_EVENT = "dkrispy:alerts:unread-count"

interface AlertUnreadCountPayload {
  unreadCount: number
  updatedAt: number
}

const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000

const normalizeUnreadCount = (value: number) => Math.max(0, Math.trunc(Number(value) || 0))

export function broadcastUnreadAlertCount(unreadCount: number) {
  if (typeof window === "undefined") return

  const payload: AlertUnreadCountPayload = {
    unreadCount: normalizeUnreadCount(unreadCount),
    updatedAt: Date.now(),
  }

  window.localStorage.setItem(ALERT_UNREAD_COUNT_STORAGE_KEY, JSON.stringify(payload))
  window.dispatchEvent(new CustomEvent<AlertUnreadCountPayload>(ALERT_UNREAD_COUNT_EVENT, { detail: payload }))
}

export function readStoredUnreadAlertCount(maxAgeMs = DEFAULT_MAX_AGE_MS) {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(ALERT_UNREAD_COUNT_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<AlertUnreadCountPayload>
    const unreadCount = normalizeUnreadCount(Number(parsed.unreadCount) || 0)
    const updatedAt = Number(parsed.updatedAt) || 0

    if (updatedAt <= 0) return null
    if (Date.now() - updatedAt > maxAgeMs) return null

    return unreadCount
  } catch {
    return null
  }
}

export function subscribeUnreadAlertCount(listener: (unreadCount: number) => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<AlertUnreadCountPayload>).detail
    listener(normalizeUnreadCount(detail?.unreadCount ?? 0))
  }

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== ALERT_UNREAD_COUNT_STORAGE_KEY) return

    const unreadCount = readStoredUnreadAlertCount()
    if (unreadCount === null) return
    listener(unreadCount)
  }

  window.addEventListener(ALERT_UNREAD_COUNT_EVENT, handleCustomEvent as EventListener)
  window.addEventListener("storage", handleStorageEvent)

  return () => {
    window.removeEventListener(ALERT_UNREAD_COUNT_EVENT, handleCustomEvent as EventListener)
    window.removeEventListener("storage", handleStorageEvent)
  }
}
