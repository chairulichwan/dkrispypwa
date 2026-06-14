// src/lib/supabase/client.ts
// ✅ Browser client — simpel, tidak perlu custom storage/cookies
// PKCE code verifier akan dihandle server-side via Route Handler

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/database.types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

