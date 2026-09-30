import type { User } from '@supabase/supabase-js'
import { createContext, createElement, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import useAppStore from '../store/useAppStore'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function useAuthSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      useAppStore.getState().setSavedJobsOwner(session?.user.id ?? null)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { user: data?.user, error }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { user: data?.user, error }
  }, [])

  const signOut = useCallback(async () => {
    const result = await supabase?.auth.signOut()
    if (result?.error) throw result.error
  }, [])

  return { user, loading, signIn, signUp, signOut }
}

const AuthContext = createContext<ReturnType<typeof useAuthSession> | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthSession()
  return createElement(AuthContext.Provider, { value: auth },
    auth.loading ? createElement('p', { role: 'status', className: 'p-6 text-center text-gray-500' }, 'Loading your account?') : children)
}
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth requires AuthProvider')
  return auth
}
