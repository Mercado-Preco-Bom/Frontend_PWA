import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Caixa } from './pages/Caixa';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Todas as rotas dentro do MainLayout herdam o design de mobile e o Header azul */}
        <Route element={<MainLayout />}>
          
          {/* Se a pessoa acessar a raiz vai ser direcionado para o /caixa */}
          <Route path="/" element={<Navigate to="/caixa" replace />} />
          
          {/* Pagina do caixa*/}
          <Route path="/caixa" element={<Caixa />} />
          
          {/* Placeholder para a próxima página */}
          <Route path="/motorista" element={
            <div className="p-4 text-center text-gray-500 mt-10">
              Ecrã do Motorista em construção...
            </div>
          } />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}