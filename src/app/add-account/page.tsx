// src/app/add-account/page.tsx
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AddAccountClient from './AddAccountClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function AddAccountPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')

  return <AddAccountClient />
}