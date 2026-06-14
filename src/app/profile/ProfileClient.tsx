//src/app/profile/ProfileClient.tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  AtSign,
  ChevronLeft,
  Check,
  Loader2,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  Trash2,
  User,
  Wallet,
  Activity,
  Star,
} from "lucide-react"
import toast from "react-hot-toast"

import BottomNav from "@/components/BottomNav"
import { ROUTES } from "@/lib/routes"
import { createClient } from "@/lib/supabase/client"

interface Profile {
  id: string
  email: string
  username: string
  full_name: string | null
  phone: string | null
}

interface Props {
  userId: string
  email: string
  profile: Profile | null
  totalBalance: number
  totalTransactions: number
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}M`
  }
  if (amount >= 1_000_000) {
    return `Rp${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}Jt`
  }
  if (amount >= 1_000) {
    return `Rp${Math.round(amount / 1_000)}rb`
  }
  return `Rp${amount.toLocaleString("id-ID")}`
}

const toastSuccess = {
  style: {
    background: "#041528",
    color: "#b8dff7",
    border: "1px solid #0d3566",
  },
}

const toastError = {
  style: {
    background: "#041528",
    color: "#b8dff7",
    border: "1px solid #7f1d1d",
  },
}

function Field({
  label,
  value,
  icon,
  editable,
  placeholder,
  onChange,
  error,
  inputMode,
}: {
  label: string
  value: string
  icon: React.ReactNode
  editable: boolean
  placeholder?: string
  onChange?: (value: string) => void
  error?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}) {
  return (
    <div
      className="flex items-center gap-3 border-t px-4 py-3.5"
      style={{ borderColor: "rgba(100,180,255,0.08)" }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
        style={{
          background: "rgba(26,110,201,0.15)",
          color: "#4f9bd4",
        }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="mb-1 font-bold uppercase"
          style={{
            fontSize: 10,
            color: "#3a6080",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </p>

        {editable ? (
          <input
            type="text"
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            placeholder={placeholder}
            inputMode={inputMode}
            className="w-full bg-transparent text-sm font-semibold outline-none"
            style={{ color: error ? "#f07070" : "#f0f8ff" }}
          />
        ) : (
          <p
            className="truncate text-sm font-semibold"
            style={{ color: value ? "#f0f8ff" : "#3a6080" }}
          >
            {value || "—"}
          </p>
        )}

        {error ? (
          <p className="mt-1 text-[10px] font-medium" style={{ color: "#f07070" }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p
        className="mb-1.5 pl-1 font-bold uppercase"
        style={{
          fontSize: 11,
          color: "#3a6080",
          letterSpacing: "0.8px",
        }}
      >
        {label}
      </p>
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "rgba(10,30,60,0.85)",
          border: "0.5px solid rgba(100,180,255,0.08)",
          backdropFilter: "blur(16px)",
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = "neutral",
  disabled,
  loading,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: "neutral" | "danger"
  disabled?: boolean
  loading?: boolean
}) {
  const palette =
    variant === "danger"
      ? {
          bg: "rgba(240,80,80,0.06)",
          border: "rgba(240,80,80,0.15)",
          iconBg: "rgba(240,80,80,0.10)",
          iconColor: "#f07070",
          text: "#f07070",
        }
      : {
          bg: "rgba(10,30,60,0.85)",
          border: "rgba(100,180,255,0.08)",
          iconBg: "rgba(26,110,201,0.15)",
          iconColor: "#4f9bd4",
          text: "#f0f8ff",
        }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 transition-all"
      style={{
        background: palette.bg,
        border: `0.5px solid ${palette.border}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: palette.iconBg, color: palette.iconColor }}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      </div>

      <span
        className="flex-1 text-left text-sm font-semibold"
        style={{ color: palette.text }}
      >
        {label}
      </span>
    </motion.button>
  )
}

