"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, ChevronLeft, Plus, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ROUTES } from "@/lib/routes"
import { cn, formatRupiah, formatRupiahCompact } from "@/lib/utils"
import AddDebtSheet from "./components/AddDebtSheet"
import DebtCard from "./components/DebtCard"
import EditDebtSheet from "./components/EditDebtSheet"
import PaymentSheet from "./components/PaymentSheet"
import type { DebtAccountItem, DebtCardData, DebtContactItem } from "./types"

interface Props {
  userId: string
  debts: DebtCardData[]
  accounts: DebtAccountItem[]
  contacts: DebtContactItem[]
}

type FilterType = "semua" | "piutang" | "hutang" | "lunas"

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "semua", label: "Aktif" },
  { id: "piutang", label: "Piutang" },
  { id: "hutang", label: "Hutang" },
  { id: "lunas", label: "Lunas" },
]

const triggerHaptic = (style: "light" | "medium" | "success" = "light") => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const patterns = { light: 8, medium: 15, success: [10, 50, 10] }
    navigator.vibrate(patterns[style])
  }
}

const getDebtOutstanding = (debt: DebtCardData) => {
  const totalAmountDue = Number(debt.total_amount_due) || Number(debt.amount) || 0
  const paidAmount = Number(debt.paid_amount) || 0
  return Math.max(0, totalAmountDue - paidAmount)
}

