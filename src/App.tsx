import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/layout/Protection/ProtectedRoute';
import { Login } from './pages/Login';
import { Caixa } from './pages/Caixa';
import { Admin } from './pages/Admin';
import { DeliveryDetail } from './pages/Admin/DeliveryDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<MainLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['CASHIER']} />}>
            <Route path="/caixa" element={<Caixa />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/entrega/:id" element={<DeliveryDetail />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}