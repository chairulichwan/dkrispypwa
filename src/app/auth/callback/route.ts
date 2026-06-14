// src/app/auth/callback/route.ts
// ✅ Route Handler — exchange ?code= di server side
// Supabase akan redirect ke sini setelah klik link di email
// Set redirectTo: `${origin}/auth/callback` di forgot-password.tsx

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const errorCode = searchParams.get('error_code')
  const errorDesc = searchParams.get('error_description')

  // ── Handle error dari Supabase ─────────────────────────────
  if (errorCode) {
    const msg = errorDesc?.replace(/\+/g, ' ') || 'Link tidak valid'
    console.error('Auth callback error:', errorCode, msg)
    return NextResponse.redirect(
      `${origin}/reset-password?error=${encodeURIComponent(msg)}`
    )
  }

  // ── Exchange code → session (server side, cookie tersimpan) ─
  if (code) {
    try {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Exchange error:', error.message)
        return NextResponse.redirect(
          `${origin}/reset-password?error=${encodeURIComponent('Link sudah kadaluwarsa atau tidak valid.')}`
        )
      }

      // ✅ Session berhasil — redirect ke halaman reset password
      return NextResponse.redirect(`${origin}/reset-password`)

    } catch (err) {
      console.error('Callback unexpected error:', err)
      return NextResponse.redirect(
        `${origin}/reset-password?error=${encodeURIComponent('Terjadi kesalahan. Silakan coba lagi.')}`
      )
    }
  }

  // Tidak ada code → redirect ke forgot-password
  return NextResponse.redirect(`${origin}/forgot-password`)
}
