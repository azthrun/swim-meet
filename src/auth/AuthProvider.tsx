import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ACCOUNT_KEY, useAccessFacts } from '../data/queries'
import { supabase } from '../data/supabase'
import { deriveAccess } from '../lib/permissions'
import { AuthContext, type Auth } from './AuthContext'

/** The session, kept in local storage by supabase-js so it survives a reload. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // undefined: not read yet. null: signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Fires once with the stored session, then on every sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      // Nothing fetched for one account may be shown to the next visitor on this phone.
      if (event === 'SIGNED_OUT') queryClient.removeQueries({ queryKey: [ACCOUNT_KEY] })
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id
  const email = session?.user.email
  const facts = useAccessFacts(userId)
  const refetch = facts.refetch

  const value = useMemo<Auth>(
    () => ({
      status: session === undefined ? 'loading' : session ? 'signedIn' : 'signedOut',
      userId,
      email,
      access: userId && facts.data?.userId === userId ? deriveAccess(facts.data) : null,
      accessLoading: userId !== undefined && facts.isPending,
      accessFailed: userId !== undefined && facts.isError,
      retryAccess: () => void refetch(),
      async signIn(emailAddress, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: emailAddress, password })
        if (error) throw error
      },
      async signOut() {
        // This phone only; the account stays signed in on other devices.
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) throw error
      },
    }),
    [session, userId, email, facts.data, facts.isPending, facts.isError, refetch],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
