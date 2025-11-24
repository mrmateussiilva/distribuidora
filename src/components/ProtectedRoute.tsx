import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/state/authStore';
import { useEffect } from 'react';

const ProtectedRoute = () => {
  const { user, isAuthenticated, logout } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    logout: state.logout,
  }));

  useEffect(() => {
    // Verifica se o token ainda existe no sessionStorage
    const token = sessionStorage.getItem('auth-token');
    if (!token && user) {
      // Token foi removido, faz logout
      logout();
    }
  }, [user, logout]);

  if (!user || !isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
