import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { UserProfile } from '../lib/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  setAuthState: (user: User, session: Session) => void
  clearAuth: () => void
  setProfile: (profile: UserProfile) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  setAuthState: (user, session) => set({ user, session }),
  clearAuth: () => set({ user: null, session: null, profile: null }),
  setProfile: (profile) => set({ profile }),
}))
