import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SafeUser } from '@/types';

interface AuthState {
  user: SafeUser | null;
  token: string | null;
  setUser: (user: SafeUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

// Função para criar storage baseado em sessionStorage
const sessionStorage = {
  getItem: (name: string): string | null => {
    try {
      return window.sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      window.sessionStorage.setItem(name, value);
    } catch {
      // Ignora erros de storage
    }
  },
  removeItem: (name: string): void => {
    try {
      window.sessionStorage.removeItem(name);
    } catch {
      // Ignora erros de storage
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => {
        // Remove token do sessionStorage
        sessionStorage.removeItem('auth-token');
        sessionStorage.removeItem('auth-storage');
        set({ user: null, token: null });
      },
      isAuthenticated: () => {
        const state = get();
        // Verifica se há token no sessionStorage
        const token = sessionStorage.getItem('auth-token');
        return !!(state.user && token);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Não persiste o token, apenas o user (mas será limpo ao fechar)
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Limpa a autenticação quando a janela for fechada
if (typeof window !== 'undefined') {
  // Listener para quando a janela for fechada
  window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem('auth-token');
    sessionStorage.removeItem('auth-storage');
  });

  // Listener para quando a aba/janela perder o foco (opcional, para maior segurança)
  window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Opcional: pode adicionar lógica aqui se necessário
    }
  });
}