export default function ProfileClient({
  userId,
  email,
  profile,
  totalBalance,
  totalTransactions,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    username: profile?.username ?? "",
    phone: profile?.phone ?? "",
  })

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? "",
      username: profile.username ?? "",
      phone: profile.phone ?? "",
    })
  }, [profile])

  const displayName = useMemo(() => {
    return profile?.full_name?.trim() || profile?.username?.trim() || email.split("@")[0] || "User"
  }, [profile, email])

  const initials = displayName.slice(0, 2).toUpperCase()

  const validate = useCallback(() => {
    const nextErrors: Record<string, string> = {}

    if (!form.username.trim()) {
      nextErrors.username = "Username wajib diisi"
    } else if (form.username.trim().length < 3) {
      nextErrors.username = "Minimal 3 karakter"
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
      nextErrors.username = "Hanya huruf, angka, dan _"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [form.username])

  useEffect(() => {
    if (isEditing) validate()
  }, [form.username, isEditing, validate])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setErrors({})
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? "",
      username: profile.username ?? "",
      phone: profile.phone ?? "",
    })
  }, [profile])

  const handleSave = useCallback(async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name.trim() || null,
        username: form.username.trim().toLowerCase(),
        phone: form.phone.trim() || null,
      }

      const { error } = await (supabase.from("profiles") as any)
        .update(payload)
        .eq("id", userId)

      if (error) throw error

      toast.success("Profil disimpan! ✓", toastSuccess)
      setIsEditing(false)
      setErrors({})
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan profil", toastError)
    } finally {
      setSaving(false)
    }
  }, [form, router, supabase, userId, validate])

  const handleLogout = useCallback(async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.replace(ROUTES.login)
    } catch {
      toast.error("Gagal logout", toastError)
    } finally {
      setLoggingOut(false)
    }
  }, [router, supabase])

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== "HAPUS") {
      toast.error('Ketik "HAPUS" untuk konfirmasi', toastError)
      return
    }

    setDeletingAccount(true)
    try {
      toast("Fitur hapus akun akan segera tersedia", {
        icon: "⚠️",
        style: {
          background: "#041528",
          color: "#b8dff7",
          border: "1px solid rgba(240,80,80,0.18)",
        },
      })
      setShowDeleteConfirm(false)
      setDeleteConfirmText("")
    } finally {
      setDeletingAccount(false)
    }
  }, [deleteConfirmText])

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 600)
  }, [isRefreshing, router])

  if (!profile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#020b18" }}
      >
        <Loader2 className="animate-spin" size={28} style={{ color: "#7dc4f0" }} />
      </div>
    )
  }

  const stats = [
    {
      icon: <Activity size={14} />,
      value: totalTransactions.toLocaleString("id-ID"),
      label: "Transaksi",
    },
    {
      icon: <Wallet size={14} />,
      value: formatRupiahShort(totalBalance),
      label: "Total Saldo",
      tooltip: formatRupiah(totalBalance),
    },
    {
      icon: <Star size={14} />,
      value: "Level 3",
      label: "Status",
    },
  ]

  return (
    <main
      className="min-h-screen pb-32"
      style={{
        background: "linear-gradient(175deg,#041525 0%,#020b18 40%,#031020 100%)",
      }}
    >
      <AnimatePresence>
        {isRefreshing ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-0 right-0 top-0 z-50 flex justify-center pt-24"
          >
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 shadow-xl"
              style={{
                background: "rgba(10,30,60,0.95)",
                border: "0.5px solid rgba(100,180,255,0.1)",
                backdropFilter: "blur(12px)",
              }}
            >
              <RefreshCw size={14} className="animate-spin" style={{ color: "#7dc4f0" }} />
              <span className="text-xs font-bold" style={{ color: "#f0f8ff" }}>
                Memuat...
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header
        className="fixed left-0 right-0 top-0 z-50 overflow-hidden rounded-b-[2rem] px-5"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          background: "rgba(4,21,40,0.95)",
          borderBottom: "0.5px solid rgba(100,180,255,0.08)",
          paddingTop: "max(3.5rem, env(safe-area-inset-top))",
          paddingBottom: "17px",
        }}
      >
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(100,180,255,0.1)] to-transparent" />

        <div className="flex items-center justify-between py-2">
          <Link
            href={ROUTES.dashboard}
            aria-label="Kembali ke dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "rgba(15,40,75,0.7)",
              border: "0.5px solid rgba(100,180,255,0.15)",
              color: "#7dc4f0",
            }}
          >
            <ChevronLeft size={18} />
          </Link>

          <h1 className="text-[17px] font-bold tracking-tight" style={{ color: "#f0f8ff" }}>
            Profil Saya
          </h1>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsEditing(true)}
                className="rounded-full px-4 py-2 text-sm font-semibold"
                style={{
                  background: "rgba(26,110,201,0.2)",
                  border: "0.5px solid rgba(26,110,201,0.4)",
                  color: "#7dc4f0",
                }}
              >
                Edit
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(15,40,75,0.7)",
                    border: "0.5px solid rgba(100,180,255,0.15)",
                    color: "#4f9bd4",
                  }}
                >
                  Batal
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleSave}
                  disabled={saving || Object.keys(errors).length > 0}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"
                  style={{
                    background:
                      saving || Object.keys(errors).length > 0
                        ? "rgba(15,40,75,0.7)"
                        : "linear-gradient(135deg,#1a6ec9,#0099ee)",
                    color:
                      saving || Object.keys(errors).length > 0 ? "#3a6080" : "#fff",
                    cursor:
                      saving || Object.keys(errors).length > 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {saving ? "Meny..." : "Simpan"}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </header>

      <div
        className="relative z-10 space-y-6 px-5"
        style={{
          paddingTop: "max(9rem, calc(env(safe-area-inset-top) + 6rem))",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex flex-col items-center py-2">
          <div className="mb-4">
            <div
              className="rounded-3xl p-[2px]"
              style={{
                background: "linear-gradient(135deg,#0a3060,#0d4a8a,#1a6ec9)",
                boxShadow:
                  "0 0 0 1px rgba(100,180,255,0.15),0 8px 32px rgba(10,48,96,0.6)",
              }}
            >
              <div
                className="flex h-24 w-24 items-center justify-center rounded-[26px]"
                style={{ background: "linear-gradient(135deg,#0a2240,#0d3566)" }}
              >
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: "#7dc4f0",
                    letterSpacing: -1,
                  }}
                >
                  {initials}
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-[22px] font-black tracking-tight" style={{ color: "#f0f8ff" }}>
            {displayName}
          </h2>
          <p className="mt-1 text-[13px] font-medium" style={{ color: "#4f9bd4" }}>
            @{profile.username || "—"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {stats.map(({ icon, value, label, tooltip }) => (
            <motion.div
              key={label}
              whileTap={{ scale: 0.95 }}
              title={tooltip}
              className="cursor-pointer rounded-2xl p-3 text-center transition-all"
              style={{
                background: "rgba(10,30,60,0.85)",
                border: "0.5px solid rgba(100,180,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="mb-1 flex justify-center" style={{ color: "#4f9bd4" }}>
                {icon}
              </div>
              <div
                className="truncate text-[14px] font-bold tracking-tight"
                style={{ color: "#b8dff7" }}
              >
                {value}
              </div>
              <div
                className="mt-0.5 text-[9px] font-semibold uppercase"
                style={{
                  color: "#3a6080",
                  letterSpacing: "0.5px",
                }}
              >
                {label}
              </div>
            </motion.div>
          ))}
        </div>

        <Section label="Informasi Pribadi">
          <Field
            label="Nama Lengkap"
            value={form.full_name}
            editable={isEditing}
            placeholder="Nama lengkap"
            onChange={(value) => setForm((prev) => ({ ...prev, full_name: value }))}
            icon={<User size={16} />}
          />

          <Field
            label="Username"
            value={form.username}
            editable={isEditing}
            placeholder="username"
            onChange={(value) =>
              setForm((prev) => ({ ...prev, username: value.toLowerCase() }))
            }
            error={errors.username}
            icon={<AtSign size={16} />}
          />

          <Field
            label="Email"
            value={email}
            editable={false}
            icon={<Mail size={16} />}
          />

          <Field
            label="Nomor HP"
            value={form.phone}
            editable={isEditing}
            placeholder="08xxxxxxxxxx"
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            inputMode="tel"
            icon={<Phone size={16} />}
          />
        </Section>

        <Section label="Akun">
          <button
            onClick={() => router.push("/profile/security")}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{
                background: "rgba(26,110,201,0.15)",
                color: "#4f9bd4",
              }}
            >
              <Shield size={16} />
            </div>
            <span className="flex-1 text-sm font-semibold" style={{ color: "#f0f8ff" }}>
              Keamanan & Password
            </span>
          </button>
        </Section>

        <div className="space-y-2.5">
          <ActionButton
            icon={<RefreshCw size={18} />}
            label={isRefreshing ? "Menyegarkan..." : "Refresh Data"}
            onClick={handleRefresh}
            loading={isRefreshing}
          />

          <ActionButton
            icon={<LogOut size={18} />}
            label={loggingOut ? "Keluar..." : "Keluar dari Akun"}
            onClick={handleLogout}
            loading={loggingOut}
            disabled={loggingOut}
          />

          <ActionButton
            icon={<Trash2 size={18} />}
            label="Hapus Akun Permanen"
            onClick={() => setShowDeleteConfirm(true)}
            variant="danger"
          />
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deletingAccount && setShowDeleteConfirm(false)}
              className="fixed inset-0 z-50"
              style={{
                background: "rgba(2,11,24,0.85)",
                backdropFilter: "blur(12px)",
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-x-5 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2"
            >
              <div
                className="rounded-3xl p-6"
                style={{
                  background: "rgba(7,31,58,0.97)",
                  border: "0.5px solid rgba(100,180,255,0.12)",
                  backdropFilter: "blur(24px)",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                }}
              >
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background: "rgba(240,80,80,0.1)",
                    border: "0.5px solid rgba(240,80,80,0.2)",
                  }}
                >
                  <AlertTriangle size={26} style={{ color: "#f07070" }} />
                </div>

                <h3
                  className="mb-2 text-center text-[17px] font-bold"
                  style={{ color: "#f0f8ff" }}
                >
                  Hapus Akun?
                </h3>

                <p
                  className="mb-4 text-center text-[13px] leading-relaxed"
                  style={{ color: "#4f9bd4" }}
                >
                  Semua data akan hilang permanen. Ketik{" "}
                  <span style={{ color: "#f0f8ff", fontWeight: 700 }}>HAPUS</span>{" "}
                  untuk konfirmasi.
                </p>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="HAPUS"
                  className="mb-4 h-12 w-full rounded-xl px-4 text-center text-sm font-bold outline-none transition-all"
                  style={{
                    background: "rgba(2,11,24,0.8)",
                    border: `0.5px solid ${
                      deleteConfirmText === "HAPUS"
                        ? "rgba(240,80,80,0.4)"
                        : "rgba(100,180,255,0.1)"
                    }`,
                    color: "#f0f8ff",
                  }}
                />

                <div className="space-y-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "HAPUS" || deletingAccount}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold"
                    style={{
                      background:
                        deleteConfirmText === "HAPUS"
                          ? "linear-gradient(135deg,#c0392b,#e74c3c)"
                          : "rgba(2,11,24,0.8)",
                      color: deleteConfirmText === "HAPUS" ? "#fff" : "#3a6080",
                      border:
                        deleteConfirmText === "HAPUS"
                          ? "none"
                          : "0.5px solid rgba(100,180,255,0.08)",
                      cursor:
                        deleteConfirmText === "HAPUS" ? "pointer" : "not-allowed",
                    }}
                  >
                    {deletingAccount ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    {deletingAccount ? "Memproses..." : "Ya, Hapus Akun"}
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingAccount}
                    className="w-full rounded-2xl py-3.5 text-[15px] font-bold"
                    style={{
                      background: "rgba(2,11,24,0.8)",
                      border: "0.5px solid rgba(100,180,255,0.1)",
                      color: "#f0f8ff",
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <BottomNav />
    </main>
  )
}