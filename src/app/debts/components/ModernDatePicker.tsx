"use client"

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CalendarDays, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface ModernDatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  isInvalid?: boolean
  errorMessage?: string
  placeholder?: string
  minDate?: string
  maxDate?: string
}

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return ""

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Ags",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ]

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

const getRelativeLabel = (dateStr: string): string | null => {
  if (!dateStr) return null

  const date = new Date(dateStr)
  const today = new Date()

  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return "Hari ini"
  if (diffDays === 1) return "Besok"
  if (diffDays === -1) return "Kemarin"
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} hari lagi`
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} hari lalu`

  return null
}

export default function ModernDatePicker({
  value,
  onChange,
  label,
  isInvalid = false,
  errorMessage,
  placeholder = "Pilih tanggal",
  minDate,
  maxDate,
}: ModernDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const hasValue = Boolean(value)
  const displayDate = formatDisplayDate(value)
  const relativeLabel = getRelativeLabel(value)

  const handleOpenPicker = () => {
    if (!inputRef.current) return

    if (typeof inputRef.current.showPicker === "function") {
      inputRef.current.showPicker()
      return
    }

    inputRef.current.focus()
    inputRef.current.click()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleOpenPicker()
    }
  }

  const stateColors = isInvalid
    ? {
      icon: "text-rose-400",
      border: "border-rose-500/50",
      text: "text-rose-300",
      bg: "bg-rose-500/5",
      glow: "shadow-rose-500/10",
    }
    : hasValue
      ? {
        icon: "text-cyan-400",
        border: "border-cyan-500/30",
        text: "text-[#E2E8F0]",
        bg: "bg-cyan-500/5",
        glow: "shadow-cyan-500/10",
      }
      : {
        icon: "text-[#475569]",
        border: "border-white/[0.07]",
        text: "text-[#334155]",
        bg: "bg-[#0D1526]",
        glow: "",
      }

  return (
    <div className="space-y-1.5">
      {label ? (
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#64748B]">
          {label}
        </p>
      ) : null}

      <div className="relative group">
        <div
          className={cn(
            "pointer-events-none absolute -inset-0.5 rounded-xl opacity-0 blur-md transition-opacity duration-300",
            isFocused && !isInvalid && "bg-cyan-500/20 opacity-100",
            isFocused && isInvalid && "bg-rose-500/20 opacity-100"
          )}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={handleOpenPicker}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsFocused(false)
            }
          }}
          className={cn(
            "relative flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 focus:outline-none",
            stateColors.border,
            stateColors.bg,
            isFocused && stateColors.glow && `shadow-lg ${stateColors.glow}`,
            !isInvalid && "focus-within:border-cyan-500/50"
          )}
          aria-label={label || "Pilih tanggal"}

        >
          <motion.div
            animate={{
              scale: isFocused ? 1.08 : 1,
              rotate: isFocused ? 4 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="shrink-0"
          >
            <CalendarDays
              size={15}
              className={cn("transition-colors duration-200", stateColors.icon)}
            />
          </motion.div>

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="popLayout">
              {hasValue ? (
                <motion.div
                  key="date-value"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className={cn("truncate text-sm font-semibold", stateColors.text)}>
                    {displayDate}
                  </span>

                  {relativeLabel ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold",
                        isInvalid
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                          : "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                      )}
                    >
                      {relativeLabel}
                    </span>
                  ) : null}
                </motion.div>
              ) : (
                <motion.span
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-medium text-[#334155]"
                >
                  {placeholder}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {hasValue ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                whileTap={{ scale: 0.85 }}
                onClick={(event) => {
                  event.stopPropagation()
                  onChange("")
                }}
                className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
                aria-label="Hapus tanggal"
              >
                <X size={10} className="text-[#94A3B8]" />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Native input disembunyikan dari layout, tapi tetap dipakai untuk picker */}
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          min={minDate}
          max={maxDate}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          tabIndex={-1}
          aria-invalid={isInvalid}
          aria-label={label || "Pilih tanggal"}
        />
      </div>

      <AnimatePresence>
        {isInvalid && errorMessage ? (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-1 text-[11px] text-rose-400"
          >
            <span className="inline-block h-1 w-1 rounded-full bg-rose-400" />
            {errorMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}