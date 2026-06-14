//src/app/forgot-password/page.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const allowedDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com',
    'hotmail.com', 'icloud.com', 'proton.me'
  ]

  const validateEmail = (value: string): string | null => {
    const clean = value.trim().toLowerCase()
    if (!clean) return 'Email wajib diisi'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return 'Format email tidak valid'
    const domain = clean.split('@')[1]
    if (!allowedDomains.includes(domain)) {
      return `Gunakan: ${allowedDomains.slice(0, 3).join(', ')}...`
    }
    return null
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const formatError = validateEmail(email)
    if (formatError) { toast.error(formatError); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          // ✅ Arahkan ke Route Handler — bukan langsung ke /reset-password
          // Route Handler akan exchange code di server, lalu redirect ke /reset-password
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      )
      if (error) throw error

      setSent(true)
      toast.success('✅ Jika email terdaftar, link reset telah dikirim', {
        duration: 6000,
        icon: '📧',
      })
    } catch (err: any) {
      console.error('Reset error:', err)
      toast.error(err?.message || 'Gagal memproses permintaan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060816] flex items-center justify-center px-4 py-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.25, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-60px] right-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-cyan-500/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.2, 0.25] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[-60px] left-[-40px] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] rounded-full bg-violet-500/20 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_40%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-50 w-full max-w-[22rem] sm:max-w-sm rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.08] backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.35)] px-4 py-5 sm:px-5 sm:py-6"
      >
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_8px_30px_rgba(34,211,238,0.35)] mb-3"
          >
            <Mail size={20} className="sm:size-6 text-white" />
          </motion.div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Forgot Password?</h1>
          <p className="text-white/50 text-xs mt-1.5">
            {sent ? 'Cek inbox email Anda' : 'Masukkan email untuk reset password'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <input
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 rounded-xl border border-white/10 bg-white/10 px-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/60 focus:bg-white/15 disabled:opacity-60"
                disabled={loading}
              />
              {email.length === 0 && (
                <p className="mt-1 text-[10px] text-white/40">
                  Gunakan: {allowedDomains.slice(0, 3).join(', ')}...
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading || !email.trim()}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={`
                mt-1 w-full h-12 rounded-xl font-bold text-sm
                flex items-center justify-center gap-2 transition-all
                ${email.trim() && !loading
                  ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-[0_10px_30px_rgba(59,130,246,0.35)]'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
                }
              `}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /><span>Mengirim...</span></>
                : <><Mail size={16} /><span>Kirim Link Reset</span></>
              }
            </motion.button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4 py-2"
          >
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <CheckCircle size={32} className="text-green-400" />
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-white text-sm font-medium">Link reset terkirim!</p>
              <p className="text-white/50 text-xs mt-1">
                Cek {email} dan klik link untuk membuat password baru
              </p>
            </div>
            <motion.button
              type="button"
              onClick={() => { setSent(false); setEmail('') }}
              className="w-full h-12 rounded-xl border border-white/10 bg-white/10 text-white text-sm font-medium hover:bg-white/15 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Kirim Ulang</span>
            </motion.button>
          </motion.div>
        )}

        <div className="mt-4 text-center">
          <p className="text-white/55 text-xs">
            Ingat password?
            <Link href="/login" className="ml-1 text-cyan-300 font-bold hover:text-cyan-200 transition">
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
                <p className="text-white/80 text-sm">Mengirim link reset...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  )
}
