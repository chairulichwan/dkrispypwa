//src/app/notifications/page.tsx

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import NotificationsClient from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const in7DaysStr = in7Days.toISOString().split('T')[0]

  // Fetch debts yang jatuh tempo dalam 7 hari atau sudah lewat
  const { data: debts } = await supabase
    .from('debts')
    .select('*, contacts(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'aktif')
    .not('due_date', 'is', null)
    .lte('due_date', in7DaysStr)
    .order('due_date', { ascending: true })

  // Fetch cicilan upcoming (punya installment_count)
  const { data: installmentDebts } = await supabase
    .from('debts')
    .select('*, contacts(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'aktif')
    .gt('installment_count', 1)
    .order('start_date', { ascending: true })

  return (
    <NotificationsClient
      userId={user.id}
      overdueDebts={(debts ?? []) as any}
      installmentDebts={(installmentDebts ?? []) as any}
      todayStr={todayStr}
      in7DaysStr={in7DaysStr}
    />
  )
}