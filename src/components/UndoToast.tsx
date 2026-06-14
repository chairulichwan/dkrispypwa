
//src/components/UndoToast.tsx
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Loader2, Trash2, Undo2 } from "lucide-react"

interface UndoToastProps {
  message: string
  onUndo: () => Promise<void>
  duration?: number
  onExpired?: () => void
}

export default function UndoToast({
  message,
  onUndo,
  duration = 5000,
  onExpired,
}: UndoToastProps) {
  const [progress, setProgress] = useState(100)
  const [undone, setUndone] = useState(false)
  const [undoing, setUndoing] = useState(false)

  const startTimeRef = useRef<number>(Date.now())
  const onExpiredRef = useRef(onExpired)
  const onUndoRef = useRef(onUndo)

  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  useEffect(() => {
    onUndoRef.current = onUndo
  }, [onUndo])

  const handleUndo = useCallback(async () => {
    if (undoing || undone) return

    setUndoing(true)

    try {
      await onUndoRef.current?.()
      setUndone(true)
    } catch {
      setUndoing(false)
    }
  }, [undoing, undone])

  useEffect(() => {
    if (undone || undoing) return

    startTimeRef.current = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)

      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        onExpiredRef.current?.()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, undone, undoing])

  return (
    <AnimatePresence mode="wait">
      {!undone && progress > 0 && (
        <motion.div
          key="undo-toast"
          initial={{ opacity: 0, y: 80, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="fixed bottom-24 left-4 right-4 z-[70] mx-auto max-w-sm"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#1a2332]/95 border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl p-4">
            <div
              className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-amber-400 to-orange-500"
              style={{
                width: `${progress}%`,
                transition: "width 50ms linear",
              }}
            />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                  <Trash2 size={14} className="text-rose-400" />
                </div>
                <p className="text-white text-sm font-bold truncate">{message}</p>
              </div>

              <button
                onClick={handleUndo}
                disabled={undoing}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {undoing ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                Urungkan
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {undone && (
        <motion.div
          key="undo-success"
          initial={{ opacity: 0, y: 80, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          onAnimationComplete={() => {
            setTimeout(() => onExpiredRef.current?.(), 2000)
          }}
          className="fixed bottom-24 left-4 right-4 z-[70] mx-auto max-w-sm"
        >
          <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-xl p-4 flex items-center gap-3 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center shrink-0">
              <Check size={16} className="text-emerald-400" strokeWidth={3} />
            </div>
            <p className="text-emerald-300 text-sm font-bold">Akun berhasil dipulihkan!</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
