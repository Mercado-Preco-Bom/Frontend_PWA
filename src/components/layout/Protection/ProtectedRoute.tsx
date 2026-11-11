import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const userStr = localStorage.getItem('@PrecoBom:user');
  
  // Se não estiver logado, manda pro login
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  // Se o Motorista tentar logar na Web, bloqueamos e mandamos baixar o app
  if (user.role === 'DRIVER') {
    alert("Acesso negado. Motoristas devem utilizar o aplicativo móvel.");
    localStorage.removeItem('@PrecoBom:user');
    return <Navigate to="/login" replace />;
  }

  // Se o usuário não tiver permissão para esta tela, redireciona para a tela correta dele
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'CASHIER') return <Navigate to="/caixa" replace />;

    // Role desconhecida: limpa a sessão e volta pro login (evita liberar a tela por engano)
    localStorage.removeItem('@PrecoBom:user');
    return <Navigate to="/login" replace />;
  }

  // Se passou em todas as validações, renderiza a página normalmente
  return <Outlet />;
}