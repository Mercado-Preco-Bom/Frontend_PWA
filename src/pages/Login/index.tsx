import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoImg from '../../assets/PBImagem.jpeg';
import { getSession, saveSession } from '../../utils/auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = getSession();
    if (!user) return;
    if (user.role === 'ADMIN') navigate('/admin', { replace: true });
    else if (user.role !== 'DRIVER') navigate('/caixa', { replace: true });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/users/login`, { email, password });
      const { user, token } = response.data;

      if (user.role === 'DRIVER') {
        alert('Acesso negado. Motoristas devem utilizar o aplicativo móvel.');
        return;
      }

      saveSession(user, token);
      navigate(user.role === 'ADMIN' ? '/admin' : '/caixa');
    } catch (error) {
      console.error(error);
      alert('Erro ao fazer login. Verifique o seu e-mail e a sua senha.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-4 text-base text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#2B4FA8] focus:ring-2 focus:ring-[#2B4FA8]/20';

  return (
    <div className="min-h-screen w-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="h-24 w-24 rounded-full overflow-hidden shadow-md ring-1 ring-black/5">
            <img src={logoImg} alt="Logo PreçoBom" className="h-full w-full object-cover" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            <span className="text-[#2E3192]">Preço</span>
            <span className="text-[#E53E3E]">Bom</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">Acesso ao Sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">E-mail</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputClass}
              placeholder="Digite seu e-mail"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
              placeholder="Digite sua senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2B4FA8] text-white font-bold text-base py-4 mt-4 rounded-xl shadow-md hover:bg-[#244590] active:bg-[#1E3A7A] transition-colors disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
