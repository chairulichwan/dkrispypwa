//src/app/reset-password/page.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState({ password: '', confirm: '' })
  const [touched, setTouched] = useState({ password: false, confirm: false })

  const sessionReadyRef = useRef(false)
  const mountedRef = useRef(true)

  // ─────────────────────────────────────────────────────────────
  // SESSION CHECK
  // Saat sampai di sini, Route Handler sudah exchange code & set cookie.
  // Tinggal verifikasi session aktif dari cookie.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const checkSession = async () => {
      // ── A. Cek error yang dikirim dari Route Handler ────────
      const error = searchParams.get('error')
      if (error) {
        if (mountedRef.current) {
          setErrorMessage(decodeURIComponent(error))
          setInitializing(false)
        }
        return
      }

      // ── B. Cek session aktif (sudah di-set oleh Route Handler) ─
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        if (!sessionError && session?.user) {
          console.log('✅ Session ready:', session.user.email)
          sessionReadyRef.current = true
          setSessionReady(true)
          setInitializing(false)
          return
        }

        // ── C. Fallback: tunggu auth state change ──────────────
        // Bisa terjadi jika cookie baru saja di-set dan belum terbaca
        console.log('⏳ Session not yet available, listening...')
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (!mountedRef.current) return
          if (
            (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
            session?.user
          ) {
            sessionReadyRef.current = true
            setSessionReady(true)
            setInitializing(false)
          }
        })

        // ── D. Timeout ─────────────────────────────────────────
        timeoutId = setTimeout(() => {
          if (mountedRef.current && !sessionReadyRef.current) {
            setErrorMessage('Sesi tidak ditemukan. Link mungkin sudah kadaluwarsa.')
            setInitializing(false)
          }
        }, 5000)

        return () => subscription.unsubscribe()

      } catch (err) {
        console.error('checkSession error:', err)
        if (mountedRef.current) {
          setErrorMessage('Terjadi kesalahan. Silakan request link reset baru.')
          setInitializing(false)
        }
      }
    }

    checkSession()

    return () => {
      mountedRef.current = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // PASSWORD VALIDATION
  // ─────────────────────────────────────────────────────────────
  const passwordRequirements = {
    length: password.length >= 6,
    uppercase: /^[A-Z]/.test(password),
    number: /\d/.test(password),
  }

  const passwordStrength = (() => {
    const score = Object.values(passwordRequirements).filter(Boolean).length
    return {
      width: `${(score / 3) * 100}%`,
      color: ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][score],
      label: ['Kurang', 'Cukup', 'Baik', 'Kuat'][score],
    }
  })()

  const isFormValid =
    password.length >= 6 &&
    /^[A-Z]/.test(password) &&
    /\d/.test(password) &&
    password === confirm &&
    confirm.length > 0

  useEffect(() => {
    if (!touched.password || !password) return
    if (password.length < 6) setErrors((p) => ({ ...p, password: 'Minimal 6 karakter' }))
    else if (!/^[A-Z]/.test(password)) setErrors((p) => ({ ...p, password: 'Diawali huruf besar' }))
    else if (!/\d/.test(password)) setErrors((p) => ({ ...p, password: 'Mengandung angka' }))
    else setErrors((p) => ({ ...p, password: '' }))
  }, [password, touched.password])

  // ─────────────────────────────────────────────────────────────
  // HANDLE UPDATE PASSWORD
  // ─────────────────────────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ password: true, confirm: true })
    if (!isFormValid) { toast.error('Periksa kembali password Anda'); return }
    if (!sessionReady) { toast.error('Session belum siap. Silakan klik link reset password lagi.'); return }

    setLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Session hilang. Silakan request link reset baru.')

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      toast.success('✅ Password berhasil diubah!')
      setTimeout(async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
      }, 1500)

    } catch (err: any) {
      console.error('Update password error:', err)
      const msg = err?.message ?? ''
      if (msg.includes('Invalid Refresh Token') || msg.includes('expired')) {
        toast.error('Session sudah habis. Silakan request link reset baru.')
      } else {
        toast.error(msg || 'Gagal mengubah password')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER STATES
  // ─────────────────────────────────────────────────────────────
  if (initializing) return <LoadingUI />
  if (errorMessage) return <ErrorUI message={errorMessage} />
  if (!sessionReady) return <ErrorUI message="Link tidak valid atau sudah kedaluwarsa." />

  // ─────────────────────────────────────────────────────────────
  // MAIN FORM
  // ─────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] flex items-center justify-center px-4 py-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.25, 0.2] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-[-60px] right-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-cyan-500/20 blur-3xl" />
        <motion.div animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.2, 0.25] }} transition={{ duration: 4, repeat: Infinity, delay: 2 }} className="absolute bottom-[-60px] left-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-50 w-full max-w-[22rem] sm:max-w-sm rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.35)] px-4 py-5 sm:px-5 sm:py-6"
      >
        <div className="text-center mb-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }} className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_8px_30px_rgba(34,211,238,0.35)] mb-3">
            <ShieldCheck size={20} className="sm:size-6 text-white" />
          </motion.div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Reset Password</h1>
          <p className="text-white/50 text-xs mt-1.5">Buat password baru yang kuat</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-3">
          {/* Password */}
          <div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Password Baru" value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: '' })) }}
                onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 pr-10 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15 disabled:opacity-60"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {password && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1.5 overflow-hidden">
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div className={`h-full ${passwordStrength.color}`} initial={{ width: 0 }} animate={{ width: passwordStrength.width }} transition={{ duration: 0.3 }} />
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/50">Kekuatan: <span className="text-white">{passwordStrength.label}</span></span>
                    <div className="flex gap-2">
                      <span className={passwordRequirements.length ? 'text-green-400' : 'text-white/30'}>6+</span>
                      <span className={passwordRequirements.uppercase ? 'text-green-400' : 'text-white/30'}>Aa</span>
                      <span className={passwordRequirements.number ? 'text-green-400' : 'text-white/30'}>0-9</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {touched.password && errors.password && (
                <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex items-center gap-1 text-red-400 text-[10px] mt-1">
                  <XCircle size={10} /> {errors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm Password" value={confirm}
                onChange={(e) => { setConfirm(e.target.value); if (errors.confirm) setErrors((p) => ({ ...p, confirm: '' })) }}
                onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 pr-10 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15 disabled:opacity-60"
                disabled={loading}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <AnimatePresence>
              {confirm && password && (
                <motion.p key={confirm === password ? 'match' : 'no-match'} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`mt-1 text-[10px] flex items-center gap-1 ${confirm === password ? 'text-green-400' : 'text-red-400'}`}>
                  {confirm === password ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {confirm === password ? 'Password cocok' : 'Tidak cocok'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <motion.button type="submit" disabled={loading || !isFormValid} whileTap={{ scale: loading ? 1 : 0.98 }}
            className={`mt-1 w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isFormValid && !loading ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)]' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}>
            {loading
              ? <><Loader2 size={16} className="animate-spin" /><span>Memproses...</span></>
              : <><ShieldCheck size={16} /><span>Update Password</span></>
            }
          </motion.button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-white/55 text-xs">Ingat password?{' '}
            <Link href="/login" className="ml-1 text-cyan-300 font-bold hover:text-cyan-200 transition">Login</Link>
          </p>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl sm:rounded-3xl bg-[#060816]/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={24} className="animate-spin text-cyan-400" />
                <p className="text-white/80 text-sm">Mengubah password...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  )
}

function LoadingUI() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] flex items-center justify-center px-4 py-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-60px] right-[-40px] w-[160px] h-[160px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-40px] w-[160px] h-[160px] rounded-full bg-violet-500/20 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-50 w-full max-w-[22rem] rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl p-6 text-center">
        <Loader2 size={32} className="animate-spin text-cyan-400 mx-auto mb-4" />
        <p className="text-white/80 text-sm font-medium">Memverifikasi sesi...</p>
        <p className="text-white/40 text-xs mt-1">Mohon tunggu sebentar</p>
      </motion.div>
    </main>
  )
}

function ErrorUI({ message }: { message: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] flex items-center justify-center px-4 py-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-60px] right-[-40px] w-[160px] h-[160px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-60px] left-[-40px] w-[160px] h-[160px] rounded-full bg-violet-500/20 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-50 w-full max-w-[22rem] rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-2xl p-6 text-center">
        <XCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-white font-bold text-lg mb-2">Link Tidak Valid</h2>
        <p className="text-white/60 text-sm mb-4">{message}</p>
        <Link href="/forgot-password" className="inline-flex items-center justify-center w-full h-12 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white font-bold text-sm hover:opacity-90 transition">
          <ArrowLeft size={16} className="mr-2" /> Request Link Baru
        </Link>
      </motion.div>
    </main>
  )
}
