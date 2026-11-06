import { Link, useLocation } from 'react-router-dom';
import { Truck, ShieldAlert, RotateCcw } from 'lucide-react';
import logoImg from '../../../assets/PBImagem.jpeg';

export function Header() {
  const location = useLocation();

  return (
    // Alteramos a cor de fundo para uma aproximação do azul do seu logo (#2B358F)
    <header className="bg-[#2E3192] text-white px-4 py-2 shadow-md z-10 w-full flex-shrink-0">
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
        
        {/* Esquerda - Logo Maior e Fundido com o Fundo (Corrigido a linha branca) */}

        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* DIV "MÁSCARA": Aumentámos a altura (h-16/h-20) e a largura (w-[65px]/w-[85px]) */}
          <div className="relative h-16 w-[65px] sm:h-20 sm:w-[85px] overflow-hidden flex-shrink-0">
             
             {/* A IMAGEM: Mantém a escala de 120% para esconder a linha branca, mas agora cresce porque o contentor é maior */}
             <img 
               src={logoImg} 
               alt="Logo PreçoBom" 
               className="absolute top-1/2 left-1/2 -translate-x-[48%] -translate-y-1/2 h-[120%] max-w-none object-contain"
             />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate hidden sm:block">
            <span className="font-normal text-blue-200 border-l border-blue-400 pl-3 sm:pl-4">Entregas</span>
          </h1>
        </div>

        {/* Centro - Navegação (Oculto no Mobile, Visível no Desktop) */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/caixa" className={`flex items-center gap-2 text-sm font-medium ${location.pathname === '/caixa' ? 'text-white' : 'text-blue-300 hover:text-white transition'}`}>
             Caixa
          </Link>
          <Link to="/motorista" className={`flex items-center gap-2 text-sm font-medium ${location.pathname === '/motorista' ? 'text-white' : 'text-blue-300 hover:text-white transition'}`}>
            <Truck size={16} /> Motorista
          </Link>
          <Link to="/admin" className={`flex items-center gap-2 text-sm font-medium ${location.pathname === '/admin' ? 'text-white' : 'text-blue-300 hover:text-white transition'}`}>
            <ShieldAlert size={16} /> Administrador
          </Link>
          <button className="text-blue-300 hover:text-white transition ml-2">
            <RotateCcw size={16} />
          </button>
        </nav>

        {/* Direita - Utilizador */}
        <div className="bg-white text-[#2B358F] px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap">
          <span className="bg-[#2B358F] text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[8px] sm:text-[10px]">CX</span>
          Caixa 01
        </div>

      </div>
    </header>
  );
}