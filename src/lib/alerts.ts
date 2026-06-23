import { createClient } from "@/lib/supabase/client"
import { debtAlertHref, ROUTES } from "@/lib/routes"

export interface SetAlertReadStateInput {
  alertId: string
  read: boolean
}

export interface DismissAlertInput {
  alertId: string
  dismiss: boolean
}

export async function setAlertReadState({ alertId, read }: SetAlertReadStateInput) {
  const supabase = createClient()

  const { error } = await (supabase.from("alerts") as any)
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", alertId)

  if (error) throw error
}

export async function dismissAlert({ alertId, dismiss }: DismissAlertInput) {
  const supabase = createClient()

  const { error } = await (supabase.from("alerts") as any)
    .update({ dismissed_at: dismiss ? new Date().toISOString() : null })
    .eq("id", alertId)

  if (error) throw error
}

export async function markAllAlertsRead() {
  const supabase = createClient()

  const { error } = await (supabase.from("alerts") as any)
    .update({ read_at: new Date().toISOString() })
    .is("dismissed_at", null)
    .is("read_at", null)

  if (error) throw error
}

export function getAlertDeepLink(source: string | null) {
  if (!source) return null

  if (source.startsWith("debt:")) {
    const parts = source.split(":")
    const debtId = parts[2]
    return debtId ? debtAlertHref(debtId) : null
  }

  if (source.startsWith("analytics:")) {
    return ROUTES.analytics
  }

  return null
}
