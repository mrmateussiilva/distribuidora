import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { useAuthStore } from '../../state/authStore';
import type { SafeUser } from '../../types';

// Componente mock para testar o Outlet
const MockChild = () => <div data-testid="outlet">Protected Content</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Limpa o store antes de cada teste
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  it('deve redirecionar para /login quando não houver usuário autenticado', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute />}>
            <Route index element={<MockChild />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Navigate não renderiza nada visível, mas podemos verificar que Outlet não foi renderizado
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('deve renderizar o Outlet quando houver usuário autenticado', () => {
    const mockUser: SafeUser = {
      id: 1,
      username: 'testuser',
      role: 'admin',
    };

    useAuthStore.getState().setUser(mockUser);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute />}>
            <Route index element={<MockChild />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('deve verificar que o store está sendo usado corretamente', () => {
    const mockUser: SafeUser = {
      id: 1,
      username: 'testuser',
      role: 'admin',
    };

    useAuthStore.getState().setUser(mockUser);
    const user = useAuthStore.getState().user;

    expect(user).toEqual(mockUser);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute />}>
            <Route index element={<MockChild />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });
});

