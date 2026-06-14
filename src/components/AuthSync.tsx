//src/components/AuthSync.tsx
"use client"
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthSync() {
  const supabase = createClient()
  
  useEffect(() => {
    // ✅ Debounce: Tunggu 500ms sebelum fetch
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getUser()
      // ... handle user
    }, 500)
    
    return () => clearTimeout(timer) // Cleanup
  }, [supabase])
  
  return null
}