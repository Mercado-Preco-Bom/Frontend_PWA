import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock } from 'lucide-react';
import logoImg from '../../assets/PBImagem.jpeg';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepConnected, setKeepConnected] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('@PrecoBom:user') || sessionStorage.getItem('@PrecoBom:user');
    const storedToken = localStorage.getItem('@PrecoBom:token') || sessionStorage.getItem('@PrecoBom:token');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (storedToken) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
        if (parsedUser.role === 'ADMIN') {
          navigate('/admin', { replace: true });
        } else if (parsedUser.role !== 'DRIVER') {
          navigate('/caixa', { replace: true });
        }
      } catch {
        localStorage.removeItem('@PrecoBom:user');
        sessionStorage.removeItem('@PrecoBom:user');
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/users/login`, { email, password });
      const { user, token } = response.data;

      if (user.role === 'DRIVER') {
        alert('Acesso negado. Motoristas devem utilizar o aplicativo móvel.');
        setLoading(false);
        return;
      }

      const targetStorage = keepConnected ? localStorage : sessionStorage;
      const otherStorage = keepConnected ? sessionStorage : localStorage;

      otherStorage.removeItem('@PrecoBom:user');
      otherStorage.removeItem('@PrecoBom:token');

      targetStorage.setItem('@PrecoBom:user', JSON.stringify(user));
      if (token) {
        targetStorage.setItem('@PrecoBom:token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/caixa');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao fazer login. Verifique o seu e-mail e palavra-passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-[#2E3192] p-8 flex flex-col items-center justify-center">
          <div className="relative h-28 w-[120px] overflow-hidden mb-2">
            <img src={logoImg} alt="Logo PreçoBom" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120%] max-w-none object-contain" />
          </div>
          <p className="text-blue-200 text-sm font-medium mt-2">Acesso ao Sistema</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">E-mail</label>
              <div className="flex bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#2B358F] focus-within:ring-1 focus-within:ring-[#2B358F] transition-all">
                <div className="pl-3 flex items-center justify-center">
                  <Mail size={18} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-3 outline-none text-sm text-gray-800 bg-transparent"
                  placeholder="exemplo@mercado.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Palavra-passe</label>
              <div className="flex bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#2B358F] focus-within:ring-1 focus-within:ring-[#2B358F] transition-all">
                <div className="pl-3 flex items-center justify-center">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-3 outline-none text-sm text-gray-800 bg-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepConnected}
                onChange={e => setKeepConnected(e.target.checked)}
                className="w-4 h-4 accent-[#2E3192] rounded cursor-pointer"
              />
              Permanecer conectado
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E53E3E] text-white font-bold text-sm py-4 mt-4 rounded-lg shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'A entrar...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}