export default function DebtsClient({
  userId,
  debts: initialDebts,
  accounts,
  contacts,
}: Props) {
  const router = useRouter()

  const [debts, setDebts] = useState(initialDebts)
  const [filter, setFilter] = useState<FilterType>("semua")
  const [search, setSearch] = useState("")
  const [selectedDebt, setSelectedDebt] = useState<DebtCardData | null>(null)
  const [selectedDebtForEdit, setSelectedDebtForEdit] = useState<DebtCardData | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    setDebts(initialDebts)
  }, [initialDebts])

  const totalPiutang = useMemo(
    () =>
      debts
        .filter((debt) => debt.type === "piutang" && debt.status === "aktif")
        .reduce((sum, debt) => sum + getDebtOutstanding(debt), 0),
    [debts]
  )

  const totalHutang = useMemo(
    () =>
      debts
        .filter((debt) => debt.type === "hutang" && debt.status === "aktif")
        .reduce((sum, debt) => sum + getDebtOutstanding(debt), 0),
    [debts]
  )

  const totalLunas = useMemo(
    () => debts.filter((debt) => debt.status === "lunas").length,
    [debts]
  )

  const filteredDebts = useMemo(
    () =>
      debts.filter((debt) => {
        if (filter === "piutang" && debt.type !== "piutang") return false
        if (filter === "hutang" && debt.type !== "hutang") return false
        if (filter === "lunas" && debt.status !== "lunas") return false
        if (filter === "semua" && debt.status === "lunas") return false
        if (
          search.trim() &&
          !debt.contacts.name.toLowerCase().includes(search.toLowerCase())
        ) {
          return false
        }
        return true
      }),
    [debts, filter, search]
  )

  const handlePaymentSuccess = async ({
    debtId,
    paidAmount,
    paidPrincipal,
    paidInterest,
    outstandingAmount,
  }: {
    debtId: string
    paidAmount: number
    paidPrincipal: number
    paidInterest: number
    outstandingAmount?: number
  }) => {
    triggerHaptic("success")

    setDebts((prev) =>
      prev.map((debt) => {
        if (debt.id !== debtId) return debt

        const nextPaidAmount = (Number(debt.paid_amount) || 0) + paidAmount
        const nextPaidPrincipal =
          (Number(debt.paid_principal) || 0) + paidPrincipal
        const nextPaidInterest =
          (Number(debt.paid_interest) || 0) + paidInterest
        const totalAmountDue =
          Number(debt.total_amount_due) || Number(debt.amount) || 0
        const nextOutstanding =
          outstandingAmount ?? Math.max(0, totalAmountDue - nextPaidAmount)

        return {
          ...debt,
          paid_amount: nextPaidAmount,
          paid_principal: nextPaidPrincipal,
          paid_interest: nextPaidInterest,
          status: nextOutstanding <= 0 ? "lunas" : "aktif",
        }
      })
    )

    router.refresh()
  }

  const handleCreateSuccess = async () => {
    triggerHaptic("success")
    router.refresh()
  }

  const handleEditSaved = async () => {
    triggerHaptic("success")
    setSelectedDebtForEdit(null)
    router.refresh()
  }

  const handleOpenEdit = (debt: DebtCardData) => {
    setSelectedDebtForEdit(debt)
  }

  return (
    <main
      className="relative min-h-screen"
      style={{
        background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-20 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <header
        className="fixed left-0 right-0 top-0 z-40 overflow-hidden rounded-b-[2rem] border-b border-white/[0.04] bg-[#0B1120]/95 px-5 backdrop-blur-2xl"
        style={{
          paddingTop: "max(3.5rem, env(safe-area-inset-top))",
          paddingBottom: "12px",
        }}
      >
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <div className="mb-4 flex items-center gap-3">
          <Link
            href={ROUTES.dashboard}
            onClick={() => triggerHaptic("light")}
            aria-label="Kembali ke dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] transition-all active:scale-95"
          >
            <ChevronLeft size={18} className="text-[#F1F5F9]" />
          </Link>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#F1F5F9]">
              Hutang &amp; Piutang
            </h1>
            <p className="text-[11px] text-[#64748B]">Catatan pinjaman</p>
          </div>

          <button
            onClick={() => {
              triggerHaptic("medium")
              setShowAdd(true)
            }}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/20 shadow-lg shadow-violet-900/30 transition-all active:scale-95"
            aria-label="Tambah hutang/piutang"
          >
            <Plus size={20} className="text-violet-400" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.04] bg-[#151E32] p-3">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-rose-400">
              Hutang
            </p>
            <p
              className="truncate text-sm font-black tabular-nums text-[#F1F5F9]"
              title={formatRupiah(totalHutang)}
            >
              {formatRupiahCompact(totalHutang)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.04] bg-[#151E32] p-3">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              Piutang
            </p>
            <p
              className="truncate text-sm font-black tabular-nums text-[#F1F5F9]"
              title={formatRupiah(totalPiutang)}
            >
              {formatRupiahCompact(totalPiutang)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Lunas
            </p>
            <p className="text-sm font-black tabular-nums text-[#F1F5F9]">
              {totalLunas}{" "}
              <span className="text-[10px] font-medium text-[#64748B]">item</span>
            </p>
          </div>
        </div>

        <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic("light")
                setFilter(item.id)
              }}
              className={cn(
                "shrink-0 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95",
                filter === item.id
                  ? "border-violet-400/30 bg-violet-500/20 text-violet-400"
                  : "border-white/[0.06] bg-white/[0.03] text-[#64748B] hover:text-[#94A3B8]"
              )}
              aria-pressed={filter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative mt-2 h-11">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama kontak..."
            className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#151E32] pl-10 pr-4 text-sm text-[#F1F5F9] outline-none transition-all placeholder:text-[#475569] focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20"
          />
        </div>
      </header>

      <div style={{ height: "13.25rem" }} aria-hidden="true" />

      <div
        className="relative z-10 space-y-6 px-5 pb-32 transition-all"
        style={{ paddingTop: "max(6rem, calc(env(safe-area-inset-top) + 5.5rem))" }}
      >
        <AnimatePresence mode="wait">
          {filteredDebts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.06] bg-[#151E32] shadow-lg"
              >
                <CheckCircle2 size={32} className="text-[#64748B]" />
              </motion.div>
              <h2 className="mb-2 text-lg font-bold tracking-tight text-[#F1F5F9]">
                Belum ada catatan
              </h2>
              <p className="mb-6 max-w-xs text-sm text-[#64748B]">
                Tambahkan hutang atau piutang baru untuk mulai melacak pembayaran.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredDebts.map((debt, index) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  index={index}
                  onClick={setSelectedDebt}
                  onEdit={handleOpenEdit}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <AddDebtSheet
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleCreateSuccess}
        contacts={contacts}
        accounts={accounts}
        userId={userId}
      />

      <PaymentSheet
        debt={selectedDebt}
        isOpen={!!selectedDebt}
        onClose={() => {
          triggerHaptic("light")
          setSelectedDebt(null)
        }}
        onSuccess={handlePaymentSuccess}
        accounts={accounts}
        userId={userId}
      />

      <EditDebtSheet
        debt={selectedDebtForEdit}
        isOpen={!!selectedDebtForEdit}
        onClose={() => setSelectedDebtForEdit(null)}
        onSaved={handleEditSaved}
        contacts={contacts}
        accounts={accounts}
        userId={userId}
      />
    </main>
  )
}