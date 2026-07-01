import { create } from 'zustand'
import { User } from '../lib/api'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
  initializeAuth: () => void
}

function getStoredAuth() {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')

  if (!token || !userStr) {
    return { user: null, token: null }
  }

  try {
    return { user: JSON.parse(userStr) as User, token }
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return { user: null, token: null }
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...getStoredAuth(),
  isLoading: false,
  error: null,

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, error: null })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  initializeAuth: () => set(getStoredAuth()),
}))
