//src/components/dashboard/analytics/components/AddAssetSheet.tsx

"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, ChevronDown, Loader2, Plus, X } from "lucide-react"
import toast from "react-hot-toast"

import type { Database } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface AddAssetSheetProps {
  userId: string
  open: boolean
  onClose: () => void
  onSaved?: () => Promise<void> | void
}

const ASSET_CATEGORIES = [
  { id: "bank", label: "Bank / Tabungan", icon: "🏦" },
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "investasi", label: "Investasi", icon: "📈" },
  { id: "saham", label: "Saham", icon: "📊" },
  { id: "crypto", label: "Crypto", icon: "₿" },
  { id: "properti", label: "Properti", icon: "🏠" },
  { id: "kendaraan", label: "Kendaraan", icon: "🚗" },
  { id: "emas", label: "Emas", icon: "🥇" },
  { id: "lainnya", label: "Lainnya", icon: "💎" },
] as const

function parseRupiah(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "")
  return cleaned ? Number(cleaned) : 0
}

function formatInputRupiah(value: string): string {
  const number = parseRupiah(value)
  if (!number) return ""
  return new Intl.NumberFormat("id-ID").format(number)
}

export default function AddAssetSheet({
  userId,
  open,
  onClose,
  onSaved,
}: AddAssetSheetProps) {
  const supabase = useMemo(() => createClient(), [])

  const [name, setName] = useState("")
  const [category, setCategory] = useState<(typeof ASSET_CATEGORIES)[number]["id"]>("bank")
  const [value, setValue] = useState("")
  const [note, setNote] = useState("")
  const [showCategories, setShowCategories] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedCategory =
    ASSET_CATEGORIES.find((item) => item.id === category) ?? ASSET_CATEGORIES[0]

  const numericValue = parseRupiah(value)
  const canSubmit = name.trim().length >= 2 && numericValue > 0 && !saving

  const reset = () => {
    setName("")
    setCategory("bank")
    setValue("")
    setNote("")
    setShowCategories(false)
  }

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSave = async () => {
    if (!canSubmit) return

    setSaving(true)

    try {
      const payload: Database["public"]["Tables"]["assets"]["Insert"] = {
        user_id: userId,
        name: name.trim(),
        type: category,
        current_value: numericValue,
        description: note.trim() || null,
      }

      const { error } = await (supabase.from("assets") as any).insert(payload)

      if (error) throw error

      toast.success("Aset berhasil ditambahkan", {
        style: {
          background: "#0B1120",
          color: "#F1F5F9",
          border: "1px solid rgba(34,211,238,0.35)",
        },
      })

      await onSaved?.()
      reset()
      onClose()
    } catch (error) {
      console.error("[AddAssetSheet] Save error:", error)
      toast.error("Gagal menambahkan aset")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md overflow-hidden rounded-[32px] border border-white/[0.09] bg-[#07111F]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Tambah aset"
          >
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
            <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />

            <div className="relative p-5">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />

              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2">
                      <Plus className="h-4 w-4 text-cyan-300" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-[#F1F5F9]">
                      Tambah Aset
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-[#64748B]">
                    Aset akan langsung masuk ke Net Worth dan alokasi aset.
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  disabled={saving}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-2.5 text-[#94A3B8] transition-all hover:bg-white/[0.08] disabled:opacity-50"
                  aria-label="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Nama Aset
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Contoh: Tabungan BCA"
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-semibold text-[#F1F5F9] outline-none transition-all placeholder:text-[#475569] focus:border-cyan-400/35 focus:bg-white/[0.065]"
                    autoFocus
                  />
                </label>

                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Kategori
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCategories((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-left transition-all hover:bg-white/[0.065]"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#F1F5F9]">
                      <span className="text-base">{selectedCategory.icon}</span>
                      {selectedCategory.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[#64748B] transition-transform",
                        showCategories && "rotate-180"
                      )}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {showCategories ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 grid grid-cols-2 gap-2 rounded-3xl border border-white/[0.06] bg-white/[0.03] p-2">
                          {ASSET_CATEGORIES.map((item) => {
                            const active = item.id === category
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setCategory(item.id)
                                  setShowCategories(false)
                                }}
                                className={cn(
                                  "flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-bold transition-all",
                                  active
                                    ? "border-cyan-400/25 bg-cyan-400/12 text-cyan-200"
                                    : "border-transparent bg-white/[0.025] text-[#94A3B8] hover:bg-white/[0.05]"
                                )}
                              >
                                <span>{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Nilai Aset
                  </span>
                  <div className="flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 transition-all focus-within:border-cyan-400/35 focus-within:bg-white/[0.065]">
                    <span className="mr-2 text-sm font-black text-cyan-300">Rp</span>
                    <input
                      value={value}
                      onChange={(event) => setValue(formatInputRupiah(event.target.value))}
                      inputMode="numeric"
                      placeholder="25.000.000"
                      className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold tabular-nums text-[#F1F5F9] outline-none placeholder:text-[#475569]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Catatan Opsional
                  </span>
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: saldo per hari ini"
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-semibold text-[#F1F5F9] outline-none transition-all placeholder:text-[#475569] focus:border-cyan-400/35 focus:bg-white/[0.065]"
                  />
                </label>
              </div>

              <div className="mt-5 grid grid-cols-[1fr_1.4fr] gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm font-bold text-[#94A3B8] transition-all hover:bg-white/[0.07] disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSubmit}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-black text-white shadow-xl shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Simpan Aset
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
