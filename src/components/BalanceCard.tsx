//src/components/BalanceCard.tsx
"use client"

import { useRef, useState } from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"
import { Eye, EyeOff, RefreshCw, TrendingUp, Users } from "lucide-react"
import { formatRupiah } from "@/lib/utils"

interface BalanceCardProps {
  totalWealth: number
  walletTotal: number
  piutang: number
  onSync?: () => void
  isSyncing?: boolean
}

export default function BalanceCard({
  totalWealth,
  walletTotal,
  piutang,
  onSync,
  isSyncing = false,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 })

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return

    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    rotateY.set(((event.clientX - centerX) / rect.width) * 10)
    rotateX.set(-((event.clientY - centerY) / rect.height) * 10)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
  }

  const maskedAmount = hidden ? "••••••••" : formatRupiah(totalWealth)

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        background: "linear-gradient(135deg, #1e3a5f 0%, #0f2442 40%, #0a1628 100%)",
      }}
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
      className="relative overflow-hidden rounded-[28px] p-6 mx-0 cursor-default select-none"
    >
      <motion.div
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent skew-x-12 pointer-events-none"
      />

      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full border border-amber-400/10 pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full border border-amber-400/[0.07] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase mb-1">Total Saldo</p>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setHidden((prev) => !prev)}
              className="w-8 h-8 rounded-xl bg-white/[0.07] border border-white/[0.08] flex items-center justify-center"
              aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            >
              {hidden ? (
                <EyeOff size={13} className="text-slate-400" />
              ) : (
                <Eye size={13} className="text-slate-400" />
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-white/[0.07] border border-white/[0.08] disabled:opacity-50"
              aria-label="Sinkronkan data"
            >
              <RefreshCw size={11} className={`text-slate-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase hidden sm:block">
                {isSyncing ? "..." : "Sync"}
              </span>
            </motion.button>
          </div>
        </div>

        <motion.div
          key={totalWealth}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-9"
        >
          <p className="text-[24px] font-black text-white tracking-tight leading-none">{maskedAmount}</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "E-Wallet",
              value: hidden ? "••••" : formatRupiah(walletTotal),
              icon: <TrendingUp size={11} />,
              color: "text-sky-400",
            },
            {
              label: "Piutang",
              value: hidden ? "••••" : formatRupiah(piutang),
              icon: <Users size={11} />,
              color: "text-amber-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/[0.05] border border-white/[0.07] p-3.5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className={stat.color}>{stat.icon}</span>
                <p className="text-[9px] font-bold tracking-[0.18em] text-slate-500 uppercase">{stat.label}</p>
              </div>
              <p className="text-[16px] font-black text-white tracking-tight leading-none">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

