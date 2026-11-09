import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, ShieldAlert, LogOut } from 'lucide-react';
import logoImg from '../../../assets/PBImagem.jpeg';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Pega os dados do usuário logado
  const userStr = localStorage.getItem('@PrecoBom:user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('@PrecoBom:user');
    navigate('/login');
  };

  return (
    <header className="bg-[#1A4B9F] text-white px-4 py-3 shadow-md z-10 w-full flex-shrink-0">
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
        
        {/* Logo na parte da esquerda */}
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-[52px] sm:h-14 sm:w-[62px] overflow-hidden flex-shrink-0 flex items-center justify-center">
             <img 
               src={logoImg} alt="Logo PreçoBom" 
               className="absolute top-1/2 left-1/2 -translate-x-[48%] -translate-y-1/2 h-[120%] max-w-none object-contain"
             />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none text-white">
              Preço<span className="text-red-400">Bom</span>
            </h1>
            <span className="text-[10px] sm:text-[11px] text-blue-200 font-normal mt-1 leading-none">
              Despacho de Entregas
            </span>
          </div>
        </div>

        {/* Meio */}
        <nav className="hidden md:flex items-center gap-6">
          {user?.role === 'CAIXA' && (
            <Link to="/caixa" className={`flex items-center gap-2 text-sm font-medium ${location.pathname === '/caixa' ? 'text-white' : 'text-blue-300 hover:text-white transition'}`}>
              <ShoppingCart size={16} /> Dashboard Caixa
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className={`flex items-center gap-2 text-sm font-medium ${location.pathname === '/admin' ? 'text-white' : 'text-blue-300 hover:text-white transition'}`}>
              <ShieldAlert size={16} /> Painel Administrador
            </Link>
          )}
        </nav>

        {/* Parte da direta (quem ta logado e botao de sair) */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="bg-white text-[#1A4B9F] px-3 py-1.5 rounded-full text-xs flex items-center gap-2 shadow-sm whitespace-nowrap">
              <div className="bg-[#1A4B9F] text-white font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px] uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="font-bold text-[11px] capitalize">{user.name.split(' ')[0]}</span>
                <span className="text-[9px] text-gray-500 font-normal">{user.role === 'CAIXA' ? 'Operador(a)' : 'Gestão'}</span>
              </div>
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="text-blue-300 hover:text-white transition flex items-center gap-1 text-xs font-semibold"
            title="Sair do sistema"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

      </div>
    </header>
  );
}