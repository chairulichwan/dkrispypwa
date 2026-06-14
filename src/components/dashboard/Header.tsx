//src/components/dashboard/Header.tsx

'use client'

import { Power } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import { supabase } from '@/lib/supabase'

interface HeaderProps {
  page: string
}

export default function Header({
  page,
}: HeaderProps) {

  const router = useRouter()

  const titles: Record<string, string> = {
    home: 'Beranda',
    assets: 'Wallet',
    report: 'Insight',
    history: 'History',
  }

  const handleLogout = async () => {

    try {

      const { error } =
        await supabase.auth.signOut()

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Logout berhasil')

      router.replace('/login')

    } catch (err) {

      toast.error('Gagal logout')

    }

  }

  return (
    <header className="fixed top-0 left-0 right-0 z-[999] bg-white/80 backdrop-blur-2xl border-b border-white/20">

      <div className="max-w-7xl mx-auto px-4 pt-safe pt-5 pb-4 flex items-center justify-between">

        {/* LEFT */}
        <div>

          <h1 className="text-2xl font-black text-slate-800">
            {titles[page]}
          </h1>

          <div className="flex items-center gap-2 mt-1">

            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />

            <p className="text-[11px] font-bold text-slate-500 tracking-widest">
              HALO, SUPER ADMIN
            </p>

          </div>

        </div>

        {/* LOGOUT */}
        <button
          type="button"
          onClick={handleLogout}
          className="relative z-[999] w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center active:scale-95 transition-all duration-200 shadow-lg"
        >
          <Power size={18} />
        </button>

      </div>

    </header>
  )
}