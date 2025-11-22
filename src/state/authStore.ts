import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SafeUser } from '@/types';

interface AuthState {
  user: SafeUser | null;
  setUser: (user: SafeUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
