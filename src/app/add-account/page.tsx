import { redirect } from "next/navigation"

import { ROUTES } from "@/lib/routes"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import AddAccountClient from "./AddAccountClient"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function AddAccountPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  return <AddAccountClient />
}
