// src/app/api/login/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js' // ✅ Pakai package standar
import { supabaseAdmin } from '../../../lib/supabase-admin' // ✅ Import relatif

interface ProfileLookup {
  email: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { identifier, password } = body

    if (!identifier?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Lengkapi data login' }, { status: 400 })
    }

    const cleanIdentifier = identifier.trim().toLowerCase()
    let emailToLogin = cleanIdentifier

    // 🔍 Jika bukan email, lookup di profiles
    if (!cleanIdentifier.includes('@')) {
      // ✅ Cast hasil query ke tipe yang kita definisikan
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .or(`username.eq.${cleanIdentifier},phone.eq.${cleanIdentifier}`)
        .maybeSingle() as { data: ProfileLookup | null }

      if (!profile?.email) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
      }
      
      emailToLogin = profile.email // ✅ Sekarang TypeScript happy
    }

    // 🔐 Login pakai client standar (anon key)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: 'Email atau Password salah' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
    })

  } catch (err: any) {
    console.error('[Login API Error]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}