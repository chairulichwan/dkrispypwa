import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, BellRing } from "lucide-react"

import type { Database } from "@/lib/supabase/database.types"
import { ROUTES } from "@/lib/routes"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import NotificationsClient from "./NotificationsClient"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface AlertRow {
  id: string
  type: string
  title: string
  message: string
  source: string | null
  created_at: string
  dismissed_at: string | null
  read_at: string | null
}

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { data } = await supabase
    .from("alerts")
    .select("id, type, title, message, source, created_at, dismissed_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  const alerts = (data ?? []) as AlertRow[]

  return (
    <main
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
      }}
    >
      <div className="mx-auto w-full max-w-3xl px-5 pb-10 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0B1120]/80 p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-[#94A3B8]">
                <BellRing size={13} />
                Notification Center
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC] sm:text-3xl">Alert &amp; Reminder</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#94A3B8]">
                Ringkasan alert otomatis dari analytics dan debt reminder aktif.
              </p>
            </div>

            <Link
              href={ROUTES.dashboard}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
          </div>
        </header>

        <NotificationsClient initialAlerts={alerts} />
      </div>
    </main>
  )
}
