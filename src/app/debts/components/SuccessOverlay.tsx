// src/app/debts/components/SuccessOverlay.tsx
"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react"
import { cn, formatRupiah } from "@/lib/utils"

interface SuccessOverlayProps {
  show: boolean
  type: "piutang" | "hutang"
  amount: number
}

export default function SuccessOverlay({ show, type, amount }: SuccessOverlayProps) {
  const isPiutang = type === "piutang"

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[70] flex items-center justify-center overflow-hidden rounded-t-[28px]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(11, 17, 32, 0.97) 0%, rgba(8, 13, 26, 0.99) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Ambient glow */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "absolute w-80 h-80 rounded-full blur-3xl",
              isPiutang ? "bg-emerald-500/15" : "bg-rose-500/15"
            )}
          />

          {/* Confetti-like particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                scale: 0,
                x: 0,
                y: 0,
                opacity: 0,
              }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i * Math.PI) / 3) * 120,
                y: Math.sin((i * Math.PI) / 3) * 120,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.2,
                delay: 0.2 + i * 0.05,
                ease: "easeOut",
              }}
              className={cn(
                "absolute w-2 h-2 rounded-full",
                isPiutang ? "bg-emerald-400" : "bg-rose-400"
              )}
              style={{ filter: "blur(1px)" }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="relative text-center px-6"
          >
            {/* Animated checkmark circle */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
              className={cn(
                "relative mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full",
                isPiutang
                  ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border-2 border-emerald-400/40"
                  : "bg-gradient-to-br from-rose-500/30 to-pink-500/20 border-2 border-rose-400/40"
              )}
            >
              {/* Pulsing rings */}
              {[0, 0.3].map((delay, idx) => (
                <motion.div
                  key={idx}
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    delay: 0.3 + delay,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className={cn(
                    "absolute inset-0 rounded-full border-2",
                    isPiutang ? "border-emerald-400" : "border-rose-400"
                  )}
                />
              ))}

              {/* Main icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              >
                {isPiutang ? (
                  <TrendingUp
                    size={48}
                    className="text-emerald-400"
                    strokeWidth={2.5}
                  />
                ) : (
                  <TrendingDown
                    size={48}
                    className="text-rose-400"
                    strokeWidth={2.5}
                  />
                )}
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl font-bold tracking-tight text-[#F1F5F9]"
            >
              {isPiutang ? "Piutang" : "Hutang"} Tercatat!
            </motion.p>

            {/* Amount */}
            <motion.p
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 260 }}
              className={cn(
                "mt-2 text-3xl font-black tabular-nums tracking-tight",
                isPiutang ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {formatRupiah(amount)}
            </motion.p>

            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="mt-3 flex items-center justify-center gap-1.5 text-sm text-[#64748B]"
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              Berhasil disimpan
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}