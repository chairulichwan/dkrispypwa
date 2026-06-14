//src/app/login/page.tsx

"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react"
import toast from "react-hot-toast"

import { createClient } from "@/lib/supabase/client"
import { ROUTES } from "@/lib/routes"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError("")

    if (loading) return

    const cleanEmail = email.trim().toLowerCase()

    if (!isValidEmail(cleanEmail)) {
      toast.error("Format email tidak valid")
      return
    }

    if (!password.trim()) {
      toast.error("Password wajib diisi")
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        if (error.message?.includes("Invalid login credentials")) {
          setPasswordError("Password atau email yang Anda masukkan salah")
          toast.error("Kredensial tidak valid")
        } else if (error.message?.includes("Email not confirmed")) {
          toast.error("Email belum dikonfirmasi. Cek inbox Anda.")
        } else {
          toast.error(error.message || "Login gagal")
        }
        return
      }

      if (!data.user) {
        toast.error("Login gagal")
        return
      }

      toast.success("Login berhasil! 🎉")
      router.refresh()
      router.replace(ROUTES.dashboard)
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Terjadi kesalahan koneksi")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] flex items-center justify-center px-4 py-4">
      <div className="absolute top-[-60px] right-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)] pointer-events-none" />

      <motion.form
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleLogin}
        className="relative z-50 w-full max-w-[22rem] sm:max-w-sm rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.35)] px-4 py-5 sm:px-5 sm:py-6"
      >
        <div className="flex justify-center mb-2">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_8px_30px_rgba(34,211,238,0.35)]"
          >
            <ShieldCheck size={24} className="sm:size-7 text-white" />
          </motion.div>
        </div>

        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Welcome Back</h1>
          <p className="text-white/50 text-xs mt-1.5 leading-relaxed">Login to your fintech wallet</p>
        </div>

        <div className="mt-5 sm:mt-6 space-y-3.5">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail size={18} className="text-white/60" />
            </div>

            <input
              type="email"
              autoComplete="email"
              placeholder="Email Address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-cyan-400/60 focus:bg-white/15"
              required
            />
          </div>

          <div className="relative group">
            <Lock
              size={18}
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors ${
                passwordError ? "text-red-400" : "text-white/40 group-focus-within:text-cyan-400"
              }`}
            />

            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (passwordError) setPasswordError("")
              }}
              className={`w-full h-12 rounded-xl border ${
                passwordError ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-white/10"
              } pl-11 pr-10 text-sm text-white placeholder:text-white/35 outline-none transition-all focus:border-cyan-400/60 focus:bg-white/15`}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 flex items-center justify-center z-10"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {passwordError && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle size={12} /> {passwordError}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-0.5">
            <Link href="/forgot-password" className="text-xs font-medium text-cyan-300 hover:text-cyan-200 transition">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-bold text-sm shadow-[0_10px_30px_rgba(59,130,246,0.35)] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Login"}
          </button>
        </div>

        <div className="mt-5 text-center">
          <p className="text-white/55 text-xs">
            Belum punya akun?
            <Link href="/register" className="ml-1 text-cyan-300 font-bold">
              Register
            </Link>
          </p>
        </div>
      </motion.form>
    </main>
  )
}
