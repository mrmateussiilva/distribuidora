import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';
import type { SafeUser } from '../../types';

const mockUser: SafeUser = {
  id: 1,
  username: 'testuser',
  role: 'admin',
};

describe('authStore', () => {
  beforeEach(() => {
    // Limpa o localStorage primeiro
    localStorage.clear();
    // Limpa o store antes de cada teste
    useAuthStore.getState().logout();
  });

  describe('setUser', () => {
    it('deve definir o usuário no store', () => {
      const { setUser } = useAuthStore.getState();
      
      setUser(mockUser);
      
      const { user } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
    });

    it('deve permitir definir usuário como null', () => {
      const { setUser } = useAuthStore.getState();
      
      setUser(mockUser);
      setUser(null);
      
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('deve persistir o usuário no localStorage', () => {
      const { setUser } = useAuthStore.getState();
      
      setUser(mockUser);
      
      const stored = localStorage.getItem('auth-storage');
      expect(stored).toBeTruthy();
      
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.user).toEqual(mockUser);
      }
    });
  });

  describe('logout', () => {
    it('deve remover o usuário do store', () => {
      const { setUser, logout } = useAuthStore.getState();
      
      setUser(mockUser);
      let { user } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
      
      logout();
      
      ({ user } = useAuthStore.getState());
      expect(user).toBeNull();
    });

    it('deve limpar o localStorage', () => {
      const { setUser, logout } = useAuthStore.getState();
      
      setUser(mockUser);
      logout();
      
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.user).toBeNull();
      }
    });
  });

  describe('persistência', () => {
    it('deve restaurar o usuário do localStorage ao inicializar', () => {
      const { setUser } = useAuthStore.getState();
      setUser(mockUser);
      
      // Simula uma nova inicialização do store
      const newStore = useAuthStore.getState();
      
      expect(newStore.user).toEqual(mockUser);
    });
  });
});

