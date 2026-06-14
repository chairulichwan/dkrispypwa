//src/app/profile/security/page.tsx

"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import toast from "react-hot-toast"
import { ChevronLeft, Lock, Eye, EyeOff, Loader2, Check } from "lucide-react"

const toastSuccess = { style: { background: "#041528", color: "#b8dff7", border: "1px solid #0d3566" } }
const toastError   = { style: { background: "#041528", color: "#b8dff7", border: "1px solid #7f1d1d" } }

export default function SecurityPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentPw, setCurrentPw]     = useState("")
  const [newPw, setNewPw]             = useState("")
  const [confirmPw, setConfirmPw]     = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})

  const validate = useCallback(() => {
    const errs: Record<string, string> = {}
    if (!currentPw)          errs.currentPw  = "Password lama wajib diisi"
    if (newPw.length < 8)    errs.newPw      = "Minimal 8 karakter"
    if (newPw !== confirmPw) errs.confirmPw  = "Password tidak cocok"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [currentPw, newPw, confirmPw])

  const handleChangePassword = useCallback(async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error("Session tidak ditemukan")

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      })
      if (signInError) { setErrors({ currentPw: "Password lama salah" }); return }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPw })
      if (updateError) throw updateError

      toast.success("Password berhasil diubah! 🔒", toastSuccess)
      setCurrentPw(""); setNewPw(""); setConfirmPw("")
      router.back()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah password", toastError)
    } finally {
      setSaving(false)
    }
  }, [validate, currentPw, newPw, supabase, router])

  return (
    // ✅ min-h-screen + flex column — header sticky mendorong konten secara alami
    <main
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(175deg,#041525 0%,#020b18 40%,#031020 100%)" }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px]"
             style={{ background: "rgba(14,79,168,0.18)" }} />
        <div className="absolute bottom-20 -left-40 w-80 h-80 rounded-full blur-[120px]"
             style={{ background: "rgba(0,170,255,0.12)" }} />
      </div>

      {/* ✅ STICKY header — otomatis dorong konten, tidak pernah overlap */}
      <header
        className="sticky top-0 z-50 px-5 shrink-0"
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          background: "rgba(4,21,40,0.95)",
          borderBottom: "0.5px solid rgba(100,180,255,0.08)",
          // Safe area untuk notch / Dynamic Island
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex items-center gap-3 py-4">
          <button
            onClick={() => router.back()}
            aria-label="Kembali"
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all"
            style={{
              background: "rgba(15,40,75,0.7)",
              border: "0.5px solid rgba(100,180,255,0.15)",
              color: "#7dc4f0",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="font-bold tracking-tight" style={{ fontSize: 17, color: "#f0f8ff" }}>
            Keamanan & Password
          </h1>
        </div>
      </header>

      {/* ✅ Body — flex-1 mengisi sisa layar, padding normal tanpa magic number */}
      <div
        className="relative z-10 flex-1 px-5 py-6 space-y-4"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Password fields */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(10,30,60,0.85)",
            border: "0.5px solid rgba(100,180,255,0.08)",
            backdropFilter: "blur(16px)",
          }}
        >
          {([
            { id: "currentPw", label: "Password Lama",   value: currentPw, setter: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
            { id: "newPw",     label: "Password Baru",   value: newPw,     setter: setNewPw,     show: showNew,     toggle: () => setShowNew(p => !p) },
            { id: "confirmPw", label: "Konfirmasi Baru", value: confirmPw, setter: setConfirmPw, show: showConfirm, toggle: () => setShowConfirm(p => !p) },
          ] as const).map(({ id, label, value, setter, show, toggle }, i) => (
            <div
              key={id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderTop: i > 0 ? "0.5px solid rgba(100,180,255,0.08)" : "none" }}
            >
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: "rgba(26,110,201,0.15)", color: "#4f9bd4" }}
              >
                <Lock size={15} />
              </div>

              <div className="flex-1 min-w-0">
                <label
                  htmlFor={id}
                  className="block font-bold uppercase"
                  style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.4px", marginBottom: 2 }}
                >
                  {label}
                </label>
                <input
                  id={id}
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!errors[id]}
                  aria-describedby={errors[id] ? `${id}-error` : undefined}
                  className="w-full bg-transparent outline-none font-semibold"
                  style={{ fontSize: 14, color: errors[id] ? "#f07070" : "#f0f8ff" }}
                />
                {errors[id] && (
                  <p id={`${id}-error`} role="alert" className="font-medium mt-0.5"
                     style={{ fontSize: 10, color: "#f07070" }}>
                    {errors[id]}
                  </p>
                )}
              </div>

              <button
                onClick={toggle}
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                className="p-1 transition-opacity active:opacity-50"
                style={{ color: "#3a6080" }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          ))}
        </div>

        {/* Strength meter */}
        <PasswordStrength password={newPw} />

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleChangePassword}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all"
          style={{
            background: saving ? "rgba(15,40,75,0.7)" : "linear-gradient(135deg,#1a6ec9,#0099ee)",
            color: saving ? "#3a6080" : "#fff",
            boxShadow: saving ? "none" : "0 4px 20px rgba(26,110,201,0.4)",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {saving ? "Menyimpan..." : "Ubah Password"}
        </motion.button>
      </div>
    </main>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Min 8 karakter", pass: password.length >= 8 },
    { label: "Huruf besar",    pass: /[A-Z]/.test(password) },
    { label: "Angka",          pass: /[0-9]/.test(password) },
    { label: "Simbol",         pass: /[^a-zA-Z0-9]/.test(password) },
  ]
  const score     = checks.filter(c => c.pass).length
  const barColor  = ["#3a6080","#f07070","#e8c56a","#4f9bd4","#10b981"][score]
  const barLabel  = ["", "Lemah", "Cukup", "Kuat", "Sangat Kuat"][score]

  if (!password) return null

  return (
    <div className="space-y-2 px-1">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? barColor : "rgba(100,180,255,0.1)" }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-y-1">
        <div className="flex gap-3 flex-wrap">
          {checks.map(({ label, pass }) => (
            <span
              key={label}
              className="flex items-center gap-1 font-medium"
              style={{ fontSize: 11, color: pass ? "#10b981" : "#3a6080" }}
            >
              <Check size={10} style={{ opacity: pass ? 1 : 0.3 }} />
              {label}
            </span>
          ))}
        </div>
        <span className="font-bold" style={{ fontSize: 11, color: barColor }}>{barLabel}</span>
      </div>
    </div>
  )
}