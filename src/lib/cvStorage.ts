import { supabase } from './supabase'

export async function getCV(path = '') {
  const { data } = await supabase!.auth.getSession()
  if (!data.session) throw new Error('Please sign in again.')
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-cv${path}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
  })
  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.error || 'Could not load your CVs. Please try again.')
  }
  return response
}

