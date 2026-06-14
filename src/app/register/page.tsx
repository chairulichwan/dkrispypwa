//src/app/register/page.tsx

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, Eye, EyeOff, Loader2, Sparkles, XCircle } from "lucide-react"
import toast from "react-hot-toast"

import { createClient } from "@/lib/supabase/client"
import { ROUTES } from "@/lib/routes"
import { emailRegex, passwordRegex, phoneRegex, usernameRegex } from "@/lib/validation"

type FormField = "username" | "email" | "phone" | "password" | "confirm"

interface FormErrors {
  username?: string
  email?: string
  phone?: string
  password?: string
  confirm?: string
}

const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
] as const

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<FormField, boolean>>({
    username: false,
    email: false,
    phone: false,
    password: false,
    confirm: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitStep, setSubmitStep] = useState<"idle" | "registering">("idle")

  const passwordRequirements = useMemo(
    () => ({
      uppercase: /^[A-Z]/.test(formData.password),
      length: formData.password.length >= 6,
      number: /\d/.test(formData.password),
    }),
    [formData.password]
  )

  const passwordStrength = useMemo(() => {
    const score = Object.values(passwordRequirements).filter(Boolean).length
    return {
      score,
      width: `${(score / 3) * 100}%`,
      color: ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"][score],
      label: ["Kurang", "Cukup", "Baik", "Kuat"][score],
    }
  }, [passwordRequirements])

  const validateField = (field: FormField, value: string): string | undefined => {
    switch (field) {
      case "username":
        if (!value.trim()) return "Username wajib diisi"
        if (!usernameRegex.test(value.trim())) return "Minimal 3 karakter, huruf/angka/_ saja"
        return undefined
      case "email": {
        const clean = value.trim().toLowerCase()
        if (!clean) return "Email wajib diisi"
        if (!emailRegex.test(clean)) return "Format email tidak valid"
        const domain = clean.split("@")[1]
        if (!ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number])) {
          return `Gunakan: ${ALLOWED_EMAIL_DOMAINS.slice(0, 3).join(", ")}...`
        }
        return undefined
      }
      case "phone":
        if (!value.trim()) return "Nomor HP wajib diisi"
        if (!phoneRegex.test(value.trim())) return "Format: 081234567890"
        return undefined
      case "password":
        if (!value) return "Password wajib diisi"
        if (!passwordRegex.test(value)) return "Harus diawali huruf besar, min 6 karakter, mengandung angka"
        return undefined
      case "confirm":
        if (!value) return "Konfirmasi password wajib diisi"
        if (value !== formData.password) return "Password tidak cocok"
        return undefined
      default:
        return undefined
    }
  }

  const isFormValid = useMemo(() => {
    const valuesFilled = Object.values(formData).every((value) => value.trim() !== "")
    const noErrors = (Object.keys(formData) as FormField[]).every((field) => !validateField(field, formData[field]))
    return valuesFilled && noErrors
  }, [formData])

  const updateField = (field: FormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
    }
    if (field === "password" && touched.confirm) {
      setErrors((prev) => ({ ...prev, confirm: validateField("confirm", formData.confirm) }))
    }
  }

  const markTouched = (field: FormField) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validateField(field, formData[field]) }))
  }

  const resetForm = () => {
    setFormData({ username: "", email: "", phone: "", password: "", confirm: "" })
    setErrors({})
    setTouched({ username: false, email: false, phone: false, password: false, confirm: false })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextTouched: Record<FormField, boolean> = {
      username: true,
      email: true,
      phone: true,
      password: true,
      confirm: true,
    }
    setTouched(nextTouched)

    const nextErrors: FormErrors = {
      username: validateField("username", formData.username),
      email: validateField("email", formData.email),
      phone: validateField("phone", formData.phone),
      password: validateField("password", formData.password),
      confirm: validateField("confirm", formData.confirm),
    }
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean) || loading) {
      toast.error("Periksa kembali data pendaftaran")
      return
    }

    setLoading(true)
    setSubmitStep("registering")

    try {
      const cleanEmail = formData.email.trim().toLowerCase()
      const cleanUsername = formData.username.trim().toLowerCase()
      const cleanPhone = formData.phone.trim()

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            username: cleanUsername,
            phone: cleanPhone,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error("Registrasi gagal")

      toast.success("🎉 Akun berhasil dibuat!")
      resetForm()
      setTimeout(() => router.replace(ROUTES.login), 1200)
    } catch (error: any) {
      const message = error?.message || "Terjadi kesalahan, coba lagi"
      toast.error(message)
    } finally {
      setLoading(false)
      setSubmitStep("idle")
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] flex items-center justify-center px-4 py-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.25, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-60px] right-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-cyan-500/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.2, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-60px] left-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-violet-500/20 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)]" />
      </div>

      <motion.form
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        onSubmit={handleSubmit}
        className="relative z-50 w-full max-w-[22rem] sm:max-w-sm rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.35)] px-4 py-5 sm:px-5 sm:py-6"
      >
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_8px_30px_rgba(34,211,238,0.35)] mb-3"
          >
            <Sparkles size={20} className="sm:size-6 text-white" />
          </motion.div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Create Account</h1>
          <p className="text-white/50 text-xs mt-1.5">Join our secure fintech wallet</p>
        </div>

        <div className="space-y-3">
          <div>
            <input
              type="text"
              autoComplete="username"
              placeholder="Username"
              value={formData.username}
              onChange={(event) => updateField("username", event.target.value.replace(/\s/g, ""))}
              onBlur={() => markTouched("username")}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15"
            />
            {touched.username && errors.username && (
              <p className="flex items-center gap-1 text-red-400 text-[10px] mt-1">
                <XCircle size={10} /> {errors.username}
              </p>
            )}
          </div>

          <div>
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              onBlur={() => markTouched("email")}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15"
            />
            {touched.email && errors.email && (
              <p className="flex items-center gap-1 text-red-400 text-[10px] mt-1">
                <XCircle size={10} /> {errors.email}
              </p>
            )}
          </div>

          <div>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(event) => updateField("phone", event.target.value.replace(/[^\d+]/g, ""))}
              onBlur={() => markTouched("phone")}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15"
              inputMode="tel"
            />
            {touched.phone && errors.phone && (
              <p className="flex items-center gap-1 text-red-400 text-[10px] mt-1">
                <XCircle size={10} /> {errors.phone}
              </p>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Password"
                value={formData.password}
                onChange={(event) => updateField("password", event.target.value)}
                onBlur={() => markTouched("password")}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 pr-10 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10 flex items-center justify-center"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <AnimatePresence>
              {formData.password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2 overflow-hidden"
                >
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${passwordStrength.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: passwordStrength.width }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-white/50">
                    Kekuatan: <span className="text-white">{passwordStrength.label}</span>
                  </p>
                  <ul className="grid grid-cols-3 gap-1">
                    {[
                      { key: "uppercase", label: "Awal kapital", met: passwordRequirements.uppercase },
                      { key: "length", label: "Min 6 karakter", met: passwordRequirements.length },
                      { key: "number", label: "Angka", met: passwordRequirements.number },
                    ].map((item) => (
                      <li key={item.key} className={`flex items-center gap-1 text-[9px] ${item.met ? "text-green-400" : "text-white/40"}`}>
                        {item.met ? <CheckCircle size={8} /> : <XCircle size={8} />}
                        <span className="truncate">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {touched.password && errors.password && (
              <p className="flex items-center gap-1 text-red-400 text-[10px] mt-1">
                <XCircle size={10} /> {errors.password}
              </p>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm Password"
                value={formData.confirm}
                onChange={(event) => updateField("confirm", event.target.value)}
                onBlur={() => markTouched("confirm")}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 pr-10 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10 flex items-center justify-center"
                aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <AnimatePresence>
              {formData.confirm && formData.password && (
                <motion.p
                  key={formData.confirm === formData.password ? "match" : "no-match"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-1 text-[10px] flex items-center gap-1 ${
                    formData.confirm === formData.password ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formData.confirm === formData.password ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {formData.confirm === formData.password ? "Password cocok" : "Password tidak cocok"}
                </motion.p>
              )}
            </AnimatePresence>

            {touched.confirm && errors.confirm && (
              <p className="flex items-center gap-1 text-red-400 text-[10px] mt-1">
                <XCircle size={10} /> {errors.confirm}
              </p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading || !isFormValid}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`mt-1 w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              isFormValid && !loading
                ? "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)] active:scale-[0.98]"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            }`}
          >
            {submitStep === "registering" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Membuat akun...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Register
              </>
            )}
          </motion.button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-white/55 text-xs">
            Sudah punya akun?
            <Link href={ROUTES.login} className="ml-1 text-cyan-300 font-bold hover:text-cyan-200 transition">
              Login
            </Link>
          </p>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl sm:rounded-3xl bg-[#060816]/80 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-cyan-400" />
                <p className="text-white/80 text-sm">Membuat akun Anda...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.form>
    </main>
  )
}
