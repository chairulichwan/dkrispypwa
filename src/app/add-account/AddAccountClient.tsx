"use client"

import { type ChangeEvent, type FormEvent, type ReactNode, useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  Loader2,
  Search,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react"
import toast from "react-hot-toast"

import type { Database } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/client"
import { ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { ACCOUNT_STYLE } from "@/app/dashboard/types"

type BankListItem = {
  type: string
  label: string
  group: string
}

const BANK_LIST = [
  { type: "BCA", label: "BCA", group: "Bank Utama" },
  { type: "Mandiri", label: "Mandiri", group: "Bank Utama" },
  { type: "BNI", label: "BNI", group: "Bank Utama" },
  { type: "BRI", label: "BRI", group: "Bank Utama" },
  { type: "BSI", label: "BSI", group: "Bank Utama" },
  { type: "BTN", label: "BTN", group: "Bank Utama" },
  { type: "CIMB", label: "CIMB Niaga", group: "Bank Utama" },
  { type: "Danamon", label: "Danamon", group: "Bank Utama" },
  { type: "Permata", label: "Permata Bank", group: "Bank Utama" },
  { type: "Panin", label: "Panin Bank", group: "Bank Utama" },
  { type: "OCBC", label: "OCBC NISP", group: "Bank Utama" },
  { type: "Maybank", label: "Maybank Indonesia", group: "Bank Utama" },
  { type: "UOB", label: "UOB Indonesia", group: "Bank Utama" },
  { type: "HSBC", label: "HSBC Indonesia", group: "Bank Utama" },
  { type: "StandardChartered", label: "Standard Chartered", group: "Bank Utama" },
  { type: "Mega", label: "Bank Mega", group: "Bank Utama" },
  { type: "BTPN", label: "Bank BTPN", group: "Bank Utama" },
  { type: "Sinarmas", label: "Bank Sinarmas", group: "Bank Utama" },
  { type: "Muamalat", label: "Bank Muamalat", group: "Bank Utama" },
  { type: "Bukopin", label: "Bank Bukopin", group: "Bank Utama" },
  { type: "SeaBank", label: "SeaBank", group: "Bank Digital" },
  { type: "Jago", label: "Bank Jago", group: "Bank Digital" },
  { type: "Blu", label: "Blu by BCA Digital", group: "Bank Digital" },
  { type: "Jenius", label: "Jenius (BTPN)", group: "Bank Digital" },
  { type: "Neobank", label: "Bank Neo Commerce", group: "Bank Digital" },
  { type: "Allo", label: "Allo Bank", group: "Bank Digital" },
  { type: "Motion", label: "Motion Bank", group: "Bank Digital" },
  { type: "Superbank", label: "Superbank", group: "Bank Digital" },
  { type: "LineBank", label: "Line Bank Indonesia", group: "Bank Digital" },
  { type: "MegaSyariah", label: "Bank Mega Syariah", group: "Bank Syariah" },
  { type: "PaninSyariah", label: "Panin Dubai Syariah", group: "Bank Syariah" },
  { type: "BCASyariah", label: "BCA Syariah", group: "Bank Syariah" },
  { type: "BTPNSyariah", label: "BTPN Syariah", group: "Bank Syariah" },
  { type: "AladinSyariah", label: "Bank Aladin Syariah", group: "Bank Syariah" },
  { type: "BJBSyariah", label: "BJB Syariah", group: "Bank Syariah" },
  { type: "BJB", label: "Bank BJB", group: "Bank Daerah" },
  { type: "BankDKI", label: "Bank DKI", group: "Bank Daerah" },
  { type: "BankJateng", label: "Bank Jateng", group: "Bank Daerah" },
  { type: "BankJatim", label: "Bank Jatim", group: "Bank Daerah" },
  { type: "BankBanten", label: "Bank Banten", group: "Bank Daerah" },
  { type: "BankSumut", label: "Bank Sumut", group: "Bank Daerah" },
  { type: "BankSumbar", label: "Bank Nagari (Sumbar)", group: "Bank Daerah" },
  { type: "BankRiau", label: "Bank Riau Kepri", group: "Bank Daerah" },
  { type: "BankSumsel", label: "Bank Sumsel Babel", group: "Bank Daerah" },
  { type: "BankLampung", label: "Bank Lampung", group: "Bank Daerah" },
  { type: "BankKalbar", label: "Bank Kalbar", group: "Bank Daerah" },
  { type: "BankKaltim", label: "Bank Kaltimtara", group: "Bank Daerah" },
  { type: "BankKalsel", label: "Bank Kalsel", group: "Bank Daerah" },
  { type: "BankSulsel", label: "Bank Sulselbar", group: "Bank Daerah" },
  { type: "BankSulut", label: "Bank SulutGo", group: "Bank Daerah" },
  { type: "BankBali", label: "Bank BPD Bali", group: "Bank Daerah" },
  { type: "BankNTB", label: "Bank NTB", group: "Bank Daerah" },
  { type: "BankNTT", label: "Bank NTT", group: "Bank Daerah" },
  { type: "BankPapua", label: "Bank Papua", group: "Bank Daerah" },
  { type: "Citibank", label: "Citibank N.A.", group: "Bank Asing" },
  { type: "DeutscheBank", label: "Deutsche Bank AG", group: "Bank Asing" },
  { type: "BankOfChina", label: "Bank of China", group: "Bank Asing" },
  { type: "Mizuho", label: "Mizuho Bank", group: "Bank Asing" },
  { type: "SMBC", label: "Sumitomo Mitsui (SMBC)", group: "Bank Asing" },
  { type: "MUFG", label: "MUFG Bank", group: "Bank Asing" },
  { type: "KEBHana", label: "KEB Hana Bank", group: "Bank Asing" },
  { type: "Woori", label: "Woori Bank", group: "Bank Asing" },
  { type: "BPR", label: "BPR (Bank Perkreditan Rakyat)", group: "Bank Lainnya" },
  { type: "BPRS", label: "BPRS (Syariah)", group: "Bank Lainnya" },
  { type: "BankPensiun", label: "Bank Pensiunan (Mantap)", group: "Bank Lainnya" },
  { type: "BankKoperasi", label: "Bank Koperasi", group: "Bank Lainnya" },
  { type: "BankPembangunan", label: "Bank Pembangunan", group: "Bank Lainnya" },
] as const

type AccountTypeValue = Database["public"]["Tables"]["accounts"]["Insert"]["type"]
type FormStep = "category" | "subtype" | "details" | "success"

type CategoryConfig = {
  id: "tunai" | "rekening" | "ewallet" | "usaha"
  label: string
  icon: ReactNode
  color: string
  shadow: string
  subTypes: AccountTypeValue[]
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "tunai",
    label: "Tunai",
    icon: <Banknote size={24} />,
    color: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/30",
    subTypes: ["tunai"],
  },
  {
    id: "rekening",
    label: "Rekening Bank",
    icon: <Building2 size={24} />,
    color: "from-sky-500 to-blue-600",
    shadow: "shadow-sky-500/30",
    subTypes: BANK_LIST.map((bank) => bank.type),
  },
  {
    id: "ewallet",
    label: "E-Wallet & QRIS",
    icon: <Smartphone size={24} />,
    color: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/30",
    subTypes: ["gopay", "ovo", "grabfood", "shopeefood", "qris"],
  },
  {
    id: "usaha",
    label: "Usaha / Bisnis",
    icon: <Sparkles size={24} />,
    color: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/30",
    subTypes: ["toko", "online-shop", "freelance", "jasa", "kuliner", "usaha-lainnya"],
  },
]

interface FormData {
  type: AccountTypeValue | ""
  name: string
  balance: string
  account_number: string
  is_default: boolean
}

const FALLBACK_STYLE = {
  iconBg: "bg-sky-500/20",
  icon: <Building2 size={20} className="text-sky-400" />,
  gradient: "from-sky-500/10 to-blue-600/10",
  border: "border-sky-500/20",
  accentColor: "#0ea5e9",
  label: "Rekening Bank",
}

const formatRupiahInput = (value: string) => {
  const numeric = value.replace(/\D/g, "")
  return numeric ? new Intl.NumberFormat("id-ID").format(Number(numeric)) : ""
}

const parseRupiah = (value: string) => Number(value.replace(/\D/g, "")) || 0

const getBankStyle = (type: string) => {
  return ACCOUNT_STYLE[type] ?? FALLBACK_STYLE
}

const getSubtypeLabel = (type: string) => {
  return ACCOUNT_STYLE[type]?.label ?? BANK_LIST.find((bank) => bank.type === type)?.label ?? type
}

export default function AddAccountClient() {
  const router = useRouter()
  const supabase = createClient()
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [step, setStep] = useState<FormStep>("category")
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [bankSearch, setBankSearch] = useState("")
  const [formData, setFormData] = useState<FormData>({
    type: "",
    name: "",
    balance: "",
    account_number: "",
    is_default: false,
  })

  const isDetailsValid = useMemo(() => {
    return Boolean(formData.type && formData.name.trim().length >= 2 && parseRupiah(formData.balance) > 0)
  }, [formData])

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return BANK_LIST
    const query = bankSearch.toLowerCase()
    return BANK_LIST.filter((bank) => {
      return bank.label.toLowerCase().includes(query) || bank.type.toLowerCase().includes(query)
    })
  }, [bankSearch])

  const groupedBanks = useMemo(() => {
    const groups: Record<string, BankListItem[]> = {}

    filteredBanks.forEach((bank) => {
      if (!groups[bank.group]) groups[bank.group] = []
      groups[bank.group].push(bank)
    })

    return groups
  }, [filteredBanks])

  const selectedStyle = formData.type ? getBankStyle(formData.type) : null

  const handleCategorySelect = useCallback((category: CategoryConfig) => {
    setSelectedCategory(category)

    if (category.id === "tunai") {
      setFormData((prev) => ({ ...prev, type: "tunai" }))
      setStep("details")
      setTimeout(() => nameInputRef.current?.focus(), 250)
      return
    }

    setBankSearch("")
    setStep("subtype")

    if (category.id === "rekening") {
      setTimeout(() => searchInputRef.current?.focus(), 300)
    }
  }, [])

  const handleSubtypeSelect = useCallback((type: AccountTypeValue) => {
    setFormData((prev) => ({ ...prev, type }))
    setStep("details")
    setTimeout(() => nameInputRef.current?.focus(), 250)
  }, [])

  const handleBalanceChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, balance: formatRupiahInput(event.target.value) }))
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isDetailsValid || loading) return

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Sesi berakhir")
      }

      const payload: Database["public"]["Tables"]["accounts"]["Insert"] = {
        user_id: user.id,
        type: formData.type,
        name: formData.name.trim(),
        balance: parseRupiah(formData.balance),
        account_number: formData.account_number || null,
        is_default: formData.is_default,
      }

      const { error } = await (supabase.from("accounts") as any).insert(payload)
      if (error) throw error

      toast.success("Akun berhasil ditambahkan! 🎉")
      setStep("success")

      setTimeout(() => {
        ;(router as { refresh?: () => void }).refresh?.()
        router.push(ROUTES.dashboard)
      }, 1200)
    } catch (error: any) {
      toast.error(error?.message || "Gagal menambahkan akun")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="relative min-h-screen pb-10"
      style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #060b14 100%)" }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-[100px]" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-violet-500/20 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/[0.04] bg-[#060b14]/70 px-5 pb-4 pt-12 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (step === "category") {
                router.back()
                return
              }

              if (step === "subtype") {
                setBankSearch("")
                setStep("category")
                return
              }

              if (step === "details") {
                if (selectedCategory?.id === "tunai") {
                  setStep("category")
                } else {
                  setStep("subtype")
                }
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.06]"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} className="text-white" />
          </motion.button>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Tambah Akun</h1>
            <p className="text-[11px] text-slate-500">
              {step === "category" && "Pilih kategori akun"}
              {step === "subtype" && selectedCategory?.id === "rekening" && "Pilih bank"}
              {step === "subtype" && selectedCategory?.id === "ewallet" && "Pilih e-wallet"}
              {step === "subtype" && selectedCategory?.id === "usaha" && "Pilih jenis usaha"}
              {step === "details" && "Isi detail akun"}
              {step === "success" && "Berhasil!"}
            </p>
          </div>
        </div>

        {step !== "success" ? (
          <div className="mt-4 flex gap-1.5">
            {[0, 1, 2].map((index) => {
              const active =
                index === 0 ||
                (index === 1 && (step === "subtype" || step === "details")) ||
                (index === 2 && step === "details")

              return (
                <div
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-500",
                    active ? "bg-amber-400" : "bg-white/10"
                  )}
                />
              )
            })}
          </div>
        ) : null}
      </header>

      <div className="relative z-10 mt-6 px-5">
        <AnimatePresence mode="wait">
          {step === "category" ? (
            <motion.div
              key="category"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="space-y-3">
                {CATEGORIES.map((category, index) => (
                  <motion.button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 text-left backdrop-blur-xl"
                  >
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                        category.color,
                        category.shadow
                      )}
                    >
                      {category.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-white">{category.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {category.id === "tunai"
                          ? "Langsung isi detail"
                          : category.id === "rekening"
                            ? `${BANK_LIST.length} bank tersedia`
                            : `${category.subTypes.length} pilihan tersedia`}
                      </p>
                    </div>
                    {category.id !== "tunai" ? (
                      <ChevronRight size={18} className="text-slate-600 transition-colors group-hover:text-white" />
                    ) : null}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : null}

          {step === "subtype" && selectedCategory?.id === "rekening" ? (
            <motion.div
              key="bank-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={bankSearch}
                  onChange={(event) => setBankSearch(event.target.value)}
                  placeholder="Cari nama bank..."
                  className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] pl-11 pr-10 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-sky-400/40"
                />
                {bankSearch ? (
                  <button
                    onClick={() => setBankSearch("")}
                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/10"
                    aria-label="Hapus pencarian"
                  >
                    <X size={12} className="text-slate-400" />
                  </button>
                ) : null}
              </div>

              {filteredBanks.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-500">
                    Bank <span className="text-white">{bankSearch}</span> tidak ditemukan
                  </p>
                  <p className="mt-1 text-xs text-slate-600">Coba kata kunci lain</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {Object.entries(groupedBanks).map(([group, banks]) => (
                    <div key={group}>
                      {!bankSearch ? (
                        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                          {group}
                        </p>
                      ) : null}
                      <div className="space-y-2">
                        {banks.map((bank, index) => {
                          const style = getBankStyle(bank.type)

                          return (
                            <motion.button
                              key={bank.type}
                              onClick={() => handleSubtypeSelect(bank.type)}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              whileTap={{ scale: 0.98 }}
                              className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all hover:border-sky-500/30 hover:bg-white/[0.06]"
                            >
                              <div
                                className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08]",
                                  style.iconBg
                                )}
                              >
                                {style.icon}
                              </div>
                              <span className="flex-1 text-left text-sm font-semibold text-white">
                                {bank.label}
                              </span>
                              <ChevronRight size={14} className="text-slate-600 transition-colors group-hover:text-slate-400" />
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : null}

          {step === "subtype" && selectedCategory?.id === "ewallet" ? (
            <motion.div
              key="ewallet-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="grid grid-cols-3 gap-3">
                {selectedCategory.subTypes.map((type, index) => {
                  const style = getBankStyle(type)
                  return (
                    <motion.button
                      key={type}
                      onClick={() => handleSubtypeSelect(type)}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.04 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "aspect-square rounded-2xl border bg-gradient-to-br p-3 backdrop-blur-xl transition-all",
                        style.gradient,
                        style.border
                      )}
                    >
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08]", style.iconBg)}>
                          {style.icon}
                        </div>
                        <span className="text-[11px] font-bold text-white">{style.label}</span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : null}

          {step === "subtype" && selectedCategory?.id === "usaha" ? (
            <motion.div
              key="usaha-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <p className="mb-4 px-1 text-sm text-slate-400">Pilih jenis usaha kamu</p>
              <div className="grid grid-cols-2 gap-3">
                {selectedCategory.subTypes.map((type, index) => {
                  const style = getBankStyle(type)
                  return (
                    <motion.button
                      key={type}
                      onClick={() => handleSubtypeSelect(type)}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "group aspect-[4/3] rounded-2xl border bg-gradient-to-br p-4 text-left backdrop-blur-xl transition-all",
                        style.gradient,
                        style.border
                      )}
                    >
                      <div className="flex h-full flex-col justify-between gap-2">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08]", style.iconBg)}>
                          {style.icon}
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-white">{style.label}</span>
                          <span className="text-[10px] text-slate-500">
                            Kelola keuangan {style.label.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : null}

          {step === "details" && selectedStyle ? (
            <motion.form
              key="details"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div className={cn("relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 backdrop-blur-xl", selectedStyle.gradient, selectedStyle.border)}>
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-3xl"
                  style={{ background: selectedStyle.accentColor }}
                />
                <div className="relative flex items-center gap-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08]", selectedStyle.iconBg)}>
                    {selectedStyle.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      {selectedStyle.label}
                    </p>
                    <p className="truncate font-bold text-white">{formData.name || getSubtypeLabel(String(formData.type))}</p>
                  </div>
                  <Check size={18} className="shrink-0 text-emerald-400" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Nama Akun
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Contoh: Tabungan Utama"
                  maxLength={40}
                  className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-white outline-none transition-all placeholder:text-slate-600 focus:border-amber-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                  Saldo Awal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.balance}
                    onChange={handleBalanceChange}
                    placeholder="0"
                    className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-12 pr-4 text-xl font-black tabular-nums text-white outline-none transition-all placeholder:text-base placeholder:font-normal placeholder:text-slate-700 focus:border-amber-400/40"
                  />
                </div>
              </div>

              {formData.type !== "tunai" ? (
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Nomor {typeof formData.type === "string" && ["gopay", "ovo", "qris"].includes(formData.type) ? "Telepon" : "Rekening"}
                    <span className="ml-1 normal-case font-normal text-slate-600">(opsional)</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formData.account_number}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        account_number: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                    placeholder="0000000000"
                    maxLength={20}
                    className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 font-mono tracking-wider text-white outline-none transition-all placeholder:tracking-normal placeholder:text-slate-600 focus:border-amber-400/40"
                  />
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(event) => setFormData((prev) => ({ ...prev, is_default: event.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-amber-400 focus:ring-amber-400"
                />
                <div>
                  <p className="text-sm font-semibold text-white">Jadikan akun utama</p>
                  <p className="text-[11px] text-slate-500">Akun ini diprioritaskan saat pemilihan default.</p>
                </div>
              </label>

              <motion.button
                type="submit"
                disabled={!isDetailsValid || loading}
                whileTap={isDetailsValid && !loading ? { scale: 0.98 } : {}}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition-all",
                  isDetailsValid && !loading
                    ? "border-amber-400/30 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white shadow-[0_10px_30px_rgba(245,158,11,0.35)]"
                    : "cursor-not-allowed border-white/[0.06] bg-white/[0.04] text-slate-600"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Tambah Akun
                  </>
                )}
              </motion.button>
            </motion.form>
          ) : null}

          {step === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_20px_60px_rgba(16,185,129,0.4)]"
              >
                <Check size={40} className="text-white" strokeWidth={3} />
              </motion.div>
              <h2 className="mt-8 text-2xl font-black text-white">Akun Ditambahkan!</h2>
              <p className="mt-2 text-sm text-slate-400">Mengalihkan ke dashboard...</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  )
}
