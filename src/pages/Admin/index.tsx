import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, CheckCircle2, Clock, Hourglass, Route, Map as MapIcon, Circle, Loader2 } from 'lucide-react';
import { DeliveryMap } from '../../components/ui/DeliveryMap';

interface DashboardData {
  metrics: {
    totalToday: number;
    completed: number;
    pending: number;
    avgIdleTime: number;
    avgRouteTime: number;
  };
  drivers: Array<{
    id: string;
    name: string;
    status: 'EM_ROTA' | 'DISPONIVEL';
    currentDelivery: any;
  }>;
  history: Array<{
    id: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    customer: { name: string; neighborhood: string };
    driver: { name: string } | null;
  }>;
}

const formatTime = (isoString?: string | null) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getAvatarColor = (name: string) => {
  const colors = ['bg-[#1A4B9F]', 'bg-[#E65100]', 'bg-green-600', 'bg-purple-600'];
  return colors[name.charCodeAt(0) % colors.length];
};

const getDeliveryProgress = (delivery: DashboardData['history'][0]) => {
  if (delivery.status === 'DELIVERED') {
    return `Entregue às ${formatTime(delivery.finishedAt)}`;
  }
  if (delivery.status === 'IN_TRANSIT') {
    return `Iniciada às ${formatTime(delivery.startedAt)} - Em andamento`;
  }
  return `Emitida às ${formatTime(delivery.createdAt)} - Não iniciada`;
};

export function Admin() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/dashboard`);
        setData(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-[#1A4B9F]" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full pb-8">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A4B9F]">Gestão de Entregas</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitoramento em tempo real</p>
        </div>
        <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          GPS ao vivo
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <Package size={20} className="text-indigo-600 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{data.metrics.totalToday}</span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Entregas do dia</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <CheckCircle2 size={20} className="text-green-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{data.metrics.completed}</span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Finalizadas</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <Clock size={20} className="text-orange-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800">{data.metrics.pending}</span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Pendentes / em rota</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <Hourglass size={20} className="text-red-500 mb-2" />
          <span className="text-2xl font-bold text-gray-800 flex items-baseline gap-1">{data.metrics.avgIdleTime} <span className="text-sm font-normal text-gray-500">min</span></span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Ociosidade média</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center col-span-2 md:col-span-1">
          <Route size={20} className="text-purple-600 mb-2" />
          <span className="text-2xl font-bold text-gray-800 flex items-baseline gap-1">{data.metrics.avgRouteTime} <span className="text-sm font-normal text-gray-500">min</span></span>
          <span className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Tempo de rota médio</span>
        </div>
      </div>

      {/* MAPA E MOTORISTAS */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* O Mapa Real ocupa este espaço */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 relative z-0">
          <DeliveryMap drivers={data.drivers} />
        </div>

        {/* Lista de Motoristas */}
        <div className="w-full lg:w-[320px] bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col min-h-[400px] z-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Motoristas</h3>
          <div className="flex-1 overflow-y-auto space-y-5">
            {data.drivers.length === 0 && <p className="text-sm text-gray-400">Nenhum motorista cadastrado.</p>}
            
            {data.drivers.map(driver => (
              <div key={driver.id} className="pb-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full ${getAvatarColor(driver.name)} text-white flex items-center justify-center text-xs font-bold uppercase`}>
                    {driver.name.charAt(0)}
                  </div>
                  <span className="font-bold text-gray-800 text-sm capitalize">{driver.name}</span>
                </div>

                {driver.status === 'EM_ROTA' ? (
                  <>
                    <div className="bg-[#1A4B9F] text-white text-[10px] font-semibold px-2 py-1 rounded w-fit mb-2">
                      Em rota desde {formatTime(driver.currentDelivery?.startedAt)}
                    </div>
                    {/* A linha que estava quebrada foi corrigida aqui */}
                    <p className="text-xs text-gray-500 leading-tight">
                      → {driver.currentDelivery?.customer?.neighborhood} - {driver.currentDelivery?.customer?.name.split(' ')[0]}
                    </p>
                    
                  </>
                ) : (
                  <div className="text-[#E65100] text-xs font-semibold mb-1 flex items-center gap-1.5">
                    <Circle size={8} fill="currentColor" /> Disponível
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABELA DE HISTÓRICO COM LINHA DO TEMPO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-hidden flex flex-col">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">Histórico de entregas de hoje</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 text-[11px]">
                <th className="pb-3 font-medium uppercase">ID</th>
                <th className="pb-3 font-medium uppercase">Cliente</th>
                <th className="pb-3 font-medium uppercase">Bairro</th>
                <th className="pb-3 font-medium uppercase text-center">Motorista</th>
                <th className="pb-3 font-medium uppercase text-center" title="Nota Emitida">Emitido</th>
                <th className="pb-3 font-medium uppercase text-center" title="Corrida Iniciada">Iniciado</th>
                <th className="pb-3 font-medium uppercase text-center" title="Corrida Finalizada">Entregue</th>
                <th className="pb-3 font-medium uppercase text-left">Status do Pedido</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              
              {data.history.length === 0 && (
                <tr><td colSpan={8} className="py-4 text-center text-gray-400 text-sm">Nenhuma entrega registrada hoje.</td></tr>
              )}

              {data.history.map(delivery => (
                <tr key={delivery.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-3.5 text-gray-400 text-xs font-medium">#{delivery.id.split('-')[0]}</td>
                  <td className="py-3.5 font-semibold text-gray-800 capitalize truncate max-w-[150px]">{delivery.customer.name}</td>
                  <td className="py-3.5 text-gray-500 capitalize">{delivery.customer.neighborhood}</td>
                  <td className="py-3.5 text-center">
                    {delivery.driver ? (
                      <div className={`w-6 h-6 rounded-full ${getAvatarColor(delivery.driver.name)} text-white flex items-center justify-center text-[10px] font-bold mx-auto uppercase`} title={delivery.driver.name}>
                        {delivery.driver.name.charAt(0)}
                      </div>
                    ) : '-'}
                  </td>
                  
                  {/* Três colunas de Horário */}
                  <td className="py-3.5 text-center text-gray-500">{formatTime(delivery.createdAt)}</td>
                  <td className="py-3.5 text-center text-gray-500">{formatTime(delivery.startedAt)}</td>
                  <td className="py-3.5 text-center font-medium text-gray-800">{formatTime(delivery.finishedAt)}</td>
                  
                  {/* Coluna descritiva de Progresso/Status */}
                  <td className="py-3.5 text-left">
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-md ${
                      delivery.status === 'DELIVERED' ? 'bg-green-50 text-green-700 border border-green-100' : 
                      delivery.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                      'bg-orange-50 text-orange-700 border border-orange-100'
                    }`}>
                      {getDeliveryProgress(delivery)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}