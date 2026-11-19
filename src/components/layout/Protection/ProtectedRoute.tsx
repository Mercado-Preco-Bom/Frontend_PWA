import { getSession, clearSession } from '../../../utils/auth';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const user = getSession();

  if (!user) {
    return <Navigate to="/login" replace />;
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