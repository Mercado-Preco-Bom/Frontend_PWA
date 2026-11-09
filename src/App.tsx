import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/Protection/ProtectedRoute';
import { Login } from './pages/Login';
import { Caixa } from './pages/Caixa';
import { Admin } from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<MainLayout />}>
          
          {/* Rotas exclusivas para o CAIXA */}
          <Route element={<ProtectedRoute allowedRoles={['CAIXA']} />}>
            <Route path="/caixa" element={<Caixa />} />
          </Route>

          {/* Rotas exclusivas para o ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  );
}