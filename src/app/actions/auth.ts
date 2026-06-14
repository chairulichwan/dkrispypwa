// app/actions/auth.ts
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function loginWithIdentifier(formData: FormData) {
  const supabase = await createClient()

  const identifier = String(formData.get("identifier") ?? "")
  const password = String(formData.get("password") ?? "")

  if (!identifier || !password) {
    return { error: "Lengkapi data login" }
  }

  try {
    const clean = identifier.trim().toLowerCase()

    let emailToLogin = clean

    if (!clean.includes("@")) {
      const { data } = await (supabase.from("profiles") as any)
        .select("email")
        .or(`username.eq.${clean},phone.eq.${clean}`)
        .maybeSingle()

      const profile = data as { email?: string | null } | null

      if (profile?.email) {
        emailToLogin = profile.email
      } else {
        return { error: "Akun tidak ditemukan" }
      }
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password,
    })

    if (authError) {
      return { error: "Email atau Password salah" }
    }

    revalidatePath("/dashboard", "layout")
    redirect("/dashboard")
  } catch (err) {
    console.error("Login error:", err)
    return { error: "Terjadi kesalahan sistem" }
  }
}