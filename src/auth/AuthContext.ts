import { createContext, useContext } from 'react'
import type { Access } from '../lib/permissions'

export type Auth = {
  /** `loading` until the stored session has been read, which happens once per visit. */
  status: 'loading' | 'signedOut' | 'signedIn'
  userId: string | undefined
  email: string | undefined
  /** What this account may edit. Null when signed out, and until the facts have loaded. */
  access: Access | null
  /** True while a signed-in account's access is still being worked out. */
  accessLoading: boolean
  /** True when the access facts could not be loaded; no edit control is shown until they are. */
  accessFailed: boolean
  retryAccess: () => void
  /** Rejects with the error from Supabase Auth. */
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
