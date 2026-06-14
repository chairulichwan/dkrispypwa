// src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types' // Optional: untuk type safety

// ✅ Service Role Key - JANGAN ekspos ke client!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables')
}

// ✅ Admin client dengan service role (bypass RLS)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)