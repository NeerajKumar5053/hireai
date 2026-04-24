import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      setAuth: (user, token) => set({ user, token }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),

      logout: () => {
        set({ user: null, token: null })
      },

      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'hireai-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
