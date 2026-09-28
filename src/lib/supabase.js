import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Supports both legacy anon key (eyJ...) and new publishable key (sb_publishable_...)
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Returns a Supabase client if env vars are configured, otherwise null.
 * The app runs in "local mode" (localStorage only) when Supabase is not set up.
 */
export const supabase =
  supabaseUrl &&
  supabaseKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseKey.includes('your-anon-key')
    ? createClient(supabaseUrl, supabaseKey)
    : null

export const isSupabaseConfigured = supabase !== null
