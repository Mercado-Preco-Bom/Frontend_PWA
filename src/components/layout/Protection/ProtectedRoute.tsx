import axios from 'axios';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

const clearSession = () => {
  localStorage.removeItem('@PrecoBom:user');
  localStorage.removeItem('@PrecoBom:token');
  sessionStorage.removeItem('@PrecoBom:user');
  sessionStorage.removeItem('@PrecoBom:token');
  delete axios.defaults.headers.common['Authorization'];
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const userStr = localStorage.getItem('@PrecoBom:user') || sessionStorage.getItem('@PrecoBom:user');
  const token = localStorage.getItem('@PrecoBom:token') || sessionStorage.getItem('@PrecoBom:token');

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  let user: { role?: string };
  try {
    user = JSON.parse(userStr);
  } catch {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  if (user.role === 'DRIVER') {
    alert('Acesso negado. Motoristas devem utilizar o aplicativo móvel.');
    clearSession();
    return <Navigate to="/login" replace />;
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'CASHIER') return <Navigate to="/caixa" replace />;

    clearSession();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}