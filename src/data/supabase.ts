import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  // TanStack Query does the retrying. Left on, the client's own backoff keeps a dead
  // connection looking like "loading" for most of a minute.
  { db: { retry: false } },
)
