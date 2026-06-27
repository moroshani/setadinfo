import { create } from 'zustand'

interface AuthUser {
  id: string
  username: string
  role: 'admin' | 'operator' | 'viewer'
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  return {
    auth: {
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      reset: () =>
        set((state) => ({
          ...state,
          auth: { ...state.auth, user: null },
        })),
    },
  }
})
